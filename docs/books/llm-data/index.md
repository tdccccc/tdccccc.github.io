# LLM 与 Agent 数据工程：原理、配方与迭代飞轮

<p class="chapter-summary">从 Data-Constrained Scaling 与有效数据账本的第一性原理出发，系统打通万亿级预训练与中期退火清洗、SFT/偏好/RLVR 后训练燃料库、图文/视频/语音多模态数据全栈、Tool/SWE/Deep Research/GUI/多智能体 Agent 轨迹工厂，以及规模化合成防坍缩、企业数据湖血缘与生产回流飞轮。</p>

大模型与智能体工程演进至今，架构日益趋同、算力决定下限，**真正拉开代差的长期护城河已经彻底回归数据工程**。无论是从百 TB 网页中淘出高密度预训练语料，为 RLVR 与长思维链构造零作弊可验证题库，还是在多模态与多轮沙箱环境里大规模生产高信噪比 Agent 轨迹，底层都在围绕同一条全书核心账本展开：

$$
D_{\text{eff}} \;=\; \underbrace{N_{\text{raw}} \cdot \eta_{\text{yield}}}_{\text{解析/过滤/去重有效量}} \;\times\; \underbrace{q(\mathcal{D}) \cdot d(\mathcal{D})}_{\text{质量与多样性增益}} \;-\; \underbrace{\mathcal{L}_{\text{repeat / contam / collapse}}}_{\text{重复衰减、污染与自噬折损}}
$$

这本《LLM 与 Agent 数据工程：原理、配方与迭代飞轮》是 **Tdccccc's Atlas** 的第四本系统专著，与 [《LLM 推理工程：原理与方法》](/books/llm-inference/)、[《LLM 强化学习：原理与后训练实践》](/books/llm-rl/) 及 [《LLM 与 Agent 评测：原理、基准与工程实践》](/books/llm-eval/) 共同构成完整的<strong>「数据燃料 × 后训练引擎 × 推理底座 × 评测标尺」四维工程闭环</strong>。全书按<strong>「先算清漏斗与成本账、再拆解多模态与 Agent 机制、最后打通资产积累与生产归因」</strong>的主线，以 **6 篇 25 章**完整覆盖获取、清洗、合成、积累、治理与迭代全生命周期。

<div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin:1.1rem 0 1.4rem;">
  <a href="/books/llm-data/chapters/chapter-01" style="display:inline-flex;align-items:center;padding:0.55rem 1.15rem;border-radius:8px;background:var(--vp-c-brand-1);color:#fff;font-weight:600;text-decoration:none;">从第 1 章开始 →</a>
  <a href="#reading-paths" style="display:inline-flex;align-items:center;padding:0.55rem 1.05rem;border-radius:8px;border:1px solid var(--vp-c-divider);color:var(--vp-c-text-1);font-weight:600;text-decoration:none;">按角色选路线</a>
  <a href="/books/llm-data/toolkit/formulas-and-ledgers" style="display:inline-flex;align-items:center;padding:0.55rem 1.05rem;border-radius:8px;border:1px solid var(--vp-c-divider);color:var(--vp-c-text-1);font-weight:600;text-decoration:none;">核心公式与数据账本速查</a>
</div>

<figure class="book-figure">
  <img src="/figures/llm-data/data-fullstack-map.svg" alt="LLM 与 Agent 数据工程全栈地图" loading="lazy">
  <figcaption><span class="book-figure__label">全景图</span>自下而上打通有效数据底座、预训练/后训练/多模态燃料供应、Agent 多轮环境与轨迹高地，以及企业数据湖与生产回流飞轮四层，左侧贯穿“留存漏斗、成本 ROI 与血缘防污染”主轴，对应全书 6 篇 25 章。</figcaption>
</figure>

## 按角色选择阅读路线 {#reading-paths}

不必从头到尾线性读完。结合你当前的研发角色选一条主线，遇到公式、清洗阈值或代码细节再随时回查速查卡。

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-data/part-2">
    <div>
      <div class="part-card__num">ROUTE 01 · 第 1–7 + 12–13 + 21 章</div>
      <div class="part-card__title">预训练、多模态底座与大数据基建</div>
      <p class="part-card__desc">吃透 Data-Constrained Scaling、文本与多模态打包账本、HTML/PDF/Repo 解析、分类器打分与 MinHash/Suffix 去重、Mid-training 退火、VLM/视频/音频管线与 10T+ 分布式洗数架构。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/part-3">
    <div>
      <div class="part-card__num">ROUTE 02 · 第 1–3 + 8–11 + 14 + 21 章</div>
      <div class="part-card__title">后训练 SFT、RLVR 与多模态推理配方</div>
      <p class="part-card__desc">掌握少而精 SFT 复杂度筛选、Long-CoT 拒绝采样、On-policy 偏好与高区分度 Rubric 工厂、RLVR 甜点区题库、视觉长思维链、负迁移与过度拒绝平衡及规模化批合成防坍缩。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/part-5">
    <div>
      <div class="part-card__num">ROUTE 03 · 第 1–3 + 15–25 章</div>
      <div class="part-card__title">Agent 轨迹工厂与企业数据飞轮</div>
      <p class="part-card__desc">直击 Trajectory IR 与 Loss Mask、Environment-as-Data、Tool/MCP、SWE/Terminal、Deep Research/多模态 RAG、GUI Grounding、反事实修复与长记忆协作，落地多模态数据湖与生产回流飞轮。</p>
    </div>
  </a>
</div>

## 全书结构总览

### 六篇 25 章主线

| 篇目 | 章节范围 | 占比 | 核心问题 | 入口 |
| --- | --- | --- | --- | --- |
| **第一篇 数据第一性原理与度量底座** | 第 1–3 章 | 12% | 重复数据何时饱和？文本与多模态怎么算打包账？怎样用小模型 Proxy 寻优配比并守住训练侧去污红线？ | [进入第一篇](/books/llm-data/part-1) |
| **第二篇 预训练与中期训练数据工程** | 第 4–7 章 | 16% | 万亿级网页/论文/代码如何高保真解析、模型打分与多尺度去重？Mid-training 退火与分布式基建怎么做？ | [进入第二篇](/books/llm-data/part-2) |
| **第三篇 后训练数据工程（SFT / 偏好 / RLVR）** | 第 8–11 章 | 16% | 少而精 SFT、On-policy 偏好、Rubric 细则与 RLVR 可验证题库怎么造？如何治负迁移与过度拒绝？ | [进入第三篇](/books/llm-data/part-3) |
| **第四篇 多模态数据工程全栈** | 第 12–14 章 | 12% | 图文对/交错文档/密集重打标、视频与全双工语音管线、Visual CoT 及跨模态混配防纯文本遗忘如何落地？ | [进入第四篇](/books/llm-data/part-4) |
| **第五篇 Agent 数据工程（核心加厚）** | 第 15–20 章 | 24% | Trajectory IR 与环境即数据如何建模？Tool/MCP、SWE、Deep Research、GUI 轨迹怎么合成、筛选、反事实修复与支撑多智能体协作？ | [进入第五篇](/books/llm-data/part-5) |
| **第六篇 规模化合成、数据积累与迭代飞轮** | 第 21–25 章 | 20% | 批合成算力账与模型坍缩怎么解？如何建企业多模态数据湖、跑通线上回流飞轮、守住脱敏版权红线并做全周期归因？ | [进入第六篇](/books/llm-data/part-6) |

### 横切参考区

| 区域 | 页面 | 适用场景 |
| --- | --- | --- |
| 进阶专题库 | [专题 A：经典开源数据集与基座配方档案](/books/llm-data/topics/dataset-archive) | 集中检索 FineWeb / DCLM / Nemotron-CC / Tulu-3 / OpenThoughts / DataComp / FineVision / SWE-smith / OSWorld 公开规模与清洗口径 |
| 进阶专题库 | [专题 B：合成数据与模型坍缩的理论边界](/books/llm-data/topics/model-collapse-theory) | 深入替换式 vs 累加式迭代分布演化，解析外部 Verifier / 沙箱 Grounding 如何锁住方差上界 |
| 进阶专题库 | [专题 C：具身智能（VLA）与世界模型数据工程速览](/books/llm-data/topics/embodied-vla-data) | 延伸多模态 + Agent 前沿边界：遥操作采集、Sim-to-Real 合成、动作 Token 化与物理一致性清洗 |
| 进阶专题库 | [专题 D：垂直行业（金融 / 医疗 / 法律 / 工业）私有数据实战](/books/llm-data/topics/vertical-industry-data) | 聚焦专业多模态文档解析、强合规脱敏、领域知识图谱合成与垂直 Agent 轨迹资产沉淀 |
| 参考工具箱 | [核心公式、数据账本与成本速查卡](/books/llm-data/toolkit/formulas-and-ledgers) | 全书唯一符号与账本事实源：Scaling 重复折算、多模态 Token 账、MinHash LSH、RLVR 甜点区与合成 ROI 核算 |
| 参考工具箱 | [数据入库与上线红线清单](/books/llm-data/toolkit/data-checklist) | 工位常备：预训练、多模态、SFT、RLVR 与 Agent 五类数据入库前 15 项必查红线与异常排障表 |
| 参考工具箱 | [最小可运行 Python 数据工具箱](/books/llm-data/toolkit/reference-code) | 零重依赖标准库实现：Data-Constrained Scaling、MinHash + LSH 去重、N-gram 去污、Trajectory IR 校验与 Loss Mask、Pass@k 分桶与合成成本核算 |

## 阅读约定与交互体验

- **全局符号与口径统一**：跨社区文献常混用符号（例如把重复轮数与 LSH 行数都写成 $r$）。全书严格遵循 [核心公式、数据账本与成本速查卡](/books/llm-data/toolkit/formulas-and-ledgers)，正文算例统一采用 2026 年代表性工程基准口径。
- **三个原生交互实验**：第 1 章（Data-Constrained Scaling 与多 Epoch 有效数据曲线）、第 5 章（MinHash + LSH 频带参数 $(b, r_{\text{lsh}})$ 与 S 型召回曲线）、第 21 章（文本 / 多模态 / Agent 合成 Yield 漏斗与单位有效成本 ROI 模拟器），支持页内拖动滑块实时验证直觉。
- **高清配图放大与术语悬停**：全书配 28 张原创机制矢量图，点击支持全屏缩放预览；正文首次出现的核心术语带虚线下划线，悬停即可查看精简定义并跳转 [术语表](/books/llm-data/glossary)。

[术语表](/books/llm-data/glossary) · [来源、口径与许可](/books/llm-data/colophon) · [← 返回 Tdccccc's Atlas 首页](/)
