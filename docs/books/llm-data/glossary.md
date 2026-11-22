# 术语表

正文首次出现的专业术语均链接至本页；将鼠标悬停在带虚线下划线的术语上即可查看精简释义。

[核心公式与数据账本速查卡](/books/llm-data/toolkit/formulas-and-ledgers) · [数据入库与上线红线清单](/books/llm-data/toolkit/data-checklist) · [最小可运行 Python 工具箱](/books/llm-data/toolkit/reference-code)

## 数据受限 Scaling Law（Data-Constrained Scaling） {#data_constrained_scaling}

Muennighoff 等提出的扩展规律：当唯一高质量语料有限而需要多轮（Epoch）重复训练时，重复数据的边际收益呈指数衰减，有效数据量 $D_{\text{eff}}$ 在重复约 4 轮后显著放缓并在极限处饱和。

常见写法：`数据受限 Scaling`、`Data-Constrained Scaling`。

## 有效数据量（Effective Tokens, $D_{\text{eff}}$） {#effective_tokens}

扣除重复轮数衰减、噪声清洗损益、数据污染与合成坍缩折损后，真正转化为模型泛化能力增益的折算 Token 数量。

常见写法：`有效 Token`、`Effective Tokens`、`$D_{\text{eff}}$`。

## 数据留存漏斗（Yield Funnel） {#yield_funnel}

原始语料经过解析抽取、语言过滤、启发式清洗、模型打分与多尺度去重后，最终进入训练集的端到端留存比例 $\eta_{\text{yield}}$ 与各环节损益账本。

常见写法：`留存漏斗`、`Yield Funnel`、`洗数漏斗`。

## 分词生育率（Fertility） {#fertility}

分词器将单个自然语言词（或语义单元）平均切分出的 Token 数量；生育率越低，压缩率越高，相同上下文窗口承载的有效信息越多且推理成本越低。

常见写法：`Fertility`、`生育率`、`分词压缩率`。

## 块内注意力掩码（Intra-document Attention Masking） {#intra_doc_masking}

在将多篇不相关文档打包（Packing）进同一条固定长度训练序列时，于注意力矩阵中阻断跨文档 Token 互见的块对角掩码，防止模型学到伪跨文档关联。

常见写法：`Intra-doc Masking`、`块内注意力掩码`、`文档隔离掩码`。

## 填充中间任务（FIM / Fill-in-the-Middle） {#fim}

将代码或文本拆分为前缀、中段与后缀并重排为 `<PRE> 前缀 <SUF> 后缀 <MID> 中段` 格式的预训练变换，使因果语言模型原生具备双向上下文代码补全能力。

常见写法：`FIM`、`Fill-in-the-Middle`、`中段填充`。

## 代理模型寻优（Proxy Scaling） {#proxy_scaling}

在投入百卡/千卡大规模训练前，先用 300M–3B 小模型在候选数据配方上做低成本对照消融，以预测大模型在目标评测集上相对排序的方法。

常见写法：`Proxy Scaling`、`小模型代理实验`。

## 微退火评测（Micro-annealing） {#micro_annealing}

从一个预训练中间检查点分叉，用少量高质量候选数据执行短程快速学习率退火（Decay），从而以极低算力灵敏检出新增数据源真实价值的技术。

常见写法：`Micro-annealing`、`微退火`。

## 训练侧去污（Decontamination） {#decontamination}

在语料入库或训练前，通过 N-gram 精确匹配、Suffix Array 或语义向量近邻检测，主动识别并剔除与公开基准或企业密封评测集重叠的样本。

常见写法：`去污`、`Decontamination`、`防泄漏清洗`。

## WARC 与 WET 格式 {#warc_wet}

CommonCrawl 发布的两种网页归档格式：WARC 保存完整原始 HTTP 响应与 HTML 结构（保真度高、适合自研抽取），WET 仅含基础纯文本提取（公式、代码块与表格损毁严重）。

常见写法：`WARC`、`WET`、`CommonCrawl 归档`。

## 启发式过滤（Heuristic Filtering） {#heuristic_filtering}

基于文档长度、标点比例、重复行占比、词汇复杂度与黑名单 URL 等确定性规则剔除低质网页与机器生成垃圾的预清洗阶段（如 C4、Gopher、FineWeb 规则集）。

常见写法：`启发式过滤`、`规则清洗`。

## 模型打分过滤（Model-based Filtering） {#model_based_filtering}

利用少量大模型或人工标注的教育价值/信息密度样本，训练轻量分类器（如 FastText 或小型编码器）对万亿级语料打分并截取高分分位数的高信噪比过滤范式（如 FineWeb-Edu、DCLM）。

常见写法：`模型过滤`、`分类器打分`、`Model-based Filtering`。

## MinHash 与局部敏感哈希（MinHash + LSH） {#minhash_lsh}

将文档切分为 $k$-shingle 后通过多组随机哈希取最小值生成固定长度指纹，再划分为 $b$ 个 Band × $r_{\text{lsh}}$ 行桶碰撞，以近线性复杂度在 TB/PB 级语料中召回高 Jaccard 相似度近似重复文档的算法。

常见写法：`MinHash LSH`、`模糊去重`、`近似去重`。

## 后缀数组去重（Suffix Array Deduplication） {#suffix_array_dedup}

在全局语料字节流上构建后缀数组，精确查找并切除任意跨文档出现的超长重复子串（如页眉页脚、版权声明、模板文本与代码拷贝）的子串级去重技术。

常见写法：`Suffix Array`、`子串去重`、`精确子串去重`。

## 语义去重（SemDeDup） {#semdedup}

将文档或样本编码为稠密向量，在聚类簇内剔除余弦相似度极高的“措辞不同但语义高度雷同”样本，以提升训练集概念覆盖密度与样本效率的方法。

常见写法：`SemDeDup`、`语义去重`。

## 中期训练与退火阶段（Mid-training / Annealing） {#mid_training}

位于大规模通用预训练末段、学习率逐步衰减至零前的关键阶段：显著上调数学、代码、长文档、百科与改写合成数据的配比，以极低总 Token 占比实现推理与知识能力跃迁。

常见写法：`Mid-training`、`中期训练`、`退火阶段`、`Decay Stage`。

## 预训练改写合成（Synthetic Rephrasing） {#synthetic_rephrasing}

利用强模型将原始高信息量但行文杂乱的网页重写为教科书体、问答对、科普摘要或思维推导格式（如 Phi、WRAP、Nemotron-CC），在不凭空捏造事实的前提下放大知识可学性。

常见写法：`合成改写`、`教科书化改写`、`Synthetic Rephrasing`。

## 流式数据集（Streaming Dataset） {#streaming_dataset}

将数据切分为顺序可读的二进制分片（Shard）存于对象存储，训练节点按需异步预取、解压与确定性混洗，避免本地磁盘装不下 TB 级语料的存储加载架构。

常见写法：`Streaming Dataset`、`流式加载`。

## 确定性混洗（Deterministic Shuffling） {#deterministic_shuffling}

基于固定随机种子与分片/行索引映射实现的全局伪随机采样顺序，确保多机断点续训或扩缩容后既不漏看样本也不意外重复读取已训样本。

常见写法：`确定性混洗`、`断点续训一致性`。

## 能力分类树（Taxonomy Coverage） {#taxonomy_coverage}

用于指导 SFT 与合成数据覆盖度的多层级任务/领域技能树，通过追踪各叶节点的样本密度与语义覆盖盲区来系统消除数据偏科。

常见写法：`Taxonomy`、`能力分类树`、`多样性覆盖`。

## 拒绝采样（Rejection Sampling / RFT） {#rejection_sampling}

让强模型或当前策略对每道题独立采样多条候选回复/思维链，经外部验证器、单测或高置信度裁判过滤掉错误与低质路径，仅保留通过样本用于 SFT 微调的经典范式。

常见写法：`Rejection Sampling`、`拒绝采样`、`RFT`。

## 同策略偏好数据（On-policy Preference Data） {#on_policy_preference}

正负回复对 $(y^+, y^-)$ 均由当前待优化策略本身采样产生并标注偏好的数据集；相比从异构旧模型收集的异策略数据，能大幅缓解分布偏移与奖励过优化。

常见写法：`On-policy 偏好`、`同策略偏好对`。

## 评分细则（Rubric） {#rubric}

将开放式、非唯一答案任务的“好坏”拆解为一组可核验、带权重的原子检查项（Checklist）与扣分红线，是开放域偏好标注、LLM Judge 与 Rubrics-RL 的核心数据资产。

常见写法：`Rubric`、`评分细则`、`原子检查项`。

## 可验证奖励题库（RLVR Data） {#rlvr_data}

专供可验证奖励强化学习使用的数据资产，由“清晰无歧义的难题 Prompt + 抗作弊确定性验证器（符号等价/单元测试/环境断言）”成对构成，不再依赖单一标准解题文本。

常见写法：`RLVR 数据`、`可验证题库`。

## 甜点区动态课程（Sweet Spot Curriculum） {#sweet_spot_curriculum}

根据当前模型在题库上的采样通过率（如 $p_i \in [0.1, 0.8]$）动态筛选中等难度题目的数据调度机制，剔除全对与全错的零梯度死题，最大化单位算力的策略梯度信噪比。

常见写法：`甜点区课程`、`Sweet Spot`、`动态难度分桶`。

## 负迁移与能力跷跷板（Negative Transfer） {#negative_transfer}

后训练中上调某一类数据（如长思维链或特定格式指令）后，导致模型在另一类任务（如短对话遵循、创意写作或通用知识）上准确率显著回退的多任务干扰现象。

常见写法：`负迁移`、`能力跷跷板`、`灾难性遗忘`。

## 过度拒绝（Over-refusal / False Refusal） {#overrefusal}

安全对齐数据中拒绝样本比例过高或触发词过于机械，导致模型将包含敏感字眼但完全合法的良性请求错误拒绝（“变傻/不敢答”）的现象。

常见写法：`过度拒绝`、`误拒`、`Over-refusal`。

## 图文交错文档（Interleaved Image-Text Data） {#interleaved_data}

保留原始网页或论文中“文本段落—多张配图—后续论述”自然先后顺序的连续多模态序列，是训练多图推理、上下文指代与长图文理解的关键预训练语料。

常见写法：`图文交错`、`Interleaved Data`。

## 密集重打标（Dense Recaptioning） {#dense_recaptioning}

用强 VLM 重新审视原始图像或视频片段，生成覆盖前景主体、空间位置、文字 OCR、材质细节与因果动作的高信息密度描述，以替代噪声极高的原始 HTML Alt-text。

常见写法：`密集重打标`、`Recaptioning`。

## 动态分辨率切片（Dynamic Resolution / AnyRes） {#dynamic_resolution}

不把高分辨率文档或 UI 截图粗暴压缩为固定小正方形，而是按原图长宽比自适应切分为若干标准图块（Tile）加一张全局缩略图，以保住密集小字与细微坐标信息。

常见写法：`动态分辨率`、`AnyRes`、`多图块切分`。

## 镜头切分（Scene Detection） {#scene_detection}

在视频数据预处理中自动识别转场边界，将长视频拆解为语义连贯的原子镜头片段（Clip），并过滤静态 PPT、黑屏、低清晰度与剧烈抖动片段的过程。

常见写法：`镜头切分`、`Scene Detection`、`视频切片`。

## 全双工语音数据（Full-duplex Audio Data） {#full_duplex_audio}

记录双方同时听与说、包含自然打断（Barge-in）、插话、停顿反馈（Backchannel）与毫秒级时序对齐的双声道真实/合成语音交互语料。

常见写法：`全双工语音`、`Full-duplex Audio`。

## 视觉长思维链（Visual CoT / Thinking with Images） {#visual_cot}

模型在视觉推理过程中不仅输出纯文本推导，还交替调用裁剪、放大、旋转、标注或代码绘图等视觉操作，把中间视觉观测纳入推理链的多模态数据范式。

常见写法：`Visual CoT`、`Thinking with Images`、`视觉思维链`。

## 统一轨迹中间表示（Trajectory IR） {#trajectory_ir}

跨工具调用、终端执行、网页检索与 GUI 操控的标准化 JSON/Parquet 轨迹数据结构，统一封装多轮消息、多模态观测、工具 Schema 版本、终态断言与 Token 级掩码元信息。

常见写法：`Trajectory IR`、`轨迹中间表示`、`统一轨迹 Schema`。

## 轨迹损失掩码（Loss Mask） {#loss_mask}

在多轮 Agent 监督训练中精确区分“模型主动生成的思考与动作（置 1）”和“用户输入、工具返回、报错日志与环境截图（置 0）”的逐 Token 梯度开关。

常见写法：`Loss Mask`、`环境观测掩码`。

## 环境即数据（Environment-as-Data） {#environment_as_data}

把可重置、可并发实例化、带确定性状态断言的沙箱应用/数据库/代码仓本身当作一等数据资产来规模化生产和版本化管理，从而源源不断孵化可验证多轮交互任务。

常见写法：`Environment-as-Data`、`环境即数据`。

## MCP 工具协议与 Schema（MCP Schema） {#mcp_schema}

Model Context Protocol 定义的标准化工具发现、参数 JSON Schema 与资源调用接口；清洗规范化 MCP Schema 与参数约束是工具调用数据合成的第一步。

常见写法：`MCP`、`MCP Schema`、`工具描述规范`。

## 用户角色模拟器（User Persona Simulator） {#user_simulator}

在多轮交互数据合成中，依据特定人物设定、隐含目标与知识盲区扮演真实终端用户，与 Agent 开展多轮追问、纠偏和条件变更对话的受控大模型。

常见写法：`User Simulator`、`用户模拟器`。

## 失败转通过测试（Fail-to-Pass Test） {#fail_to_pass}

软件工程数据工厂的核心验收标准：一道有效修复任务必须存在至少一组单元测试，在应用补丁前**稳定失败**（复现缺陷）、应用正确补丁后**稳定通过**且不破坏已有测试（Pass-to-Pass）。

常见写法：`Fail-to-Pass`、`F2P 测试`。

## 句级引用归因（Citation Grounding） {#citation_grounding}

在 Deep Research 与企业 RAG 数据中，要求生成报告的每一条关键事实主张都严格绑定到检索上下文中的具体文档段落、页码或表格单元格，杜绝无中生有的“伪引用”。

常见写法：`Citation Grounding`、`引用归因`、`证据链绑定`。

## 无障碍树（Accessibility Tree / A11y Tree） {#a11y_tree}

操作系统与浏览器暴露给辅助技术的结构化界面节点树，包含按钮、输入框的语义角色、文本标签与边界框坐标，常与原始截图联合对齐用于 GUI Agent 数据构造。

常见写法：`A11y Tree`、`无障碍树`。

## 界面元素定位（UI Grounding） {#ui_grounding}

将自然语言操作意图（如“点击右上角导出 CSV 图标”）精准映射到屏幕归一化坐标 $(x, y) \in [0, 1]^2$ 或边界框的视觉-空间定位基础能力及对应训练数据。

常见写法：`UI Grounding`、`界面定位`。

## 逆向任务合成（Reverse Task Synthesis） {#reverse_task_synthesis}

针对 GUI 或复杂软件环境，先让探索 Agent 在沙箱中执行一段有效状态迁移序列并记录全过程变化，再由强模型回看状态 diff 反推自然语言用户任务指令的低成本合成范式。

常见写法：`逆向任务合成`、`Reverse Task Synthesis`。

## 假成功 / 瞎蒙轨迹（Lucky Hack） {#lucky_hack}

Agent 在多轮交互中虽然最终侥幸触发了通过判定（如篡改测试脚本、靠硬编码猜中或经过大量死循环碰巧命中），但中间推理或操作逻辑存在严重缺陷、绝不能纳入训练集的毒化轨迹。

常见写法：`Lucky Hack`、`假成功轨迹`、`奖励作弊轨迹`。

## 反事实修复（Counterfactual / Backtracking Repair） {#counterfactual_repair}

对失败的 Agent 轨迹精准定位首个导致偏航的关键分叉步（Critical Error Step），回滚沙箱状态至该步之前并引入强模型或人工修正动作，从而将昂贵的失败轨迹转化为高质量正样本与步级对比对。

常见写法：`反事实修复`、`Counterfactual Repair`、`分叉点回滚修复`。

## 上下文压缩摘要（Context Compaction） {#context_compaction}

当长程 Agent 交互逼近上下文窗口上限时，将早期冗余工具日志压缩为高保真结构化状态摘要（保留关键事实、已验证路径与待办约束）的专用训练数据与能力。

常见写法：`Context Compaction`、`上下文压缩`。

## 模型坍缩（Model Collapse） {#model_collapse}

模型反复在自身或同族模型生成的合成数据上递归微调且缺乏真实世界锚定或外部验证时，分布尾部稀有知识逐步消失、输出趋同僵化且方差发散的退化现象。

常见写法：`模型坍缩`、`Model Collapse`、`数据自噬`。

## AI 数据湖仓（AI Data Lakehouse） {#data_lakehouse}

面向多模态非结构化语料与 Agent 轨迹的分层存储管理架构（Raw 原始层 → Silver 清洗层 → Gold 训练特征层 → Snapshot 不可变快照），兼顾大对象吞吐、向量检索与 ACID 版本控制。

常见写法：`AI Data Lakehouse`、`多模态数据湖仓`。

## 端到端数据血缘（Data Lineage） {#data_lineage}

记录从原始采集源、清洗脚本 Commit、过滤阈值、合成模型版本、沙箱镜像哈希到最终训练快照与模型权重的有向无环图（DAG），支撑故障精准回溯与合规定向删数。

常见写法：`数据血缘`、`Data Lineage`。

## 双轨物理隔离（Dual-track Physical Isolation） {#dual_track_isolation}

线上生产日志回流后，必须在用户/会话/任务哈希维度严格拆分为互不相交的“评测黄金集轨”与“训练候选池轨”，并执行跨轨去重检查，严防数据飞轮变成自测自训的虚假涨点机器。

常见写法：`双轨隔离`、`训测物理隔离`。

## 轨迹老化（Trajectory Staleness） {#trajectory_staleness}

在企业生产飞轮中，由于线上工具 API Schema 变更、前端 UI 改版或业务规章更新，导致几个月前沉淀的历史 Agent 轨迹变成“过时错误示范”的现象，需通过生命周期 TTL 与自动回放校验治理。

常见写法：`轨迹老化`、`Trajectory Staleness`。

## 敏感信息脱敏（PII Redaction & Pseudonymization） {#pii_redaction}

在文本、图像截图与音频中自动检测个人身份信息（姓名、手机号、证件号、密钥、人脸、车牌等），并以保持语义结构一致的假名或遮罩替换的隐私保护管线。

常见写法：`PII 脱敏`、`隐私擦除`、`假名化`。

## 间接提示注入语料（Indirect Prompt Injection） {#indirect_prompt_injection}

暗藏在网页隐藏 DOM、PDF 白色小字、代码注释或屏幕图像文字中的恶意指令，若未经清洗混入预训练或 Agent 检索/微调数据，会诱发越权工具调用或信息外泄。

常见写法：`间接提示注入`、`Indirect Prompt Injection`。

## 数据投毒（Data Poisoning） {#data_poisoning}

攻击者向公开网页、代码仓或众包标注渠道刻意植入含特定触发词与恶意输出的样本（如后门样本），以极小污染占比操控模型在特定输入下产生预设危险行为的安全威胁。

常见写法：`数据投毒`、`Data Poisoning`、`后门语料`。
