# 核心算法最小可运行 PyTorch 参考实现

<p class="chapter-summary">把全书最核心的算法目标函数浓缩为可直接对照阅读与单元测试的 PyTorch 张量实现：涵盖 GAE、DPO、GRPO / Dr.GRPO / DAPO / GSPO / CISPO、MaxRL、GDPO、SDPO 与 TIS 训练-推理修正。</p>

阅读论文时最容易在“聚合分母是按序列还是按 token”、“stop-gradient 到底套在哪个张量上”、“掩码 $\mu_t$ 应该乘在哪一层”这类细节上出错。下面所有函数均采用**与全书严格一致的符号与张量形状约定**，可直接作为自研训练代码或阅读 veRL / TRL 源码的对照基准。

**统一张量形状约定**：
- `logp`: 当前策略逐 token 对数概率 $\log\pi_\theta(y_{i,t}\mid s_{i,t})$，形状 `[B, T]`（建议在 **FP32** 下计算）
- `old_logp`: 旧策略对数概率 $\log\pi_{\theta_{\text{old}}}$，形状 `[B, T]`
- `infer_logp`: 推理引擎记录的对数概率 $\log\pi_{\text{infer}}$，形状 `[B, T]`
- `ref_logp`: 参考策略对数概率 $\log\pi_{\text{ref}}$，形状 `[B, T]`
- `mask`: 有效动作损失掩码 $\mu_{i,t} \in \{0, 1\}$（屏蔽 Prompt、Padding 与多轮环境观测），形状 `[B, T]`
- `rewards`: 组内序列级奖励，形状 `[num_prompts, G]`

---

## 1. $k_3$ KL 估计量与 GAE 广义优势估计（第 2–3 章）

```python
import torch
import torch.nn.functional as F


def kl_k3_per_token(logp: torch.Tensor, ref_logp: torch.Tensor) -> torch.Tensor:
    """Schulman k3 单样本 KL 估计量：u - 1 - log(u)，其中 u = pi_ref / pi_theta。
    值无偏且恒非负；注意 off-policy 时需在外部乘重要性比修正。
    """
    log_u = ref_logp - logp
    u = torch.exp(log_u.clamp(-20.0, 20.0))
    return (u - 1.0) - log_u


@torch.no_grad()
def compute_gae(
    token_rewards: torch.Tensor,  # [B, T], 含 KL 惩罚的逐 token 奖励 r̃_t
    values: torch.Tensor,         # [B, T], Critic 预测 V_ψ(s_t)
    mask: torch.Tensor,           # [B, T], 有效动作 token 掩码 μ_t
    gamma: float = 1.0,
    lam: float = 0.95,
) -> tuple[torch.Tensor, torch.Tensor]:
    """反向递推计算 GAE 优势 Â_t 与价值回归目标 R̂_t。"""
    B, T = token_rewards.shape
    advantages = torch.zeros_like(token_rewards)
    last_gae = torch.zeros(B, device=token_rewards.device, dtype=token_rewards.dtype)

    for t in reversed(range(T)):
        next_val = values[:, t + 1] if t + 1 < T else torch.zeros_like(values[:, t])
        next_mask = mask[:, t + 1] if t + 1 < T else torch.zeros_like(mask[:, t])
        delta = token_rewards[:, t] + gamma * next_val * next_mask - values[:, t]
        last_gae = (delta + gamma * lam * last_gae * next_mask) * mask[:, t]
        advantages[:, t] = last_gae

    returns = advantages + values
    return advantages, returns
```

---

## 2. DPO 与 SimPO 偏好损失（第 7 章）

```python
def dpo_loss(
    pi_logp_w: torch.Tensor,   # [B], sum_t log pi_theta(y_w | x)
    pi_logp_l: torch.Tensor,   # [B], sum_t log pi_theta(y_l | x)
    ref_logp_w: torch.Tensor,  # [B], sum_t log pi_ref(y_w | x)
    ref_logp_l: torch.Tensor,  # [B], sum_t log pi_ref(y_l | x)
    beta: float = 0.1,
) -> torch.Tensor:
    h_theta = (pi_logp_w - ref_logp_w) - (pi_logp_l - ref_logp_l)
    return -F.logsigmoid(beta * h_theta).mean()


def simpo_loss(
    pi_logp_w: torch.Tensor,   # [B], 序列总对数似然
    pi_logp_l: torch.Tensor,   # [B]
    len_w: torch.Tensor,       # [B], |y_w|
    len_l: torch.Tensor,       # [B], |y_l|
    beta: float = 2.0,
    margin: float = 0.5,       # 本书记作 m（原文记作 γ）
) -> torch.Tensor:
    """去掉参考模型，按回复长度归一平均对数似然。"""
    r_w = pi_logp_w / len_w.clamp(min=1.0)
    r_l = pi_logp_l / len_l.clamp(min=1.0)
    return -F.logsigmoid(beta * (r_w - r_l) - margin).mean()
```

---

## 3. 四种组相对优势：GRPO、Dr.GRPO、RLOO、MaxRL 与 GDPO（第 8–10 章）

```python
@torch.no_grad()
def group_advantages(
    rewards: torch.Tensor,  # [P, G]
    mode: str = "grpo",
    eps: float = 1e-6,
) -> torch.Tensor:
    """在每个提示的 G 条回复内计算序列级优势 [P, G]。"""
    P, G = rewards.shape
    mean = rewards.mean(dim=-1, keepdim=True)

    if mode == "grpo":
        std = rewards.std(dim=-1, unbiased=False, keepdim=True)
        return torch.where(std > eps, (rewards - mean) / (std + eps), torch.zeros_like(rewards))

    if mode == "dr_grpo":
        return rewards - mean

    if mode == "rloo":
        return (G / (G - 1.0)) * (rewards - mean)

    if mode == "maxrl":
        # 仅适用于非负二值奖励 r in {0, 1}；全错组（mean == 0）置 0 丢弃
        return torch.where(mean > eps, (rewards - mean) / (mean + eps), torch.zeros_like(rewards))

    raise ValueError(f"Unknown mode: {mode}")


@torch.no_grad()
def gdpo_advantages(
    reward_list: list[torch.Tensor],  # K 个 [P, G] 张量，对应不同奖励维度
    weights: list[float],
    eta: float = 1e-6,
) -> torch.Tensor:
    """GDPO：先对每个奖励维度分别做组内标准化，加权求和后再做全局 Batch 标准化。"""
    a_sum = torch.zeros_like(reward_list[0])
    for r_k, w_k in zip(reward_list, weights):
        mu = r_k.mean(dim=-1, keepdim=True)
        sd = r_k.std(dim=-1, unbiased=False, keepdim=True)
        a_k = torch.where(sd > eta, (r_k - mu) / (sd + eta), torch.zeros_like(r_k))
        a_sum = a_sum + w_k * a_k

    # Batch 级再标准化，使优势尺度不随奖励个数 K 增长
    return (a_sum - a_sum.mean()) / (a_sum.std(unbiased=False) + eta)
```

---

## 4. 策略损失全家桶：DAPO、Dr.GRPO、GSPO、CISPO 与 TIS（第 9、18 章）

```python
def dapo_loss(
    logp: torch.Tensor,
    old_logp: torch.Tensor,
    adv: torch.Tensor,            # [B, 1] 或 [B, T]
    mask: torch.Tensor,           # [B, T]
    eps_low: float = 0.20,
    eps_high: float = 0.28,
) -> torch.Tensor:
    """DAPO：非对称 Clip-Higher + 全 Batch Token 等权聚合（β = 0）。"""
    rho = torch.exp((logp - old_logp).clamp(-20.0, 20.0))
    clipped = torch.clamp(rho, 1.0 - eps_low, 1.0 + eps_high)
    obj = torch.minimum(rho * adv, clipped * adv)
    return -(obj * mask).sum() / mask.sum().clamp(min=1.0)


def dr_grpo_loss(
    logp: torch.Tensor,
    old_logp: torch.Tensor,
    adv: torch.Tensor,            # 去掉 std 的 (r_i - r̄)
    mask: torch.Tensor,
    l_max: float = 4096.0,
    eps: float = 0.20,
) -> torch.Tensor:
    """Dr.GRPO：常数 L_max 分母替代 1/|y_i|，彻底消除错答变长偏差。"""
    rho = torch.exp((logp - old_logp).clamp(-20.0, 20.0))
    clipped = torch.clamp(rho, 1.0 - eps, 1.0 + eps)
    obj = torch.minimum(rho * adv, clipped * adv)
    return -(obj * mask).sum(dim=-1).mean() / l_max


def gspo_loss(
    logp: torch.Tensor,
    old_logp: torch.Tensor,
    seq_adv: torch.Tensor,        # [B], 序列级优势
    mask: torch.Tensor,           # [B, T]
    eps: float = 3e-4,            # 注意：序列级几何平均 ε 必须为 1e-4 量级！
) -> torch.Tensor:
    """GSPO：序列级几何平均比率 g_i(θ)，整条序列统一裁剪，适合 MoE。"""
    lengths = mask.sum(dim=-1).clamp(min=1.0)
    mean_log_rho = ((logp - old_logp) * mask).sum(dim=-1) / lengths
    g_i = torch.exp(mean_log_rho.clamp(-10.0, 10.0))
    clipped_g = torch.clamp(g_i, 1.0 - eps, 1.0 + eps)
    obj = torch.minimum(g_i * seq_adv, clipped_g * seq_adv)
    return -obj.mean()


def cispo_loss_with_tis(
    logp: torch.Tensor,
    old_logp: torch.Tensor,
    adv: torch.Tensor,
    mask: torch.Tensor,
    infer_logp: torch.Tensor | None = None,
    eps_low: float = 0.20,
    eps_high: float = 0.28,
    c_tis: float = 3.0,
) -> torch.Tensor:
    """CISPO：裁剪重要性权重并施加 stop-gradient，保留每个反思 token 的梯度；
    可选叠加 TIS 修正推理引擎与训练框架的数值不一致。
    """
    with torch.no_grad():
        rho = torch.exp((logp - old_logp).clamp(-20.0, 20.0))
        weight = torch.clamp(rho, 1.0 - eps_low, 1.0 + eps_high)
        if infer_logp is not None:
            # 训练-推理跨引擎修正：min(pi_train / pi_infer, C_TIS)
            tis_ratio = torch.exp((old_logp - infer_logp).clamp(-20.0, 20.0))
            weight = weight * torch.clamp(tis_ratio, max=c_tis)

    obj = weight * adv * logp
    return -(obj * mask).sum() / mask.sum().clamp(min=1.0)
```

---

## 5. SDPO 与在线蒸馏 OPD 的 Top-K 反向 KL 损失（第 10、13 章）

```python
def reverse_kl_topk_distill_loss(
    student_logits: torch.Tensor,  # [B, T, V], 学生 logits（FP32）
    teacher_logits: torch.Tensor,  # [B, T, V], 教师/反馈条件自身 logits
    mask: torch.Tensor,            # [B, T]
    top_k: int = 100,
) -> torch.Tensor:
    """在学生概率最高的 Top-K 词表子集上计算逐 token 反向 KL（节省显存并缓解高熵尾部噪声）。
    教师侧施加 detach()（即 stop-gradient）。
    """
    top_vals, top_idx = torch.topk(student_logits, k=top_k, dim=-1)
    student_log_p = F.log_softmax(top_vals, dim=-1)
    student_p = student_log_p.exp()

    with torch.no_grad():
        teacher_top_vals = torch.gather(teacher_logits, dim=-1, index=top_idx)
        teacher_log_q = F.log_softmax(teacher_top_vals, dim=-1)

    # KL(p || q) = sum_k p_k * (log p_k - log q_k)
    kl_per_tok = (student_p * (student_log_p - teacher_log_q)).sum(dim=-1)
    return (kl_per_tok * mask).sum() / mask.sum().clamp(min=1.0)
```

> **使用提示**：以上代码聚焦算法数学语义的清晰对照，省略了分布式 `all_reduce` 全局 token 分母归约与序列打包（FlashAttention varlen）逻辑；在多卡 FSDP / Megatron 生产环境下，务必确保分母 `mask.sum()` 与 Batch 级归一化统计量在所有 DP Rank 间全局同步，避免不同卡梯度尺度失衡。
