# 统计公式、检验方法与指标口径速查卡

<p class="chapter-summary">全书唯一数学与统计口径事实源：统一评测规模、配对检验、聚类标准误、pass@k / pass^k、Bradley-Terry 排名、Rogan-Gladen 判分矫正、校准误差与 IRT 符号体系，附全书核心公式速查。</p>

大模型评测横跨统计学、信息检索、流行病学诊断、心理测量学与软件工程五个社区，符号撞车和口径混淆极为常见：例如心理测量学常用 $\theta$ 表示被试能力，而流行病学矫正用 $\theta$ 表示真实阳性率；不少工程博客甚至把朴素代入 $1-(1-c/n)^k$ 误当作无偏 $\mathrm{pass@}k$。本书全书 20 章与 4 篇专题**强制统一**使用以下符号与公式口径。

---

## 一、全局统一符号表

| 符号 | 含义 | 说明 / 防冲突约定 |
| --- | --- | --- |
| $N$ | 评测集独立任务/题目总数 | 若题目按文档/仓库分组，另有聚类数 $G_c$ 与簇内题数 $m_g$ |
| $s_i^A,\; s_i^B$ | 模型 $A, B$ 在第 $i$ 题上的得分 | 二值任务取 $\{0,1\}$，连续/多维评分取 $[0,1]$ |
| $d_i,\; \bar d,\; s_d$ | 配对得分差及其样本均值、样本标准差 | $d_i = s_i^B - s_i^A$，$\bar d = \frac{1}{N}\sum_{i=1}^N d_i$ |
| $\rho_{AB}$ | 两模型在同题得分上的皮尔逊相关系数 | 同题配对降方差的核心杠杆（第 1 章） |
| $n_{10},\; n_{01}$ | 二值配对分歧题数 | $n_{10}$：A 对 B 错；$n_{01}$：A 错 B 对（McNemar 检验） |
| $\alpha,\; 1-\beta$ | 显著性水平（I 类错误率）与统计功效 | 工程默认 $\alpha = 0.05$（双侧 $z_{1-\alpha/2} \approx 1.96$），功效 $80\%$（$z_{1-\beta} \approx 0.84$） |
| $\mathrm{MDE}$ | 最小可检测效应（Minimum Detectable Effect） | 给定 $N$ 与功效下能稳定测出的最小真实分差 |
| $\mathrm{ICC},\; \mathrm{DEFF}$ | 组内相关系数与聚类设计效应 | $\mathrm{DEFF} = 1 + (\bar m - 1)\,\mathrm{ICC}$（第 1 章） |
| $n,\; c,\; k$ | 单题采样总次数、通过次数与目标尝试数 | 满足 $0 \le c \le n$ 且 $1 \le k \le n$ |
| $\mathrm{pass@}k$ | 尝试 $k$ 次至少成功 1 次的概率 | 理论值 $1-(1-p)^k$，有限样本无偏估计 $1-\binom{n-c}{k}/\binom{n}{k}$ |
| $\mathrm{pass}^k$ | 连续尝试 $k$ 次**全部成功**的可靠性 | 理论值 $p^k$，有限样本无偏估计 $\binom{c}{k}/\binom{n}{k}$（第 2 章） |
| $\mathrm{maj@}k$ | 采样 $k$ 次多数投票命中率 | Self-Consistency 指标，反映无外部验证器时的测试时扩展 |
| $S_A,\; R_A$ | Bradley-Terry 潜实力与 Arena Elo 分 | $R_A = 400\log_{10}(e)\,S_A + R_0$（第 2 章） |
| $\theta$ | 评测集上的真实通过率（True Prevalence） | 全书保留 $\theta$ 专指真实通过率；IRT 模型能力另记作 $\eta_m$ |
| $\hat p_{\text{raw}}$ | 有偏评委（LLM Judge）测得的原始通过率 | 满足 $\mathbb{E}[\hat p_{\text{raw}}] = \theta q_1 + (1-\theta)(1-q_0)$ |
| $q_1,\; q_0$ | 评委灵敏度（TPR）与特异度（TNR） | 在人类金标正/负样本集上测得；$J = q_1 + q_0 - 1$ 为 Youden 指数 |
| $\hat\theta_{\text{RG}}$ | Rogan-Gladen 矫正后通过率估计 | 要求 $q_1 + q_0 > 1$（第 3 章） |
| $\kappa,\; \alpha_K$ | Cohen's / Fleiss' Kappa 与 Krippendorff's Alpha | 剔除随机一致的标注者间一致性系数（第 4 章） |
| $\mathrm{ECE},\; \mathrm{BS}$ | 期望校准误差与 Brier 分数 | 衡量模型预测置信度与真实准确率的对齐程度（第 5 章） |
| $\mathrm{ASR},\; \mathrm{ORR}$ | 攻击成功率与过度拒绝率 | 安全防线与可用性的双轴帕累托指标（第 7 章） |
| $\mathrm{CS}$ | 关键路径步数（Critical Steps） | 多智能体并行执行 DAG 的最长串行依赖深度（第 12 章） |
| $\eta_m,\; a_j,\; b_j,\; c_j$ | IRT 模型能力与题目区分度、难度、猜测下限 | 用于专题 B 自适应选题（CAT），避开与真实通过率 $\theta$ 冲突 |

---

## 二、核心统计与评测公式速查

### 1. 配对检验、样本量与聚类标准误（第 1 章）

- **配对差值标准误与方差缩减**：

$$
\mathrm{SE}_{\text{paired}} = \frac{s_d}{\sqrt{N}} = \sqrt{\frac{\sigma_A^2 + \sigma_B^2 - 2\rho_{AB}\sigma_A\sigma_B}{N}}, \qquad
\mathrm{SE}_{\text{unpaired}} = \sqrt{\frac{\sigma_A^2 + \sigma_B^2}{N}}
$$

- **80% 功效、双侧 $\alpha=0.05$ 下的 MDE 与所需样本量**：

$$
\mathrm{MDE} \approx (z_{1-\alpha/2} + z_{1-\beta})\,\mathrm{SE}_{\text{paired}} \approx 2.80\,\mathrm{SE}_{\text{paired}}, \qquad
N_{\text{req}} \approx \left(\frac{2.80\,\sigma_d}{\Delta}\right)^2
$$

- **McNemar 检验统计量（带连续性修正）**：

$$
\chi^2_{\text{McNemar}} = \frac{\big(\max(0,\,\lvert n_{10} - n_{01} \rvert - 1)\big)^2}{n_{10} + n_{01}} \;\sim\; \chi^2_1 \quad (\text{小样本 } n_{10}+n_{01}<25 \text{ 时改用精确二项检验})
$$

- **聚类标准误（按簇汇总残差 / Liang-Zeger 三明治形式）**：当 $N$ 道题聚在 $G_c$ 个独立簇（如仓库或文档）内，每簇得分和为 $Y_g = \sum_{i \in g} (s_i - \bar s)$ 时：

$$
\mathrm{SE}_{\text{cluster}} = \sqrt{\frac{G_c}{G_c - 1}\cdot\frac{1}{N^2}\sum_{g=1}^{G_c} Y_g^2} \;\approx\; \mathrm{SE}_{\text{iid}}\cdot\sqrt{1 + (\bar m - 1)\,\mathrm{ICC}}
$$

### 2. 采样指标与 Arena 排名（第 2 章）

- **无偏 $\mathrm{pass@}k$（Chen 等，2021）与无偏 $\mathrm{pass}^k$（Yao 等，2024）**：

$$
\widehat{\mathrm{pass@}k} = 1 - \frac{\binom{n-c}{k}}{\binom{n}{k}} = 1 - \prod_{j=0}^{k-1}\frac{n - c - j}{n - j}, \qquad
\widehat{\mathrm{pass}^k} = \frac{\binom{c}{k}}{\binom{n}{k}} = \prod_{j=0}^{k-1}\frac{c - j}{n - j}
$$

- **Bradley-Terry 与带风格控制协变量的对战概率**：

$$
P(A \succ B \mid \mathbf{x}_{AB}) = \sigma\!\Big(S_A - S_B + \mathbf{w}^\top (\mathbf{f}_A - \mathbf{f}_B)\Big), \qquad R_A = \frac{400}{\ln 10} S_A + R_0
$$

其中 $\mathbf{f}_A - \mathbf{f}_B$ 为长度差、Markdown 标题/列表数量差等风格特征向量。

### 3. LLM-as-a-Judge 统计矫正与一致性（第 3–4 章）

- **观测通过率的混叠关系与 Rogan-Gladen 矫正**：

$$
\mathbb{E}[\hat p_{\text{raw}}] = \theta q_1 + (1-\theta)(1 - q_0)
\;\;\Longrightarrow\;\;
\hat\theta_{\text{RG}} = \operatorname{clip}_{[0,1]}\!\left(\frac{\hat p_{\text{raw}} + \hat q_0 - 1}{\hat q_1 + \hat q_0 - 1}\right)
$$

- **计入有限人类校准集 $(m_1, m_0)$ 与评测集 $N$ 的 Delta 法方差**：

$$
\widehat{\mathrm{Var}}(\hat\theta_{\text{RG}}) \approx \frac{1}{(\hat q_1 + \hat q_0 - 1)^2}\Bigg[\frac{\hat p_{\text{raw}}(1-\hat p_{\text{raw}})}{N} + \hat\theta_{\text{RG}}^2\frac{\hat q_1(1-\hat q_1)}{m_1} + (1-\hat\theta_{\text{RG}})^2\frac{\hat q_0(1-\hat q_0)}{m_0}\Bigg]
$$

- **Cohen's $\kappa$ 与 Krippendorff's $\alpha_K$**：

$$
\kappa = \frac{p_o - p_e}{1 - p_e}, \qquad \alpha_K = 1 - \frac{D_o}{D_e}
$$

### 4. 校准误差、RAG 检索与 IRT（第 5、11 章与专题 B）

- **期望校准误差（ECE）与 Brier 分数**：

$$
\mathrm{ECE} = \sum_{b=1}^{B}\frac{|I_b|}{N}\big|\operatorname{acc}(I_b) - \operatorname{conf}(I_b)\big|, \qquad
\mathrm{BS} = \frac{1}{N}\sum_{i=1}^{N}(\hat p_i - y_i)^2
$$

- **信息检索三大指标（RAG 检索层）**：

$$
\mathrm{MRR} = \frac{1}{N}\sum_{i=1}^N \frac{1}{\operatorname{rank}_i}, \qquad
\mathrm{DCG@}k = \sum_{r=1}^k \frac{2^{\text{rel}_r}-1}{\log_2(r+1)}, \qquad
\mathrm{NDCG@}k = \frac{\mathrm{DCG@}k}{\mathrm{IDCG@}k}
$$

- **三参数逻辑斯蒂项目反应理论（3PL-IRT）**：

$$
P(s_{m,j} = 1 \mid \eta_m) = c_j + \frac{1 - c_j}{1 + \exp\!\big(-a_j(\eta_m - b_j)\big)}
$$

---

## 三、评测方法速选指南

| 你的对比场景 | 推荐检验 / 估计方法 | 避坑提示 |
| --- | --- | --- |
| 同题库比较两个模型的二值通过率 | **McNemar 检验** 或 **Paired Bootstrap** | 严禁把两模型当独立样本套双样本 $t$ 检验，会平白丢掉 50%+ 统计功效 |
| 同一题库存在子题共享文档/代码仓 | **Clustered SE** 或 **按簇 Block Bootstrap** | 未按簇重采样会把 95% 置信区间人为压窄 1.5–3 倍，制造大量假阳性涨点 |
| 评测需要验证器重试的 Coding/数学 | **无偏 $\widehat{\mathrm{pass@}k}$**（采样 $n \ge 2k$） | 切忌直接代入 $1-(1-c/n)^k$，也不要只报 $k=1$ 忽略探索潜力 |
| 评测无人兜底的生产多轮 Agent | **$\widehat{\mathrm{pass}^k}$**（$k=4\text{–}8$）+ 单次率 | $p=0.75$ 的 Agent 看似不错，但 $\mathrm{pass}^5$ 仅 23.7%，上线必遭高频客诉 |
| 使用 LLM-as-a-Judge 跑开放式任务 | **人类金标估 $(q_1, q_0)$ + Rogan-Gladen 矫正** | 若 Youden 指数 $J = q_1 + q_0 - 1 < 0.4$，先修评委再矫正，否则方差爆炸 |
| 模型选型报告要给管理层拍板 | **配对 $\Delta \pm 95\%\text{ CI}$ + $/Task + P95 延迟** | 单报无区间标量分或只报准确率不报成本与延迟，一律视为无效结论 |
