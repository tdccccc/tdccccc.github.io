# 第 2 章 把 LLM 生成建模为 RL：MDP、Bandit 与 KL 闭式解

<p class="chapter-summary">建立大语言模型生成的 token 级 MDP 与序列级 Contextual Bandit 双视角，厘清信用分配难题，完整推导 KL 正则化目标的闭式最优策略 π*，并剖析前向/反向 KL 与 Schulman k1/k2/k3 估计量的微妙陷阱。</p>

要把大语言模型接入强化学习算法，第一步是把“给提示、逐词吐字、结束打分”的过程翻译成标准决策语言。本章建立全书最重要的数学起点——**带 KL 正则的期望奖励目标 $J_\beta(\theta)$**，并证明它的闭式最优解 $\pi^\star$。后面几乎所有算法——PPO、DPO、GRPO、OPD 乃至 2026 年的 SDPO——都可以看作对这一目标的不同解法或变形。

---

## 2.1 LLM 生成的 MDP 对照与两个特殊性

在经典<a class="term-ref" href="/books/llm-rl/glossary#mdp" title="Markov Decision Process，马尔可夫决策过程：由状态、动作、转移与奖励构成的序贯决策模型">马尔可夫决策过程（MDP）</a>中，智能体在每一步 $t$ 观察状态 $s_t$、依策略选择动作 $a_t$、环境转移至 $s_{t+1}$ 并返回即时奖励 $r_t$。将单轮 LLM 自回归生成逐项映射如下：

| 经典 RL 概念 | 在单轮 LLM 生成中的对应 | 关键数量级 / 特征 |
| --- | --- | --- |
| **状态 $s_t$** | $(x, y_{<t})$：提示加上已生成的 $t-1$ 个 token | 序列长度 $T$ 可达 $10^3\text{–}10^5$ |
| **动作 $a_t$** | $y_t \in \mathcal{V}$：从词表挑选的下一个 token | 离散动作空间极庞大，$\vert\mathcal{V}\vert\sim 10^5$ |
| **策略 $\pi_\theta(a_t \mid s_t)$** | LLM 在位置 $t$ 输出的 softmax 概率分布 | 整条回复概率 $\pi_\theta(y\mid x) = \prod_{t=1}^T \pi_\theta(y_t\mid s_t)$ |
| **状态转移 $P(s_{t+1}\mid s_t, a_t)$** | **确定性拼接**：$s_{t+1} = (x, y_{\le t})$ | 无环境随机性（多轮工具 Agent 除外，见第 14 章） |
| **回合（Episode）** | 一次完整生成，直至输出 `EOS` 或达到 $L_{\max}$ | 变长回合，长尾极严重 |
| **奖励 $r_t$** | 通常仅在末尾给出：$t < T$ 时为 $0$，$t = T$ 时为 $r(x, y)$ | 极度稀疏的延迟标量奖励 |

这张映射表立刻揭示出 LLM RL 与传统游戏/机器人控制的两个本质差异：
1. **确定性转移但超大动作空间**：在单轮文本生成里没有环境动力学未知的问题，但每步要在 10 万级词表上做决策，使得基于动作值函数枚举 $\arg\max_a Q(s,a)$ 的经典值迭代（如 DQN）在 LLM 上极难直接奏效。
2. **极度稀疏的末尾奖励**：一条长达 8,000 token 的推理轨迹，往往只在最后一个 `EOS` 位置收到一个 $0$ 或 $1$ 的标量。

---

## 2.2 两种视角：Token 级 MDP vs 序列级 Contextual Bandit

利用自回归分解 $\pi_\theta(y\mid x) = \prod_{t=1}^T \pi_\theta(y_t\mid s_t)$，我们可以把整条回复 $y$ 打包视作**一个宏动作**。此时问题退化为单步的<a class="term-ref" href="/books/llm-rl/glossary#contextual_bandit" title="Contextual Bandit，上下文多臂老虎机：接收上下文、做一次选择、立即获得奖励即结束的单步决策模型">上下文多臂老虎机（Contextual Bandit）</a>：看到上下文 $x$，一次选出完整回复 $y$，立刻拿到 $r(x,y)$，回合结束。

<figure class="book-figure">
  <img src="/figures/llm-rl/mdp-vs-bandit.svg" alt="Token 级 MDP 与序列级 Contextual Bandit 双视角对比" loading="lazy">
  <figcaption><span class="book-figure__label">图 2-1</span>同一条生成轨迹的两种建模粒度。Token 级视角试图给每个 token 分配精确信用；序列级视角与末尾奖励的粒度天然一致，把复杂度从 Critic 转移到了组内采样。</figcaption>
</figure>

- **Token 级视角**：追问“第 $t$ 个 token 对最终成败贡献了多少”。这正是 PPO 中价值函数 $V_\psi(s_t)$ 与 GAE（第 3 章、第 7 章）以及过程奖励 PRM（第 5 章）的工作。
- **序列级视角**：只评价整条回复的相对优劣，再把同一个序列级优势广播给该回复中的所有 token。代表方法包括 REINFORCE、RLOO、GRPO、DPO 与 GSPO（第 7–9 章）。

2023–2025 年的主流后训练大幅倒向序列级视角——它简单、省显存，且与末尾标量奖励粒度严丝合缝；而 2026 年的 **SDPO**（第 10 章）与 **在线蒸馏 OPD**（第 13 章）则从另一条路径重返 token 级：不再靠难训的 Critic 猜价值，而是直接用教师分布给出稠密的逐 token 信号。

### 信用分配（Credit Assignment）的代价与妥协

<a class="term-ref" href="/books/llm-rl/glossary#credit_assignment" title="Credit Assignment，信用分配：将最终稀疏奖励归因到具体步骤或关键 token 的问题">信用分配</a>要回答的是：一道数学题最终算错，可能只是第 1,200 个 token 抄错了一个负号，前面 1,199 个 token 的思路完全正确。序列级视角把同样的负优势广播给整条回复，对前面正确的推理看似非常“冤枉”。

为什么它依然有效？因为在大批量采样上取平均时，真正导致错误的 token 会更系统性地与低奖励共同出现，而正确的通用推理模式在正确回复和错误回复中都会出现、其正负噪声在期望意义下相互抵消——**梯度期望方向仍然无偏，代价是方差更大、需要更多 rollout 样本**。Critic、PRM、SDPO 与 OPD 的共同使命，就是把这部分方差压下来。

---

## 2.3 KL 正则化的统一目标

如果直接最大化原始期望奖励 $\mathbb{E}[r(x,y)]$，模型很快就会把分布压塌或钻奖励漏洞。工业界与学术界几乎一致采用带<a class="term-ref" href="/books/llm-rl/glossary#kl_divergence" title="Kullback-Leibler Divergence，相对熵：衡量两个分布差异的非负不对称量">KL 散度</a>约束的正则化目标：

$$
J_\beta(\theta) = \mathbb{E}_{x\sim\mathcal{D}}\Big[\;\mathbb{E}_{y\sim\pi_\theta(\cdot\mid x)}\big[\,r(x,y)\,\big] - \beta\,\mathbb{D}_{\mathrm{KL}}\big[\pi_\theta(\cdot\mid x)\,\big\|\,\pi_{\text{ref}}(\cdot\mid x)\big]\;\Big]
$$

其中 $\pi_{\text{ref}}$ 是冻结的参考策略（通常为 SFT 检查点），$\beta > 0$ 控制约束强度。引入 KL 项有三重根本原因：
1. **防止奖励模型在分布外失真**：奖励模型 $r_\phi$ 仅在 $\pi_{\text{ref}}$ 附近的样本上训练，一旦 $\pi_\theta$ 跑远，高代理分不再代表高质量（第 6 章详述 Gao 等人的过优化缩放曲线）。
2. **保护通用能力与语言流畅度**：缺乏锚定时，策略容易塌缩到少数高分套话模板，语言变得怪异，非训练任务能力急剧退化（对齐税 / 灾难性遗忘）。
3. **维持探索多样性**：KL 项阻止分布过早退化为确定性独峰，为持续探索保留概率支撑。

利用序列概率的逐 token 分解，序列级 KL 恰好可以精确拆成逐 token 对数概率比之和：

$$
\mathbb{D}_{\mathrm{KL}}\big[\pi_\theta(\cdot\mid x)\,\big\|\,\pi_{\text{ref}}(\cdot\mid x)\big]
= \mathbb{E}_{y\sim\pi_\theta}\Bigg[\sum_{t=1}^{T}\log\frac{\pi_\theta(y_t\mid s_t)}{\pi_{\text{ref}}(y_t\mid s_t)}\Bigg]
$$

因此工程上存在两种注入 KL 的写法：
- **折入 token 奖励（PPO-RLHF 做法）**：令 $\tilde r_t = -\beta\log\frac{\pi_\theta(y_t\mid s_t)}{\pi_{\text{ref}}(y_t\mid s_t)} + \mathbf{1}[t=T]\,r(x,y)$，与末尾奖励一起喂给 GAE。
- **作为独立损失项（GRPO 做法）**：优势完全由任务奖励 $r(x,y)$ 计算，在策略损失旁单独减去 $\beta\hat{\mathbb{D}}_{\text{KL}}$。

两种写法在目标期望值上相等，但求导后的梯度结构并不等价（见 2.5 节）。在强噪声少、规则确定性高的 RLVR 推理训练中，许多团队（如 DAPO）甚至直接令 $\beta = 0$，允许策略大幅偏离初始分布以长出全新推理模式。

---

## 2.4 闭式最优解 $\pi^\star$ 的完整推导与温度直觉

对每个固定的提示 $x$，目标 $J_\beta$ 竟然存在**精确的闭式最优策略**（这正是最大熵 RL 与“控制即推断”在语言模型上的直接体现）：

$$
\pi^\star(y \mid x) = \frac{1}{Z(x)}\,\pi_{\text{ref}}(y \mid x)\exp\!\left(\frac{r(x,y)}{\beta}\right), \qquad Z(x) = \sum_{y}\pi_{\text{ref}}(y\mid x)\exp\!\left(\frac{r(x,y)}{\beta}\right)
$$

### 完整推导

固定提示 $x$，将 $\pi(\cdot\mid x)$ 简记为 $\pi$：

$$
\begin{aligned}
\mathbb{E}_{y\sim\pi}[r(x,y)] - \beta\,\mathbb{D}_{\mathrm{KL}}[\pi \,\|\, \pi_{\text{ref}}]
&= \mathbb{E}_{y\sim\pi}\!\left[r(x,y) - \beta\log\frac{\pi(y)}{\pi_{\text{ref}}(y)}\right] && (1) \\
&= -\beta\,\mathbb{E}_{y\sim\pi}\!\left[\log\frac{\pi(y)}{\pi_{\text{ref}}(y)\exp\!\big(r(x,y)/\beta\big)}\right] && (2) \\
&= -\beta\,\mathbb{E}_{y\sim\pi}\!\left[\log\frac{\pi(y)}{\pi^\star(y)\,Z(x)}\right] && (3) \\
&= -\beta\,\mathbb{D}_{\mathrm{KL}}[\pi \,\|\, \pi^\star] + \beta\log Z(x) && (4)
\end{aligned}
$$

- 第 (1) 步把 KL 展开为期望，与奖励合并；
- 第 (2) 步提出 $-\beta$，将 $r/\beta = \log\exp(r/\beta)$ 并入对数分母；
- 第 (3) 步代入 $\pi^\star$ 定义 $\pi_{\text{ref}}(y)\exp(r/\beta) = \pi^\star(y)Z(x)$；
- 第 (4) 步因配分函数 $Z(x)$ 与 $y$ 无关，可提出期望之外。

由于 $\beta\log Z(x)$ 与优化变量 $\pi$ 无关，最大化 $J_\beta$ 严格等价于最小化 $\mathbb{D}_{\mathrm{KL}}[\pi \,\|\, \pi^\star]$。由吉布斯不等式，KL 散度非负且仅在 $\pi = \pi^\star$ 时取零，故 $\pi^\star$ 为唯一全局最优解。

**物理直觉**：$\pi^\star$ 是对参考分布 $\pi_{\text{ref}}$ 的**指数倾斜（Exponential Tilting）**——奖励每高出 $\beta$，该回复的相对概率就乘以 $e \approx 2.718$ 倍。因此 **$\beta$ 本质上是“奖励的温度”**：$\beta$ 极小时概率几乎全部塌缩到最高分回复上；$\beta$ 极大时 $\pi^\star$ 紧贴 $\pi_{\text{ref}}$。虽然因 $Z(x)$ 需要对 $|\mathcal{V}|^T$ 条可能回复求和而无法直接采样，但这条闭式解正是 DPO（第 7 章）绕开 RL 循环的全部数学钥匙。

<RlBetaTiltWidget />

---

## 2.5 前向 vs 反向 KL，以及 $k_1 / k_2 / k_3$ 估计量的陷阱

### KL 方向决定分布性格

$\mathbb{D}_{\mathrm{KL}}[p \,\|\, q]$ 对两个参数**不对称**。假设目标参考分布 $q$ 存在多个高价值峰（例如一道数学题存在代数法与几何法两种正确解）：

<figure class="book-figure">
  <img src="/figures/llm-rl/kl-direction.svg" alt="前向 KL 覆盖型与反向 KL 寻模型分布对比" loading="lazy">
  <figcaption><span class="book-figure__label">图 2-2</span>前向 KL（SFT / 离线蒸馏）强迫模型覆盖目标分布的所有支撑，避免遗漏；反向 KL（RL 正则 / 在线蒸馏 OPD）允许模型放弃部分峰而把概率高度集中在高分主峰上。</figcaption>
</figure>

- **前向 KL $\mathbb{D}_{\mathrm{KL}}[q \,\|\, \pi_\theta]$（Mode-Covering）**：对应 SFT 与离线蒸馏。只要 $q(y) > 0$，若 $\pi_\theta(y) \to 0$ 就会受到无穷大惩罚，因此 $\pi_\theta$ 被迫拉宽以覆盖所有模态，保留多样性但也可能把概率分到两峰之间的低质“折中地带”。
- **反向 KL $\mathbb{D}_{\mathrm{KL}}[\pi_\theta \,\|\, q]$（Mode-Seeking）**：对应 RL 目标 $J_\beta$ 与在线蒸馏 OPD。只要 $q(y) \approx 0$，$\pi_\theta(y)$ 必须迅速归零；模型可以安心放弃某些峰、只锁定最稳妥的一个高分峰，这让推理 pass@1 极强，却也埋下了多样性流失（pass@k 下降）的隐患（第 12–13 章）。

### 采样估计 KL：Schulman 的 $k_1 / k_2 / k_3$

训练中无法对整张词表或全部轨迹精确求和，通常利用采样到的 token $y_t \sim \pi_\theta(\cdot\mid s_t)$ 构造单样本估计量。记概率比 $u = \frac{\pi_{\text{ref}}(y_t\mid s_t)}{\pi_\theta(y_t\mid s_t)}$，John Schulman（2020）总结了三种经典估计量：

$$
k_1 = -\log u, \qquad k_2 = \frac{1}{2}(\log u)^2, \qquad k_3 = (u - 1) - \log u
$$

| 估计量 | 无偏性（值） | 非负性 | 方差特征 | 典型用途 |
| --- | --- | --- | --- | --- |
| **$k_1 = -\log u$** | 无偏 | 否（单样本可负） | 方差大 | PPO 折入逐 token 奖励 $\tilde r_t$ |
| **$k_2 = \frac{1}{2}(\log u)^2$** | 有偏（分布近时极小） | 恒非负 | 方差最低 | 近似正则监控 |
| **$k_3 = (u-1) - \log u$** | **无偏** | **恒非负** | 方差远低于 $k_1$ | **GRPO 损失项默认选择** |

**$k_3$ 的无偏与非负证明**：
- **无偏**：$\mathbb{E}_{y\sim\pi_\theta}[u] = \sum_y \pi_\theta(y)\frac{\pi_{\text{ref}}(y)}{\pi_\theta(y)} = \sum_y \pi_{\text{ref}}(y) = 1$，故 $\mathbb{E}[u - 1] = 0$，剩下的 $\mathbb{E}[-\log u]$ 恰好是 KL 精确定义。
- **非负**：由基本不等式 $\log u \le u - 1$（仅在 $u=1$ 取等），恒有 $(u - 1) - \log u \ge 0$。

::: warning 工程陷阱：值无偏 ≠ 梯度无偏，且 off-policy 需要修正
直接把 $k_3$ 放进损失函数自动求导时，必须注意两个在 2025 年后被反复踩中的坑：
1. **值与梯度的差异**：$k_3$ 仅保证对 KL 的*数值*无偏，直接对 $\mathbb{E}_{y\sim\pi_{\text{old}}}[k_3(u)]$ 关于 $\theta$ 求导时，由于未考虑采样分布随 $\theta$ 的变化，得到的梯度并不等价于直接对精确 $\mathbb{D}_{\mathrm{KL}}[\pi_\theta\|\pi_{\text{ref}}]$ 求导；
2. **Off-policy 分布错配**：当回复 $y$ 来自旧策略 $\pi_{\theta_{\text{old}}}$ 而非当前策略 $\pi_\theta$ 时，对 $k_3$ 的期望是在 $\pi_{\theta_{\text{old}}}$ 下取的，$\mathbb{E}_{\pi_{\text{old}}}[u] \ne 1$，无偏性直接破坏！必须额外乘上重要性比 $\rho_t = \frac{\pi_\theta}{\pi_{\theta_{\text{old}}}}$ 修正（DeepSeek-V3.2 在 2025-12 的技术报告中专门修正了这一细节）。
:::

建立起统一目标与闭式解后，下一章我们将正式推导如何用梯度求解这个目标：从 REINFORCE 到 GAE，再到支撑整个后训练时代的 PPO 裁剪替代目标。
