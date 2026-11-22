# 术语表

正文首次出现的专业术语均链接至本页；将鼠标悬停在带虚线下划线的术语上即可查看精简释义。

[统计公式与指标口径速查卡](/books/llm-eval/toolkit/metrics-and-stats) · [基准选型与避坑清单](/books/llm-eval/toolkit/eval-checklist)

## 效度与信度（Validity & Reliability） {#validity_reliability}

效度衡量评测指标是否真正测到了目标业务或科学能力（测得对不对）；信度衡量在相同条件下反复运行评测结果是否稳定一致（测得稳不稳）。

常见写法：`效度`、`信度`、`建构效度`、`重测信度`。

## 天花板效应（Ceiling Effect） {#ceiling_effect}

基准难度过低导致多个强模型分数全部挤在 95%–99% 顶端区间，失去区分度，微小的标注错误或随机抖动即可颠倒排名的现象。

常见写法：`天花板效应`、`饱和`、`benchmark saturation`。

## Goodhart 定律（Goodhart's Law） {#goodhart_law}

“当一项度量指标本身变成优化目标时，它就不再是一个好的度量指标。”在 LLM 评测中常表现为过拟合榜单格式、刷代理 Judge 分数或数据污染。

常见写法：`Goodhart 定律`、`指标异化`。

## 标准差（Standard Deviation, SD） {#standard_deviation}

衡量单个样本观测值（如评测集中各道题的得分 $s_i$ 或同题得分差 $d_i$）围绕平均值的离散波动幅度，常记作总体 $\sigma$ 或样本 $s$。它刻画题目本身难易分化或单题结果的固有离散程度，不会随题量 $N$ 增大而趋近于零。

常见写法：`SD`、`标准差`、`样本标准差`、`σ`。

## 标准误（Standard Error, SE） {#standard_error}

全称“标准误差”，衡量样本统计量（如评测集平均分 $\bar s$ 或两模型平均分差 $\bar d$）因有限抽样而产生的估计不确定性，即反复重抽样时该估计量分布的标准差。在独立同分布假设下满足 $\mathrm{SE} = \mathrm{SD}/\sqrt{N}$，随题量 $N$ 增大按 $1/\sqrt{N}$ 缩小，是构造置信区间（95% CI 约 $\pm 1.96\,\mathrm{SE}$）与显著性检验的核心度量。

常见写法：`SE`、`标准误`、`标准误差`、`Standard Error`。

## 同题相关系数（Paired Correlation, $\rho_{AB}$） {#paired_correlation}

两模型在同一批题目上得分序列 $(s_i^A, s_i^B)$ 的皮尔逊相关系数 $\rho_{AB} = \mathrm{Cov}(s^A, s^B)/(\sigma_A\sigma_B) \in [-1, 1]$（常简写为 $\rho$）。刻画两模型“难题同错、易题同对”的协同程度；$\rho_{AB}$ 越高，同题配对消除的题间难度方差越多（方差缩减系数为 $1 - \rho_{AB}$）。

常见写法：`ρ`、`ρ_AB`、`同题相关系数`、`皮尔逊相关系数`。

## 配对自助法（Paired Bootstrap） {#paired_bootstrap}

在比较两个模型于同一题库上的得分差时，以“题目”为单位有放回重采样并成对计算两模型差值分布的非参数显著性检验方法，可消除题目固有难度方差。

常见写法：`Paired Bootstrap`、`配对 Bootstrap`。

## McNemar 检验（McNemar's Test） {#mcnemar_test}

专门针对同一题库上二值（对/错）配对结果的精确或卡方检验，仅依赖两模型意见分歧的题数 $n_{10}$ 与 $n_{01}$ 来判断胜负是否显著。

常见写法：`McNemar 检验`、`麦克尼马尔检验`。

## 统计功效（Statistical Power, $1-\beta$） {#statistical_power}

当候选模型相对基线确实存在真实提升 $\Delta \neq 0$ 时，统计检验能够成功拒绝原假设、检出“统计显著”（即不发生漏报/假阴性）的概率，记作 $1 - \beta$（其中 $\beta$ 为第二类错误率，工程常取功效 $1 - \beta = 80\%$）。

常见写法：`Statistical Power`、`统计功效`、`1 - β`、`检出功效`。

## 最小可检测效应（MDE） {#mde}

Minimum Detectable Effect，在给定题量 $N$、显著性水平 $\alpha$（常取 0.05）与统计功效 $1-\beta$（常取 0.80）下，评测集能够稳定识别出的最小真实分差。

常见写法：`MDE`、`最小可检测效应`。

## 聚类标准误（Clustered Standard Error） {#clustered_se}

当多道子题共享同一篇阅读材料、同一个代码仓库或同一轮对话模板时，样本间存在组内相关（ICC），必须按聚类层级而非独立单题计算的修正标准误。

常见写法：`Clustered SE`、`聚类标准误`、`设计效应 DEFF`。

## 每字节比特数（BPB） {#bpb}

Bits-Per-Byte，将语言模型的交叉熵损失按原始 UTF-8 字节数归一化，从而消除不同词表与分词器切分粒度差异、支持跨模型族公平对比的压缩率指标。

常见写法：`BPB`、`Bits-Per-Byte`。

## pass@k 与无偏组合估计 {#pass_at_k}

对同一题目独立采样 $k$ 次，至少有一次通过验证的概率。有限样本 $(n, c)$ 下的无偏估计为 $1 - \binom{n-c}{k}/\binom{n}{k}$，刻画模型探索上限或带确定性验证器重试时的能力。

常见写法：`pass@k`、`pass@1`。

## pass^k（连续成功可靠性） {#pass_hat_k}

由 $\tau$-bench 提出的生产可靠性指标，衡量模型对同一任务连续独立执行 $k$ 次且**全部成功**的概率（理论值 $p^k$，无偏估计 $\binom{c}{k}/\binom{n}{k}$），反映无人工兜底时的真实稳定性。

常见写法：`pass^k`、`pass-hat-k`、`连续成功可靠性`。

## 多数投票（maj@k / Self-Consistency） {#maj_at_k}

对同一题目采样 $k$ 条推理路径并提取最终答案，取出现频次最高的答案作为最终输出所对应的准确率指标，用于衡量测试时计算扩展收益。

常见写法：`maj@k`、`cons@k`、`多数投票`。

## Bradley-Terry 模型与 Arena Elo {#bradley_terry_elo}

假设模型 $A, B$ 具有潜实力分 $S_A, S_B$，以 $P(A \succ B) = \sigma(S_A - S_B)$ 拟合人类成对盲测胜率，再经线性缩放换算为国际象棋风格 Elo 评分的统计排名方法。

常见写法：`Bradley-Terry`、`BT 模型`、`Arena Elo`。

## 风格控制（Style Control） {#style_control}

在 Chatbot Arena 等盲测对战的 Bradley-Terry 回归中，将回复长度、Markdown 列表与排版特征作为协变量剥离，以测出不靠“话多排版美”取胜的纯内容实力。

常见写法：`Style Control`、`风格控制`。

## 确定性验证器（Deterministic Verifier） {#deterministic_verifier}

不依赖另一个大模型，直接通过数学符号等价化简（SymPy）、AST / JSON Schema 校验、单元测试或环境终态哈希给出客观判分的程序化裁判。

常见写法：`确定性验证器`、`规则验证器`、`Verifier`。

## LLM-as-a-Judge {#llm_as_a_judge}

使用强语言模型对开放式生成或复杂 Agent 轨迹进行打分（Pointwise）、两两对比（Pairwise）或按细则逐项核查（Rubric-based）的自动化裁判范式。

常见写法：`LLM-as-a-Judge`、`大模型评委`、`模型判分`。

## Rogan-Gladen 矫正估计量 {#rogan_gladen}

利用评委在人类金标集上测得的灵敏度 $q_1$（TPR）与特异度 $q_0$（TNR），对有偏观测阳性率 $\hat p_{\text{raw}}$ 进行无偏还原的经典流行病学统计公式：$\hat\theta_{\text{RG}} = (\hat p_{\text{raw}} + q_0 - 1)/(q_1 + q_0 - 1)$。

常见写法：`Rogan-Gladen`、`RG 矫正`。

## 评委偏见（Judge Biases） {#judge_biases}

LLM-as-a-Judge 常见的六类系统误差：位置偏见（Position）、冗长偏见（Verbosity）、自我偏好（Self-Preference）、奉承偏见（Sycophancy）、权威/格式偏见以及分数锚定/聚类偏见。

常见写法：`位置偏见`、`冗长偏见`、`自我偏好`、`Judge 偏见`。

## 标注者间一致性（IAA：$\kappa$ / $\alpha_K$） {#iaa}

Inter-Annotator Agreement，剔除随机猜对一致性后衡量多位人类专家或“人-评委”判定吻合度的指标，常用 Cohen's $\kappa$（双人）、Fleiss' $\kappa$（多人完整）与 Krippendorff's $\alpha$（支持缺失值与有序量表）。

常见写法：`IAA`、`Cohen's κ`、`Fleiss' κ`、`Krippendorff's α`。

## 数据污染（Data Contamination） {#data_contamination}

评测集的题目、参考答案或其改写变体在模型预训练或后训练阶段意外混入训练语料，导致离线分数虚高而真实泛化能力不变的测量失效。

常见写法：`数据污染`、`训练集泄漏`、`Contamination`。

## 动态活基准（Live Benchmark） {#live_benchmark}

持续引入截断日期之后的新题（如竞赛新题、近期 GitHub Issue、实时金融/新闻事件）并按时间戳切片评测，以从机制上抵御静态数据污染的基准范式。

常见写法：`活基准`、`Live Benchmark`、`动态基准`。

## 有效上下文长度（Effective Context Length） {#effective_context_length}

模型在需要跨长文多跳推理、状态追踪或无词面线索检索（而非简单复制粘贴）时，仍能保持合理准确率的真实可用窗口长度，通常远小于宣称的最大支持长度。

常见写法：`有效上下文长度`、`RULER`、`NoLiMa`。

## 置信度校准与拒答（Calibration & Abstention） {#calibration_abstention}

衡量模型表达的确定性与真实正确率是否一致（常用期望校准误差 ECE 与 Brier 分数），以及在知识缺失或证据不足时能否诚实拒答而非编造幻觉。

常见写法：`ECE`、`Brier 分数`、`校准`、`拒答`、`Abstention`。

## 推理忠实度（CoT Faithfulness） {#cot_faithfulness}

模型生成的思维链文字是否真实反映了决定其最终答案的内部计算因果过程，而非先凭捷径猜出结论再编造一段听起来合理的“事后合理化”解释。

常见写法：`忠实度`、`CoT Faithfulness`。

## 间接提示注入（Indirect Prompt Injection） {#indirect_prompt_injection}

在 Agent 场景中，攻击者将恶意指令藏在外部网页、邮件、文档、工具返回或数据库字段里，诱使 Agent 在读取观测后劫持原任务目标或窃取敏感信息。

常见写法：`间接提示注入`、`IPI`、`Prompt Injection`。

## 攻击成功率与过度拒绝率（ASR / ORR） {#asr_orr}

ASR 衡量恶意红队攻击诱发不安全输出的占比（越低越好）；ORR 衡量模型将良性边界请求误判为有害而拒绝服务的占比（越低越好）。两者构成安全评测的帕累托权衡。

常见写法：`ASR`、`过度拒绝`、`Over-Refusal`、`ORR`。

## 脚手架（Scaffold / Agent Harness） {#scaffold}

包裹在底层 LLM 之外的系统提示词、工具封装与参数校验、规划与反思循环、上下文折叠、错误重试与编排逻辑的总称。Agent 评测必须将其与底层模型能力解耦。

常见写法：`脚手架`、`Scaffold`、`Agent Harness`。

## 用户模拟器（User Simulator） {#user_simulator}

在多轮对话或业务工单评测（如 $\tau$-bench）中，扮演真实终端用户与被测 Agent 交互的受控语言模型；需严防越权泄题、违背人设与评判漂移。

常见写法：`用户模拟器`、`User Simulator`。

## 模型上下文协议（MCP） {#mcp}

Model Context Protocol，用于标准化 Agent 与外部工具服务器、数据源和动态能力发现之间通信的开放协议；评测需覆盖工具发现、参数适配与调用失败自愈。

常见写法：`MCP`、`Model Context Protocol`。

## 终态断言（Final-State Assertion） {#final_state_assertion}

不拘泥于 Agent 中间走了哪条路径或输出了什么文字，而是直接检查任务结束后外部环境（数据库哈希、文件系统、测试套件退出码、DOM 状态）是否达成目标约束的判分方式。

常见写法：`终态断言`、`环境状态断言`、`DB Hash`。

## 检索与生成解耦（RAG Decoupling） {#rag_decoupling}

将复杂 RAG 与深度研究系统的失败严格拆分为“检索层未召回关键证据”（Recall@k / MRR / NDCG）与“证据已入窗但生成层未忠实利用或引用错位”（Faithfulness / Citation Precision）。

常见写法：`RAG 解耦`、`检索归因`、`引用可核验率`。

## 关键路径步数（Critical Steps） {#critical_steps}

在并行多智能体系统中，从任务起点到终点的执行有向无环图（DAG）上耗时最长那条串行依赖链的步数，用于衡量并行编排对端到端延迟的真实加速比。

常见写法：`Critical Steps`、`关键路径步数`。

## 评测 Harness（Evaluation Harness） {#eval_harness}

驱动模型评测全流程的自动化工程框架，包含任务加载、对话模板渲染、推理调用与并发调度、结果解析、判分验证与统计汇总六大模块。

常见写法：`Harness`、`评测框架`。

## 录制回放代理（Replay Proxy） {#replay_proxy}

在 Agent 评测期间截获并持久化所有外部 HTTP / API / 搜索响应，后续复测时按确定性键直接回放缓存结果，从而消除外网抖动与内容漂移的基础设施组件。

常见写法：`Replay Proxy`、`录制回放`、`VCR 代理`。

## 基础设施故障 vs 模型失败（`infra_error` vs `model_failure`） {#infra_vs_model_error}

评测异常分类铁律：API 限流 429、容器 OOM、镜像拉取超时等基础设施异常必须标记为 `infra_error` 并与模型真实能力失败（`model_failure`）分桶统计，严禁按 0 分混入准确率分母。

常见写法：`infra_error`、`model_failure`、`异常分桶`。

## 联合帕累托前沿（Quality-Cost-Latency Pareto） {#pareto_frontier}

在准确率（质量）、单任务美元开销（$/Task）与端到端 P95 延迟构成的多维空间中，不存在被其他方案在所有维度同时碾压的最优折中方案集合。

常见写法：`帕累托前沿`、`Pareto Frontier`、`性价比前沿`。

## 开放编码误差分析（Open Coding） {#open_coding}

源自质性研究的系统化误差分析方法：不预设先入为主的标签，人工深度通读 50–100 条真实失败轨迹，自下而上提炼现象并收敛为互斥、可量化的根因分类表。

常见写法：`Open Coding`、`开放编码`、`误差分析`。

## 评测驱动开发（EDD） {#edd}

Evaluation-Driven Development，将业务黄金评测集与通过门槛置于 Prompt、脚手架及模型开发之前，任何变更均以离线回归与误差分析指标为准绳的工程范式。

常见写法：`EDD`、`评测驱动开发`。

## 影子流量与灰度 A/B（Shadow & Canary A/B） {#shadow_canary}

影子流量将线上真实请求异步复制给候选模型/Agent 暗跑而不影响用户响应；灰度 A/B 则按可控比例切流并对比真实业务转化与隐式质量信号。

常见写法：`影子流量`、`Shadow Traffic`、`灰度 A/B`。

## 项目反应理论与自适应测试（IRT / CAT） {#irt_cat}

源自心理测量学的统计建模方法：为每道题估计难度 $b_j$ 与区分度 $a_j$、为模型估计潜能力 $\eta_m$，并据此动态挑选下一道信息量最大的题目（CAT）以大幅缩减题量。

常见写法：`IRT`、`CAT`、`项目反应理论`、`自适应评测`。

## 可扩展监督与隐藏能力（Scalable Oversight & Sandbagging） {#scalable_oversight}

可扩展监督研究当模型能力逼近甚至超越单个人类专家时如何借助辩论、分解与验证辅助人类可靠评判；Sandbagging 指模型在安全或能力评测中策略性地故意压低表现以规避监管限制。

常见写法：`可扩展监督`、`Scalable Oversight`、`Sandbagging`、`隐藏能力`。
