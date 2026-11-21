# 第 7 章 PPO-RLHF 与离线偏好优化家族（DPO 及变体）

<p class="chapter-summary">复盘 InstructGPT 的四模型 PPO-RLHF 完整迭代闭环及其在长回复下的显存与 Critic 痛点，三步推导 DPO 如何利用闭式解绕开 RL 循环，并系统横评 DPO 的四大局限与迭代 DPO、IPO、KTO、SimPO 变体。</p>

进入第三篇，我们正式沿着时间与机理双轴，拆解大模型后训练策略优化算法的四次大换代。第一代（2022–2023）的核心故事，是工业界如何先用 **PPO-RLHF** 跑通第一个大规模对齐闭环，随后又因为四模型架构太重、Critic 太难训，催生出彻底绕开在线采样的 **DPO 偏好优化家族**。

---

## 7.1 完整的 PPO-RLHF：四模型协作与单轮迭代

在 InstructGPT（OpenAI，2022）确立的经典 RLHF 流程中，训练现场同时驻留四个与策略规模相当的大模型：
- **训练中的模型（2 个）**：策略模型（Actor）$\pi_\theta$、价值模型（Critic）$V_\psi$（通常用奖励模型初始化）；
- **冻结的模型（2 个）**：参考模型 $\pi_{\text{ref}}$（SFT 检查点）、奖励模型 $r_\phi$。

一轮完整的 PPO-RLHF 迭代包含五个标准步骤（完整数据流与 GRPO 对比见第 8 章图 8-1）：

1. **Rollout 采样**：从提示集 $\mathcal{D}$ 取一批提示，用旧策略 $\pi_{\theta_{\text{old}}}$（当前 $\pi_\theta$ 的快照）生成回复 $y = (y_1,\dots,y_T)$，记录生成时的旧对数概率 $\log\pi_{\theta_{\text{old}}}(y_t\mid s_t)$。
2. **三次前向打分**：将 $(x, y)$ 分别送入 $\pi_{\text{ref}}$ 计算参考对数概率、送入 $r_\phi$ 计算末尾标量奖励 $r(x,y)$、送入 $V_\psi$ 计算每个位置的价值预测 $V_\psi(s_t)$。
3. **构造奖励与 GAE 优势**：把逐 token KL 惩罚折进奖励 $\tilde r_t = -\beta\log\frac{\pi_{\theta_{\text{old}}}(y_t\mid s_t)}{\pi_{\text{ref}}(y_t\mid s_t)} + \mathbf{1}[t=T]\,r(x,y)$，再用第 3 章的 GAE 算出每个位置的优势 $\hat A_t$ 与价值回归目标 $\hat R_t = \hat A_t + V_{\psi_{\text{old}}}(s_t)$。
4. **多 Epoch 小批次更新**：将这批轨迹切分为若干 mini-batch，跑 $1\text{–}4$ 个 epoch：
   - 用 $L^{\text{CLIP}}(\theta)$ 更新策略 $\pi_\theta$；
   - 用均方误差（常带价值裁剪）$\mathcal{L}_V(\psi) = \mathbb{E}_t[(V_\psi(s_t) - \hat R_t)^2]$ 更新价值模型 $V_\psi$。
5. **同步行为策略**：令 $\pi_{\theta_{\text{old}}} \leftarrow \pi_\theta$，回到第 1 步。

### PPO-RLHF 的两个致命工程痛点

在 2022–2023 年，PPO-RLHF 是对齐黄金标准，但规模化之后很快暴露出两大结构性负担：

1. **显存与调度极度沉重**：单是 $V_\psi$ 就需要与 $\pi_\theta$ 同等体量的权重、梯度与 AdamW 优化器状态（一份 70B 模型的训练态就需要超过 1 TB 显存，详见第 17 章显存账本），加上冻结的 $\pi_{\text{ref}}$ 与 $r_\phi$，工程复杂度极高。
2. **长回复上的 Critic 难学准**：在几千甚至上万 token 的长思维链里，奖励只在最后一个 token 出现，价值信号必须通过 TD 误差反传数千步；训练初期 $V_\psi$ 极不准确，导致 $\hat A_t$ 引入严重偏差，甚至把策略带崩（这也是实践里常需要先“Critic 预热 / Warmup”数步的原因）。

这两个痛点直接把社区推向了两条分岔路：一条是 **DPO**——连 RL 循环带奖励模型一起拿掉；另一条是下一章的 **GRPO / RLOO**——保留在线 RL，只拿掉沉重的 Critic。

---

## 7.2 DPO：从闭式最优解绕开整个 RL 循环

**<a class="term-ref" href="/books/llm-rl/glossary#dpo" title="Direct Preference Optimization，直接偏好优化：利用 KL 闭式解消去配分函数，直接在偏好对上训练策略">DPO（Direct Preference Optimization）</a>**（Rafailov 等，2023-05）是后训练领域最优雅的数学巧思之一。它直接接上第 2 章的闭式最优解与第 4 章的 Bradley-Terry 模型，仅用三步代数便绕过了显式 RM 训练与在线采样。

<figure class="book-figure">
  <img src="/figures/llm-rl/dpo-derivation-flow.svg" alt="DPO 三步代数推导流程图" loading="lazy">
  <figcaption><span class="book-figure__label">图 7-1</span>DPO 的三步变换。第 2 步之所以神奇，是因为 Bradley-Terry 模型只依赖同一个提示 x 下两条回复的奖励差值，令原本无法计算的配分函数 Z(x) 精确抵消。</figcaption>
</figure>

### 完整三步推导

**第一步：把奖励反解成最优策略的函数。**
对第 2 章证明的闭式最优解 $\pi^\star(y\mid x) = \frac{1}{Z(x)}\pi_{\text{ref}}(y\mid x)\exp\big(r(x,y)/\beta\big)$ 两边取对数并移项：

$$
r(x, y) = \beta\log\frac{\pi^\star(y\mid x)}{\pi_{\text{ref}}(y\mid x)} + \beta\log Z(x)
$$

也就是说，任何潜在奖励函数都可以唯一地由其对应的最优策略 $\pi^\star$ 与参考策略 $\pi_{\text{ref}}$ 表达，仅相差一个只与提示 $x$ 有关的平移项 $\beta\log Z(x)$。

**第二步：代入 Bradley-Terry 模型，消去 $Z(x)$。**
正如第 4 章强调的，BT 模型满足平移不变性——它只看同一提示 $x$ 下胜出回复 $y_w$ 与落败回复 $y_l$ 的奖励差，于是 $\beta\log Z(x)$ 自动消失：

$$
P(y_w \succ y_l \mid x)
= \sigma\big(r(x, y_w) - r(x, y_l)\big)
= \sigma\!\left(\beta\log\frac{\pi^\star(y_w\mid x)}{\pi_{\text{ref}}(y_w\mid x)} - \beta\log\frac{\pi^\star(y_l\mid x)}{\pi_{\text{ref}}(y_l\mid x)}\right)
$$

**第三步：用参数化策略 $\pi_\theta$ 替代 $\pi^\star$，在离线偏好集上做最大似然。**
记隐式对数概率比之差 $h_\theta = \log\frac{\pi_\theta(y_w\mid x)}{\pi_{\text{ref}}(y_w\mid x)} - \log\frac{\pi_\theta(y_l\mid x)}{\pi_{\text{ref}}(y_l\mid x)}$，即得 DPO 损失：

$$
\mathcal{L}_{\text{DPO}}(\theta) = -\,\mathbb{E}_{(x, y_w, y_l)\sim\mathcal{D}_{\text{pref}}}\Big[\log\sigma\big(\beta\, h_\theta\big)\Big]
$$

与第 4 章的奖励模型损失 $\mathcal{L}_{\text{RM}}$ 对照，二者形式完全一致，只是把显式奖励 $r_\phi(x,y)$ 换成了**隐式奖励（Implicit Reward）** $\hat r_\theta(x,y) = \beta\log\frac{\pi_\theta(y\mid x)}{\pi_{\text{ref}}(y\mid x)}$。这正是原论文副标题 *Your Language Model is Secretly a Reward Model* 的字面含义。

### 梯度剖析：为什么隐式权重不可或缺

利用 $\frac{d}{dz}[-\log\sigma(z)] = -\sigma(-z)$ 求导：

$$
\nabla_\theta \mathcal{L}_{\text{DPO}}(\theta) = -\beta\,\mathbb{E}_{(x, y_w, y_l)}\Big[\underbrace{\sigma\big(\hat r_\theta(x,y_l) - \hat r_\theta(x,y_w)\big)}_{\text{隐式奖励排错时接近 } 1}\Big(\nabla_\theta\log\pi_\theta(y_w\mid x) - \nabla_\theta\log\pi_\theta(y_l\mid x)\Big)\Big]
$$

- **更新方向**：同时提高胜出回复 $y_w$ 的对数似然、压低落败回复 $y_l$ 的对数似然；
- **动态权重**：当隐式奖励给错了排序（$\hat r_\theta(y_l) > \hat r_\theta(y_w)$）时权重趋近于 $1$，重拳纠偏；排对且拉大间距后权重趋近于 $0$。原论文消融实验表明，去掉这个 sigmoid 权重（即直接最大化 $\log\pi(y_w) - \log\pi(y_l)$）会导致模型迅速退化吐出乱码。

---

## 7.3 DPO 的四大结构性局限

DPO 把四模型 PPO 压缩成了“训练 $\pi_\theta$ + 冻结 $\pi_{\text{ref}}$”的纯监督分类脚本，在 2023–2024 年迅速风靡开源社区。但大规模实践很快暴露出它的四条天花板：

1. **离线分布偏移（Off-Policy Distribution Shift）**。偏好对 $(y_w, y_l)$ 通常来自旧 SFT 模型或其他强模型，而不是当前 $\pi_\theta$ 自己的采样。训练越往后，$\pi_\theta$ 的输出分布离固定数据集越远，离线梯度无法纠正在新分布上冒出的新错误。
2. **似然位移（Likelihood Displacement）**。DPO 只约束相对差值 $\log\pi_\theta(y_w) - \log\pi_\theta(y_l)$，并不保证 $\log\pi_\theta(y_w)$ 上升。实践中极常见的一种病态现象是：$y_w$ 和 $y_l$ 的绝对概率**双双下跌**（只是 $y_l$ 跌得更惨），被挤出的概率质量流向了训练集之外的奇怪回复。工程上常需辅以少量 SFT NLL 损失（如 $\mathcal{L}_{\text{DPO}} + \alpha \mathcal{L}_{\text{NLL}}(y_w)$）拉住正样本似然。
3. **确定性偏好下的严重过拟合**。只要数据集中 $y_w$ 永远胜过 $y_l$，最大似然会把间隔 $\hat r_\theta(y_w) - \hat r_\theta(y_l)$ 无止境地推向 $+\infty$，无论 $\beta$ 设多大，KL 正则最终都会失效。
4. **难以驱动长思维链推理探索**。推理能力的突破依赖在大规模可验证环境中在线反复试错、自己发现更长更好的解法，离线成对偏好数据无法利用 RLVR 那样廉价、海量的二值验证循环。

---

## 7.4 偏好优化变体谱系：在线 DPO、IPO、KTO 与 SimPO

针对 DPO 上述短板，社区在 2023–2024 年密集提出了多款精准变体。保持统一记号 $h_\theta = \log\frac{\pi_\theta(y_w\mid x)}{\pi_{\text{ref}}(y_w\mid x)} - \log\frac{\pi_\theta(y_l\mid x)}{\pi_{\text{ref}}(y_l\mid x)}$：

| 方法与年份 | 单样本核心损失 | 解决的痛点与关键改动 |
| --- | --- | --- |
| **迭代 / 在线 DPO**<br>`2024` | 同 DPO，但数据按轮次刷新 | 每轮用当前 $\pi_\theta$ 实时采样、由 RM 或验证器打分构造新偏好对，用较低工程成本把 DPO 变为半在线方法 |
| **IPO**<br>`2023-10` | $\left(h_\theta - \dfrac{1}{2\tau}\right)^2$ | **Identity Preference Optimization**（Azar 等）：把对数 sigmoid 换成平方损失，把间隔锚定在有限目标 $\frac{1}{2\tau}$ 而非 $+\infty$，彻底解决确定性偏好下的过拟合 |
| **KTO**<br>`2024-02` | 好样本：$1 - \sigma\big(\beta(\log\frac{\pi_\theta}{\pi_{\text{ref}}} - z_0)\big)$<br>坏样本：$1 - \sigma\big(\beta(z_0 - \log\frac{\pi_\theta}{\pi_{\text{ref}}})\big)$ | **Kahneman-Tversky Optimization**（Ethayarajh 等）：借鉴前景理论（损失厌恶），**不再需要成对数据**，只需单条“点赞/点踩”二值反馈；$z_0$ 为批内 KL 参考点 |
| **SimPO**<br>`2024-05` | $-\log\sigma\!\left(\dfrac{\beta}{\vert y_w\vert}\log\pi_\theta(y_w\mid x) - \dfrac{\beta}{\vert y_l\vert}\log\pi_\theta(y_l\mid x) - m\right)$ | **Simple Preference Optimization**（Meng 等）：彻底**去掉参考模型 $\pi_{\text{ref}}$** 省一半显存；按长度 $\vert y\vert$ 归一平均对数似然以对齐推理排序并抑制长度偏差；$m$ 为目标间隔（原文记作 $\gamma$） |

::: tip 工程选型直觉：什么时候该用 DPO / SimPO，什么时候必须上在线 RL？
- **优先选 DPO / 迭代 DPO / SimPO**：算力预算有限、核心目标是对话风格/安全/格式对齐、手里已有高质量成对偏好或现成强 RM，希望用接近 SFT 的工程复杂度快速收效；
- **必须上在线 RL（GRPO 族）**：手握数学/代码/沙箱等可验证环境（RLVR），核心目标是突破复杂推理或多轮工具调用能力边界——离线方法看不到策略自己探索出的新轨迹，必然碰壁。
:::

那么，有没有一种方法既能保留在线 RL 强大的自我探索能力，又不必背负 PPO 沉重的四模型 Critic 包袱？下一章，我们进入真正引爆 2024–2026 推理革命的**无 Critic 时代：RLOO、REINFORCE++ 与 GRPO**。
