# 专题 A：经典开源数据集与基座配方档案

<p class="chapter-summary">集中归档大模型预训练、后训练与推理、多模态及 Agent 四大领域的里程碑开源数据集与公开配方：统一记录原始与清洗后规模、核心过滤与去重工艺、许可协议陷阱与主要机构出处，为基座复现、配比参照与合规排雷提供一站式索引。</p>

数据工程文献高度分散在网页爬虫、代码仓、视觉多模态与软件工程等多个社区，许多团队在复用开源数据集时容易忽略**口径差异**（例如把未过滤原始池与模型打分精选切片混为一谈）或**协议风险**（如强模型蒸馏产出的商业使用限制、代码仓强传染性 Copyleft 协议、以及网页图文 URL 大规模腐化）。

本档案将截至 **2026 年** 最具工程参照价值的 23 个代表性开源数据集按四大赛道集中编目。所有留存漏斗与去重参数遵循 [核心公式、数据账本与成本速查卡](/books/llm-data/toolkit/formulas-and-ledgers)，入库前审计见 [数据入库与上线红线清单](/books/llm-data/toolkit/data-checklist)。

---

## A.1 预训练与中期退火核心语料（第 4–6 章）

| 数据集 | 年份 / 机构 | 净规模与语言 | 核心解析 / 过滤 / 去重工艺 | 许可与工程避坑 | 本书位置 |
| --- | --- | --- | --- | --- | --- |
| **FineWeb** | 2024 · Hugging Face | ~15T tokens（英语，96 期 CC） | WARC→trafilatura 抽取 + Gopher/C4/FineWeb 启发式 + 逐快照 <a class="term-ref" href="/books/llm-data/glossary#minhash_lsh" title="以 MinHash 签名与分带分桶召回高 Jaccard 近似重复文档">MinHash LSH</a>（非全局跨快照去重） | ODC-BY；发现“逐快照去重”在最新高质量网页留存上反超粗暴全局去重 | [第 4 章](/books/llm-data/chapters/chapter-04) · [第 5 章](/books/llm-data/chapters/chapter-05) |
| **FineWeb-Edu** | 2024 · Hugging Face | 1.3T（5.4T 全打分池） | Llama-3-70B 标注 460K 样本教育分（0–5）→ 训练轻量编码器对全量打分，截取 $\ge 3$ 分切片 | ODC-BY；单用极高教育分易偏科科普文体，需与通用网页及代码混配 | [第 5 章](/books/llm-data/chapters/chapter-05) |
| **FineWeb-2** | 2024–2025 · Hugging Face | ~8TB / 1,000+ 语言 | 按语言定制 GlotLID 识别、分语种重标定启发式阈值 + 语言内 MinHash 去重与重采样权重 | ODC-BY；低资源语种极易被通用英语标点/词长启发式规则误杀，须分语种校准 | [第 5 章](/books/llm-data/chapters/chapter-05) |
| **DCLM-Baseline** | 2024 · DataComp / UW 等 | ~3.8T tokens（从 240T 粗池筛出） | FastText 高质参考集分类器（OH-2.5 + ELI5 正例 vs 网页负例）截取 Top 10% + BFF 模糊去重 | CC-BY-4.0；实证**轻量 <a class="term-ref" href="/books/llm-data/glossary#model_based_filtering" title="用轻量分类器打分截取高信息密度语料的过滤范式">模型打分过滤</a>** 在 7B 规模下较纯启发式大幅提升 MMLU | [第 3 章](/books/llm-data/chapters/chapter-03) · [第 5 章](/books/llm-data/chapters/chapter-05) |
| **Dolma / OLMo-2（Dolmino）** | 2024–2025 · AI2 | Dolma 3T；OLMo-2 预训练 4T + Dolmino 退火 843B | 全透明开源端到端管线：网页 + 论文 + 代码 + 百科，末段 <a class="term-ref" href="/books/llm-data/glossary#mid_training" title="预训练末段学习率衰减前显著上调高密度数据的退火阶段">Mid-training</a> 注入高质数学/问答/改写 | ODC-BY（子集混合协议）；**最佳透明配方标杆**，完整公开数据组成与消融曲线 | [第 6 章](/books/llm-data/chapters/chapter-06) |
| **Nemotron-CC** | 2024–2025 · NVIDIA | 6.3T tokens（含 1.9T 合成改写） | 集成分类器分层保留中低分网页中的真实信息 + 5 类风格（百科/QA/摘要等）<a class="term-ref" href="/books/llm-data/glossary#synthetic_rephrasing" title="用强模型将高信息量但行文杂乱的网页改写为清晰格式">合成改写</a> | CommonCrawl ToS + NVIDIA 开放许可；突破高阈值过杀瓶颈，延长数据受限寿命 | [第 6 章](/books/llm-data/chapters/chapter-06) |
| **StarCoder / The Stack v2** | 2023–2024 · BigCode | ~67.5TB 原始 / 600+ 语言（3T+ 去重） | Software Heritage 归档 + 仓库级上下文拼接 + <a class="term-ref" href="/books/llm-data/glossary#fim" title="将代码重排为前缀-后缀-中段以训练双向上下文补全">FIM</a> 变换 + 许可证白名单 + PII/密钥擦除 | 仅保留宽松协议仓 + 遵循作者 Opt-out；须剔除自动生成锁文件与压缩 JS | [第 4 章](/books/llm-data/chapters/chapter-04) · [第 24 章](/books/llm-data/chapters/chapter-24) |

---

## A.2 后训练指令、偏好与推理燃料库（第 8–11 章）

| 数据集 | 年份 / 机构 | 规模与形态 | 构造与清洗工艺 | 许可与工程避坑 | 本书位置 |
| --- | --- | --- | --- | --- | --- |
| **UltraChat（200k）** | 2023 · 清华 / HF | 原始 1.47M；清洗版 200K 多轮对话 | 双模型围绕主题树多轮自对话合成；200K 精选版过滤掉“作为 AI 语言模型”等模板拒答与格式错误 | MIT（衍生自商用 API 需查上游条款）；早期代表，偏通用流畅对话，逻辑深度有限 | [第 8 章](/books/llm-data/chapters/chapter-08) |
| **OpenHermes 2.5** | 2023 · Teknium | ~1M 条多源混合 SFT 指令 | 聚合代码、推理、角色扮演与科学问答多子集，统一 ShareGPT 对话结构与去重清洗 | 混合上游许可；经典高性价比通用 SFT 混合基底，但需先做 <a class="term-ref" href="/books/llm-data/glossary#decontamination" title="识别并剔除与评测集重叠样本的防泄漏清洗">训练侧去污</a> | [第 8 章](/books/llm-data/chapters/chapter-08) |
| **Tulu-3 数据套件** | 2024–2025 · AI2 | 939K SFT + 偏好对 + RLVR 题库 | 基于 Persona 扩展技能树多样性 + <a class="term-ref" href="/books/llm-data/glossary#on_policy_preference" title="正负回复对由当前策略自身采样的偏好数据">On-policy 偏好</a> + 数学/IFEval <a class="term-ref" href="/books/llm-data/glossary#rlvr_data" title="由无歧义难题与抗作弊确定性验证器构成的强化学习题库">RLVR 题库</a>全链路公开 | ODC-BY / Apache-2.0（剔除上游禁商用源）；工业界少见的 SFT→DPO→RLVR 透明配方 | [第 8 章](/books/llm-data/chapters/chapter-08) · [第 10 章](/books/llm-data/chapters/chapter-10) |
| **OpenThoughts（114k / 2-1M）** | 2025 · OpenThoughts | 114K → 1M 精选 Long-CoT 推理题 | 数学/代码/科学难题经强推理模型采样 + 确定性验证器（单测/符号）<a class="term-ref" href="/books/llm-data/glossary#rejection_sampling" title="多次采样后由确定性验证器筛选正确推理路径的微调范式">拒绝采样</a> + 难例去重 | Apache-2.0（含开源权重蒸馏路径）；纯 Long-CoT 过量易引发短对话冗长与负迁移 | [第 8 章](/books/llm-data/chapters/chapter-08) · [第 11 章](/books/llm-data/chapters/chapter-11) |
| **NuminaMath（CoT / 1.5）** | 2024–2025 · Project Numina | ~860K → 896K 竞赛数学问答 | 汇集国内外竞赛、教材与论坛题，OCR 转 LaTeX + 统一 CoT 格式 + 1.5 版新增来源标注与可验证性筛选 | Apache-2.0；原始版含部分证明题与脏 OCR，用于 RLVR 前须筛出唯一确定答案子集 | [第 10 章](/books/llm-data/chapters/chapter-10) |

---

## A.3 多模态视觉-语言代表语料（第 12–14 章）

| 数据集 | 年份 / 机构 | 规模与形态 | 过滤 / 重打标 / 解析工艺 | 许可与工程避坑 | 本书位置 |
| --- | --- | --- | --- | --- | --- |
| **DataComp（1B）** | 2023 · UW / Apple 等 | 12.8B 原始池 → 1.4B 精选图文对 | 确立“固定模型与算力、纯拼数据筛选算法”范式：NSFW/水印/分辨率过滤 + CLIP 相似度与图像聚类 | MIT 元数据（URL 指向外网原图）；**URL 链接逐年腐化（Link Rot）**，复现率随时间下降 | [第 12 章](/books/llm-data/chapters/chapter-12) |
| **OBELICS** | 2023 · Hugging Face | 1.41 亿篇网页 · 3.53 亿张图 · 115B 文本 | 从 CommonCrawl DOM 保留完整 <a class="term-ref" href="/books/llm-data/glossary#interleaved_data" title="保留网页中文本段落与多张配图自然先后顺序的连续序列">图文交错文档</a> 顺序，剔除图标/广告图与重复模板页 | CC-BY-4.0 元数据；训练原生多图上下文推理的核心基底，须配合图像缓存落地 | [第 12 章](/books/llm-data/chapters/chapter-12) |
| **FineVision** | 2025 · Hugging Face | 约 1,730 万图 · 2,400 万条样本（200+ 来源） | 对开源 VLM 监督集做统一格式标准化、跨集重复去除、低质问答清洗与系统化能力分类对齐 | 汇总各上游子集许可（含商用筛选标签）；避免团队反复手工拼接上百个异构视觉集 | [第 12 章](/books/llm-data/chapters/chapter-12) |
| **PixMo** | 2024 · AI2（Molmo） | 712K 超长密集描述 + 230 万点定位数据 | 全人类专家语音口述转写实现无蒸馏 <a class="term-ref" href="/books/llm-data/glossary#dense_recaptioning" title="生成覆盖前景主体、空间位置与文字细节的高密度视觉描述">密集重打标</a>（均长 ~200 词）+ 精确坐标点标注（PixMo-Points） | ODC-BY / 开放许可；证明“高质量无合成污染人工视觉数据”即可追平闭源视觉模型 | [第 12 章](/books/llm-data/chapters/chapter-12) · [第 19 章](/books/llm-data/chapters/chapter-19) |
| **LLaVA-OneVision 数据集** | 2024 · 字节 / NTU 等 | ~3.2M 单图 + 1.6M 多图/视频/高精混合 | 覆盖单图、多图交错与视频三阶段配方：高密度图文、图表 OCR、文档解析与通用视觉对话均衡配比 | Apache-2.0（含多上游子集）；须搭配纯文本回放语料防止视觉微调拖垮文本推理 | [第 12 章](/books/llm-data/chapters/chapter-12) · [第 14 章](/books/llm-data/chapters/chapter-14) |

---

## A.4 Agent 轨迹与可验证交互环境语料（第 15–20 章）

| 数据集 / 环境工厂 | 年份 / 机构 | 规模与任务域 | 构造与验证机制 | 许可与工程避坑 | 本书位置 |
| --- | --- | --- | --- | --- | --- |
| **ToolBench** | 2023 · 清华 / OpenBMB | 16,464 个真实 RapidAPI · ~12.6 万轨迹 | DFSDT 深度优先搜索树采样多步工具调用路径 + 自动评估器筛选通过轨迹 | Apache-2.0；外部真实 API 极易失效或限流，复现与改造须构建本地 Stateful Mock | [第 16 章](/books/llm-data/chapters/chapter-16) |
| **APIGen（/ APIGen-MT）** | 2024–2025 · Salesforce | 6 万条单轮/并行 + 5 千+ 多轮模拟环境轨迹 | 三阶段过滤（格式检查→沙箱实际执行→语义校验）；MT 版引入任务蓝图与 <a class="term-ref" href="/books/llm-data/glossary#user_simulator" title="依据人物设定与隐含目标扮演真实终端用户的受控大模型">用户模拟器</a> | CC-BY-4.0（注意基础模型生成条款）；强调“先执行再入库”，显著压低伪造参数幻觉 | [第 16 章](/books/llm-data/chapters/chapter-16) |
| **SWE-smith** | 2025 · Princeton / Stanford | 50,000+ 可执行任务 · 128 个 Python 仓 | 反向流水线：先配通仓库统一 Docker 镜像，再经 AST/LLM 注入 Bug 生成稳定 <a class="term-ref" href="/books/llm-data/glossary#fail_to_pass" title="应用补丁前稳定失败、应用正确补丁后稳定通过的单元测试验收标准">Fail-to-Pass</a> 任务 | MIT（跟随目标开源仓协议）；将单任务环境构建边际成本压低两个数量级 | [第 17 章](/books/llm-data/chapters/chapter-17) |
| **SWE-Gym** | 2024–2025 · CMU / OpenHands | 2,438 个真实仓任务 · 11 个大型 Python 项目 | 真实历史 GitHub PR + 完整预构建可执行 Docker 容器镜像 + 单元测试验收套件 | MIT；首个面向 SWE 训练与验证器建模的真实可执行容器环境池，但镜像存储开销较大 | [第 17 章](/books/llm-data/chapters/chapter-17) |
| **OSWorld** | 2024 · HKU 等 | 369 项真实 Ubuntu 桌面跨应用任务 | 真实 VM 快照 + 截图与 <a class="term-ref" href="/books/llm-data/glossary#a11y_tree" title="操作系统暴露给辅助技术的结构化界面节点与坐标树">无障碍树</a> 双观测 + 134 个确定性文件系统/应用终态评估脚本 | Apache-2.0；**核心评测标尺严禁直接用于训练**，但可借鉴其环境封装范式构造自有桌面任务 | [第 19 章](/books/llm-data/chapters/chapter-19) |
| **Mind2Web（/ Online-Mind2Web）** | 2023–2025 · OSU | 2,350 条真实跨站点网页任务（137 网站） | 人类专家录制真实商业网站多步交互，提供完整 DOM 快照、动作序列与元素定位标注 | CC-BY-4.0；静态离线 DOM 与动态线上网页存在时间漂移，训练 GUI Grounding 须做坐标归一化 | [第 19 章](/books/llm-data/chapters/chapter-19) |

---

## A.5 典型清洗与去重工艺解剖对比

不同数据集的核心差距往往不在原始语料来源，而在**留存漏斗每一步的取舍策略**。下表横向拆解四条最具代表性的工业管道：

| 管道代表 | 原始来源与保真度 | 核心筛选信号 | 去重粒度与设计亮点 | 端到端留存率 $\eta_{\text{yield}}$ |
| --- | --- | --- | --- | --- |
| **FineWeb / FineWeb-Edu** | CommonCrawl <a class="term-ref" href="/books/llm-data/glossary#warc_wet" title="保留完整原始 HTML 结构的 WARC 归档格式">WARC</a> → `trafilatura` | 启发式过滤 → 教育分分类器（$\ge 3$） | 逐快照 MinHash $(b=14, r=8)$，避免跨年老旧低质快照“挤掉”新版高质网页 | FineWeb ~12%；Edu 切片 ~1.2% |
| **DCLM-Baseline** | CommonCrawl WET/WARC 240T 粗池 | FastText 二分类（OH-2.5+ELI5 正例） | 高速 Bloom Filter 去重（BFF）+ 严格 Top-10% 模型分位截取 | ~1.6%（信噪比大幅反超纯规则） |
| **Nemotron-CC** | CommonCrawl 分层分桶保留池 | 多模型集成分类器（5 档质量分层） | 高分池轻度去重 + 中低分池经强模型改写为 QA/百科/摘要，释放长尾事实 | 综合净留存提升至 ~25%（含改写） |
| **SWE-smith** | GitHub 128 个高星 Python 仓库 | Docker 测试全绿基底 + AST/LLM 注入故障 | 按仓库先建统一镜像再批量实例化任务，由 Fail-to-Pass 单测自动去伪 | 可执行有效任务率 ~65%–80% |

---

## A.6 基座数据配方共性解剖与许可合规红线

横向比对上述 23 个里程碑资产，2025–2026 年领先基座的数据管道已收敛为一条清晰共识：**原始提取保真（WARC / 原生 DOM / 预建容器） → 轻量模型分级打分 → 多尺度防误杀去重 → 确定性验证与高密度退火**。在实际复用开源数据集前，必须核查四条合规与工程红线：

1. **上游合成条款传染**：若公开 SFT/推理数据集由闭源商用 API 蒸馏生成，即便仓库本身挂 Apache-2.0/MIT，商业闭源模型训练仍可能触发上游服务条款风险（优先选用 Tulu-3、PixMo、OpenThoughts 开源权重路径等干净血缘）。
2. **代码与多模态双层许可**：代码数据须按单仓 SPDX 标识过滤强传染性协议（GPL/AGPL）并响应作者 Opt-out；图文对数据集仅提供 URL 清单，抓取落盘时须遵守 `robots.txt`、版权排除清单（TDM Opt-out）并剔除失效/被劫持域名图片。
3. **训测严格隔离**：像 OSWorld、SWE-bench Verified 等权威基准及其关联仓库 PR 切片只能留在评测侧；复用 OpenHermes、NuminaMath、SWE-smith 等大型混合集前，必须先跑 [第 3 章](/books/llm-data/chapters/chapter-03) 的 13-gram 与仓库 Commit 级双向去污。
4. **版本哈希与配方快照**：开源数据集在 Hugging Face Hub 上可能静默修订分片，任何训练任务必须在 <a class="term-ref" href="/books/llm-data/glossary#data_lineage" title="记录原始源、清洗脚本、阈值到训练快照的双向血缘图谱">端到端数据血缘</a> 清单中锁定精确的 Git Revision Commit SHA 与文件校验和。

::: tip 如何高效检索本档案
若你要搭预训练流水线，以 **FineWeb + DCLM + Dolmino + Nemotron-CC** 为参照系；若要补强后训练与推理，优先解剖 **Tulu-3 + OpenThoughts + NuminaMath 1.5**；若要搭建多模态与 Agent 工厂，直接对标 **OBELICS / PixMo / FineVision** 与 **APIGen-MT / SWE-smith**。
:::
