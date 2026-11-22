# 第 4 章 预训练数据源谱系与高保真解析管线

<p class="chapter-summary">系统拆解预训练六大核心数据源谱系，定量揭示 CommonCrawl WARC 与 WET 在公式、代码与表格保真度上的巨大代差，深度剖析 HTML 树状抽取、PDF 版面与 OCR-VLM 分级转写、Git 仓库级依赖拓扑拼接三大专用解析管线，并落盘合规采集元数据与冷热分层对象存储账本。</p>

走进万亿级预训练数据车间，第一条必须刻在墙上的工程铁律是：**抽取器决定数据天花板（The Extractor Sets the Ceiling）**。如果上游解析器把网页里的 LaTeX 公式洗成乱码、把 Python 代码的缩进拍平为一行、或者把双栏学术 PDF 的左右两栏逐行穿插拼接成毫无逻辑的文字粥，那么下游再先进的分类器、去重引擎和千亿参数基座，也永远无法凭空把已经损毁的结构信息变回来。本章沿着“源头谱系 → WARC vs WET 保真代差 → 三大专用解析引擎 → 合规血缘与冷热存储”四步，彻底打通预训练最上游的原材料供给关。

---

## 4.1 预训练六大核心数据源谱系

一个均衡的通用基座模型绝不能只吃单一网页语料，而需要把广度世界知识、严密符号推理、结构化代码与长程叙事有机融合。当前工业级 10T–30T 预训练语料库的典型源头谱系及其核心特征如下：

| 数据源类别 | 代表来源 | 原始量级估算 | 核心能力贡献 | 最大抽取与清洗痛点 |
| --- | --- | --- | --- | --- |
| **1. 公开网页快照** | CommonCrawl（月度爬库）、自研定向垂直爬虫 | 数 PB WARC（净剩 ~5T–15T tok） | 广度常识、多领域时效知识、自然语言流畅度 | 噪音比高达 85%+；广告、导航栏、SEO 农场与镜像泛滥 |
| **2. 源码与软件仓** | GitHub、GitLab、软件包文档与 Issue/PR | ~1T–3T 原始代码 tok | 编程能力、严密逻辑推理、结构化格式遵循 | 跨文件依赖断裂；自动生成代码、锁文件、加密密钥（Secrets）混杂 |
| **3. 学术论文与科技文献** | arXiv、PubMed、S2ORC、专利库 | ~300B–800B tok | 数学公式推演、前沿科学概念、严谨论证链 | 双栏排版串行、公式符号丢失、跨页复杂表格崩坏 |
| **4. 书籍与长篇教材** | 公版书、开放教材（OpenStax）、长篇非虚构作品 | ~200B–600B tok | 长程连贯叙事、深度背景铺陈、原生 32K–128K 长窗 | 版权边界严格；扫描版 OCR 错别字与页眉页脚频繁打断正文 |
| **5. 高信噪比问答与百科** | Wikipedia、StackExchange、专业技术论坛 | ~50B–150B tok | 实体事实锚点、问题求解结构、多视角讨论 | 总量小易过拟合（需控制重复 Epoch）；问答线程与最佳答案关联易断 |
| **6. 多语种高质量语料** | 区域百科、官方公报、多语学术与新闻（中/日/欧等） | 视目标语言市场而定（~1T–5T tok） | 跨语种知识迁移、本土文化与业务落地能力 | 低资源语种机器翻译垃圾（Translationese）泛滥，启发式规则易误杀 |

---

## 4.2 WARC vs WET：为何必须彻底抛弃 WET 直采原始 HTML？

CommonCrawl 每个月都会免费发布约 80–100 TB 的网页快照，并提供两种主要文本归档形态——<a class="term-ref" href="/books/llm-data/glossary#warc_wet" title="CommonCrawl 发布的两种网页归档格式：WARC 保存完整原始 HTTP 响应与 HTML 结构，WET 仅含基础纯文本提取">WARC 与 WET 格式</a>。早期开源项目（如 C4、RedPajama-v1）为了省去解析 HTML 的 CPU 算力，直接拉取了官方预处理好的 WET 纯文本文件；然而 FineWeb、RefinedWeb 与 DCLM 的定量消融实验彻底揭穿了 WET 的结构性损毁：

| 结构信息维度 | CommonCrawl WET（官方粗提纯文本） | WARC + 自研高保真 DOM 抽取 | 对下游基座能力的直接冲击 |
| --- | --- | --- | --- |
| **数学公式（MathJax / MathML）** | 大量丢失或拍扁为无上下标乱码（保真率 **< 15%**） | 钩子还原为标准 `$...$` LaTeX（保真率 **> 85%**） | 直接决定 STEM 网页能否贡献 GSM8K / MATH 推理增益 |
| **代码块与缩进（`<pre><code>`）** | 缩进与换行被压扁为单行空白（Python 语法全毁） | 完整保留缩进并包裹 Markdown 语言围栏 | 保住百万级技术博客、StackOverflow 解答与教程代码 |
| **HTML 表格（`<table>`）** | 行列结构蒸发为无法对齐表头的词汤 | 转写为对齐 Markdown 或紧凑结构化表格 | 挽救海量财报、实验对比表与百科参数知识 |
| **页面导航与样板噪音** | 残留高达 **30%–50%**（登录/Cookie/侧边栏全在） | 正文边界识别剔除 **> 90%** 导航样板 | 大幅拉高<a class="term-ref" href="/books/llm-data/glossary#yield_funnel" title="原始语料经过过滤与去重后最终进入训练集的端到端留存比例与损益账本">留存漏斗</a>纯度，下游少写脆弱正则 |

FineWeb 的严格对照消融给出了一笔极震撼的账：**仅将同一批 CommonCrawl 快照从 WET 切换为 WARC + Trafilatura，在完全不增加 1 FLOP 训练算力的前提下，下游常识与推理基准均值即稳定跃升 +1.5 至 +3.0 个百分点**，而新增的 CPU 解析成本摊薄到 1B tokens 上甚至不到 $0.02！

---

## 4.3 三大专用高保真解析引擎实战

为吃干榨净不同载体的结构化信息，现代预训练车间早已淘汰“一把剪刀剪天下”的通用文本提取，转而为 HTML、PDF 与代码仓搭建三条独立的高保真抽取管线：

<figure class="book-figure">
  <img src="/figures/llm-data/pretrain-parsing-pipeline.svg" alt="预训练三大核心数据源高保真解析管线与冷热分层血缘存储架构" loading="lazy">
  <figcaption><span class="book-figure__label">图 4-1</span>三条专用解析流水线分别攻克 WARC 网页结构还原、PDF 双栏/公式/表格 OCR-VLM 转写与 Git 仓库级依赖拓扑拼接，最终携带完整许可与血缘元数据落盘至冷热分离的对象存储湖仓。</figcaption>
</figure>

### 1. WARC 网页解析：Trafilatura / Resiliparse + STEM 特化钩子
- **吞吐与精度权衡**：**Resiliparse**（C++ 内核）单核吞吐极高（可达数千页/秒），适合首轮极速批量清洗；**Trafilatura** 在正文边界判别、标题层级保留与去导航样板精度上更胜一筹（吞吐约为 Resiliparse 的 1/3–1/2，但 CPU 成本依然微不足道）。
- **数学与代码特化钩子（DOM Pre-hooks）**：在把 HTML 喂给通用正文抽取器之前，先过一遍轻量 DOM 预处理——识别 `<script type="math/tex">`、`data-latex`、MathML 与公式 `<img alt="...">` 节点，统一替换为带 `$...$` 保护标记的文本；对 `<pre><code>` 块显式包裹标准 Markdown 代码围栏 ```` ```lang ... ``` ```` 并锁死原始缩进；将 `<table>` 转写为规范 Markdown 表格。

### 2. 学术论文与书籍 PDF 解析：LaTeX 源码优先 + OCR-VLM 分级路由
- **LaTeX 源码绝对优先**：对 arXiv 等同时提供 `.tar.gz` 源码的论文，切忌先渲染成 PDF 再去 OCR！应直接解析 `.tex` 源码，展开自定义宏定义（`\newcommand`）、剥离纯排版指令、内联 `\input` 子文件与图表标题，可拿到接近 100% 保真度的公式与证明文本。
- **PDF 分级解析路由与成本算例**：对于仅有 PDF 的教材、研报、专利与扫描书籍，传统 `PyMuPDF` 仅按字符坐标提取，遇到双栏排版、跨页长表或扫描页会灾难性错乱。现代工业标准采用**“轻量探测 → 分级路由”**（如 **MinerU、Marker、olmOCR / Dots.OCR**）：

| PDF 页面类型 | 典型占比 | 路由解析引擎 | 吞吐与单价（每百万页 ≈ 1B 净 Token） | 保真质量 |
| --- | --- | --- | --- | --- |
| **简单单栏电子 PDF** | ~45% | 轻量版面规则 + 文本层抽取（CPU） | ~$2–$5 / 百万页 | 高（正文清晰无公式） |
| **双栏/含图表中等复杂 PDF** | ~35% | 专用版面检测 + 表格/公式小模型（GPU） | ~$30–$60 / 百万页 | 极高（阅读顺序精准重排） |
| **扫描古籍/手写/复杂公式表格页** | ~20% | **7B 级专用 OCR-VLM 批推理**（8×H100） | **~$150–$300 / 百万页** | **接近人类专家手录级保真** |

按上述分级路由算账：处理 **1 亿页（约 100B 顶级学术与教材净 Token）**混合 PDF，全部走重型 OCR-VLM 需 ~$25,000，而走分级路由总费用直降至 **~$7,000–$9,000**（约 **$0.08 / 1M 顶级知识 Token**），即可为数学、金融与科研推理注入极其稀缺的高密度弹药。

### 3. 代码仓库解析：从单文件切片升级为仓库级（Repo-Level）拓扑拼接
把 GitHub 里的每个 `.py` 或 `.cpp` 文件孤立打散送进模型，模型永远学不会跨模块查类定义与接口契约。高质量代码预训练必须升级为**仓库级上下文拼接（StarCoder2 / DeepSeek-Coder 范式）**：
1. **预处理去噪与安全清洗**：剔除二进制资产、压缩前端文件（单行超 1,000 字符）、`package-lock.json` / `go.sum` 依赖锁文件、自动生成代码（`DO NOT EDIT`），并用正则 + 高香农熵扫描擦除硬编码 API Key / 私钥凭证（落实代码侧<a class="term-ref" href="/books/llm-data/glossary#pii_redaction" title="在文本、图像与音频中自动检测个人身份信息、密钥等并以假名或遮罩替换的隐私保护管线">敏感信息脱敏</a>）。
2. **AST 依赖图拓扑排序**：用 Tree-sitter 解析仓内 `import` / `include` 引用关系，构建文件级有向依赖图并执行拓扑排序（存在环时按目录邻近度与提交时间破环），将**基础类型与接口定义排在前面、业务调用方与单元测试紧随其后**，并以 `<repo_name>`、`<file_path>` 特殊元标签顺次封装为 32K–128K 连续长样本：

```text
<repo_name>acme/quant-engine
<file_path>src/types.py
class OrderBookSnapshot: ...
<file_path>src/matcher.py
from src.types import OrderBookSnapshot
def match_orders(book: OrderBookSnapshot): ...
<file_path>tests/test_matcher.py
from src.matcher import match_orders
def test_price_time_priority(): ...
```

这种封装不仅让模型在预训练阶段直接习得跨文件符号检索与类型约束，还天然为后续第 17 章的软件工程（SWE）Agent 数据工厂铺平了代码上下文表示底座。

---

## 4.4 采集伦理、合规元数据与冷热分层存储账本

面向 2026 年全球版权与 AI 合规监管环境，解析落盘的第一步就必须把溯源（Provenance）字段作为不可缺省的一等公民写入 Silver 层元数据 Schema，全面对接第 22、24 章的<a class="term-ref" href="/books/llm-data/glossary#data_lakehouse" title="面向多模态非结构化语料与 Agent 轨迹的分层存储管理架构（Raw → Silver → Gold → Snapshot）">AI 数据湖仓</a>与<a class="term-ref" href="/books/llm-data/glossary#data_lineage" title="记录从原始采集源、清洗脚本、过滤阈值到最终训练快照与模型权重的有向无环图">端到端数据血缘</a>体系：

| Silver 层标准字段 | 数据类型 | 工程与合规核心用途 |
| --- | --- | --- |
| `doc_id` / `raw_uri` | `string`（SHA-256 / 对象路径） | 全局内容唯一指纹；反向定位原始 WARC/PDF 字节偏移，支撑重解析与溯源 |
| `source_domain` / `crawl_ts` | `string` / `int64` | 域名级质量/时效分桶；支持按时间窗口回溯知识截止日期（Knowledge Cutoff） |
| `robots_ok` / `tdm_opt_out` | `bool` / `string` | 记录采集时刻 `robots.txt` 与欧盟 TDM 保留声明（`noai`/`noimageai`），一键合规摘除 |
| `spdx_license` | `string` | 开源代码精确许可证标签（严格区分 MIT/Apache-2.0 与强传染 GPL/AGPL） |
| `extractor_ver` / `parse_meta` | `string` / `struct` | 锁定解析器代码 Commit 与结构指标（公式数、代码块数、表格数），防隐性漂移 |

- **解析阶段安全防线**：严防暗藏在网页 `display:none` / 零号字体 DOM、PDF 白色极小文字或代码注释中的<a class="term-ref" href="/books/llm-data/glossary#indirect_prompt_injection" title="暗藏在网页隐藏 DOM、PDF 白色小字或代码注释中的恶意指令，若混入训练或检索数据会诱发越权行为">间接提示注入语料</a>与定向<a class="term-ref" href="/books/llm-data/glossary#data_poisoning" title="攻击者向公开网页、代码仓或标注渠道刻意植入含特定触发词与恶意输出的样本以操控模型行为">数据投毒</a>样本——HTML 与 PDF 解析器必须严格剥离不可见渲染节点与隐形文本层，从源头斩断投毒通道。

### 原始层与解析层的冷热存储经济账（以 100 TB WARC 为例）

| 存储层级 | 存储介质与格式 | 数据体积 | 典型月度存储费（云对象存储参考） | 核心工程价值 |
| --- | --- | --- | --- | --- |
| **Raw 冷底片层** | S3 Glacier / 归档对象存储（原始 `.warc.gz` / PDF 原件） | 100 TB | **~$100–$400 / 月** | 极低成本永久封存不可变底片；解析器升级时可随时零重爬重跑 |
| **Silver 热清洗层** | 标准对象存储（Zstd 压缩 Parquet，单分片 256–512 MB） | ~18–25 TB | **~$400–$600 / 月** | 列式裁剪元数据极速筛选，供下游多轮启发式、分类器与去重高并发吞吐 |

::: tip 绝不销毁 Raw 底片，也绝不在解析阶段做不可逆硬删
业务需求与解析算法每半年就会迭代一代：今天觉得“无用”的 HTML 表格属性、图文邻域关系或 Git Commit 历史，半年后可能成为训练多模态交错文档或 SWE Agent 的稀缺金矿。**Raw 层永远只增不改（Append-only Immutable）**；所有过滤策略均应在 Silver 层以“附加打分列 / 标志位”而非物理删行的方式沉淀，随时支持低成本派生新版本训练快照。
:::

::: warning 严防开源代码许可证“整仓污染”
商业化基座与企业内部代码助手在采集 GitHub 时，切忌只看仓库根目录是否有 `LICENSE` 文件就全盘照收——许多仓虽挂 MIT，但内部 `third_party/` 或 `vendor/` 子目录夹带了 GPL 源码或无许可拷贝代码。解析管线需对子目录递归核验 `SPDX-License-Identifier` 声明并剥离常见第三方依赖包目录，既守住法务红线，又天然清除海量跨仓库重复依赖代码。
:::

拿到高保真、带血缘的 Silver 层文本之后，我们面前依然横亘着一座由 85% 噪声与海量镜像副本构成的垃圾山。下一章将深入预训练数据工程最具艺术感也最考验系统功力的核心炼炉：如何组合廉价启发式规则、轻量模型分类器打分，以及 Exact / MinHash LSH / Suffix Array / SemDeDup 四尺度去重引擎，在不误杀代码、数学与小语种的前提下，把 13T+ 原始正文精准提纯为高信噪比精矿？
