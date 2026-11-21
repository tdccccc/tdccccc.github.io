# 专题 B：心理测量学与项目反应理论（IRT / CAT 自适应评测）

<p class="chapter-summary">从经典测验理论的算力浪费出发，完整推导 1PL（Rasch）、2PL 与 3PL 项目反应理论模型与 Fisher 信息量，阐明计算机自适应测试（CAT）如何将万题长测压缩至 50–150 题而不损失排序精度，并剖析冷启动与多维能力坍缩等工程局限。</p>

跑完一套包含 12,032 道题的 MMLU-Pro（或 14,042 题的 MMLU）及跨学科综合基准，在开启长思考（CoT）模式时往往需要消耗数千万 token 与数小时墙钟时间——这在后训练 RLVR 每隔几百步做一次 Checkpoint 选优时几乎难以承受。然而，在经典测验理论（CTT）的“全题等权平均”范式下，绝大多数算力其实都被白白浪费了：让旗舰模型做初中算术题（几乎必对），或让 1.5B 端侧小模型做研究级 FrontierMath（几乎必错），**两类题目都几乎不提供任何关于模型真实能力边界的新信息**。

源自教育心理测量学的<a class="term-ref" href="/books/llm-eval/glossary#irt_cat" title="为每道题估计难度与区分度、为模型估计潜能力，并动态挑选信息量最大题目的统计评测范式">项目反应理论（IRT）与计算机自适应测试（CAT）</a>提供了破局的数学武器。严格遵循 [统计公式速查卡](/books/llm-eval/toolkit/metrics-and-stats) 的防冲突约定：全书保留 $\theta$ 专指真实通过率，本专题统一记**被测模型 $m$ 的潜在能力为 $\eta_m \in \mathbb{R}$**（绝不使用 $\theta$ 记作能力），题目 $j$ 的区分度、难度与猜测下限分别记作 $a_j, b_j, c_j$。

---

## B.1 1PL（Rasch）、2PL 与 3PL-IRT 数学模型

设二值观测变量 $s_{m,j} \in \{0,1\}$ 表示模型 $m$ 在第 $j$ 道题上是否答对。IRT 假设题目答对概率是模型能力 $\eta_m$ 与题目固有属性的光滑单调函数，称为<strong>项目特征曲线</strong>（Item Characteristic Curve，ICC；注意与[第 1 章](/books/llm-eval/chapters/chapter-01)的组内相关系数 ICC 区分）。最通用的<strong>三参数逻辑斯蒂模型（3PL-IRT）</strong>形式为：

$$
P_j(\eta_m) \;\equiv\; P(s_{m,j} = 1 \mid \eta_m) \;=\; c_j + \frac{1 - c_j}{1 + \exp\!\big(-a_j(\eta_m - b_j)\big)}
$$

三个题目参数各具清晰的物理与测量学含义，并自然退化出三代经典模型：

| 模型层级 | 参数约束 | 数学形式与特征 | 在 LLM 评测中的适用场景 |
| --- | --- | --- | --- |
| **1PL（Rasch 模型）** | $a_j = 1,\; c_j = 0$ | $P_j(\eta_m) = \sigma(\eta_m - b_j)$；原始总分 $\sum_j s_{m,j}$ 即为 $\eta_m$ 的充分统计量 | 题目质量极其均一的合成难度阶梯测试 |
| **2PL-IRT** | $c_j = 0,\; a_j > 0$ | $P_j(\eta_m) = \sigma\!\big(a_j(\eta_m - b_j)\big)$；允许不同题目拥有不同斜率（区分度） | **代码生成、数学填空、确定性验证器任务**（随机盲猜几乎为 0） |
| **3PL-IRT** | $a_j > 0,\; c_j \in [0, 1)$ | 含非零下渐近线 $\lim_{\eta_m \to -\infty} P_j(\eta_m) = c_j$，拐点位于 $\eta_m = b_j$ 处 | **选择题基准**（如 4 选 1 MMLU 对应 $c_j \approx 0.25$，10 选 1 MMLU-Pro 对应 $c_j \approx 0.10$） |

当题目参数库 $\{(a_j, b_j, c_j)\}_{j=1}^M$ 已在历史模型响应矩阵上通过边际极大似然（MMLE）或变分推断离线标定后，对于一个新待测模型 $m$，给定其在子集 $\mathcal{S}$ 上的作答记录 $\{s_{m,j}\}_{j\in\mathcal{S}}$，由局部独立性假设写出对数似然（常配标准正态先验 $\eta_m \sim \mathcal{N}(0,1)$ 进行 MAP 或期望后验 EAP 估计，防止全对/全错时极大似然发散）：

$$
\ell(\eta_m) \;=\; \sum_{j \in \mathcal{S}} \Big[\, s_{m,j}\log P_j(\eta_m) + (1 - s_{m,j})\log\!\big(1 - P_j(\eta_m)\big) \,\Big] - \frac{\eta_m^2}{2}
$$

---

## B.2 Fisher 信息量与渐近标准误推导

自适应选题的核心问题是：**在已知当前能力估计 $\hat\eta_m$ 时，从题库里挑选哪一道未做题 $j$，能让估计方差收缩最快？** 答案由单题 <strong>Fisher 信息量（Item Fisher Information）</strong>给出。对伯努利似然求二阶导取负期望：

$$
I_j(\eta_m) \;=\; -\mathbb{E}\!\left[\frac{\partial^2}{\partial \eta_m^2}\log L_j(\eta_m)\right] \;=\; \frac{\big[P_j'(\eta_m)\big]^2}{P_j(\eta_m)\big(1 - P_j(\eta_m)\big)}
$$

对 3PL 公式关于 $\eta_m$ 求一阶导数，利用 $\frac{P_j - c_j}{1 - c_j} = \sigma\!\big(a_j(\eta_m - b_j)\big)$，有 $P_j'(\eta_m) = a_j\frac{(P_j - c_j)(1 - P_j)}{1 - c_j}$。代入上式立即得到 2PL 与 3PL 的精确闭式信息量：

$$
I_j^{\text{2PL}}(\eta_m) = a_j^2\, P_j(\eta_m)\big(1 - P_j(\eta_m)\big), \qquad
I_j^{\text{3PL}}(\eta_m) = a_j^2\, \frac{1 - P_j(\eta_m)}{P_j(\eta_m)} \left(\frac{P_j(\eta_m) - c_j}{1 - c_j}\right)^2
$$

这条公式导出三条极富工程洞察的推论：
1. **难度匹配最大化信息**：在 2PL 下，$I_j(\eta_m)$ 严格在 $P_j(\eta_m) = 0.5$ 即 <strong>$\eta_m = b_j$（难度刚好等于模型当前实力）</strong>时达到峰值 $a_j^2 / 4$；太简单（$P_j \approx 1$）或太难（$P_j \approx 0$）的题目信息量均趋近于零。
2. **高区分度呈平方级放大**：信息量正比于 $a_j^2$；而标注错误或存在严重歧义的脏题，往往在离线标定中自动暴露出极低甚至为负的 $a_j$，天然充当<strong>「题库质检筛子」</strong>。
3. **猜测下限惩罚信息量**：在 3PL 下，$c_j$ 越大，整体信息量越低，且峰值向右偏移至略高于 $b_j$ 处——这从数学上再次印证了第 5 章 MMLU-Pro 把 4 选 1 改为 10 选 1（将 $c_j$ 从 $0.25$ 降至 $0.10$）为什么能显著提升测量效率（单题峰值 Fisher 信息量由 $0.155\,a_j^2$ 提至 $0.206\,a_j^2$，增幅约 33%）！

对已测题目集合 $\mathcal{S}$，测试总信息量为可加和 $\mathcal{I}_{\mathcal{S}}(\eta_m) = \sum_{j \in \mathcal{S}} I_j(\eta_m)$，由 Cramér-Rao 下界给出能力估计的渐近标准误：

$$
\mathrm{SE}(\hat\eta_m) \;\approx\; \frac{1}{\sqrt{\mathcal{I}_{\mathcal{S}}(\eta_m) + 1}} \quad (\text{含标准正态先验信息量 } 1)
$$

---

## B.3 CAT 自适应评测闭环与工程代表方案

<strong>计算机自适应测试（CAT）</strong>将静态批处理评估改写为一个极简的在线序贯闭环：

1. **冷启动初始化**：给定初始先验 $\hat\eta^{(0)} = 0$（或先固定跑 5–10 道覆盖低/中/高难度的锚点题快速定位粗略区间）。
2. **最大信息量选题**：在第 $t$ 步，从未测题库中选择令当前 Fisher 信息量最大的下一题 $j^\star = \arg\max_{j \notin \mathcal{S}_{t-1}} I_j(\hat\eta^{(t-1)})$（工程中常采用批量 $B=8\text{–}16$ 题并发以打满推理引擎批处理吞吐，或采用期望后验方差最小化）。
3. **推理执行与后验更新**：调用被测模型得到 $s_{m,j^\star}$，利用牛顿迭代或数值积分更新 $\hat\eta^{(t)}$ 与标准误 $\mathrm{SE}(\hat\eta^{(t)})$。
4. **精度/预算停机**：当 $\mathrm{SE}(\hat\eta^{(t)}) \le \varepsilon_{\text{target}}$ 或达到预设预算 $T_{\max}$ 时终止；必要时还可按 $\hat S_{\text{full}} = \frac{1}{M}\sum_{j=1}^M P_j(\hat\eta_m)$ 反推该模型在完整万题全集上的预测总分。

工业与学术界落地形成了两条互补路线：
- **静态锚点压缩（tinyBenchmarks，Polo 等，2024）**：通过 IRT 潜空间聚类挑选约 100 道高代表性 **Anchor Points**，配合 `p-IRT` / `gp-IRT` 估计量，仅用约 **100 道题**即可把 MMLU（14,042 题）等大榜的预测误差压至 **2% MAE 以内**，同时兼容全批并行与跨模型配对比较。
- **动态自适应选题（Fluid Benchmarking，Hofmann 等，2025）**：采用完整 CAT 闭环实时按模型能力动态挑题，在保持相同甚至更高模型排序稳定性（更低 SE）的前提下，将动辄上万题的静态套件压缩至 **50–150 题**（算力与成本直降 95%+），尤其适合 RL 训练过程中的高频中期体检。

---

## B.4 工程局限、冷启动陷阱与适用边界

::: warning 落地 IRT / CAT 前必须跨过的四道门槛
1. **题库标定冷启动**：准确拟合 2PL/3PL 参数 $(a_j, b_j, c_j)$ 通常需要 **50–200 个能力分布跨度充分的历史模型**在同一全集上的作答矩阵；对于企业刚刚新建的 300 题私有黄金集，切忌强行上 3PL，应先沿用常规全量配对评测。
2. **单维能力假设破裂**：单标量 $\eta_m$ 隐含“所有题目测的是同一种综合智商”。若把数学竞赛题、中文指令遵循与安全拒答混在一个 IRT 题库里，单维模型会严重失真——必须**按能力域分库独立建模**，或升级为多维项目反应理论（MIRT）。
3. **数据污染与能力漂移扭曲**：若新模型恰好背过题库中几道高区分度（大 $a_j$）题目，CAT 会因这几道题的巨大权重迅速把 $\hat\eta_m$ 推向虚高；需在自适应选题中叠加题目曝光上限与周期性全量抽检校准。
4. **跨模型不配对的统计代价**：纯动态 CAT 让模型 A 与模型 B 做的是**不同的题目子集**，因而无法直接套用第 1 章的 McNemar 检验或同题 Paired Bootstrap；最终上线拍板或细微涨点（$<1.5\text{ pp}$）验证，仍建议切回固定锚点子集或全量配对回归。
:::

总体而言，IRT / CAT 最优的工程定位是<strong>「高频训练监控与大库初筛的 20× 加速器」</strong>，与固定私有黄金集的最终发布闸门（第 19 章）形成完美互补。
