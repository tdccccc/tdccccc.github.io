# 第 1 章 评测测量学与统计显著性

<p class="chapter-summary">确立评测在选型、后训练指南针（与 RLVR 奖励互为镜像）和上线闸门中的三重角色，拆解四大测量失效模式，并系统推导配对 Bootstrap、McNemar 检验、MDE 样本量账本与聚类标准误。</p>

大模型研发界有一句屡试不爽的警句：**没有置信区间的评测分数不是证据，只是噪声的精装版**。在 100 道测试题上宣布新版本比基线“涨了 1.2 个百分点”，在统计学上和抛硬币决定是否发布几乎没有区别。本章不急于讨论任何具体基准榜单，而是先把“评测”当作一门精密测量工程来立规矩——看清评测在工程全生命周期里承担什么职责、分数里的误差从哪里来，以及怎样用严谨的配对检验与聚类修正把真实涨点和随机抖动彻底分开。

---

## 1.1 三重角色与观测分数的四项误差分解

在大模型与 Agent 研发流水线中，评测远非“发版前跑一次榜单”的装饰环节，而是承担着彼此联动的三重工程角色：

1. <strong>底座选型与路由标尺（Selection）</strong>：在多家族模型之间横向对比知识、推理、长上下文、工具调用与安全边界，结合单任务成本与延迟绘制<a class="term-ref" href="/books/llm-eval/glossary#pareto_frontier" title="在质量、成本与延迟多维空间中不存在被全面碾压方案的最优折中集合">帕累托前沿</a>（第 15 章）。这一角色要求跨模型族绝对公平、无数据污染。
2. <strong>训练与迭代指南针（Training Compass）</strong>：在 SFT、RLHF、RLVR 后训练与 Agent 脚手架重构过程中，持续指导数据配比、超参搜索与早停。特别地，**离线可验证评测与 RLVR 奖励信号在数学上互为镜像**——[《LLM 强化学习》](/books/llm-rl/)第 5 章用于给 GRPO/DAPO 轨迹打分的数学符号验证器、代码单测与环境终态断言，本质上就是把高信噪比评测器前置到了训练循环内部。
3. <strong>上线闸门与回归防线（Release Gate）</strong>：在 CI/CD 流水线中阻断 Prompt 改动、工具 Schema 调整、模型量化或跨芯片迁移引发的隐性精度回退（第 19 章、专题 C）。这一角色极度强调可复现性与生产连续可靠性。

无论服务哪一种角色，我们在报表上看到的任何观测分数 $\hat S(\mathcal{M}, \mathcal{H})$（底层模型 $\mathcal{M}$ 与<a class="term-ref" href="/books/llm-eval/glossary#scaffold" title="包裹在底层 LLM 之外的系统提示词、工具封装、规划循环与上下文管理逻辑">脚手架</a> $\mathcal{H}$ 的联合表现），都严格服从全书统一的四项误差分解：

$$
\hat S(\mathcal{M}, \mathcal{H}) \;=\; \underbrace{S^\star(\mathcal{M}, \mathcal{H})}_{\text{真实能力信号}} \;+\; \underbrace{\delta_{\text{judge}}}_{\text{判分器系统偏差}} \;+\; \underbrace{\delta_{\text{env}}}_{\text{环境与基建噪声}} \;+\; \underbrace{\epsilon_{\text{sample}}}_{\text{有限题量与聚类方差}}
$$

<figure class="book-figure">
  <img src="/figures/llm-eval/eval-lifecycle-roles.svg" alt="评测的三重工程角色与观测分数四项误差分解" loading="lazy">
  <figcaption><span class="book-figure__label">图 1-1</span>评测贯通底座选型、RLVR 训练指南针与上线闸门三大环节，线上失败轨迹反向沉淀为黄金集；任何观测分数均由真实信号、判分偏差、环境噪声与抽样方差叠加而成。</figcaption>
</figure>

全书后续章节正是逐项消灭这三类误差：第 1–2 章控制 $\epsilon_{\text{sample}}$ 并校准采样口径；第 3–4 章治理 $\delta_{\text{judge}}$ 与数据污染；第 13–14 章把模板截断、沙箱漂移与 `infra_error` 混入等 $\delta_{\text{env}}$ 压到零。

---

## 1.2 四大典型测量失效模式

当团队忽视测量学底座时，评测系统往往以四种隐蔽方式失效，让数周研发投入颗粒无收：

| 失效模式 | 本质机理 | 典型工程症状 | 治本对策 |
| --- | --- | --- | --- |
| <strong><a class="term-ref" href="/books/llm-eval/glossary#validity_reliability" title="效度衡量测得对不对，信度衡量反复运行是否稳定一致">效度失真</a>（Low Validity）</strong> | 代理指标未测到真实业务能力 | 用多选题 logprob 或 MMLU 选客服 Agent 底座，上线后多轮工具调用频繁崩坏 | 贴近线上轨迹构建业务黄金集，采用<a class="term-ref" href="/books/llm-eval/glossary#final_state_assertion" title="直接检查任务结束后数据库、文件系统或测试退出码等环境终态的判分方式">终态断言</a> |
| <strong>信度崩塌（Low Reliability）</strong> | 采样温度、并发限流或裁判漂移导致噪声淹没信号 | 同一模型连跑两次分数波动 $\pm 3\text{ pp}$，超过版本间真实差异 | 固定种子/多次采样均值、隔离 `infra_error`、校准评委 |
| <strong><a class="term-ref" href="/books/llm-eval/glossary#ceiling_effect" title="基准过易导致强模型扎堆在 95%–99% 顶端区间而失去区分度">天花板效应</a>（Ceiling Effect）</strong> | 基准过易导致强模型挤在 95%–99% 饱和区 | GSM8K / HumanEval 头部模型差距不足 0.5 pp，少数标注错题即可颠倒排名 | 升级动态难题（第 4 章）或引入 IRT 高区分度选题（专题 B） |
| <strong><a class="term-ref" href="/books/llm-eval/glossary#goodhart_law" title="当一项度量指标本身变成优化目标时，它就不再是一个好的度量指标">Goodhart 异化</a></strong> | 优化压力沿着代理指标的漏洞疯狂钻营 | 刷长回复骗 LLM Judge、过拟合公开题库，离线分节节高升而线上客诉翻倍 | 严守密封留存集轮换，双轨监控代理分与真实业务指标 |

Goodhart 异化在后训练阶段尤为致命：正如[《LLM 强化学习》第 6 章](/books/llm-rl/chapters/chapter-06)所剖析的奖励过优化曲线，当策略偏离参考分布过远，代理奖励模型或弱验证器分数会单调虚高，而真实质量在越过拐点后掉头暴跌。把评测当“指南针”而非“刷分靶子”的唯一方法，是把**研发迭代集**与**密封验收集**严格物理隔离（第 4 章）。

---

## 1.3 同题配对降方差：Paired Bootstrap 与 McNemar 检验

比较模型 $A$ 与模型 $B$ 在同一份 $N$ 题评测集上的表现时，最常见也最昂贵的统计错误是**把两模型视作独立样本**直接做双样本 $t$ 检验或对比各自误差棒是否重叠。

记两模型在第 $i$ 题上的得分为 $s_i^A, s_i^B$，同题得分差 $d_i = s_i^B - s_i^A$，平均分差 $\bar d = \frac{1}{N}\sum_{i=1}^N d_i$。若两模型在相同题目上的得分相关系数为 $\rho_{AB}$，则配对差值与非配对差值的标准误之比由协方差项直接决定：

$$
\mathrm{SE}_{\text{unpaired}} = \sqrt{\frac{\sigma_A^2 + \sigma_B^2}{N}}, \qquad
\mathrm{SE}_{\text{paired}} = \frac{s_d}{\sqrt{N}} = \sqrt{\frac{\sigma_A^2 + \sigma_B^2 - 2\rho_{AB}\sigma_A\sigma_B}{N}}
$$

现实评测集里，一道难题通常两个模型都容易错，一道送分题两个模型都容易对，因此同题相关性极强（跨模型族常达 $\rho_{AB} \approx 0.45\text{–}0.65$，同底座调 Prompt 或 RL 检查点迭代甚至高达 $0.75\text{–}0.90$）。当 $\sigma_A \approx \sigma_B$ 时，配对方差缩减系数为 $1 - \rho_{AB}$——当 $\rho_{AB} = 0.80$ 时，等价于**不花一分钱把测试集题量免费扩大 5 倍**！

### 两种工业标准配对检验

1. <strong><a class="term-ref" href="/books/llm-eval/glossary#paired_bootstrap" title="以题目为单位有放回重采样并成对计算两模型差值分布的非参数检验方法">配对自助法（Paired Bootstrap）</a></strong>：通用于二值 $\{0,1\}$、连续分 $[0,1]$ 乃至多维加权总分。每轮 $b = 1,\dots,B$（工程取 $B = 10{,}000$），从题目索引 $\{1,\dots,N\}$ 有放回抽取 $N$ 个索引构成重采样集 $\mathcal{I}_b$，成对计算 $\bar d^{(b)} = \frac{1}{N}\sum_{i\in\mathcal{I}_b}(s_i^B - s_i^A)$。取 $\{\bar d^{(b)}\}$ 的 $2.5\%$ 与 $97.5\%$ 分位数即得 95% 置信区间；若区间完全位于 0 的同一侧，则在 $\alpha = 0.05$ 水平下统计显著。
2. <strong><a class="term-ref" href="/books/llm-eval/glossary#mcnemar_test" title="专门针对同题库二值配对结果的精确或卡方检验，仅依赖两模型意见分歧题数">McNemar 检验</a></strong>：专为二值（对/错）评测集设计。将 $N$ 道题填入 $2\times 2$ 配对列联表——同对 $n_{11}$、同错 $n_{00}$、仅 $A$ 对 $n_{10}$、仅 $B$ 对 $n_{01}$。同对与同错题不携带相对胜负信息，在原假设 $H_0: p_A = p_B$ 下，条件于分歧总数 $n_d = n_{10} + n_{01}$，有 $n_{01} \sim \mathrm{Bin}(n_d, 0.5)$。大样本（$n_d \ge 25$）采用带 Edwards 连续性修正的卡方统计量，小样本（$n_d < 25$）直接求精确双侧二项概率：

$$
\chi^2_{\text{McNemar}} = \frac{(\max(0,\,\lvert n_{10} - n_{01} \rvert - 1))^2}{n_{10} + n_{01}} \;\sim\; \chi^2_1
$$

### 完整数值算例：为何“肉眼误差棒重叠”错杀了真实涨点

假设在 $N = 300$ 道代码题上，基线模型 $A$ 通过 210 题（$\hat p_A = 70.0\%$），候选模型 $B$ 通过 225 题（$\hat p_B = 75.0\%$），表面提升 $\Delta = +5.0\text{ pp}$。配对列联表为 $n_{11} = 195$、$n_{10} = 15$、$n_{01} = 30$、$n_{00} = 60$。

- **误用非配对检验**：$\sigma_A^2 = 0.70 \times 0.30 = 0.21$，$\sigma_B^2 = 0.75 \times 0.25 = 0.1875$，算得 $\mathrm{SE}_{\text{unpaired}} = \sqrt{(0.21 + 0.1875)/300} = 3.64\text{ pp}$。95% 置信区间为 $+5.0 \pm 7.13\text{ pp} = [-2.13, +12.13]\text{ pp}$，$z = 1.37, p = 0.17$，结论竟是“不显著”！
- **正确同题配对检验**：同题协方差为 $\frac{195}{300} - 0.70 \times 0.75 = 0.125$，对应 $\rho_{AB} = 0.630$。配对差值样本方差 $s_d^2 = \frac{300}{299}(0.15 - 0.05^2) = 0.1480$，于是 $\mathrm{SE}_{\text{paired}} = \sqrt{0.1480/300} = 2.22\text{ pp}$（方差直接压缩 $2.69\times$）。95% 置信区间收窄为 $[+0.65, +9.35]\text{ pp}$，$z = 2.25, p = 0.024 < 0.05$，显著胜出！
- **交叉验证 McNemar**：仅看 $n_d = 15 + 30 = 45$ 道分歧题，$\chi^2_{\text{McNemar}} = (|15 - 30| - 1)^2 / 45 = 196 / 45 = 4.356 > 3.841$（$p = 0.037$，精确二项检验 $p = 0.036$），与配对自助法结论完全一致。

---

## 1.4 MDE 样本量账本：你的评测集到底能看清多小的涨点？

工程排期前最该先算清的一笔账是<a class="term-ref" href="/books/llm-eval/glossary#mde" title="Minimum Detectable Effect，给定题量、显著性水平与统计功效下可稳定检测的最小真实分差">最小可检测效应（MDE）</a>：在双侧显著性 $\alpha = 0.05$（$z_{0.975} = 1.96$）与统计功效 $1 - \beta = 80\%$（$z_{0.80} = 0.84$）下，需要多大的真实分差 $\Delta$ 才能稳定检出，或者反向计算检测目标涨点 $\Delta$ 至少需要多少独立题目：

$$
\mathrm{MDE} \approx (z_{1-\alpha/2} + z_{1-\beta})\,\mathrm{SE}_{\text{paired}} \approx 2.80\,\frac{\sigma_d}{\sqrt{N}}, \qquad
N_{\text{req}} \approx \left(\frac{2.80\,\sigma_d}{\Delta}\right)^2
$$

在最保守的中位难度 $p \approx 0.50$（$\sigma_A = \sigma_B = 0.50$，$\sigma_d = \sqrt{0.5(1-\rho_{AB})}$）下，常见题量对应的 MDE 账本如下：

| 独立题量 $N$ | 典型基准量级对照 | 非配对 ($\rho = 0$) | 跨家族配对 ($\rho = 0.50$) | 同底座迭代配对 ($\rho = 0.80$) |
| --- | --- | --- | --- | --- |
| **30** | 单年 AIME（30 题） | 36.1 pp | 25.6 pp | **16.2 pp**（约 5 题） |
| **100** | 迷你冒烟集 / 人工精测集 | 19.8 pp | 14.0 pp | **8.9 pp** |
| **300** | 中型垂直业务黄金集 | 11.4 pp | 8.1 pp | **5.1 pp** |
| **1,000** | GSM8K / 完整回归集 | 6.3 pp | 4.4 pp | **2.8 pp** |
| **3,000** | 大规模全量验收集 | 3.6 pp | 2.6 pp | **1.6 pp** |

一张表就能戳破无数技术报告里的泡沫：单年 AIME 只有 30 道题，即便在极强配对（$\rho = 0.80$）下，低于 16 pp 的单次差值也根本达不到 80% 统计功效（必须多轮独立采样平均或合并多届试题）；而如果想稳健测出 **1.0 pp** 的微弱改进，即便 $\rho = 0.80$ 也至少需要 $N_{\text{req}} \approx (2.80 \times \sqrt{0.1} / 0.01)^2 = 7{,}840$ 道独立题目！

<EvalStatsPowerWidget />

---

## 1.5 聚类标准误（Clustered SE）与设计效应 DEFF

配对检验帮我们把**被高估的误差棒**收紧了；但评测中同样普遍存在反向陷阱——**把不独立的题目当成独立样本，导致误差棒被人为压窄 1.5–3 倍，制造铺天盖地的假阳性涨点**。

当多道子题共享同一篇长文档（阅读理解/RAG）、同一个代码仓库（SWE-bench 同一 repo 的多个 Issue）、同一个提示模板或同一组工具环境时，同簇内题目的得分存在正的组内相关系数 $\mathrm{ICC} > 0$：只要模型对这篇文档的领域术语不熟或对该仓库构建环境水土不服，簇内 20 道题会“一损俱损”。

设 $N$ 道题聚在 $G_c$ 个独立簇内，簇均题数 $\bar m = N / G_c$，每簇的中心化得分和为 $Y_g = \sum_{i \in g}(s_i - \bar s)$（对比两模型时替换为 $d_i - \bar d$）。采用 Liang-Zeger 簇汇总三明治形式计算的<a class="term-ref" href="/books/llm-eval/glossary#clustered_se" title="针对共享文档、仓库或对话模板的分组题目按聚类层级计算的修正标准误">聚类标准误（Clustered SE）</a>及其与朴素 i.i.d. 标准误的膨胀关系（设计效应 $\mathrm{DEFF}$）为：

$$
\mathrm{SE}_{\text{cluster}} = \sqrt{\frac{G_c}{G_c - 1}\cdot\frac{1}{N^2}\sum_{g=1}^{G_c} Y_g^2} \;\approx\; \mathrm{SE}_{\text{iid}}\cdot\sqrt{\mathrm{DEFF}}, \qquad
\mathrm{DEFF} = 1 + (\bar m - 1)\,\mathrm{ICC}
$$

**数值直觉**：某企业长文档 QA 评测集共有 $N = 500$ 题，但它们仅来自 $G_c = 25$ 份业务合同（$\bar m = 20$），实测簇内相关性 $\mathrm{ICC} = 0.30$。此时设计效应 $\mathrm{DEFF} = 1 + (20 - 1)\times 0.30 = 6.70$，**有效独立题量骤缩至 $N_{\text{eff}} = N / \mathrm{DEFF} \approx 74.6$ 题**！真实标准误比朴素公式宽出 $\sqrt{6.70} = 2.59$ 倍——（以 $p \approx 72\%$ 为例）把原本 $\pm 5.2\text{ pp}$ 的真实标准误（对应 95% 置信区间 $\pm 10.2\text{ pp}$）误报成 $\pm 2.0\text{ pp}$（95% 置信区间虚假缩水至 $\pm 3.9\text{ pp}$）。

<figure class="book-figure">
  <img src="/figures/llm-eval/paired-vs-unpaired-power.svg" alt="同题配对降方差、MDE 曲线与聚类标准误膨胀三合一对比" loading="lazy">
  <figcaption><span class="book-figure__label">图 1-2</span>统计功效的三大杠杆：左图给出不同配对相关性 ρ 下的 MDE 衰减；右上展示 N=300 算例中配对如何挽救假阴性；右下揭示忽略文档聚类会让 95% CI 虚假缩水 2.59 倍。</figcaption>
</figure>

::: tip 工程黄金法则：按独立单元做 Block Bootstrap
当你在写评测统计脚本时（参考 [最小可运行 Python 评测工具箱](/books/llm-eval/toolkit/reference-code)），请遵循一条极简铁律：**重采样单元必须等于最大独立聚类单元**。若每题独立，按题做 Paired Bootstrap；若多题共享文档、代码仓或用户会话，则以“文档/仓库/会话”为单位整簇有放回抽样（Clustered Block Bootstrap），无需手算复杂解析式即可自动同时享受配对降方差与聚类防假阳性双重保护。
:::

::: warning 多重比较陷阱（Multiple Hypothesis Testing）
如果你一口气拿 20 组 Prompt 或 15 个 RL 检查点在同一份固定评测集上与基线比对，即便所有候选版本都毫无真实提升，在 $\alpha = 0.05$ 下至少出现 1 个“统计显著假阳性”的概率也高达 $1 - 0.95^{20} = 64.2\%$！批量筛选时务必使用 Benjamini-Hochberg（FDR）或 Bonferroni 校正，并把最终胜出者放到从未参与筛选的密封留存集上做唯一一次终审。
:::

确立了样本量与显著性的底座后，下一章我们将直面大模型评测最具迷惑性的口径分岔：为什么同一模型在似然指标与生成抽答上结论相反？探索上限 $\mathrm{pass@}k$ 与生产可靠性 $\mathrm{pass}^k$ 之间到底藏着多大的剪刀差？
