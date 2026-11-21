# 第 8 章 无 Critic 时代：RLOO、REINFORCE++ 与 GRPO

<p class="chapter-summary">剖析为什么在序列级奖励下可以去掉庞大的价值模型 Critic，完成 RLOO 留一法与 GRPO 组相对标准化的代数推导，揭示二值奖励下组优势的闭式结构与零方差组难题（内嵌 4 种组优势实时交互实验）。</p>

上一章看到，PPO-RLHF 的痛点集中在价值模型 $V_\psi$：显存翻倍、长思维链下极难学准。而在 RLVR 或序列级奖励场景下，奖励本来就是整条回复结束后才给一次的标量。既然第 2 章已经指出可以将整条回复视作序列级 Bandit，我们何必非要硬训一个逐 token 的百亿参数 Critic 来猜“这道题大概能拿多少分”？

一个朴素却威力巨大的替代思路浮出水面：**直接对同一道题多采样几条回复，拿它们自己的平均得分当基线！** 本章系统梳理沿这一思想诞生的三条脉络——**ReMax / RLOO**、**REINFORCE++** 与彻底改变推理后训练格局的 **GRPO**。

---

## 8.1 从四模型到“单模型训练”：去掉 Critic 的账本

对比 PPO 与 GRPO 在同一轮迭代中的计算流，结构差异一目了然：

<figure class="book-figure">
  <img src="/figures/llm-rl/ppo-vs-grpo-flow.svg" alt="PPO 与 GRPO 单轮迭代数据流对比" loading="lazy">
  <figcaption><span class="book-figure__label">图 8-1</span>同一轮迭代的数据流对照。绿色边框为需要反向传播更新的模型。GRPO 移除了与策略同等规模的 Critic 模型，把基线估计的职责交给“同提示 $G$ 条回复的组内均值”，并将 KL 惩罚从逐 token 奖励移至独立损失项。</figcaption>
</figure>

拿掉 Critic 带来两笔直接红利和一笔交换成本：
- **显存红利**：省去整份百亿级 Critic 的参数、梯度、优化器状态与前反向激活（若在 RLVR 下再把 RM 换成 CPU 规则验证器，并令 $\beta=0$ 去掉 $\pi_{\text{ref}}$，GPU 上甚至**只需要驻留策略 $\pi_\theta$ 这一个模型**！）；
- **稳定性红利**：消除了训练初期 Critic 预测不准导致优势带偏、需要复杂 Critic Warmup 的工程难题；
- **交换成本**：每个提示不再只采样 $1$ 条回复，而是需要并发采样 $G$ 条（常见 $G = 8\text{–}64$）。得益于现代推理引擎（vLLM / SGLang）的共享提示前缀缓存（Prefix Caching / RadixAttention），同提示 $G$ 条回复只需做一次 Prompt Prefill，且能高并发批处理 Decode，这笔采样开销在绝大多数场景下远比维护一个巨型 Critic 划算得多。

---

## 8.2 基线谱系：ReMax、RLOO 与 REINFORCE++

在组采样或无 Critic 基线的探索中，三种经典设计先后验证了“简洁基线在大模型上不输甚至超越 PPO”：

### 1. ReMax（Li 等，2023-10）
对每个提示 $x$，除了按采样温度生成一条探索回复 $y$ 外，额外做一次贪心解码（Greedy Decoding）得到 $y_{\text{greedy}}$，取基线 $b(x) = r(x, y_{\text{greedy}})$。它满足严格无偏条件，但每条样本的基线来自单次确定性轨迹，面对多峰复杂题方差仍偏大。

### 2. RLOO：留一法 REINFORCE（Ahmadian 等，2024-02）
<strong><a class="term-ref" href="/books/llm-rl/glossary#rloo" title="RLOO，留一法 REINFORCE：用同组其余 G-1 条回复的平均奖励作无偏基线">RLOO（REINFORCE Leave-One-Out）</a></strong>对每个提示采样 $G$ 条独立回复 $\{y_1,\dots,y_G\}$，给第 $i$ 条回复用<strong>其余 $G-1$ 条回复的均值</strong>作为基线：

$$
\hat A_i^{\text{RLOO}} = r_i - \frac{1}{G-1}\sum_{j \ne i} r_j
$$

由于第 $i$ 条的基线严格不包含 $y_i$ 自身，直接满足第 3 章基线无偏降方差定理的充分条件。把上式做一行极其漂亮的代数变形（利用 $\sum_{j\ne i} r_j = G\bar r - r_i$，其中 $\bar r = \frac{1}{G}\sum_{j=1}^G r_j$）：

$$
\hat A_i^{\text{RLOO}}
= r_i - \frac{G\bar r - r_i}{G-1}
= \frac{(G-1)r_i - G\bar r + r_i}{G-1}
= \frac{G}{G-1}\big(r_i - \bar r\big)
$$

::: tip 关键代数洞见：去掉标准差的 GRPO 与 RLOO 方向完全等价
很多人曾怀疑 GRPO 的组均值 $\bar r$ 包含了 $r_i$ 本身，会不会破坏第 3 章的基线无偏性？上面这一行变形一锤定音：**$r_i - \bar r$ 与严格无偏的 RLOO 仅相差一个全局常数因子 $\frac{G}{G-1}$**！因此两者在期望梯度方向上完全一致、均无偏（仅相差一个可被学习率吸收的缩放倍数）。
:::

### 3. REINFORCE++（Hu，2025-01）
REINFORCE++ 同样放弃 Critic，但在**整个全局 Batch 层面**（而非单个提示的组内）对优势做白化标准化，并结合 PPO 裁剪与逐 token KL 惩罚。它的动机是：当每提示采样数很小（甚至 $G=1$）时，单组均值方差过大或退化，改用全批统计能减少对单个提示局部采样的过拟合。

---

## 8.3 GRPO 完整推导与目标函数

<strong><a class="term-ref" href="/books/llm-rl/glossary#grpo" title="Group Relative Policy Optimization，组相对策略优化：以组内标准化奖励直接估计优势">GRPO（Group Relative Policy Optimization）</a></strong>由 DeepSeekMath（Shao 等，2024-02）提出，并随 DeepSeek-R1（2025-01）成为整个推理强化学习时代的默认起点。

从第 3 章的 PPO 裁剪目标出发，GRPO 做了三处精准替换：
1. **以组内标准化替代 Critic**：对每个提示 $x$ 用旧策略 $\pi_{\theta_{\text{old}}}$ 采样 $G$ 条回复 $\{y_1,\dots,y_G\}$，拿到奖励 $\{r_1,\dots,r_G\}$，直接计算组内标准化优势（Z-score）：

$$
\hat A_{i,t} = \frac{r_i - \operatorname{mean}(\{r_1,\dots,r_G\})}{\operatorname{std}(\{r_1,\dots,r_G\}) + \epsilon_{\text{std}}}
$$

2. **序列级优势广播**：同一条回复 $y_i$ 里的所有 token $t = 1,\dots,|y_i|$ 共享同一个标量优势 $\hat A_{i,t} = \hat A_i$；
3. **KL 移出奖励、并入损失**：不再像 PPO 那样把 KL 折入 $\tilde r_t$，而是用第 2 章的 $k_3$ 估计量 $\hat{\mathbb{D}}_{i,t} = \frac{\pi_{\text{ref}}}{\pi_\theta} - \log\frac{\pi_{\text{ref}}}{\pi_\theta} - 1$ 作为独立惩罚项。

按“先对每条回复内的 token 求平均，再对组内 $G$ 条回复求平均”聚合，即得 GRPO 完整目标：

$$
J_{\text{GRPO}}(\theta) = \mathbb{E}_{x\sim\mathcal{D},\; \{y_i\}_{i=1}^G \sim \pi_{\theta_{\text{old}}}(\cdot\mid x)}\Bigg[\frac{1}{G}\sum_{i=1}^{G}\frac{1}{|y_i|}\sum_{t=1}^{|y_i|}\Big(\min\big(\rho_{i,t}\hat A_{i,t},\;\operatorname{clip}(\rho_{i,t}, 1-\varepsilon, 1+\varepsilon)\,\hat A_{i,t}\big) - \beta\,\hat{\mathbb{D}}_{i,t}\Big)\Bigg]
$$

其中 $\rho_{i,t}(\theta) = \frac{\pi_\theta(y_{i,t}\mid x, y_{i,<t})}{\pi_{\theta_{\text{old}}}(y_{i,t}\mid x, y_{i,<t})}$。

---

## 8.4 二值奖励下的闭式优势与零方差组困境

当把 GRPO 用到数学/代码等 **0/1 二值可验证奖励（RLVR）** 时，组内优势可以精确化简为极富启发性的闭式表达。

设组内通过率为 $p = K / G \in (0, 1)$（$K = \sum_{i=1}^G r_i$ 为答对条数）。此时组均值 $\bar r = p$，总体标准差 $\operatorname{std} = \sqrt{p(1-p)}$（工程中若用无偏样本标准差，仅多一个常数因子 $\sqrt{G/(G-1)}$）。代入公式立得：

$$
\hat A_{\text{对}} = \frac{1 - p}{\sqrt{p(1-p)}} = \sqrt{\frac{1-p}{p}}, \qquad
\hat A_{\text{错}} = \frac{-p}{\sqrt{p(1-p)}} = -\sqrt{\frac{p}{1-p}}
$$

观察这两个对称的根号分式，立刻看清 GRPO 在不同难度题目上的隐含性格：
- **难题（$p$ 很小，如 $1/8$）**：唯一做对的那条回复拿到很大的正优势 $+\sqrt{7} \approx +2.65$，其余 7 条错答各拿很小的负优势 $-0.38$；
- **简单题（$p$ 很大，如 $7/8$）**：7 条对答各拿很小的正优势 $+0.38$，唯一做错的那条却承受巨大的负优势 $-\sqrt{7} \approx -2.65$；
- **全对或全错的组（$p=0$ 或 $p=1$）**：标准差为 $0$，组内所有样本的优势均为 $0$——**这道题对策略更新贡献为零，整组 $G$ 次昂贵的 Rollout 采样全部白白浪费！**

### 交互实验：动手比较四种组相对优势估计

点击下方回复卡片切换对错，或切换“难题 / 中等 / 简单 / 全对”预设，直观比较 **GRPO**、**Dr.GRPO**（第 9 章）、**RLOO** 与 **MaxRL**（第 10 章）在同一组 8 条回复上分配出的优势尺度差异：

<RlGroupAdvantageWidget />

通过上面的交互实验，你一定已经敏锐地察觉到了 GRPO 隐藏的两个问题：<strong>除以标准差到底是不是好事？</strong>以及<strong>全对/全错的零方差组怎么处理？</strong> 除此之外，GRPO 的外层聚合因子 $\frac{1}{|y_i|}$、对称裁剪 $\varepsilon$ 以及 token 级比率 $\rho_{i,t}$ 在 2025 年的大规模长思维链与 MoE 训练中又陆续暴露出深层缺陷。下一章，我们就逐一拆解 2025 年围绕 GRPO 的四大手术级修正。
