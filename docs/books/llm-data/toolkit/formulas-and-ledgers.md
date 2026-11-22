# 核心公式、数据账本与成本速查卡

<p class="chapter-summary">全书唯一数学口径与工程账本事实源：统一数据受限 Scaling Law、有效 Token 漏斗、分词与多模态编码账本、MinHash LSH 概率曲线、RLVR 难度筛选、模型坍缩方差演化以及离线批合成与人工标注成本核算。</p>

大模型与 Agent 数据工程横跨信息论、分布式大数据处理、多媒体编码、强化学习后训练与企业数据治理五个领域，社区文献常出现符号冲突（如 $D$ 既指总训练 Token 又指唯一语料量、$r$ 既指重复 Epoch 又指 LSH 行数）。本书全书 25 章与 4 篇专题**强制统一**使用以下符号体系与数量级账本。

---

## 一、全局统一符号表

| 符号 | 含义 | 说明 / 防冲突约定 |
| --- | --- | --- |
| $N_{\text{param}}$ | 模型活跃参数量（或总参数量） | 与样本总数 $N_{\text{raw}}$ 显式区分，避免撞车 |
| $D_{\text{tok}}$ | 训练消耗的总 Token 预算 | 含多轮重复 epoch；如 15T tokens |
| $D_U$ | 经去重后的唯一（Unique）Token 量 | 重复轮数记为 $E = D_{\text{tok}} / D_U$（绝不用 $r$ 表示 epoch） |
| $D_{\text{eff}}$ | 计入重复衰减与质量折算的有效 Token 量 | Data-Constrained Scaling 核心量（第 1 章） |
| $R_D^\star$ | 数据受限 Scaling 的重复衰减半衰常数 | Muennighoff 等经验口径 $R_D^\star \approx 15.0$（约 4 epoch 内高效） |
| $N_{\text{raw}},\; \eta_{\text{yield}}$ | 原始采集量与全流水线端到端留存率 | $\eta_{\text{yield}} = \prod_i \eta_i$（解析×语言×启发×打分×去重） |
| $f_{\text{fert}}$ | 分词器生育率（Fertility） | 平均每个词/汉字切分出的 Token 数，越低代表压缩率越高（第 2 章） |
| $T_{\text{img}},\; T_{\text{vid}},\; T_{\text{aud}}$ | 单图、单视频、单段音频映射的视觉/声学 Token 数 | 多模态序列打包与显存/I/O 账本核心量（第 2、12、13 章） |
| $J(A, B),\; s$ | 两文档 shingle 集合的 Jaccard 相似度 | 取值 $[0, 1]$，模糊去重阈值记为 $t^\star$ |
| $b,\; r_{\text{lsh}}$ | MinHash LSH 的频带数（Bands）与每带行数（Rows） | 签名总长度 $k_{\text{sig}} = b \cdot r_{\text{lsh}}$（第 5 章） |
| $w_m$ | 第 $m$ 个数据域在混合配方中的采样权重 | 满足 $\sum_{m=1}^{M} w_m = 1$（第 3、6、11 章） |
| $p_i,\; \widehat{\mathrm{pass@}k}$ | 第 $i$ 道 RLVR 题在基座策略下的单次通过率与 $k$ 次命中率 | 用于难度画像与甜点区筛选 $p_i \in [p_{\min}, p_{\max}]$（第 10 章） |
| $\tau = (s_0, a_0, o_0, \dots, s_T)$ | Agent 多轮交互轨迹 | $s_t$ 环境状态，$a_t$ 模型思考与工具动作，$o_t$ 环境观测（第 15 章） |
| $m_t \in \{0, 1\}$ | 轨迹第 $t$ 个 Token 的 Loss Mask | 模型动作与思考位为 $1$，系统提示与环境返回 $o_t$ 严格置 $0$ |
| $\eta_{\text{pass}}$ | 合成数据生成—验证流水线的端到端有效通过率 | 含格式校验、确定性验证器或裁判过滤（第 21 章） |
| $c_{\text{in}},\; c_{\text{out}}$ | 离线批推理或 API 的输入/输出单价（$/1M tokens） | 用于合成成本账与人工标注单价 $C_{\text{human}}$ 横向对比 |
| $\psi_{\text{stale}}$ | 历史 Agent 轨迹因工具 Schema / UI 改版导致的失效率 | 生产飞轮轨迹老化治理指标（第 23 章） |

---

## 二、核心数学公式速查

### 1. 有效数据价值、Scaling Law 与重复衰减（第 1 章）

- **全书统一有效数据价值账本**：

$$
D_{\text{eff}} \;=\; \underbrace{N_{\text{raw}} \cdot \eta_{\text{yield}}}_{\text{解析/过滤/去重有效量}} \;\times\; \underbrace{q(\mathcal{D}) \cdot d(\mathcal{D})}_{\text{质量与多样性增益}} \;-\; \underbrace{\mathcal{L}_{\text{repeat / contam / collapse}}}_{\text{重复衰减、污染与自噬折损}}
$$

- **Data-Constrained Scaling Law（Muennighoff 等，2023）有效重复 Token 折算**：当唯一语料量为 $D_U$、总训练预算为 $D_{\text{tok}} = E \cdot D_U$（重复轮数 $E \ge 1$，额外重复轮数 $R_D = E - 1$）时，有效数据量与近似损失为：

$$
D_{\text{eff}}(D_U, E) \;=\; D_U \cdot \left[1 + R_D^\star \Big(1 - e^{-(E - 1)/R_D^\star}\Big)\right], \qquad
L(N_{\text{param}}, D_{\text{eff}}) \;=\; E_0 + \frac{A}{N_{\text{param}}^{\alpha}} + \frac{B}{D_{\text{eff}}^{\beta}}
$$

> 当 $E \le 4$ 时重复近乎无损；当 $E \gg R_D^\star$ 时，$D_{\text{eff}}$ 渐近饱和于 $(1 + R_D^\star)\,D_U$，继续堆算力进入严重边际递减。

### 2. 分词与多模态序列 Token 账本（第 2、12、13 章）

- **文本编码效率与字节压缩比（Bytes-Per-Token）**：

$$
\mathrm{BPT} = \frac{\text{UTF-8 原始字节数}}{\text{分词后 Token 数}}, \qquad f_{\text{fert}} = \frac{\text{分词后 Token 数}}{\text{语义词/字数}}
$$

- **多模态序列长度账本**（以常见 ViT Patch $p \times p$ + $2\times 2$ 空间下采样池化为例）：

$$
T_{\text{img}}(H, W) = \left\lceil\frac{H}{p}\right\rceil \left\lceil\frac{W}{p}\right\rceil \cdot \frac{1}{s_{\text{pool}}^2} + T_{\text{meta}}, \qquad
T_{\text{vid}}(L_{\text{sec}}, f_{\text{fps}}) = L_{\text{sec}} \cdot f_{\text{fps}} \cdot T_{\text{frame}}, \qquad
T_{\text{aud}}(L_{\text{sec}}) = L_{\text{sec}} \cdot f_{\text{codec}}
$$

典型基准数量级（教材统一口径）：
- 动态高分图像（$1120 \times 1120$，$p=14$，$2\times 2$ 合并）：单图 $T_{\text{img}} = (80\times 80)/4 = 1{,}600$ visual tokens（常规 $448\times 448$ 图为 $256$ tokens）。
- 1 分钟视频（$1\text{ fps}$ 抽帧，单帧压缩至 $128$ tokens）：$T_{\text{vid}} = 60 \times 128 = 7{,}680$ tokens。
- 1 分钟语音（$25\text{ Hz}$ 单码本音频 Codec）：$T_{\text{aud}} = 60 \times 25 = 1{,}500$ tokens（多码本并行为 $K \times 1{,}500$）。

### 3. MinHash + LSH 模糊去重概率曲线（第 5 章）

设两文档的 $k$-shingle 集合 Jaccard 相似度为 $s = \frac{|A \cap B|}{|A \cup B|}$，构造 $k_{\text{sig}} = b \cdot r_{\text{lsh}}$ 维 MinHash 签名并分为 $b$ 个 Band、每 Band 含 $r_{\text{lsh}}$ 行，则二者被至少一个 Band 命中成为候选重复对的概率及 S 曲线拐点阈值 $t^\star$ 为：

$$
P(\text{candidate} \mid s) = 1 - \big(1 - s^{r_{\text{lsh}}}\big)^b, \qquad
t^\star \approx \left(\frac{1}{b}\right)^{1/r_{\text{lsh}}}
$$

| 经典配置 $(b, r_{\text{lsh}})$ | 签名长度 $k_{\text{sig}}$ | 拐点阈值 $t^\star$ | $s=0.5$ 命中率 | $s=0.8$ 命中率 | 典型场景 |
| --- | --- | --- | --- | --- | --- |
| **$(14, 8)$** | 112 | **0.719** | 5.3% | **92.4%** | 网页严格去重（FineWeb 类默认口径） |
| **$(20, 5)$** | 100 | **0.549** | 47.0% | **99.96%** | 宽松去重（易误杀模板代码/财报） |
| **$(16, 10)$** | 160 | **0.758** | 1.6% | **83.8%** | 高精准低误杀（学术论文/代码仓） |
| **$(32, 8)$** | 256 | **0.648** | 11.8% | **99.7%** | 高召回陡峭边界（内存与哈希成本加倍） |

### 4. RLVR 难度甜点区与有效梯度利用率（第 10 章）

在组采样（GRPO/RLOO）组大小为 $G$ 时，若某道题的真实通过率为 $p_i$，该题在单次 Rollout 中出现“全对或全错”导致组内优势恒为零（**零梯度死题**）的概率为：

$$
P(\text{zero-grad} \mid p_i, G) = p_i^G + (1 - p_i)^G
$$

当 $G = 8$ 时：若 $p_i = 0.02$，零梯度浪费高达 **$85.1\%$**；若 $p_i \in [0.15, 0.85]$，有效梯度命中率稳定高于 **$72\%$**。因此离线题库清洗必须按 $\widehat{\mathrm{pass@}k}$ 将题池维持在 $p_i \in [0.1, 0.8]$ 的课程甜点区。

### 5. Agent 轨迹掩码目标函数与合成数据单位有效成本账（第 15、21 章）

- **带严格 Loss Mask 的多轮 Agent 监督损失**：

$$
\mathcal{L}_{\text{Agent}}(\theta) = -\frac{\sum_{t=1}^{L} m_t \log \pi_\theta(x_t \mid x_{<t})}{\sum_{t=1}^{L} m_t}, \qquad
m_t = \begin{cases} 1, & x_t \in \{\text{Think}, \text{ToolCall}, \text{FinalAnswer}\} \\ 0, & x_t \in \{\text{System}, \text{User}, \text{ToolObservation}, \text{EnvError}\} \end{cases}
$$

- **合成数据单位有效样本成本公式（含失败废弃、验证与抽检）**：

$$
C_{\text{eff}} = \frac{C_{\text{gen}} + C_{\text{env}} + C_{\text{verify}}}{\eta_{\text{pass}}} + \gamma_{\text{audit}} \cdot C_{\text{human}}
$$

其中 $C_{\text{gen}} = (L_{\text{in}} c_{\text{in}} + L_{\text{out}} c_{\text{out}}) / 10^6$ 为单次生成推理费，$C_{\text{env}}$ 为沙箱容器/搜索调用费，$C_{\text{verify}}$ 为验证器或裁判费，$\eta_{\text{pass}} \in (0, 1]$ 为端到端通过率，$\gamma_{\text{audit}} \in [0, 1]$ 为人工抽检复核比例。

---

## 三、全书统一教材算例基准（数量级直觉表）

为保证全书 25 章算例前后一致，正文示例默认采用以下 **2026 年代表性工程基准口径**（换用具体集群或云厂商报价时直接代入同套公式即可）：

| 阶段 / 场景 | 教材统一基准口径 | 典型留存率 $\eta_{\text{yield}}$ 或 $\eta_{\text{pass}}$ | 参考成本量级（教学口径） |
| --- | --- | --- | --- |
| **预训练网页洗数** | 100 TB WARC 原始网页（~25T 原始 Token） | $\eta_{\text{yield}} \approx 8\%\text{–}15\%$（净剩 2T–3.8T Token） | CPU/轻量打分洗数约 **$0.03–$0.12 / 1B tokens** |
| **预训练 LLM 改写** | 8B–32B 开源模型在 8×H100 节点离线批推理（联动 `llm-inference`） | 有效产出约 $70\%\text{–}85\%$ | 离线批改写约 **$0.08–$0.25 / 1M tokens** |
| **SFT / Rubric 人工精标** | 领域专家编写长推理或复杂 Rubric + 盲审仲裁 | 金标通过率 $80\%\text{–}90\%$ | **$5–$45 / 样本**（医疗/金融/代码专家可达 $80+） |
| **RLVR 题库合成与验证** | 强模型生成 + 沙箱单测/符号验证 + Pass@k 难度过滤 | 有效甜点区留存 $\eta_{\text{pass}} \approx 15\%\text{–}35\%$ | **$0.02–$0.15 / 有效可验证题** |
| **多轮 Agent 轨迹合成** | 平均 8–15 轮工具/SWE/GUI 交互 + 终态断言 + 去伪过滤 | 端到端有效轨迹率 $\eta_{\text{pass}} \approx 10\%\text{–}30\%$ | **$0.08–$0.80 / 有效轨迹**（人工录屏精标约 **$15–$60 / 条**） |
| **视觉密集重打标** | VLM 批量 Recaptioning（单图 ~500 in + ~250 out tokens） | 质量过滤留存 $\sim 60\%\text{–}75\%$ | **$0.15–$0.60 / 千图** |

---

## 四、模型坍缩方差演化速查（第 21 章与专题 B）

在每代仅用上一代模型生成的 $n$ 个样本**完全替换**真实数据（零锚定递归训练）的简化高斯模型下，第 $k$ 代估计均值 $\hat\mu_k$ 的方差随代数线性发散，协方差行列式以指数速度塌缩至零：

$$
\mathrm{Var}(\hat\mu_k) = \sigma_0^2 \cdot \left(\frac{1}{n_0} + \sum_{j=1}^{k}\frac{1}{n_j}\right) \xrightarrow{k\to\infty} \infty
$$

而在**累加混合（Accumulating with Real Grounding）**策略下（保持真实样本基座 $D_{\text{real}}$ 不被替换，且新增合成样本经过外部确定性验证器筛选），方差上界被真实数据锚点严格锁定，不会发生发散坍缩。
