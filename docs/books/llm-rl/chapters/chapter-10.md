# 第 10 章 2026 新一代目标函数：MaxRL、GDPO 与 SDPO

<p class="chapter-summary">系统推导 2026 年最具代表性的三类目标与信号革新：把 RL 目标升级为最大似然 log p 的 MaxRL、解决多目标信息坍塌的 GDPO / GD²PO，以及把环境报错变成逐 token 策略梯度的自蒸馏 SDPO，并以二维全景图收束整个算法演进史。</p>

> **口径提示**：本章收录的前沿工作发布于 2026 年 1–6 月，论文效果提升数字均来源于原文作者自报结果，部分尚处于社区独立复现进程中；但其数学构造极为清晰，代表了后训练算法从“修补 GRPO 裁剪”迈向“重塑目标函数与信号密度”的明确转向。

<figure class="book-figure">
  <img src="/figures/llm-rl/maxrl-gdpo-sdpo.svg" alt="2026 年 MaxRL、GDPO 与 SDPO 三大创新对比" loading="lazy">
  <figcaption><span class="book-figure__label">图 10-1</span>2026 年三项标志性算法分别从“优化目标函数”“多目标优势归一化”与“逐 token 反馈密度”三个正交维度突破了标准 GRPO 的天花板。</figcaption>
</figure>

---

## 10.1 MaxRL：把二值 RL 目标换成最大似然 $\log p$

- **出处**：Tajwar, Salakhutdinov, Zanette 等（CMU 等），*Maximum Likelihood Reinforcement Learning*，2026-02，ICML 2026，arXiv `2602.02710`。

### 问题：最大化通过率 $p$ 为什么容易忽略难题、牺牲覆盖率？
在 0/1 可验证奖励下，标准 RL（REINFORCE / Dr.GRPO / RLOO）最大化的是单次采样通过率 $p(x) = \mathbb{E}_{y\sim\pi_\theta(\cdot\mid x)}[r(x,y)]$。

把视角换回监督学习：如果把“答对这道题”看作观测到的正确事件，最大似然（MLE）原则要求最大化的并不是概率 $p$ 本身，而是**对数似然 $\log p$**。对比两者的梯度：

$$
\nabla_\theta \log p = \frac{1}{p}\,\nabla_\theta p
$$

最大似然天然给通过率 $p$ 很低的**难题**乘上了 **$1/p$ 倍的放大权重**，而在已经几乎必对（$p\to 1$）的简单题上自然收缩更新幅度！

### 推导：$\log p$ 恰好是全部 $\text{pass@}k$ 的调和混合

将 $\log p$ 改写为 $\log\big(1 - (1 - p)\big)$，展开泰勒级数 $\log(1 - z) = -\sum_{k=1}^{\infty}\frac{z^k}{k}$：

$$
\log p = -\sum_{k=1}^{\infty}\frac{(1 - p)^k}{k} = -\sum_{k=1}^{\infty}\frac{\text{fail@}k}{k}
$$

其中 $\text{fail@}k = (1-p)^k$ 是独立采样 $k$ 次全部失败的概率，而 $\text{pass@}k = 1 - (1-p)^k$。对上式逐项求导，注意到 $\nabla_\theta\big[-(1-p)^k/k\big] = (1-p)^{k-1}\nabla_\theta p$，且 $\nabla_\theta\,\text{pass@}k = k(1-p)^{k-1}\nabla_\theta p$，立即得到一条惊艳的恒等式：

$$
\nabla_\theta \log p = \sum_{k=1}^{\infty} \frac{1}{k}\,\nabla_\theta\,\text{pass@}k
$$

**意义豁然开朗**：标准 RL 只保留了 $k = 1$ 这第一项（纯粹优化 pass@1），本质上只是最大似然的一阶粗略近似！**<a class="term-ref" href="/books/llm-rl/glossary#maxrl" title="MaxRL，最大似然强化学习：在二值奖励下以计算量索引阶数 M 逼近 log p 目标">MaxRL</a>** 定义了一族以截断阶数 $M$（原文记作 $T$，本书改用 $M$ 避免与序列长度冲突）索引的目标：
- $M = 1$ 时精确退化为标准 RL；
- $M \to \infty$ 时恢复完整最大似然 $\log p$。

### 估计量只改一行代码
对提示 $x$ 独立采样 $N$ 次，记成功条数为 $K = \sum_{i=1}^N r_i$。论文证明：当 $K \ge 1$ 时，**只在成功样本上求得分函数平均**，恰好就是截断到 $M = N$ 阶目标的无偏梯度估计！减去零均值控制变量（基线）以降低方差后：

$$
\hat g = \frac{1}{K}\sum_{i=1}^{N} r_i\,\nabla_\theta\log\pi_\theta(y_i\mid x)
\quad\xrightarrow{\text{减零均值控制变量}}\quad
\hat g = \sum_{i=1}^{N}\!\left(\frac{r_i}{K} - \frac{1}{N}\right)\nabla_\theta\log\pi_\theta(y_i\mid x)
$$

（注：实用版本在 $K=0$ 时直接丢弃该组而不做基线减法，此时严格对应 $M = N - 1$ 阶目标，见原文 §4.3。）

把括号里的权重除以 $1/N$ 改写成等价的优势形式（利用 $\bar r = K/N$）：

$$
\hat A_i^{\text{MaxRL}} = \frac{r_i - \bar r}{\bar r} \qquad (K \ge 1)
$$

- 和 Dr.GRPO（$r_i - \bar r$）或 GRPO（$(r_i - \bar r)/\operatorname{std}$）相比，**仅仅是把分母换成了组均值 $\bar r$**；
- 回到第 8 章交互组件切到“难题 $1/8$”即可看到：MaxRL 给唯一答对样本赋予了 $+7.00$ 的优势（是 Dr.GRPO 的 $8$ 倍、GRPO 的 $2.65$ 倍），而在“简单题 $7/8$”上对错答只给恒定 $-1.00$、对对答只给微小的 $+0.14$；
- 采样预算 $N$ 越大，截断阶数 $M$ 越高，目标越逼近 $\log p$，因此作者称之为“**以计算量为索引的目标族（Compute-Indexed Objective）**”。

作者在 Qwen3 系列数学推理上报告，MaxRL 在 $\text{pass@}k$ 覆盖率上**帕累托优于** GRPO 且 $\text{pass@}1$ 不降——从目标函数本身正面回应了第 12 章关于“标准 RL 是否只会锐化分布而牺牲覆盖率”的核心争论。

---

## 10.2 GDPO 与 GD²PO：多奖励先解耦归一化，再融合

- **出处**：Liu 等（NVIDIA），*GDPO: Group reward-Decoupled Normalization Policy Optimization*，2026-01，ICML 2026，arXiv `2601.05242`；后续工作 **GD²PO**，2026-06，arXiv `2606.16771`。

### 问题：先求和再标准化，把组合信息彻底压扁
真实工业后训练几乎从不只用单一奖励，而是同时叠加多个维度：答案正确性、格式合规、语言一致性、长度约束、工具调用语法等。GRPO 的习惯做法是先加权求和 $r_i = \sum_k w_k r_i^{(k)}$ 再做一次组内标准化。

看一个只需 2 条回复、2 个 0/1 奖励（格式分、正确分）的最小反例（表中使用总体标准差；样本标准差对应 $\pm 0.71$ 与 $\pm 1.41$，比例完全相同）：

| 回复 A、B 的（格式，正确） | 总奖励 $(r_A, r_B)$ | GRPO 先求和再标准化优势 | GDPO 先解耦再聚合优势 |
| --- | --- | --- | --- |
| $(0, 0)$ vs $(1, 0)$（仅多格式） | $(0, 1)$ | $-1,\; +1$ | $-1,\; +1$ |
| $(0, 0)$ vs $(1, 1)$（双项全胜） | $(0, 2)$ | **$-1,\; +1$（信息坍塌！）** | **$-2,\; +2$（清晰拉开）** |
| $(1, 0)$ vs $(1, 1)$（仅多正确） | $(1, 2)$ | $-1,\; +1$ | $-1,\; +1$ |

可以看到，GRPO 下“两项都满足”和“只满足了廉价格式分”拿到了**完全一模一样的优势信号**！只要组内存在差距，先求和再除以标准差会把幅度彻底抹平。

### GDPO 与 GD²PO 的做法
**<a class="term-ref" href="/books/llm-rl/glossary#gdpo" title="GDPO，组内奖励解耦归一化策略优化：对每个奖励维度分别做组内标准化后再加权与批归一化">GDPO</a>** 把顺序翻过来——**对第 $k$ 个奖励维度 $r^{(k)}$ 各自独立做组内标准化**，再按权重 $w_k$ 线性叠加，最后在整个 Batch 层面再做一次批归一化（使总优势方差不随奖励个数 $K$ 膨胀）：

$$
\hat A_i^{(k)} = \frac{r_i^{(k)} - \operatorname{mean}_j r_j^{(k)}}{\operatorname{std}_j r_j^{(k)}}, \qquad
\hat A_i^{\text{sum}} = \sum_{k} w_k\,\hat A_i^{(k)}, \qquad
\hat A_i = \frac{\hat A_i^{\text{sum}} - \operatorname{mean}_{\text{batch}}\hat A^{\text{sum}}}{\operatorname{std}_{\text{batch}}\hat A^{\text{sum}} + \eta}
$$

随后的 **GD²PO**（2026-06）更进一步指出：即便分项归一化，把多维优势压成单一标量时，若某条回复在一个维度正优势、另一维度强负优势（例如格式满分但答案大错），两股信号叠加后会相互抵消甚至给出误导方向，因此额外**检测并屏蔽多奖励方向冲突的回复**。

---

## 10.3 SDPO：用丰富反馈把模型自己变成逐 Token 老师

- **出处**：Hübotter, Krause 等（ETH Zürich 等），*Reinforcement Learning via Self-Distillation*，2026-01，arXiv `2601.20802`。

### 问题：把丰富报错压成 1 bit 是巨大的信息浪费
写代码跑测试挂了，沙箱其实吐出了完整的 Traceback 栈追踪、断言失败值甚至编译器行号；评委模型也写出了详尽的扣分理由。标准 RLVR 把这整段高信息量反馈 $f$ 扔进垃圾桶，只留一个 $r = 0$ 给几千个 token 平摊，信用分配极其低效。

### 做法：条件化自身作教师，反向 KL 自蒸馏
**<a class="term-ref" href="/books/llm-rl/glossary#sdpo" title="SDPO，自蒸馏策略优化：将环境反馈放入上下文让自身充当教师，逐 token 反向 KL 蒸馏给学生">SDPO（Self-Distillation Policy Optimization）</a>** 提出了一个拍案叫绝的对称结构：

在学生策略 $\pi_\theta(\cdot\mid x, y_{<t})$ 自己生成的轨迹 $y$ 上，把环境返回的文本反馈 $f$（编译报错、失败测试输出、评委评语，或在纯标量奖励下直接塞入同组里另一条**做对的回复**）放进同一模型的上下文，构造一个“开了上帝视角”的**自我教师** $\pi_\theta(\cdot\mid x, f, y_{<t})$，然后逐 token 最小化学生到教师的反向 KL（对教师侧施加停止梯度 $\operatorname{sg}$）：

$$
\mathcal{L}_{\text{SDPO}}(\theta) = \sum_{t=1}^{|y|} \mathbb{D}_{\mathrm{KL}}\Big[\,\pi_\theta(\cdot \mid x, y_{<t}) \;\Big\|\; \operatorname{sg}\big(\pi_\theta(\cdot \mid x, f, y_{<t})\big)\,\Big]
$$

### 推导：反向 KL 梯度严格等价于逐 Token 策略梯度

固定位置 $t$，简记学生分布 $p_t = \pi_\theta(\cdot\mid x, y_{<t})$，冻结教师分布 $q_t = \operatorname{sg}\big(\pi_\theta(\cdot\mid x, f, y_{<t})\big)$：

$$
\begin{aligned}
\nabla_\theta \mathbb{D}_{\mathrm{KL}}[p_t \,\|\, q_t]
&= \nabla_\theta \sum_{\hat y} p_t(\hat y)\big(\log p_t(\hat y) - \log q_t(\hat y)\big) \\
&= \sum_{\hat y}\nabla_\theta p_t(\hat y)\big(\log p_t(\hat y) - \log q_t(\hat y)\big) + \sum_{\hat y} p_t(\hat y)\,\frac{\nabla_\theta p_t(\hat y)}{p_t(\hat y)} \\
&= \mathbb{E}_{\hat y\sim p_t}\Big[\big(\log p_t(\hat y) - \log q_t(\hat y)\big)\,\nabla_\theta\log p_t(\hat y)\Big] + \underbrace{\nabla_\theta \sum_{\hat y} p_t(\hat y)}_{=\,\nabla_\theta 1 \,=\, 0}
\end{aligned}
$$

对损失 $\mathcal{L}_{\text{SDPO}}$ 做**梯度下降**（取负号），恰好等价于逐 token 的**策略梯度上升**，且每个位置 $t$、每个候选词 $\hat y$ 都自动获得了精确的**逐 Token 优势**：

$$
A_t^{\text{SDPO}}(\hat y) = \log\frac{\pi_\theta(\hat y \mid x, f, y_{<t})}{\pi_\theta(\hat y \mid x, y_{<t})}
$$

**直觉极其通透**：
- 看到报错反馈 $f$ 之后概率**大幅上升**的 token，就是“早该这么写”的修正点，获得强正优势；
- 看到报错反馈 $f$ 之后概率**骤降**的 token，就是真正闯祸的错误根源，精准获得强负优势；
- 与报错无关的正确前缀，学生与教师预测几乎一致，对数比接近 $0$，**不再被冤枉连坐！**

### 工程实现细节与效果
- **防坍缩正则**：除了停止梯度阻止教师向学生退化，实现中通常让教师参数取学生的 **EMA（指数滑动平均）** 或参考快照，并将 KL 替换为对称的 **JS 散度**，且仅在概率最高的 **Top-100 logits** 上计算以大幅节省显存；
- **混合使用**：可与序列级 GRPO 优势线性混合 $\lambda A^{\text{GRPO}} + (1-\lambda)A^{\text{SDPO}}$（论文实验取 $\lambda = 0.9$）；
- **效果与生态**：作者在科学推理、工具调用与 LiveCodeBench v6 上报告显著超越标准 RLVR 基线的样本效率与最终准确率；在单个难题上做测试时 SDPO（Test-Time SDPO），达到与 Best-of-$k$ 相同发现率所需尝试次数减少约 **3 倍**。Hugging Face TRL 已集成 SDPO 训练器，2026-05 的 *Restoring the Sweet Spot*（arXiv `2605.27765`）进一步提出了按通过率加权的自蒸馏改进。

---

## 10.4 全算法二维全景图：行业正走向哪里？

把前三篇讨论过的全部方法放进同一张“**数据来源（离线 → 在线）** × **信号密度（序列标量 → 逐 Token 稠密）**”的二维坐标系里，整个大模型后训练过去四年的演进轨迹一览无遗：

<figure class="book-figure">
  <img src="/figures/llm-rl/method-landscape-2d.svg" alt="后训练算法二维全景图：数据来源与信号密度演进方向" loading="lazy">
  <figcaption><span class="book-figure__label">图 10-2</span>从 SFT（离线+逐 token）出发，行业先经历 DPO（离线+序列）与 GRPO 族（在线+序列），而在 2026 年正通过 SDPO 与在线蒸馏 OPD 强劲汇聚向右上角“在线采样 + 逐 Token 稠密信号”的黄金象限。</figcaption>
</figure>

如果把第三篇压缩成四句话：
1. **PPO** 用独立 Critic 给出逐 token 优势，强但太重；
2. **DPO** 利用闭式解消去 RL 循环，轻但受困于离线分布偏移；
3. **GRPO 家族**（Dr.GRPO / DAPO / GSPO / CISPO）以组采样取代 Critic，释放了大规模 RLVR 推理红利；
4. **2026 新一代方法**（MaxRL / GDPO / SDPO / OPD）正在同步重塑目标函数本身与反馈信号密度，让在线学习重获逐 token 级的精准指导。

算法武器库已全部就绪。从下一篇开始，我们走进真实的大模型战场，看看这些算法如何炼出 o1、DeepSeek-R1、Kimi k1.5、Qwen3 与 DeepSeek-V4 这样的推理与全能模型。
