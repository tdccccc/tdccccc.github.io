# 第 17 章 RL 训练系统架构与显存/时间账本

<p class="chapter-summary">衔接《LLM 推理工程》的物理算账方法：算清长思维链 RL 中 Rollout 长尾气泡与四模型显存账本，系统对比共卡（Colocated）与分离（Disaggregated）部署、权重同步以及同步/异步流水线（Partial Rollout 与 PipelineRL）。</p>

如果说预训练像一场整齐划一的马拉松——每个 batch 的长度固定、前后向计算高度对称、只要喂满 Tensor Core 就能跑出 50%+ MFU——那么大模型强化学习更像一场**一边高速发牌、一边现场判分、一边动态改规则的混合交响乐**。

在这一章，我们延续姊妹书 [《LLM 推理工程：原理与方法》](/books/llm-inference/) 「先算清账、再看架构」的工程信条，先算清 RL 训练中耗时与显存两笔硬账，再拆解主流工业系统架构。

---

## 17.1 两笔硬账：为什么 Rollout 吞噬 75% 时间，以及显存花在哪

### 第一笔账：Rollout 长尾气泡账
在预训练或 SFT 中，整条回复一次性并行 Prefill + 反向传播，属于高算术强度的<strong>计算受限（Compute-bound）</strong>负载；而在 RL 的采样阶段（Rollout），模型必须逐 token 自回归 Decode，单步受限于 HBM 显存带宽（详见《LLM 推理工程》第 1 章 Roofline 拆账）。

更致命的是长思维链与多轮交互带来的**极端长度方差（Straggler 长尾）**：
- 假设一个 8B/32B 模型在每轮迭代采样 $1,024$ 条推理回复，中位长度 $2,500$ token，P99 长尾长度达到 $16,384$ token；
- 若以 $50\text{ tok/s}$ 的单流解码速度估算，中位请求在 **50 秒**内就已完工，但整批同步屏障必须死等最后那几条 16k 长尾跑满 **328 秒**！
- 随后进入训练器对整批轨迹并行执行 1 次 Prefill 算旧/参考对数概率 + 1–2 个 epoch 的前反向更新，全程高度计算密集，往往仅耗时 **40–60 秒**。

算完这笔账便一目了然：**在同步长 CoT RL 中，高达 70%–85% 的墙钟时间被 Rollout（尤其是尾部空等气泡）吞噬，反向传播反而是轻量环节！**

<figure class="book-figure">
  <img src="/figures/llm-rl/memory-rollout-ledger.svg" alt="同步 RL 长尾气泡时间线与不同算法静态显存账本对比" loading="lazy">
  <figcaption><span class="book-figure__label">图 17-1</span>左：同步模式下单条 16k 长尾制造出大片 GPU 空闲气泡；右：8B 模型 BF16 混合精度训练下，PPO、GRPO 与无参考 DAPO 的静态显存硬账。</figcaption>
</figure>

### 第二笔账：不同算法的静态显存账本
按标准 BF16 混合精度 + AdamW 算一笔 8B 稠密模型的静态显存账（不含动态激活与 KV Cache）：
- **一个可训练模型（Actor 或 Critic）**：BF16 权重（$2\text{ B/参数}$）+ BF16 梯度（$2\text{ B}$）+ FP32 主权重与 Adam 一二阶动量（$4+4+4 = 12\text{ B}$）= **$16\text{ B/参数} \approx 128\text{ GB}$**；
- **一个冻结推理模型（$\pi_{\text{ref}}$ 或标量 RM）**：仅需 BF16 权重 **$2\text{ B/参数} \approx 16\text{ GB}$**。

汇总四种典型算法（以 8B 为例，70B 等比例乘以 $8.75\times$）：

| 算法形态 | GPU 驻留模型组成 | 8B 总静态显存 | 70B 总静态显存 |
| --- | --- | ---: | ---: |
| **PPO-RLHF** | Actor(训) + Critic(训) + Ref(冻) + RM(冻) | **~288 GB** | **~2.52 TB** |
| **DPO** | Actor(训) + Ref(冻) | **~144 GB** | **~1.26 TB** |
| **GRPO（带 KL）** | Actor(训) + Ref(冻) + CPU 验证器 | **~144 GB** | **~1.26 TB** |
| **DAPO / RLVR（$\beta=0$）** | 仅 Actor(训) + CPU 验证器 | **~128 GB** | **~1.12 TB** |

注意：除了静态权重与优化器状态，Rollout 阶段还必须为推理引擎腾出庞大的 **KV Cache 显存池**（例如 8B GQA 模型单条 32k 轨迹就要吃掉约 $4\text{ GiB}$ KV），而训练阶段又需要大量激活检查点（Activation Checkpointing）空间——这直接催生了两大物理部署模式。

---

## 17.2 双子系统架构：共卡（Colocated）vs 分离（Disaggregated）

为了同时拿到推理引擎（vLLM / SGLang）的极速解码吞吐和训练框架（FSDP / Megatron-LM）的百卡并行反向能力，现代 RL 系统几乎清一色采用**生成与训练双引擎架构**：

<figure class="book-figure">
  <img src="/figures/llm-rl/rl-system-arch.svg" alt="生成与训练分离的大规模 RL 训练系统架构图" loading="lazy">
  <figcaption><span class="book-figure__label">图 17-2</span>现代 RL 系统的标准闭环。推理集群与训练集群通过经验缓冲和高速权重广播解耦；滞后步数 $d$ 直观刻画系统的异步与 off-policy 程度。</figcaption>
</figure>

在物理 GPU 划分上，工业界主要采用两种布局：

### 1. 共卡模式（Colocated / Time-Sharing）
同一批 GPU 在时间轴上**轮流扮演推理引擎与训练器**：
- Rollout 阶段：把训练器的优化器状态与梯度卸载（Offload）到主机 CPU 内存，释放绝大部分显存给 vLLM / SGLang 分配巨型 KV Cache 池全速采样；
- 训练阶段：销毁或休眠推理引擎的 KV Cache 池（如 vLLM Sleep Mode），把优化器状态拉回显存，用 FSDP/Megatron 执行反向传播，随后在片内高速更新推理引擎权重。
- **优缺点**：中小规模（8–64 卡）显存与算力利用率极高，无跨池配比失衡问题；但每次切换都有卸载/重载开销，且本质受限于**同步屏障**，无法彻底消除长尾气泡。

### 2. 分离模式（Disaggregated / Spatial Split）
将集群按比例切分为独立的**推理 GPU 池**与**训练 GPU 池**（典型配比常为 $2:1$ 甚至 $3:1$，把更多卡分给最耗时的 Rollout）：
- 推理池常驻运行 vLLM / SGLang，永不卸载 KV Cache；
- 训练池常驻运行 FSDP / Megatron，持续从经验缓冲池拉取成品轨迹做梯度更新；
- 每次或每 $K$ 次权重更新后，训练池通过 **NCCL / RDMA 广播**（甚至权重切片重排 Resharding：从训练的 TP/PP/FSDP 分片即时重映射为推理的 TP 分片）把最新权重 $\theta_k$ 推送给推理池。
- **优缺点**：支持真正的**异步流水并行**，彻底消灭长尾空转，是百卡至千卡级长 CoT 与多轮 Agent RL（如 GLM-5 / ScaleRL）的必然选择；代价是需要精细调优“推理池 vs 训练池”卡数配比，防止一侧饥饿、另一侧拥堵。

---

## 17.3 消灭长尾的三把利器：Partial Rollout、异步缓冲与 PipelineRL

即便做了分离部署，如果依然坚持严格同步（$d=0$，训练一步必须等推理端把整批新轨迹全跑完），两群 GPU 仍会互相干等。工业界演进出了三级加速方案：

1. **Partial Rollout（分段续写，Kimi k1.5 2025-01）**：
   设定每轮采样预算上限（如每轮只推进 4k token）。到了预算点尚未吐出 `EOS` 的超长轨迹直接连同已有 token 序列一起挂起存回队列，下一轮同步到新权重 $\theta_{k+1}$ 后接着往下续写！这样每轮采样耗时整齐划一，代价是同一条超长轨迹的前半段与后半段由不同版本权重生成（引入轻微 off-policy）。
2. **有界异步缓冲（Bounded Async，如 AReaL / slime / ROLL）**：
   允许推理引擎使用最多落后 $d$ 个版本的权重 $\theta_{k-d}$ 持续采样并向缓冲池灌入完成轨迹，训练器零等待持续消费。只要把最大滞后步数控制在安全边界内（常见 $d \in [1, 8]$），GPU 利用率可从同步模式的 ~30%–45% 飙升至 **80%+**。
3. **PipelineRL（流式在途权重更新，ScaleRL 采用）**：
   进一步打破“必须等整批生成停顿才能做权重广播”的约束——在推理引擎**仍在逐 token 解码中途**，以极低暂停代价把最新参数流式刷入推理权重，随后所有在途请求立刻无缝切换至最新策略继续生成，在近乎满载吞吐的同时把平均陈旧度 $d$ 压到极低水平。

然而，只要推理引擎和训练框架分成两套代码栈，哪怕在严格同步（$d = 0$）的情况下，一个更幽暗的幽灵也会悄然现身：**同一组权重，推理引擎和训练框架算出来的概率竟然不一样！** 下一章，我们就来彻底揭开 2025–2026 大规模 RL 稳定性头号杀手——**训练-推理不一致与 MoE 路由抖动**的面纱。
