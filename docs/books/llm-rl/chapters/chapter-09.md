# 第 9 章 GRPO 的系统修正：Dr.GRPO、DAPO、GSPO 与 CISPO

<p class="chapter-summary">按“去偏、防熵坍缩与探索、序列级 MoE 稳定、保留分叉 token 梯度”四条主线，逐一拆解 2025 年围绕 GRPO 的四大里程碑改进，并给出覆盖 PPO 到 CISPO 的全算法对比矩阵。</p>

DeepSeek-R1 发布后，GRPO 迅速成为开源界和工业界复现推理模型的默认基线。但在 2025 年的密集大规模实验中，工程师们很快发现原始 GRPO 目标函数里潜伏着四类系统性问题：长度与难度隐性偏差、低概率探索 token 被过早剪死、MoE 架构下 token 级比率剧烈抖动，以及多次复用样本时关键反思 token 失去梯度。

2025 年诞生的四个代表性方法——**Dr.GRPO**、**DAPO**、**GSPO** 与 **CISPO**——就像四把精准的手术刀，分别改写了 GRPO 公式的四个不同部位。

<figure class="book-figure">
  <img src="/figures/llm-rl/grpo-variants-anatomy.svg" alt="GRPO 目标函数解剖与 2025 四大变体对照" loading="lazy">
  <figcaption><span class="book-figure__label">图 9-1</span>把 GRPO 目标函数拆为四个槽位：长度聚合分母、裁剪形式、重要性比粒度与优势标准化。Dr.GRPO、DAPO、GSPO、CISPO 的全部差异一目了然。</figcaption>
</figure>

---

## 9.1 Dr.GRPO：消除长度与难度的两个隐藏偏差

Liu 等（2025-03，*Understanding R1-Zero-Like Training: A Critical Perspective*，arXiv 2503.20783）逐项审视原始 GRPO 目标，指出其中埋着两处容易被忽视的系统性偏差：

### 偏差 1：序列级长度归一化 $\frac{1}{|y_i|}$ 诱发“错答越来越长”
在 GRPO 中，第 $i$ 条回复每个 token 分摊到的损失权重是 $\hat A_i / |y_i|$：
- 对于**正优势回复（$\hat A_i > 0$）**：回复越短，单个 token 拿到的正向梯度越大，于是模型偏好简短正确答案；
- 对于**负优势回复（$\hat A_i < 0$）**：回复越长，单个 token 分摊到的负惩罚 $|\hat A_i| / |y_i|$ 反而**越轻**！

数学上这制造了一个怪异的激励——**只要答错了，写得越啰嗦每个词挨的打越轻**。作者指出，R1-Zero 类复现实验中观察到的“生成长度随步数一路暴涨”，有一部分其实是这个数学偏差带来的伪增长，而非模型真正学会了深度思考。

### 偏差 2：除以标准差 $\operatorname{std}$ 制造难度偏差
二值奖励下，$\operatorname{std} = \sqrt{p(1-p)}$ 在极端难度（几乎全对 $p\to 1$ 或几乎全错 $p\to 0$）时趋近于 $0$，除以标准差把极端题目的梯度量级不成比例地放大，相比中等难度题目引入了额外权重失真。

### Dr.GRPO 的极简修正
去掉优势分母中的标准差，并将随回复长度变化的 $1/|y_i|$ 替换为全局常数（如最大生成长度 $L_{\max}$）：

$$
J_{\text{Dr.GRPO}}(\theta) = \mathbb{E}\Bigg[\frac{1}{G}\sum_{i=1}^{G}\frac{1}{L_{\max}}\sum_{t=1}^{|y_i|}\min\big(\rho_{i,t}\hat A_i,\;\operatorname{clip}(\rho_{i,t}, 1-\varepsilon, 1+\varepsilon)\,\hat A_i\big)\Bigg], \qquad \hat A_i = r_i - \bar r
$$

结合第 8 章的代数证明，去掉标准差后的 Dr.GRPO 在梯度方向上与无偏的 RLOO 严丝合缝，同时彻底移除了错误回复被拉长的隐性激励。

---

## 9.2 DAPO：面向长思维链 RLVR 的四项组合改进

字节跳动 Seed 与清华 AIR 提出的 **<a class="term-ref" href="/books/llm-rl/glossary#dapo" title="DAPO，解耦裁剪与动态采样策略优化：面向长 CoT RLVR 的四项 GRPO 改进">DAPO（Decoupled Clip and Dynamic sAmpling Policy Optimization）</a>**（Yu 等，2025-03，arXiv 2503.14476），在 Qwen2.5-32B 基座上用不到 R1-Zero 同等实验一半的训练步数在 AIME 2024 上达到 **50 分**。它打包了四项针对长思维链痛点的精准改动（并令 $\beta = 0$ 去掉 KL 约束，允许策略自由长出长推理分布）：

### 1. Clip-Higher（非对称解耦裁剪）
把对称的 $\varepsilon = 0.2$ 拆为 **$\varepsilon_{\text{low}} = 0.20$、$\varepsilon_{\text{high}} = 0.28$**。

为什么上界非要放宽、下界却必须守住？算一笔极其直观的数字账（可直接回到第 3 章交互组件验证）：
- 一个 $\pi_{\text{old}} = 0.90$ 的高概率高频词，哪怕按 $1+\varepsilon = 1.2$ 放行，也能轻松涨到概率天花板 $1.0$；
- 一个 $\pi_{\text{old}} = 0.01$ 的低概率探索词（例如触发思路转折的罕见推理词），即使拿到正优势，在 $\varepsilon = 0.2$ 下目标只允许它涨到 $0.012$（绝对涨幅仅 $+0.002$），几乎原地踏步！

结果就是对称裁剪系统性地压制低概率探索 token、只让原本就高概率的 token 越来越集中，迅速诱发**熵坍缩**（第 12 章）。把 $\varepsilon_{\text{high}}$ 抬升到 $0.28$ 为探索 token 释放了成长空间；同时保持 $\varepsilon_{\text{low}} = 0.20$ 不动，避免把负优势 token 的概率一把压死到 $0$。

### 2. 动态采样（Dynamic Sampling）
第 8 章指出，全对（$p=1$）或全错（$p=0$）的组优势全为零。随着训练推进，越来越多题目变成全对，导致每步真正贡献梯度的有效 Batch 骤缩、梯度方差变大。DAPO 在 Rollout 阶段过采样并**直接丢弃 $p=0$ 或 $p=1$ 的零方差组**，直到凑满固定数量的有效样本再做一次参数更新，稳住有效信噪比。

### 3. Token 级损失聚合
将 GRPO 的“先按序列平均再按组平均”改为**所有回复的所有 token 等权平均**：

$$
J_{\text{DAPO}}(\theta) = \mathbb{E}\Bigg[\frac{1}{\sum_{i=1}^{G}|y_i|}\sum_{i=1}^{G}\sum_{t=1}^{|y_i|}\min\big(\rho_{i,t}\hat A_{i,t},\;\operatorname{clip}(\rho_{i,t}, 1-\varepsilon_{\text{low}}, 1+\varepsilon_{\text{high}})\,\hat A_{i,t}\big)\Bigg]
$$

长回复中的每个 token 不再被 $1/|y_i|$ 稀释，因此长回复里出现的死循环重复、乱码等坏模式能够受到足额惩罚；优质长推理也能得到充分强化。

### 4. 超长奖励塑形（Overlong Reward Shaping）
直接把因触及 $L_{\max}$ 而被截断的回复一律判 $-1$ 噪音极大（有时模型思路全对，只差最后一行没写完）。DAPO 在截断上限前划出一段宽度为 $L_{\text{cache}}$ 的软缓冲带，线性施加长度惩罚：

$$
R_{\text{len}}(y) = \begin{cases}
0, & |y| \le L_{\max} - L_{\text{cache}} \\
\dfrac{(L_{\max} - L_{\text{cache}}) - |y|}{L_{\text{cache}}}, & L_{\max} - L_{\text{cache}} < |y| \le L_{\max} \\
-1, & |y| > L_{\max}
\end{cases}
$$

::: warning 注意细节分歧：标准差归一化要不要留？
DAPO 保留了 GRPO 的除以标准差 $\operatorname{std}$，与 Dr.GRPO 的结论恰好相反。这说明在大模型 RL 中，**部分精细归一化技巧对基座模型特性、题目难度分布与数据配比高度敏感**，没有绝对的“一键最优”，上线前务必在小规模对照消融中亲自验证。
:::

---

## 9.3 GSPO：用序列级几何平均比率稳住 MoE

Qwen 团队提出的 **<a class="term-ref" href="/books/llm-rl/glossary#gspo" title="GSPO，组序列策略优化：将重要性比与裁剪从 token 级提升至序列级几何平均">GSPO（Group Sequence Policy Optimization）</a>**（Zheng 等，2025-07，arXiv 2507.18071）直指一个更底层的理论裂缝：**单位失配（Unit Mismatch）**。

奖励 $r(x,y)$ 是给整条序列的，理论上重要性采样也应当在序列级进行；而 GRPO 沿用 PPO 的逐 token 比率 $\rho_{i,t}$，在每个具体位置 $t$ 实际上只有一个采样样本，token 比率起不到分布纠偏作用，反而随序列长度不断积累高方差噪声。

在 **MoE（混合专家）模型**上，这个裂缝会被灾难性放大：参数更新一步后，同一个 token 在新旧策略下可能被路由器分派给**完全不同的专家子网络**，造成个别位置 $\rho_{i,t}$ 瞬间剧烈跳变，直接引爆梯度。此前工程界只能依赖复杂的路由回放（Routing Replay，第 18 章）强行压制。

GSPO 干脆回归第一性原理，定义**按长度取几何平均的序列级重要性比** $g_i(\theta)$（原文记作 $s_i$，本书改用 $g_i$ 以免与状态 $s_t$ 冲突）：

$$
g_i(\theta) = \left(\frac{\pi_\theta(y_i\mid x)}{\pi_{\theta_{\text{old}}}(y_i\mid x)}\right)^{\!\frac{1}{|y_i|}} = \exp\!\left(\frac{1}{|y_i|}\sum_{t=1}^{|y_i|}\log\rho_{i,t}(\theta)\right)
$$

代入裁剪目标，裁剪粒度也随之从 token 级提升到**整条序列级**：

$$
J_{\text{GSPO}}(\theta) = \mathbb{E}\Bigg[\frac{1}{G}\sum_{i=1}^{G}\min\big(g_i(\theta)\hat A_i,\;\operatorname{clip}(g_i(\theta), 1-\varepsilon, 1+\varepsilon)\,\hat A_i\big)\Bigg]
$$

- **几何平均的意义**：把不同长度（从几百到数万 token）的序列比率拉齐到同一可比量级；不过因为取了全序列对数均值，数值波动远小于单个 token，因此 GSPO 的 **$\varepsilon$ 必须设小两个数量级**（论文采用 $10^{-4}$ 量级，如 $3\times 10^{-4}$ 与 $4\times 10^{-4}$）；
- **整条截断机制**：要么整条回复参与梯度更新，要么整条被裁剪掉，彻底平滑了单个 MoE token 路由切换带来的尖峰；
- **适用边界**：Qwen 报告 GSPO 的被裁剪 token 比例虽比 GRPO 高出两个数量级，训练效率与稳定性却显著更高，并应用于 Qwen3 系列训练；社区第三方复现普遍反馈它对 **MoE 大模型收益显著**，对中小稠密（Dense）模型收益则相对有限。

---

## 9.4 CISPO：裁剪权重本身，永不把反思 Token 的梯度截零

MiniMax-M1 技术报告（2025-06，arXiv 2506.13585）提出了另一条极具穿透力的观察：

在长思维链推理中，真正决定解题成败的往往是像 `"Wait"`、`"However"`、`"Recheck"`、`"Alternatively"` 这样触发回溯与反思的**低概率分叉 token**。它们在旧策略 $\pi_{\theta_{\text{old}}}$ 下概率极低，在同批数据的第一次 mini-batch 更新后，其比率 $\rho_{i,t}$ 立刻冲破 $1 + \varepsilon$。在传统 PPO / GRPO / DAPO 裁剪下，这些最关键的分叉 token 的梯度瞬间被截为 **0**，在后续全部 off-policy 更新步中彻底“失声”！

**<a class="term-ref" href="/books/llm-rl/glossary#cispo" title="CISPO，裁剪重要性权重策略优化：裁剪权重并加 stop-gradient，保留每个 token 的梯度">CISPO（Clipped IS-weight Policy Optimization）</a>** 换了一个看似极小却极其有效的写法——**不再裁剪目标曲线，而是直接裁剪重要性权重 $\hat\rho_{i,t}$ 并对权重施加停止梯度 $\operatorname{sg}(\cdot)$**：

$$
J_{\text{CISPO}}(\theta) = \mathbb{E}\Bigg[\frac{1}{\sum_{i=1}^G |y_i|}\sum_{i=1}^{G}\sum_{t=1}^{|y_i|}\operatorname{sg}\big(\hat\rho_{i,t}\big)\,\hat A_{i,t}\,\log\pi_\theta(y_{i,t}\mid x, y_{i,<t})\Bigg]
$$

$$
\hat\rho_{i,t} = \operatorname{clip}\big(\rho_{i,t},\; 1 - \varepsilon^{\text{IS}}_{\text{low}},\; 1 + \varepsilon^{\text{IS}}_{\text{high}}\big)
$$

对比求导后的逐 token 梯度，差异立判：
- **PPO / GRPO / DAPO 裁剪**：超出区间后梯度**直接清零**（要么全要，要么彻底丢弃）；
- **CISPO**：求导后每个 token 的梯度为 $\operatorname{sg}(\hat\rho_{i,t})\,\hat A_{i,t}\,\nabla_\theta\log\pi_\theta$——裁剪只封顶重要性权重的放大倍数以防方差爆炸，**每一个 token（包括关键反思词）都永远保留更新梯度！**

后续 Meta 消耗超 40 万 GPU 小时完成的 RL 扩展规律研究 **ScaleRL**（第 20 章）在大规模受控对比中发现，许多技巧只加快收敛速度而不抬高天花板，而把损失函数从 DAPO 式换成 **CISPO 式**，实实在在地抬高了最终渐近性能上限 $R_\infty$。

---

## 9.5 主流策略优化算法全景对比（2022–2025）

| 方法 | 需驻留模型 | 数据形态 | 优势 / 监督信号 | 比率与裁剪粒度 | 典型适用场景 |
| --- | --- | --- | --- | --- | --- |
| **PPO-RLHF** | 策略、价值、奖励、参考 | 在线 | GAE（价值函数） | token 级硬截零 | 通用对齐（2022–2023 主力） |
| **DPO** | 策略、参考 | 离线偏好对 | 隐式奖励之差 | 无 | 低成本离线偏好对齐 |
| **SimPO** | 策略 | 离线偏好对 | 长度归一似然之差 | 无 | 省显存偏好对齐 |
| **RLOO** | 策略、奖励（可选参考） | 在线 | 留一法均值基线 | 序列或 token | RLHF 与 RLVR 干净基线 |
| **GRPO** | 策略、奖励、参考 | 在线 | 组内 Z-score 标准化 | token 级对称裁剪 | RLVR 推理默认起点 |
| **Dr.GRPO** | 策略、奖励 | 在线 | 组内去均值（去 std） | token 级 + 常数 $L_{\max}$ 归一 | 去长度/难度偏差 RLVR |
| **DAPO** | 策略、奖励 | 在线 | 组内标准化 + 动态采样 | token 级非对称 Clip-Higher | 长思维链稠密模型 RLVR |
| **GSPO** | 策略、奖励 | 在线 | 组内标准化 | 序列级几何平均（$\varepsilon\sim 10^{-4}$） | **大规模 MoE 模型 RL** |
| **CISPO** | 策略、奖励 | 在线 | 组内标准化 | token 级裁剪权重、保留梯度 | 长 CoT、多步复用与高扩展上限 |

> 注：表中“奖励”指学习型奖励模型或确定性程序验证器；在纯 RLVR 场景下验证器运行于 CPU 沙箱，不占 GPU 显存。

2025 年的工作几乎把 GRPO 骨架上的每一个旋钮都拧到了极致。但进入 **2026 年**，研究者开始跳出裁剪与聚合的局部修补，直接向三个更根本的问题开火：**为什么非要最大化通过率 $p$ 而不是最大似然 $\log p$？多个异质奖励混合时怎么避免信息坍塌？1 bit 的 0/1 反馈能不能升级为逐 token 稠密监督？** 这正是下一章的主角——MaxRL、GDPO 与 SDPO。
