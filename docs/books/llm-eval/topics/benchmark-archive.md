# 专题 A：核心评测基准与论文口径档案

<p class="chapter-summary">集中索引全书引用的主流基础模型基准、Agent 专项基准与统计方法学里程碑文献，统一记录发布年份、样本规模、判分验证机制、已知局限与避坑口径，并附高频易混版本映射表，便于严谨引用与横向比对。</p>

大模型与 Agent 评测文献分散在 NLP、软件工程、系统安全、信息检索与生物统计等多个社区，同一基准在不同论文或模型卡（Model Card）中极易出现版本混用（例如把 SWE-bench Lite 300 题、Verified 500 题与 Pro 跨仓库版混为一谈）或计分口径漂移（如 IFEval 的 Instruction-Loose 往往比 Prompt-Strict 高出 10 个百分点以上）。

本档案按<strong>「基础模型底座」「Agent 专项」「统计与方法学基石」「高频易混版本映射」</strong>四节集中归档截至 **2026 年 10 月** 的核心标尺。所有数学符号遵循 [统计公式与指标口径速查卡](/books/llm-eval/toolkit/metrics-and-stats)，实操避坑核查表见 [基准选型与评测上线避坑清单](/books/llm-eval/toolkit/eval-checklist)。

---

## A.1 基础模型核心基准档案（第 5–7 章）

| 基准名称 | 年份 / 出处 | 规模与粒度 | 判分 / 验证机制 | 已知局限与口径避坑 | 本书位置 |
| --- | --- | --- | --- | --- | --- |
| **MMLU-Pro** | 2024 · TIGER-Lab | 12,032 题 · 14 学科 · 10 选 1 | 选项正则抽取 / 精确匹配 | 随机下限降至 10%，但仍属静态公开题库，需防刷榜污染 | [第 5 章](/books/llm-eval/chapters/chapter-05) |
| **GPQA Diamond** | 2023 · Rein 等 | 198 题 · 博士级理化生 4 选 1 | 精确匹配（通常配 CoT 抽答） | **样本极小（1 题 = 0.51 pp）**，单次跑分方差极大，须多次采样配对比较 | [第 5 章](/books/llm-eval/chapters/chapter-05) |
| **Humanity's Last Exam (HLE)** | 2025 · CAIS / Scale | 约 2,500 题（纯文本 + 多模态） | 短答精确匹配 + 校准 Judge | 前沿难度高，必须声明是否开启联网搜索工具及纯文本/全量切片 | [第 5 章](/books/llm-eval/chapters/chapter-05) |
| **IFEval** | 2023 · Google | 541 提示 · 25 类可验证约束 | Python 确定性规则验证器 | 仅 25 类固定模板易被 RLVR 过拟合；须区分 Strict 与 Loose 及 Prompt 级 | [第 5 章](/books/llm-eval/chapters/chapter-05) |
| **Multi-IF** | 2024 · Meta | 4,501 条 · 3 轮对话 · 8 种语言 | 多轮累计规则验证器 | 暴露第 3 轮指令遗忘与非英语显著掉点；勿仅报第 1 轮均分 | [第 5 章](/books/llm-eval/chapters/chapter-05) |
| **RULER** | 2024 · NVIDIA | 4 类 13 项合成任务 · 可控长度 | 精确匹配 / 集合召回验证 | 合成语境仍弱于真实语义关联，宜作为有效窗口的“必要非充分”筛查 | [第 5 章](/books/llm-eval/chapters/chapter-05) |
| **NoLiMa** | 2025 · Adobe 等 | 58 组无词面重叠针问模板 × 多长度 | 关键实体精确 / 语义匹配 | 剥离关键词锚点后衰减剧烈，能戳破 NIAH 全绿假象 | [第 5 章](/books/llm-eval/chapters/chapter-05) |
| **OpenAI MRCR** | 2025 · OpenAI | 2 / 4 / 8 根相似干扰针 · 至 1M | 序列相似度与目标针精准匹配 | 专测多轮长对话同类干扰混淆；高针数区间区分度远大于单针 | [第 5 章](/books/llm-eval/chapters/chapter-05) |
| **SimpleQA** | 2024 · OpenAI | 4,326 道短事实问答 | 评委三分类（对/错/拒答） | 需区分“总答对率”与“尝试作答准确率”，防止模型靠盲猜拉分 | [第 5 章](/books/llm-eval/chapters/chapter-05) |
| **FactScore** | 2023 · Min 等 | 长文本传记 / 报告原子声明级 | 原子拆解 + 知识源检索核验 | 依赖拆解粒度与底层验证器精度，须同步审计拆解遗漏率 | [第 5 章](/books/llm-eval/chapters/chapter-05) · [第 11 章](/books/llm-eval/chapters/chapter-11) |
| **AIME'24 / '25 / '26** | 2024–2026 · MAA | 每年 30 道整数填空竞赛题 | 数值等价确定性验证 | **单届 30 题方差极大（1 题 = 3.33 pp）**，须跨年合并或高 $n$ 均值 | [第 6 章](/books/llm-eval/chapters/chapter-06) |
| **FrontierMath** | 2024 · Epoch AI | 数百道未公开研究级数学题 | 托管闭源 + 符号/程序验证 | 极强抗污染标杆，但因闭源托管无法由外部团队本地直接复现 | [第 6 章](/books/llm-eval/chapters/chapter-06) |
| **LiveCodeBench** | 2024 · Jain 等 | 持续增量竞赛题 · 4 类代码子任务 | 沙箱测试用例执行（pass@k） | 须按被测模型截断日期切片；仅测算法题，不等价于仓库级 SWE 能力 | [第 6 章](/books/llm-eval/chapters/chapter-06) |
| **MMMU-Pro** | 2024 · Yue 等 | 1,730 题 · 10 选 1 + 纯图版 | 选项精确匹配 | 剔除纯文本盲答捷径，是视觉多模态底座选型的核心清洗标杆 | [第 6 章](/books/llm-eval/chapters/chapter-06) |
| **HallusionBench** | 2024 · Guan 等 | 346 图 · 1,129 道视觉错觉/幻觉题（按对照图成组） | Yes/No 成对正反联合判分 | 专抓“语言先验压倒视觉事实”；必须报告成对全对率而非单题均值 | [第 6 章](/books/llm-eval/chapters/chapter-06) |
| **HarmBench** | 2024 · Mazeika 等 | 400+ 标准化恶意行为 × 多攻击器 | 专用安全分类器 / 规则复核 | 评测自动化越狱鲁棒性，须与过拒指标联用防“全拒答刷分” | [第 7 章](/books/llm-eval/chapters/chapter-07) |
| **XSTest** | 2024 · Röttger 等 | 250 良性边界 + 200 真实恶意提示 | 拒答检测（WildGuard / 人工） | 衡量过度拒绝率 ORR 的基准锚点；建议补充领域自有业务边界语料 | [第 7 章](/books/llm-eval/chapters/chapter-07) |
| **AgentDojo** | 2024 · ETH Zurich | 97 真实任务 × 629 间接注入用例 | 沙箱环境终态 + 恶意动作检测 | 动态评测 IPI 攻防，必须同报“攻击下良性可用率”与“注入成功率” | [第 7 章](/books/llm-eval/chapters/chapter-07) |

---

## A.2 Agent 专项评测基准档案（第 8–12 章）

| 基准名称 | 年份 / 出处 | 规模与粒度 | 判分 / 验证机制 | 已知局限与口径避坑 | 本书位置 |
| --- | --- | --- | --- | --- | --- |
| **BFCL（v1–v4）** | 2024–2025 · UC Berkeley | 数千条单/并行/多轮/拒调工具题 | AST 语法校验 + 模拟状态执行 | 需区分静态 AST 子集与多轮有状态执行子集，关注“不该调用时拒调” | [第 9 章](/books/llm-eval/chapters/chapter-09) |
| **$\tau$-bench / $\tau^2$-bench** | 2024–2025 · Sierra | 零售/航空/电信多轮客服与协同任务 | 数据库终态哈希 + 政策断言 | 强依赖用户模拟器模型与温度设置，必须固定模拟器并汇报 $\mathrm{pass}^k$ | [第 2 章](/books/llm-eval/chapters/chapter-02) · [第 9 章](/books/llm-eval/chapters/chapter-09) |
| **SWE-bench Verified / Pro / Live** | 2024–2026 · Princeton 等 | Verified 500 题；Pro/Live 持续扩展 | Docker 仓内隐藏单元测试（FAIL_TO_PASS） | Full 版含模糊描述与环境损坏；须防 Agent 改测试作弊并冻结脚手架对比 | [第 10 章](/books/llm-eval/chapters/chapter-10) |
| **Terminal-Bench** | 2025 · Stanford / Laude | 百余项真实 Linux/DevOps 终端任务 | 容器文件系统/进程/服务终态断言 | 镜像依赖易腐化，须严格区分 `infra_error` 与 `model_failure` | [第 10 章](/books/llm-eval/chapters/chapter-10) · [第 14 章](/books/llm-eval/chapters/chapter-14) |
| **GAIA** | 2023 · Meta / HF 等 | 466 道跨工具多步现实助手题 | 唯一短答精确匹配（隐藏测试集） | 搜索工具质量与外网时效漂移对分数影响极大，须配录制回放代理 | [第 11 章](/books/llm-eval/chapters/chapter-11) |
| **BrowseComp** | 2025 · OpenAI | 1,266 道极难长尾网页深度检索题 | 极简短答校验（难找但极易验） | 依赖联网搜索与长程浏览预算，须明确最大搜索步数与耗时上限 | [第 11 章](/books/llm-eval/chapters/chapter-11) |
| **OSWorld** | 2024 · HKU 等 | 369 项真实 Ubuntu 桌面多应用任务 | 脚本级文件系统/配置/应用终态检查 | 高并发虚拟机开销大，须锁定分辨率、坐标体系与动作空间脚手架 | [第 12 章](/books/llm-eval/chapters/chapter-12) |
| **WebArena** | 2023 · CMU 等 | 812 项自托管电商/论坛/GitLab 网页任务 | DOM / URL / 数据库终态断言 | 自托管站点复现性好，但须防止跨任务脏状态污染，每题独立重置 | [第 12 章](/books/llm-eval/chapters/chapter-12) |
| **AndroidWorld** | 2024 · Google | 116 项真实 Android App 动态参数任务 | 设备数据库与系统状态确定性验证 | 每次动态生成任务参数抗记忆，评测须锁定模拟器快照与等待超时 | [第 12 章](/books/llm-eval/chapters/chapter-12) |
| **LoCoMo** | 2024 · Snap 等 | 长程多会话对话记忆（百轮跨度） | 问答 F1 / LLM-Judge 事实核对 | 偏重静态信息召回，须结合知识更新/时间冲突场景共同评判 | [第 12 章](/books/llm-eval/chapters/chapter-12) |
| **LongMemEval** | 2024 · Wu 等 | 500 题 · 覆盖信息更新/时序推理/拒答 | 针对记忆演化五维能力的细粒度核验 | 区分“记住了旧事实”与“按新信息正确覆写旧记忆”，贴近真实助手 | [第 12 章](/books/llm-eval/chapters/chapter-12) |

---

## A.3 统计方法学与评测理论里程碑论文（第 1–4 章与专题）

| 论文 / 文献 | 年份 / 出处 | 核心方法论贡献与对全书口径的影响 | 本书位置 |
| --- | --- | --- | --- |
| **Estimating Prevalence from the Results of a Screening Test**（Rogan & Gladen） | 1978 · *Am. J. Epidemiol.* | 提出利用灵敏度 $q_1$ 与特异度 $q_0$ 对有偏筛查阳性率进行无偏还原的 $\hat\theta_{\text{RG}}$ 公式，奠定本书 LLM Judge 统计矫正底座 | [第 3 章](/books/llm-eval/chapters/chapter-03) · [速查卡](/books/llm-eval/toolkit/metrics-and-stats) |
| **Evaluating Large Language Models Trained on Code（Codex）**（Chen 等，OpenAI） | 2021 · `2107.03374` | 发布 HumanEval 并严格推导有限样本 $(n,c)$ 下低方差无偏组合估计量 $\widehat{\mathrm{pass@}k} = 1 - \binom{n-c}{k}/\binom{n}{k}$ | [第 2 章](/books/llm-eval/chapters/chapter-02) |
| <strong>Is Your Code Generated by ChatGPT Really Correct?（EvalPlus）</strong>（Liu 等） | 2023 · NeurIPS | 将 HumanEval/MBPP 测例扩充 35–80 倍，实证确定性验证器测例不足会制造严重假阳性（`pass@1` 降幅最高达 19.3%，`pass@k` 降幅最高达 28.9%） | [第 3 章](/books/llm-eval/chapters/chapter-03) · [第 6 章](/books/llm-eval/chapters/chapter-06) |
| **Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena**（Zheng 等，LMSYS） | 2023 · NeurIPS | 系统命名位置/冗长/自我偏好三类评委偏见，确立众包盲测 + Bradley-Terry Arena Elo 范式 | [第 2 章](/books/llm-eval/chapters/chapter-02) · [第 3 章](/books/llm-eval/chapters/chapter-03) |
| **Chatbot Arena: An Open Platform & Style Control**（Chiang 等，LMSYS） | 2024 · ICML / 博客 | 在 Bradley-Terry 回归中引入回复长度与 Markdown 排版协变量，剥离“话多排版美”带来的 30+ Elo 风格水分 | [第 2 章](/books/llm-eval/chapters/chapter-02) |
| **Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations**（Miller，Anthropic） | 2024 · `2411.00640` | 系统引入配对差值降方差、聚类标准误（Liang-Zeger）与多次采样方差分解，推动 LLM 评测回归统计严谨性 | [第 1 章](/books/llm-eval/chapters/chapter-01) |
| **GSM-Symbolic: Understanding the Limitations of Mathematical Reasoning**（Mirzadeh 等，Apple） | 2024 · `2410.05229` | 通过符号模板替换数字/人名与插入无关条件，揭示静态数学榜单存在显著泛化脆弱性与记忆红利 | [第 4 章](/books/llm-eval/chapters/chapter-04) |
| **$\tau$-bench: A Benchmark for Tool-Agent-User Interaction**（Yao 等，Sierra） | 2024 · `2406.12045` | 提出“有状态环境 + 用户模拟器 + 业务政策”交互框架及衡量生产连续稳定性的核心指标 $\mathrm{pass}^k$ | [第 2 章](/books/llm-eval/chapters/chapter-02) · [第 9 章](/books/llm-eval/chapters/chapter-09) |
| **How to Correctly Report LLM-as-a-Judge Evaluations**（Lee 等） | 2025 · `arXiv:2511.21140` | 将 Rogan-Gladen 偏置矫正与含校准集不确定性的有限样本置信区间系统引入 LLM-as-a-Judge 评测报告规范 | [第 3 章](/books/llm-eval/chapters/chapter-03) · [速查卡](/books/llm-eval/toolkit/metrics-and-stats) |

---

## A.4 高频易混基准版本与计分口径对照

阅读模型发布报告时，以下五组极易被“偷梁换柱”的版本差异必须逐一核对，绝不可跨版本直接拉表比高低：

| 基准家族 | 常见混淆版本 / 子口径 | 典型分差幅度 | 推荐默认规范口径 |
| --- | --- | --- | --- |
| **SWE-bench** | Full（2,294）vs Lite（300）vs Verified（500）vs Pro / Live | 跨子集相差 15–35 pp | 通用对比用 **Verified（500）** + 固定脚手架；抗污染看 **Pro / Live** |
| **IFEval** | Prompt-Strict vs Prompt-Loose vs Instruction-Loose | Strict 与 Loose 相差 5–12 pp | 强制报告 **Prompt-level Strict**，禁止只报宽松均值 |
| **GPQA** | Extended（546）vs Main（448）vs Diamond（198） | Diamond 噪声最低但 $N$ 最小 | 统一使用 **Diamond（198）** + 多次采样均值（如 $n \ge 8$） |
| **LiveCodeBench** | 全历史累计集 vs 截断日期后纯未来切片 | 污染模型前后可差 20–30 pp | 必须标注**精确起止年月**（如 `v5 / v6` 未来窗口） |
| **$\tau$-bench** | $\mathrm{pass@}1$ 单次均分 vs $\mathrm{pass}^4$ / $\mathrm{pass}^8$ 连续可靠性 | $p=0.70$ 时 $\mathrm{pass}^4$ 仅 $24\%$ | 生产准入必须同时报告 **$\mathrm{pass@}1$ 与 $\mathrm{pass}^4$** 并锁定用户模拟器 |

::: tip 引用与复现口径核查三原则
任何内部评审报告或对外技术博客引用上表基准时，必须同时注明三项元数据：① **数据集精确版本、SHA 与切片日期**；② **评测 Harness、提示模板、脚手架与思考预算**（含 `temperature`、`max_tokens` 与工具权限）；③ **采样次数 $n$ 与配对 95% 置信区间**。
:::
