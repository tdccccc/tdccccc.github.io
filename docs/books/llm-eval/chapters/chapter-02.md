# 第 2 章 采样指标与生产可靠性：pass@k、pass^k 与 Arena 排名

<p class="chapter-summary">厘清似然指标（PPL / BPB / option logprob）与生成抽答的根本评估错位，严格证明无偏 pass@k、朴素代入 Jensen 偏差与连续可靠性 pass^k，并剖析 Bradley-Terry 排名与 Chatbot Arena 风格控制机制。</p>

就算你的测试集足够大、统计检验也滴水不漏，如果**选错了指标定义**，依然会把一个“演示惊艳但上线必炸”的模型推进生产。大模型与 Agent 评测中最容易偷换概念的三对口径，分别是“似然打分 vs 自由生成”、“探索上限 $\mathrm{pass@}k$ vs 连续可靠 $\mathrm{pass}^k$”以及“原始 Arena Elo vs 风格控制纯实力”。本章逐一拆透它们的数学本质与工程适用边界。

---

## 2.1 似然指标 vs 生成式抽答：为什么两套口径经常打架？

在预训练监控和早期公开榜单（如 `lm-evaluation-harness` 的默认多选题模式）里，似然类指标曾占据统治地位，但随着指令微调与长思维链推理模型的普及，似然口径与真实生成表现之间的裂痕越来越深。

### 从 PPL 到跨词表公平的 BPB

语言模型的困惑度 $\mathrm{PPL} = \exp\big(-\frac{1}{T}\sum_{t=1}^T \log p_{\mathcal{M}}(y_t\mid y_{<t})\big)$ 直接依赖分词器的切分 token 数 $T$：同一段中文文本，大词表分词器切出 100 个 token，小词表切出 180 个 token，二者的逐 token 困惑度根本不可横比。为了实现跨模型族的公平压缩率对比，现代预训练评测一律采用<a class="term-ref" href="/books/llm-eval/glossary#bpb" title="Bits-Per-Byte，按原始 UTF-8 字节数归一化的交叉熵损失，支持跨词表公平对比">每字节比特数（BPB）</a>：

$$
\mathrm{BPB} = \frac{-\sum_{t=1}^{T}\log_2 p_{\mathcal{M}}(y_t \mid y_{<t})}{B_{\text{UTF-8}}}
$$

其中 $B_{\text{UTF-8}}$ 为原始文本的 UTF-8 字节长度。BPB 与分词器无关，是衡量预训练语言建模压缩能力的黄金指标，但它依然只反映“背诵与续写分布拟合”，而非任务解决能力。

### Option Logprob 与生成式抽答（Generative Extraction）的四大错位

在 MMLU、ARC、C-Eval 等多选题上，工程界存在两种截然不同的跑法：<strong>选项似然比对（Option Logprob）</strong>直接比较模型在提示后生成 `A/B/C/D` 或选项正文的条件对数概率；<strong>生成式抽答（Generative Extraction）</strong>则允许模型自由输出完整推理过程并从末尾抽取最终答案。两套口径在后训练时代频繁得出相反排名，根源在于四重错位：

| 对比维度 | Option Logprob（似然比对） | Generative Extraction（生成抽答） | 工程错位后果 |
| --- | --- | --- | --- |
| **思维链支持** | 强迫模型在第 1 个 token 立即下注 | 允许生成长 CoT 与自我纠错 | 推理模型在 logprob 模式下实力被完全阉割 |
| **位置与长度偏见** | 易受选项字母先验与正文长短影响（需 `acc_norm`） | 仍受选项顺序影响，但可通过推理大幅削弱 | 仅改字节归一化方式即可让榜单排位互换 |
| **指令遵循与格式** | 跳过自由解码，完全遮蔽格式崩坏与过度拒答 | 完整暴露截断、答非所问与拒答行为 | 似然高分模型上线后可能无法输出合法 JSON |
| **后训练对齐税** | RLHF / RLVR 分布变尖常使原始 PPL/BPB 略微上升 | 真实任务准确率大幅跃升 | 若用 PPL 监控 RL 阶段会误判模型退化 |

**铁律**：预训练早期与底座缩放律实验用 **BPB**；只要涉及指令模型选型、推理模型评测或业务上线验收，一律必须使用**与线上一致的对话模板 + 生成式抽答**，严禁用 Option Logprob 替代真实生成。

---

## 2.2 无偏 $\mathrm{pass@}k$、Jensen 偏差证明与 $\mathrm{maj@}k$ 扩展

在代码生成、数学求解与带确定性验证器的探索任务中，单次贪心解码（$T = 0$）既波动大，又无法刻画模型在多次采样重试下的真实能力上限。记模型在某题上独立采样一次通过验证的真实概率为 $p$，则尝试 $k$ 次至少成功一次的理论值为 $\mathrm{pass@}k = 1 - (1 - p)^k$。

### 朴素代入为何系统性低估？（Jensen 不等式证明）

实际评测时，我们对单题以温度 $T > 0$ 采样 $n$ 次（$n \ge k$），观察到 $c$ 次通过，单次经验通过率为 $\hat p = c / n$。大量非正规代码库会直接把 $\hat p$ 代入理论式，算出朴素估计 $\widetilde{\mathrm{pass@}k} = 1 - (1 - \hat p)^k$。这是一个**严格有偏的错误公式**！

令 $f(x) = 1 - (1 - x)^k$。对任意 $k \ge 2$，其二阶导数 $f''(x) = -k(k - 1)(1 - x)^{k-2} < 0$ 在 $x \in [0, 1)$ 上严格为负，故 $f$ 是**严格凹函数**。由 **Jensen 不等式**，只要 $p \in (0, 1)$，随机变量 $\hat p = c/n$ 满足 $\mathbb{E}[\hat p] = p$，必有：

$$
\mathbb{E}\!\left[1 - (1 - \hat p)^k\right] \;<\; 1 - \big(1 - \mathbb{E}[\hat p]\big)^k \;=\; 1 - (1 - p)^k
$$

也就是说，**朴素代入恒定系统性低估真实 $\mathrm{pass@}k$**。以最简单的 $n = k = 2, p = 0.5$ 为例：理论 $\mathrm{pass@}2 = 1 - 0.5^2 = 75.0\%$；但 $c \in \{0, 1, 2\}$ 概率分别为 $\{0.25, 0.50, 0.25\}$，朴素公式给出的期望值为 $0.25\times 0 + 0.50\times 0.75 + 0.25\times 1 = 62.5\%$，平白压低了整整 <strong>−12.5 pp</strong>！

### Chen 等人（2021）无偏组合估计与数值防溢出写法

为消除上述偏差，Codex 论文引入了经典的<a class="term-ref" href="/books/llm-eval/glossary#pass_at_k" title="独立采样 k 次至少成功 1 次的概率，有限样本下采用无偏组合估计">无偏 $\mathrm{pass@}k$ 估计量</a>：

$$
\widehat{\mathrm{pass@}k} = 1 - \frac{\binom{n - c}{k}}{\binom{n}{k}} = 1 - \prod_{j=0}^{k-1}\frac{n - c - j}{n - j} \qquad (n - c < k \text{ 时取 } 1)
$$

<strong>无偏性精简证明（Rao-Blackwell 对称论证）</strong>：从 $n$ 次独立同分布采样中均匀随机抽取一个大小为 $k$ 的子集 $S$。因为任意 $k$ 次采样彼此独立，事件“$S$ 中至少含 1 次成功”的边缘概率恰好等于真实 $\mathrm{pass@}k = 1 - (1 - p)^k$；而在给定总成功数 $c$ 的条件下，该事件的条件概率正是 $1 - \binom{n-c}{k}/\binom{n}{k}$。由全期望公式，该估计量不仅严格无偏，而且是关于充分统计量 $c$ 的一致最小方差无偏估计（UMVUE）。回到刚才 $n = k = 2, p = 0.5$ 的例子，当 $c = 0, 1, 2$ 时无偏估计分别输出 $0, 1, 1$，期望恰好为 $0.750$；而在更现实的 $n = 20, c = 4, k = 5$ 场景下，朴素代入给出 $67.23\%$，无偏公式给出 $1 - \frac{16\cdot 15\cdot 14\cdot 13\cdot 12}{20\cdot 19\cdot 18\cdot 17\cdot 16} = 71.83\%$，单题差距达 $+4.60\text{ pp}$。工程上建议采样总数至少满足 $n \ge 2k$（测低方差 $\mathrm{pass@}1$ 时常取 $n = 8\text{–}16$），并始终采用连乘形式避免大阶乘整数溢出。

### $\mathrm{maj@}k$（Self-Consistency）与无验证器测试时扩展

$\mathrm{pass@}k$ 隐含了一个强前提：**系统拥有廉价且零假阳性的外部验证器**（如编译器、单元测试），能从 $k$ 个候选中精准挑出唯一正确的解。若缺少外部验证器（如开放数学竞赛题或无单测推理），只能用<a class="term-ref" href="/books/llm-eval/glossary#maj_at_k" title="对同一题目采样 k 条推理路径并对最终答案多数投票的准确率指标">多数投票（$\mathrm{maj@}k$ / Self-Consistency）</a>，取 $k$ 次采样中频次最高的最终答案作为输出。

$\mathrm{maj@}k$ 是衡量测试时计算扩展收益的关键标尺（联动[《LLM 强化学习》专题 C](/books/llm-rl/topics/test-time-compute)），但存在一条犀利的相变界线：只有当正确答案本身是模型输出分布的**唯一众数**（$p_{y^\star} > \max_{w \neq y^\star} p_w$）时，增大 $k$ 才会把准确率推向 $100\%$；一旦模型陷入系统性误解（某个错误答案占比高于正确答案），加大采样数反而会把 $\mathrm{maj@}k$ 稳步拉向 $0\%$，此时只有外部验证器或过程奖励（PRM）才能撬动 $\mathrm{pass@}k$ 的红利。

---

## 2.3 生产可靠性的照妖镜：$\tau$-bench 的 $\mathrm{pass}^k$ 剪刀差

把视线从代码补全切回**无人兜底的生产多轮 Agent**（例如自动退款、工单审批、线上数据库变更）：线上没有单元测试替用户重跑 5 遍，用户也不会容忍“每 4 次操作炸 1 次”。Yao 等人在 $\tau$-bench（2024）中提出了直击工业界痛点的<a class="term-ref" href="/books/llm-eval/glossary#pass_hat_k" title="衡量模型对同一任务连续独立执行 k 次且全部成功的生产可靠性指标">连续成功可靠性指标 $\mathrm{pass}^k$</a>——对同一任务独立执行 $k$ 次**全部成功**的概率（理论值 $p^k$）：

$$
\widehat{\mathrm{pass}^k} = \frac{\binom{c}{k}}{\binom{n}{k}} = \prod_{j=0}^{k-1}\frac{c - j}{n - j} \qquad (c < k \text{ 时取 } 0)
$$

与 $\mathrm{pass@}k$ 形成镜像对称：由于 $g(x) = x^k$（$k \ge 2$）是严格凸函数，直接代入 $(c/n)^k$ 会因 Jensen 不等式**系统性高估**真实可靠性，必须采用上述超几何无偏估计。下面这张表揭示了 $\mathrm{pass@}k$ 与 $\mathrm{pass}^k$ 之间触目惊心的剪刀差（末列向上取整至一位小数，以严格保证 $p^k \ge 80.0\%$）：

| 尝试/连续次数 $k$ | $p = 0.75$ 的 $\mathrm{pass@}k$ | $p = 0.75$ 的 $\mathrm{pass}^k$ | $p = 0.90$ 的 $\mathrm{pass}^k$ | 生产级 $\mathrm{pass}^k \ge 80\%$ 所需单次率 $p$ |
| --- | --- | --- | --- | --- |
| **$k = 1$** | 75.0% | 75.0% | 90.0% | 80.0% |
| **$k = 2$** | 93.8% | 56.3% | 81.0% | 89.5% |
| **$k = 4$** | 99.6% | 31.6% | 65.6% | 94.6% |
| **$k = 5$** | <strong>99.9%</strong> | <strong>23.7%</strong> | 59.0% | 95.7% |
| **$k = 8$** | 99.998% | <strong>10.0%</strong> | <strong>43.0%</strong> | <strong>97.3%</strong> |

<figure class="book-figure">
  <img src="/figures/llm-eval/passk-vs-passhatk.svg" alt="探索上限 pass@k 与生产可靠性 pass^k 随 k 分岔剪刀差及适用场景对照" loading="lazy">
  <figcaption><span class="book-figure__label">图 2-1</span>同一单次通过率 p=0.75 下的冰火两重天：pass@5 高达 99.9%，而 pass^5 跌至 23.7%，k=5 剪刀差达 76.2 pp；对比 pass^k 与 (pass^1)^k 还可诊断失败根源。</figcaption>
</figure>

更进一步，跨全集 $N$ 道异质任务取平均时，由凸性恒有 $\frac{1}{N}\sum_{i=1}^N p_i^k \ge \big(\frac{1}{N}\sum_{i=1}^N p_i\big)^k$。这一不等式赋予了 $\mathrm{pass}^k$ 极强的**故障诊断价值**：
- 若实测全集平均 $\mathrm{pass}^k \gg (\mathrm{pass}^1)^k$（例如单次均值 50%，而 $\mathrm{pass}^5$ 仍维持在 45%）：说明任务呈两极分化——一半任务模型稳过（$p_i \approx 1$），另一半稳定失败（$p_i \approx 0$），根因是**能力或工具知识短板**；
- 若 $\mathrm{pass}^k \approx (\mathrm{pass}^1)^k$（单次 50% 暴跌至 $\mathrm{pass}^5 \approx 3\%$）：说明每道题都在随机摇骰子，根因是**执行抖动、工具参数不稳或长上下文注意力漂移**，必须优先降采样方差并加固脚手架确定性护栏（第 8 章）。

<EvalPassKWidget />

---

## 2.4 Bradley-Terry 排名、Arena Elo 与 Style Control 剥离

当评测从可验证任务走向开放对话与通用助手时，单点绝对分极易漂移，业界主流转向基于匿名人类成对盲测的 Chatbot Arena 排名体系。其数学内核并非国际象棋里的在线增量更新 Elo，而是无视对战次序的静态<a class="term-ref" href="/books/llm-eval/glossary#bradley_terry_elo" title="用潜实力差经逻辑斯蒂函数拟合人类成对盲测胜率并换算为 Arena Elo 的排名模型">Bradley-Terry（BT）模型</a>：为每个模型 $m$ 赋予潜实力参数 $S_m$，规定模型 $A$ 击败模型 $B$ 的概率为逻辑斯蒂函数，经极大似然估计（MLE）拟合全部对战日志后线性映射到 Elo 标度：

$$
P(A \succ B) = \sigma(S_A - S_B) = \frac{1}{1 + e^{-(S_A - S_B)}}, \qquad
R_A = \frac{400}{\ln 10}\,S_A + R_0 \approx 173.72\,S_A + 1000
$$

这一标度下，分差 $\Delta R = R_A - R_B$ 与胜率精确对应：$\Delta R = 400$ 对应 $10:1$ 胜算（$90.9\%$ 胜率）；$\Delta R = 100$ 对应 $64.0\%$ 胜率；而榜单头条经常大肆渲染的 $\Delta R = 20$ Elo，**其实仅对应 52.9% 的微弱胜率**！因此，Arena 官方必须对全部对战样本执行 1,000 轮 Bootstrap 重采样，同时给出每个模型的 95% Elo 置信区间与名次波动区间——只要两模型区间重叠，无论谁排第 1、谁排第 2，统计学上均属并列。

### Style Control：剥离“话多排版美”的协变量虚高

LMSYS 团队在 2024 年对 Arena 历史数据做归因分析时发现了一个极具颠覆性的现象：大众匿名评审存在强烈的**长度与 Markdown 排版偏见**——即便实质正确性相同，回复更长、带多级标题、加粗关键词和项目列表的模型，胜率也会显著飙升。为防止模型靠“写小作文”刷榜，Arena 引入了<a class="term-ref" href="/books/llm-eval/glossary#style_control" title="在 Bradley-Terry 回归中剥离回复长度、Markdown 标题与列表密度等风格协变量的去偏方法">风格控制（Style Control）</a>回归：

$$
P(A \succ B \mid \mathbf{x}_{AB}) = \sigma\!\Big(S_A - S_B + \mathbf{w}^\top (\mathbf{f}_A - \mathbf{f}_B)\Big)
$$

其中 $\mathbf{f}_A - \mathbf{f}_B$ 编码了双方回复的标准化 token 长度差、Markdown 标题数差、加粗数量差与列表项密度差。联合拟合 $(\mathbf{S}, \mathbf{w})$ 后，风格权重向量 $\mathbf{w}$ 显著为正；再令 $\mathbf{f}_A = \mathbf{f}_B$ 读取纯内容潜实力 $S_A$，相当于强行要求“假设两模型回复一样长、排版一样精美，谁的内容更强”。

<figure class="book-figure">
  <img src="/figures/llm-eval/arena-bt-style-control.svg" alt="Chatbot Arena Bradley-Terry 拟合与 Style Control 剥离长度和排版协变量机制" loading="lazy">
  <figcaption><span class="book-figure__label">图 2-2</span>带协变量的 Bradley-Terry 回归将人类投票拆解为纯内容实力与风格红利两部分；开启 Style Control 后，依靠冗长排版取胜的模型 Elo 明显回落，高信息密度模型排位跃升。</figcaption>
</figure>

::: warning 别把 Arena 综合榜当成企业业务选型圣经
即便开启了 Style Control，公开 Arena 仍受限于三大结构边界：(1) 众包用户提问高度偏重单轮闲聊、创意写作与浅层问答，严重欠代表企业多轮工具调用、私域 RAG 与长周期代码修复；(2) 缺乏客观事实核查，流畅自信的幻觉常常在盲测中击败谨慎简短的正确答案；(3) 热门新模型常面临刷票与分布偏移。正确用法是将 Arena 作为**通用对话流畅度粗筛参考**，最终选型必须交给贴合业务的私有评测集与下一章要讲的校准判分器。
:::

搞清楚了采样指标与盲测排名后，紧接着的核心工程瓶颈浮出水面：每一道题的对错到底由谁来判？下一章我们将深入确定性验证器的隐藏漏洞，并推导如何用 **Rogan-Gladen 公式** 把充满偏见的 LLM-as-a-Judge 校准为可信的统计标尺。
