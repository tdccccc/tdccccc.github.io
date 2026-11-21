# LLM 与 Agent 评测：原理、基准与工程实践

<p class="chapter-summary">从评测测量学、统计显著性与判分校准的第一性原理出发，系统打通基础模型选型标尺、Agent 专项评测（工具/MCP、SWE、Deep Research、GUI、记忆与多智能体）、可复现沙箱基建与质量-成本-延迟帕累托，以及企业级 EDD 黄金集、线上 Tracing 与后训练反哺飞轮。</p>

大模型与智能体工程界有一个反复应验的铁律：**你测不准什么，就永远无法稳定改进什么**。无论是用百卡集群跑 RLVR 后训练，还是在业务线上迭代多轮 Agent 脚手架，一个存在统计噪声、判分漂移、沙箱泄漏或数据污染的评测体系，都会让整个团队在虚假涨点里空转数月。评测的真实本质，可以用一条贯通全书的误差分解式来概括：

$$
\hat S(\mathcal{M}, \mathcal{H}) \;=\; \underbrace{S^\star(\mathcal{M}, \mathcal{H})}_{\text{模型与脚手架真实能力}} \;+\; \underbrace{\delta_{\text{judge}}}_{\text{判分器系统偏差}} \;+\; \underbrace{\delta_{\text{env}}}_{\text{沙箱/模板/基础设施噪声}} \;+\; \underbrace{\epsilon_{\text{sample}}}_{\text{有限题量与采样方差}}
$$

这本《LLM 与 Agent 评测：原理、基准与工程实践》是 **Tdccccc's Atlas** 的第三本系统专著，与 [《LLM 推理工程：原理与方法》](/books/llm-inference/) 及 [《LLM 强化学习：原理与后训练实践》](/books/llm-rl/) 共同构成<strong>「推理底座 × RL 后训练 × 评测闭环」</strong>三部曲。全书以 **20% 统计与校准底座 + 15% 基础模型速评 + 65% Agent 专项、评测基建与企业业务闭环** 的重心配比，带你彻底走出“刷榜单、凭体感”的泥潭，把评测建成可复现、抗抖动、能驱动业务持续演进的工业测量系统。

<div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin:1.1rem 0 1.4rem;">
  <a href="/books/llm-eval/chapters/chapter-01" style="display:inline-flex;align-items:center;padding:0.55rem 1.15rem;border-radius:8px;background:var(--vp-c-brand-1);color:#fff;font-weight:600;text-decoration:none;">从第 1 章开始 →</a>
  <a href="#reading-paths" style="display:inline-flex;align-items:center;padding:0.55rem 1.05rem;border-radius:8px;border:1px solid var(--vp-c-divider);color:var(--vp-c-text-1);font-weight:600;text-decoration:none;">按角色选路线</a>
  <a href="/books/llm-eval/toolkit/metrics-and-stats" style="display:inline-flex;align-items:center;padding:0.55rem 1.05rem;border-radius:8px;border:1px solid var(--vp-c-divider);color:var(--vp-c-text-1);font-weight:600;text-decoration:none;">统计公式与指标速查卡</a>
</div>

<figure class="book-figure">
  <img src="/figures/llm-eval/eval-fullstack-map.svg" alt="LLM 与 Agent 评测全栈地图" loading="lazy">
  <figcaption><span class="book-figure__label">全景图</span>自上而下打通企业业务迭代闭环、Agent 专项评测高地、评测工程基建与统计测量底座四层，左侧贯穿“严密统计口径、四维解耦与生产飞轮”主轴，对应全书 5 篇 20 章。</figcaption>
</figure>

## 按角色选择阅读路线 {#reading-paths}

不必从头到尾线性读完。结合你手头最紧迫的工程问题选一条主线，遇到统计公式或代码细节再随时回查速查卡。

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-eval/part-3">
    <div>
      <div class="part-card__num">ROUTE 01 · 第 1–3 + 8–12 + 16 章</div>
      <div class="part-card__title">Agent 研发与专项评测主线</div>
      <p class="part-card__desc">吃透 pass@k 与 pass^k 剪刀差、模型与脚手架解耦，系统掌握 BFCL / MCP / τ²-bench、SWE-bench / Terminal-Bench、Deep Research / RAG、GUI、长期记忆与多智能体评测及误差归因。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/part-4">
    <div>
      <div class="part-card__num">ROUTE 02 · 第 1–4 + 13–15 + 专题 C</div>
      <div class="part-card__title">评测基建与模型选型主线</div>
      <p class="part-card__desc">拿下配对检验与 Rogan-Gladen Judge 校准，规避 Harness 五大分数刺客，落地 Docker/MicroVM 沙箱池、HTTP 录制回放、质量×成本×延迟联合帕累托以及量化/芯片移植回归。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/part-5">
    <div>
      <div class="part-card__num">ROUTE 03 · 第 3–4 + 16–20 章</div>
      <div class="part-card__title">企业 EDD 落地与后训练飞轮</div>
      <p class="part-card__desc">从零构建高信噪比业务黄金集，拆解企业 RAG、客服/运维工单 Agent 与研发 Copilot 三大实战，打通离线 CI 闸门、线上 Tracing 隐式信号到脚手架重构与 SFT/RLVR 闭环。</p>
    </div>
  </a>
</div>

## 全书结构总览

### 五篇 20 章主线

| 篇目 | 章节范围 | 核心问题 | 入口 |
| --- | --- | --- | --- |
| **第一篇 统计口径与判分校准底座** | 第 1–4 章（20%） | 多少题才算显著？pass@k 与 pass^k 差在哪？如何用 Rogan-Gladen 矫正有偏 LLM Judge 并治理数据污染？ | [进入第一篇](/books/llm-eval/part-1) |
| **第二篇 基础模型选型速评** | 第 5–7 章（15%） | 抛开刷榜噱头，怎样为 Agent 与企业业务快速摸清底座的知识/长上下文/校准、推理/代码/多模态与安全注入边界？ | [进入第二篇](/books/llm-eval/part-2) |
| **第三篇 Agent 评测专项** | 第 8–12 章（25%） | 多轮交互如何把模型和脚手架拆开测？工具与 MCP、SWE/终端、Deep Research/RAG、GUI、记忆与多智能体该测什么终态？ | [进入第三篇](/books/llm-eval/part-3) |
| **第四篇 评测基建、帕累托与误差归因** | 第 13–16 章（20%） | 如何避开模板与截断刺客、搭建可复现沙箱与录制回放？怎样画清质量×成本×延迟帕累托并用 Open Coding 归因失败？ | [进入第四篇](/books/llm-eval/part-4) |
| **第五篇 企业业务落地与迭代闭环** | 第 17–20 章（20%） | 怎样从线上日志沉淀 EDD 黄金集、跑通三大高频企业场景、建好 CI 闸门与灰度飞轮，并决定改脚手架还是做 RLVR？ | [进入第五篇](/books/llm-eval/part-5) |

### 横切参考区

| 区域 | 页面 | 适用场景 |
| --- | --- | --- |
| 进阶专题库 | [专题 A：核心评测基准与论文口径档案](/books/llm-eval/topics/benchmark-archive) | 集中检索主流基础与 Agent 基准的题量、评判机制、已知缺陷与一手论文出处 |
| 进阶专题库 | [专题 B：心理测量学与 IRT / CAT 自适应评测](/books/llm-eval/topics/irt-and-cat) | 深入 1PL/2PL/3PL 项目反应理论与计算机自适应选题，把千题长测压缩为高信息量精测 |
| 进阶专题库 | [专题 C：量化、推理加速与国产芯片精度回归](/books/llm-eval/topics/quant-and-chip-regression) | 联动《LLM 推理工程》，建立 FP8/W4A16 量化、投机解码与昇腾等跨芯片迁移的灵敏回归测试集 |
| 进阶专题库 | [专题 D：多模态生成（图 / 视频 / 语音）评测速览](/books/llm-eval/topics/generative-multimodal-eval) | 快速掌握文生图、视频生成与端到端实时语音模型的自动指标、VLM 细则与人类偏好协议 |
| 参考工具箱 | [统计公式、检验方法与指标口径速查卡](/books/llm-eval/toolkit/metrics-and-stats) | 全书唯一数学口径事实源，集中速查配对检验、MDE、pass@k/pass^k、Rogan-Gladen 与一致性系数 |
| 参考工具箱 | [基准选型与评测上线避坑清单](/books/llm-eval/toolkit/eval-checklist) | 工位常备：按业务场景选基准与框架、发布评测报告前 12 项必查红线 |
| 参考工具箱 | [最小可运行 Python 评测工具箱](/books/llm-eval/toolkit/reference-code) | 零重依赖、可直接单元测试复用的 Python 代码：Bootstrap/McNemar、Clustered SE、无偏 pass@k/pass^k、Rogan-Gladen 与 ECE |

## 阅读约定与交互体验

- **统一统计口径**：跨社区评测文献常混用符号与指标定义（例如把朴素代入 $1-(1-c/n)^k$ 误当作无偏 $\mathrm{pass@}k$，或在未报告置信区间的情况下宣称涨点 0.8%）。全书强制遵循 [统计公式与指标口径速查卡](/books/llm-eval/toolkit/metrics-and-stats)。
- **严谨时间与事实边界**：本书基准、框架与方法整理截至 **2026 年 10 月**；公开基准数据均注明原论文或官方榜单发布时的测试口径，示例数值如属教学算例均显式声明。
- **三个原生交互实验**：第 1 章（样本量 $N$ / 分差 $\Delta$ / 配对相关性 $\rho$ 与 MDE）、第 2 章（$\mathrm{pass@}k$ vs $\mathrm{pass}^k$ 曲线与无偏组合估计）、第 3 章（LLM-as-a-Judge 原始分偏差与 Rogan-Gladen 矫正），支持页内拖动滑块实时验证直觉。
- **配图放大与术语悬停**：点击任意机制 SVG 图支持全屏缩放查看；正文首次出现的核心术语带虚线下划线，悬停即可查看精简定义并跳转 [术语表](/books/llm-eval/glossary)。

[术语表](/books/llm-eval/glossary) · [来源、口径与许可](/books/llm-eval/colophon) · [← 返回 Tdccccc's Atlas 首页](/)
