# 专题 B：合成数据与模型坍缩的理论边界

<p class="chapter-summary">系统推导递归合成训练中的分布演化边界：从 Shumailov 等（2024）的替换式方差发散与长尾截断，到 Gerstgrasser 等（2024）的累加混合有界收敛，再从信息论数据处理不等式出发，阐明外部确定性验证器与沙箱 Grounding 如何打破自噬天花板。</p>

随着高质量公开网页逼近枯竭，规模化合成数据已成为预训练改写、Long-CoT 蒸馏与 Agent 轨迹生产的标配（见 [第 6 章](/books/llm-data/chapters/chapter-06) 与 [第 21 章](/books/llm-data/chapters/chapter-21)）。但工程界长期被两种极端论调撕裂：一派宣称“合成数据必然触发 <a class="term-ref" href="/books/llm-data/glossary#model_collapse" title="递归在自身合成数据上训练导致尾部知识消失与方差发散的退化现象">模型坍缩</a>，大模型将自我毒死”；另一派则盲目用模型自我滚雪球造数，最终练出词汇贫瘠、逻辑循环的僵化模型。

解开这场争论的关键，在于严格区分**替换式递归（Replacement）**、**累加式混合（Accumulation）**以及**带外部信息注入的验证过滤（Verified Grounding）**三种截然不同的动力学机制。

---

## B.1 替换式递归：方差线性发散与协方差塌缩（Shumailov 等，2024）

Shumailov 等人在 *Nature*（2024）中将递归生成式退化分解为三类误差叠加：**有限样本统计近似误差**、**模型容量导致的函数表达误差**与**优化不完美导致的函数近似误差**。即便假设模型容量无限、优化完全精确（仅保留有限样本抽样噪声），纯替换式递归依然必然坍缩。

### 1. 连续高斯分布的随机游走与塌缩

设真实数据服从 $d$ 维正态分布 $X^{(0)} \sim \mathcal{N}(\mu_0, \Sigma_0)$。第 $0$ 代抽取 $n_0$ 个真实样本估计均值与协方差 $(\hat\mu_0, \hat\Sigma_0)$；此后每一代 $k \ge 1$ **完全丢弃历史数据**，仅从上一代拟合分布 $\mathcal{N}(\hat\mu_{k-1}, \hat\Sigma_{k-1})$ 采样 $n_k$ 个合成样本重新估计 $(\hat\mu_k, \hat\Sigma_k)$。

由全方差公式与 Wishart 分布性质，第 $k$ 代估计均值 $\hat\mu_k$ 的无偏性与方差演化（一维情形 $\Sigma_0 = \sigma_0^2$）满足：

$$
\mathbb{E}[\hat\mu_k] = \mu_0, \qquad
\mathrm{Var}(\hat\mu_k \mid \hat\sigma_0^2, \dots, \hat\sigma_{k-1}^2) = \frac{\sigma_0^2}{n_0} + \sum_{j=1}^{k} \frac{\hat\sigma_{j-1}^2}{n_j}
$$

若每代固定采样量 $n_j = n$ 且先忽略方差缩放（一阶近似），均值估计方差如 [核心公式速查卡](/books/llm-data/toolkit/formulas-and-ledgers) 所示随代数线性发散：$\mathrm{Var}(\hat\mu_k) \approx \sigma_0^2 (1 + k)/n \to \infty$；而更致命的是**协方差矩阵的指数级塌缩**：

$$
\mathbb{E}[\hat\Sigma_k] = \left(\prod_{j=0}^{k} \frac{n_j - 1}{n_j}\right)\Sigma_0, \qquad
\det(\hat\Sigma_k) \xrightarrow[k\to\infty]{\text{a.s.}} 0
$$

直观物理意义极其清晰：均值像醉汉一样随机游走偏离真实世界，而分布支撑集（方差/多样性）不断收缩，最终退化为某个漂移位置上的**单点狄拉克脉冲 $\delta_{\mu_\infty}$**——在语言模型上表现为“句式高度雷同、反复复读、丧失罕见知识”。

### 2. 离散分布与重尾截断（Tail Truncation）

真实语言与知识服从典型 Zipf 长尾分布。设某一罕见实体或长尾推理模式在真实分布中的概率为 $p \ll 1$。单代抽取 $n$ 个样本时，该尾部事件一次都未被抽中的概率为：

$$
P(\text{miss in 1 gen}) = (1 - p)^n \approx e^{-np}
$$

在**替换式递归**中，零概率是一个**吸收态（Absorbing State）**：只要某代抽样漏掉该长尾概念（或解码采用低温度 / Top-$p$ 截断），后续所有世代都将以概率 $1$ 永久丢失该知识。相应地，分布的香农熵 $H(P_k) = -\sum_x P_k(x)\log P_k(x)$ 在递归马尔可夫链下呈现严格单调下降趋势——这就是 Shumailov 所称的**早期坍缩（Early Collapse：尾部率先蒸发，主流测试集分数看似变化不大）**与**晚期坍缩（Late Collapse：核心模态彻底崩毁）**。

---

## B.2 累加式混合：打破递归魔咒的有限误差上界（Gerstgrasser 等，2024）

Shumailov 模型的隐含前提在现代工业界并不成立：没有任何成熟团队会在训练第 $k$ 代模型时“把所有真实互联网与企业数据删光，只留 AI 生成的文本”。

Gerstgrasser 等（2024，*"Is Model Collapse Inevitable? Breaking the Curse of Recursion by Accumulating Real and Synthetic Data"*）分析了更贴近现实的**累加式机制（Accumulation）**：第 $k$ 代模型在真实数据集 $\mathcal{D}_0$ 与历代合成数据集的并集 $\bigcup_{j=0}^{k-1}\mathcal{D}_j$ 上联合训练（设每代新增等量样本 $n$）。

在多元线性回归（以及对应的高斯均值估计）解析框架下，对比两种策略下第 $k$ 代模型的期望超额测试误差 $E_{\text{test}}^{(k)}$：

| 迭代范式 | 第 $k$ 代训练数据构成 | 均值/参数估计方差渐近行为 | 是否必然坍缩 |
| --- | --- | --- | --- |
| **替换式（Replace）** | 仅 $\mathcal{D}_{k-1}$（丢弃真实源） | $\propto \sigma^2 \cdot \dfrac{k}{n} \xrightarrow{k\to\infty} \infty$（线性发散） | **是**（必然坍缩） |
| **累加式（Accumulate）** | $\mathcal{D}_0 \cup \mathcal{D}_1 \cup \dots \cup \mathcal{D}_{k-1}$ | $\le \sigma^2 \cdot \dfrac{1}{n}\left(1 + \displaystyle\sum_{j=2}^{k}\frac{1}{j^2}\right) \le \dfrac{\pi^2}{6}\cdot\dfrac{\sigma^2}{n}$ | **否**（收敛至有限上界） |

由于历史真实数据 $\mathcal{D}_0$ 始终锚定在混合池中，第 $j$ 代新注入噪声在累加平均中的权重被分母 $j$ 持续稀释，其方差贡献按调和平方级数 $\sum_{j=1}^{\infty} 1/j^2 = \pi^2/6 \approx 1.645$ 收敛！因此只要**保留真实数据基座不被覆盖**，纯统计误差永远被锁定在一个与真实基座规模 $n_0$ 成反比的有限常数内，不会随迭代代数发散。

> **工程警惕**：上述“累加有界”依赖一个关键前提——**真实数据不能被海量低质合成垃圾在采样权重上稀释至趋近于零**。若真实数据 $n_0$ 固定而每代无节制倾倒 $100\times$ 合成文本且按均匀比例采样，有效等效状态仍会滑向替换式坍缩。

---

## B.3 信息论边界与外部确定性 Verifier 如何突破自噬上限

从信息论视角审视，单纯把真实数据 $\mathcal{D}_{\text{real}}$ 喂给模型 $\theta_k$ 生成无约束合成数据 $\mathcal{D}_{\text{syn}}$，构成马尔可夫链 $\mathcal{D}_{\text{real}} \to \theta_k \to \mathcal{D}_{\text{syn}}$。由**数据处理不等式（Data Processing Inequality, DPI）**：

$$
I\big(\mathcal{D}_{\text{syn}};\, \mathcal{D}_{\text{real}}\big) \;\le\; I\big(\theta_k;\, \mathcal{D}_{\text{real}}\big)
$$

也就是说，**无外部信号约束的封闭自举无法创造新信息**（只能通过结构重塑如 <a class="term-ref" href="/books/llm-data/glossary#synthetic_rephrasing" title="将高信息量杂乱网页改写为清晰可读的教科书体">合成改写</a> 提升已有知识的可学性）。要让合成数据真正超越上一代模型天花板，必须打破封闭马尔可夫链，接入**外部世界信息源（External Grounding）**：

1. **确定性验证器注入信息比特**：在数学符号引擎、编译器、单元测试或 Agent 执行沙箱中，验证器 $V(x, y) \in \{0, 1\}$ 等价于从外部客观规则中抽取过滤信号。设基座策略通过率为 $\eta_{\text{pass}} = \mathbb{E}_{y\sim\pi_\theta}[V(x,y)]$，经 <a class="term-ref" href="/books/llm-data/glossary#rejection_sampling" title="多次采样后经外部验证器筛选通过样本的微调范式">拒绝采样</a> 后的目标分布变为条件分布：
   $$
   \pi_{\text{filtered}}(y \mid x) = \frac{\pi_\theta(y \mid x)\,\mathbf{1}[V(x, y) = 1]}{\eta_{\text{pass}}(x)}
   $$
   其与原策略的 KL 散度精确等于验证器注入的信息增益：$D_{\mathrm{KL}}(\pi_{\text{filtered}} \,\|\, \pi_\theta) = -\log \eta_{\text{pass}}(x)$。题目越难（只要 $\eta_{\text{pass}} > 0$，落在 [第 10 章](/books/llm-data/chapters/chapter-10) 的 <a class="term-ref" href="/books/llm-data/glossary#sweet_spot_curriculum" title="筛选中等通过率难题以最大化梯度信噪比的动态课程">甜点区</a> 内），每条通过样本带回的新信息量越大！
2. **警惕“验证器诱发模式坍缩”（Verifier-induced Mode Collapse）**：确定性验证器保证**正确性（Precision）**，却不自动保证**多样性（Diversity）**。如果模型靠某一种偷懒解题套路或 <a class="term-ref" href="/books/llm-data/glossary#lucky_hack" title="虽触发通过判定但中间逻辑存在缺陷或作弊的毒化轨迹">假成功轨迹</a> 频繁过检，过滤后的数据仍会出现局部模态坍缩与解题风格单一化。

---

## B.4 工程抗坍缩四条铁律（联动第 21 章）

将上述数学边界翻译为可直接写进数据管线的硬规则：

1. **真实锚定下限（Real Anchor Floor）**：任何大规模合成混合训练中，经过严格去污的高质真实人类语料或真实环境观测占比**不得低于 20%–30%**，并在采样权重层锁定而非按原始行数被动稀释。
2. **外部 Grounding 优先于纯模型自评**：优先采用“代码沙箱 / 数学等价验证 / 状态断言 / 真实检索文档改写”作为过滤锚；若必须使用 LLM Judge，须引入异族模型交叉评判与人类金标校准。
3. **跨族生成器 + 采样温度 + 语义去重**：用多家族教师模型与较高采样温度生成候选集，入库前对通过样本执行 <a class="term-ref" href="/books/llm-data/glossary#semdedup" title="在向量聚类簇内剔除措辞不同但语义高度雷同样本的方法">SemDeDup</a> 与解题策略多样性抽检，防范验证器侧模式坍缩。
4. **尾部健康度在线监测**：每个合成批次上线前监控三项坍缩早筛指标——**N-gram 词汇熵 / Type-Token Ratio**、**长尾领域（非热门代码库/冷门学科）困惑度回退**，以及**输出风格方差**；一旦熵值相对基线骤降超过 10%，立即停库排查采样温度与过滤阈值。

::: warning 不要被“单代测试集涨点”蒙蔽
早期坍缩（Early Collapse）最阴险的特征在于：**主流高频基准分数甚至可能因为分布锐化而微涨 1–2 个百分点，但长尾知识召回率与复杂边界场景鲁棒性已悄然腰斩**。评估合成数据配方时，必须并行监测长尾冷门切片与分布熵。
:::
