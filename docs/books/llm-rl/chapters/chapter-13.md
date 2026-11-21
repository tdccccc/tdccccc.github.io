# 第 13 章 在线蒸馏与“RL 训专家，蒸馏做整合”

<p class="chapter-summary">对比离线前向 KL 蒸馏与在线反向 KL 蒸馏（OPD），严格推导 OPD 等价于“以教师为参考策略的纯 KL 强化学习”，剖析 DeepSeek-V4 用多教师在线蒸馏取代混合 RL 的工业架构及多样性流失修正。</p>

把数学、代码、多轮智能体、创意写作、指令遵循与安全对齐全部塞进同一个大型 RL 训练循环里，是 2024–2025 年所有大厂后训练团队共同的噩梦：
- 数学和代码奖励是 $0/1$ 二值规则，推理链动辄 20,000 token；
- 通用对话奖励是连续标量 RM，回复只有 500 token；
- 混合在一起跑 RL 时，各领域奖励尺度打架、梯度方向互相拉扯、长短轨迹极度不均导致 GPU 大面积空等，常常调好数学就把写作和指令遵循打塌了。

2025 年末至 2026 年，一条把<strong>强化学习</strong>与<strong><a class="term-ref" href="/books/llm-rl/glossary#opd" title="On-Policy Distillation，在线蒸馏：学生自采样、教师在每个 token 给出目标分布并最小化反向 KL">在线蒸馏（On-Policy Distillation, OPD）</a></strong>无缝咬合的新范式迅速走向主流，并在 <strong>DeepSeek-V4（2026-04，arXiv `2606.19348`）</strong> 上完成了大规模工业验证。

---

## 13.1 在线蒸馏（OPD）的数学本质：纯 KL 强化学习

先分清两种蒸馏：
- **传统离线蒸馏（SFT 式 / 前向 KL）**：先用教师模型 $\pi_{\mathrm{T}}$ 生成一批静态回复 $y \sim \pi_{\mathrm{T}}$，学生模型 $\pi_\theta$ 在这批静态数据上做交叉熵模仿（最小化前向 KL $\mathbb{D}_{\mathrm{KL}}[\pi_{\mathrm{T}} \,\|\, \pi_\theta]$）。缺点和第 1 章的 SFT 完全一致：**存在暴露偏差**——学生推理时走偏到教师没写过的前缀，立刻手足无措。
- **在线蒸馏（OPD / 反向 KL）**：由**学生 $\pi_\theta$ 自己在线采样**回复 $y \sim \pi_\theta(\cdot\mid x)$，再把学生写出的轨迹送入冻结的教师模型 $\pi_{\mathrm{T}}$ 做一次前向传播，在每个位置 $t$ 最小化学生到教师的**反向 KL 散度**：

$$
\mathcal{L}_{\text{OPD}}(\theta) = \mathbb{E}_{x\sim\mathcal{D},\; y\sim\pi_\theta(\cdot\mid x)}\Bigg[\sum_{t=1}^{|y|} \mathbb{D}_{\mathrm{KL}}\big[\,\pi_\theta(\cdot\mid s_t) \;\big\|\; \pi_{\mathrm{T}}(\cdot\mid s_t)\,\big]\Bigg]
$$

### 推导：OPD 严格等价于“参考模型换成教师”的逐 Token RL

与第 10 章 SDPO 的推导完全同源：固定位置 $t$，记 $p_t = \pi_\theta(\cdot\mid s_t)$，$q_t = \pi_{\mathrm{T}}(\cdot\mid s_t)$，求梯度得：

$$
\nabla_\theta \mathbb{D}_{\mathrm{KL}}[p_t \,\|\, q_t]
= \mathbb{E}_{\hat y\sim p_t}\Big[\big(\log p_t(\hat y) - \log q_t(\hat y)\big)\,\nabla_\theta\log p_t(\hat y)\Big]
$$

（因为 $\sum_{\hat y}\nabla_\theta p_t(\hat y) = \nabla_\theta 1 = 0$）。对损失做**梯度下降**，等价于策略梯度**上升**，单采样 token 估计下的逐 token 即时奖励正好是：

$$
r_t^{\text{OPD}} = -\Big(\log\pi_\theta(y_t\mid s_t) - \log\pi_{\mathrm{T}}(y_t\mid s_t)\Big) = \log\frac{\pi_{\mathrm{T}}(y_t\mid s_t)}{\pi_\theta(y_t\mid s_t)}
$$

把这条公式和第 2 章 PPO-RLHF 里带 KL 惩罚的 token 奖励 $\tilde r_t = -\beta\log\frac{\pi_\theta}{\pi_{\text{ref}}} + \mathbf{1}[t=T]r(x,y)$ 并排一对照，豁然开朗：

::: tip 核心等价结论
**在线蒸馏（OPD）就是把参考策略 $\pi_{\text{ref}}$ 换成强教师 $\pi_{\mathrm{T}}$、取 $\beta = 1$、去掉末尾稀疏奖励项后的纯 KL 强化学习！**

它罕见地集齐了两家的全部长处：
1. **拥有 RL 的 On-Policy 基因**：样本来自学生自己，彻底消除暴露偏差；
2. **拥有 SFT 的逐 Token 稠密信号**：不再是几千个 token 共享 1 bit 对错，而是每个位置都拿到完整概率对数差监督；
3. **寻模（Mode-Seeking）特性适配推理**：反向 KL 允许容量较小的学生专注锁定教师概率最高的核心正确解，不必勉强覆盖教师的全部风格分支。

Thinking Machines 在 2025-10 的技术博客中报告，在 AIME 2024 推理任务上，在线蒸馏仅用约 **十分之一的算力** 就达到了与从头跑标准 RLVR 相当的效果（博客自报）。第 10 章的 SDPO 本质上正是“以带上反馈的自己充当教师 $\pi_{\mathrm{T}}$”的 OPD 特例。
:::

---

## 13.2 DeepSeek-V4 范式：RL 训专家，多教师在线蒸馏做整合

既然在线蒸馏如此高效且自带稠密逐 token 信号，一个自然的架构升级便水到渠成——**把“产生顶尖能力”和“把多项能力合并进一个通用模型”彻底拆成两道独立工序！**

<figure class="book-figure">
  <img src="/figures/llm-rl/opd-expert-distill.svg" alt="DeepSeek-V4 的各领域独立 RL 训专家与多教师在线蒸馏整合架构" loading="lazy">
  <figcaption><span class="book-figure__label">图 13-1</span>DeepSeek-V4 后训练两段式架构。RL 并没有退出历史舞台，而是专注在各自最纯粹的单域环境里拉高上限；多教师在线蒸馏则彻底替代了极难调参的多领域混合 RL 阶段。</figcaption>
</figure>

**DeepSeek-V4（2026-04，arXiv `2606.19348`）** 的公开架构清晰展示了这套工业新范式：

1. **阶段 A · 单域专家 RL**：为数学、代码、智能体、通用指令遵循等垂直领域**各自独立训练专家模型**。每个专家只跑自己最干净的 SFT + GRPO / 专项 RL，无需迁就其他领域的长度、学习率、奖励尺度或 KL 系数，能把单域能力推到极致；
2. **阶段 B · 多教师在线蒸馏整合**：初始化统一的学生主模型 $\pi_\theta$，按配比混合各领域提示词，由学生实时在线采样；遇到数学题就由数学专家提供 $\pi_{\mathrm{T}}$ logits，遇到代码题就由代码专家提供 $\pi_{\mathrm{T}}$ logits，用统一的逐 token 反向 KL 一次性把全部专家的本领熔进同一个权重——**完全替换了 DeepSeek-V3.2 中的多领域混合 RL 阶段**！

这套架构的工程优雅之处在于：
- **彻底解耦多领域干扰**：不同领域的奖励数值尺度原本风马牛不相及，而所有专家的 log-prob 分布天然共享同一个概率单纯形与 nats 尺度，可以直接混合训练；
- **研发团队并行化**：数学组、代码组、Agent 组、对话组可以各自独立迭代升级自己的专家检查点，最终只需在整合阶段统一跑一轮高效的 OPD 即可合流交付。

---

## 13.3 争议与边界：多样性流失与顶部模型的宿命

在线蒸馏虽强，2026 年的实证研究也迅速指出了它的两道硬边界：

### 1. 反向 KL 加速多样性流失与高熵脆弱性
回顾第 2 章图 2-2 的前向/反向 KL 对比：反向 KL 强烈的寻模（Mode-Seeking）特性，在把学生推向高 $\text{pass@}1$ 的同时，会比标准 RL 更猛烈地压缩输出熵，导致 **$\text{pass@}1$ 亮眼、$\text{pass@}k$ 下滑**；此外，当教师分布本身熵较高（多峰平缓）时，全词表反向 KL 在低概率尾部容易引发梯度震荡。

针对这一问题，*Revisiting On-Policy Distillation*（2026-03，arXiv `2603.25562`）提出**截断反向 KL（Top-K Truncated Reverse KL）**——只在教师或学生概率最高的 Top-$K$ 候选词上计算散度，大幅稳定了高熵任务上的蒸馏动态并缓解尾部噪声。

### 2. RL 与蒸馏的终极分工：最前沿模型没有老师
一个必须保持清醒的事实是：**蒸馏永远只能传递和整合已有能力，无法凭空超越所有教师的联合天花板**。
- 当你手头有更强的超大模型或分域专家时，在线蒸馏是性价比高一个数量级的“能力压缩机与整合器”；
- 但对于探索人类知识与推理最前沿的旗舰模型而言，世上并没有更强的现成老师——**新能力的源头活水，依然只能来自与真实环境、验证器和世界交互的强化学习（RL）**。

如何确定“先 OPD 整合还是后接一轮轻度 RL 收尾”、“如何用 MaxRL 或熵正则补回蒸馏损失的多样性”，正是 2026 年下半年工业界最活跃的配方调优课题。

至此，我们完成了单轮文本与长思维链推理的全部核心理论与实践。从下一篇开始，大语言模型将正式长出“手脚”——走出单轮对话框，进入代码仓库、终端沙箱与多智能体协同的 **Agentic RL** 世界。
