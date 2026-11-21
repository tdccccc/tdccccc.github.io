# 第 13 章 评测 Harness 架构与开源框架选型

<p class="chapter-summary">剖析现代评测 Harness 的六层模块化架构，揪出潜伏在模板渲染、截断控制与正则抽取中导致跨团队跑分漂移 5–15 pp 的五大工程「分数刺客」，并横向深评六大主流开源框架的适用边界与选型策略。</p>

回到全书导言确立的误差分解式 $\hat S = S^\star + \delta_{\text{judge}} + \delta_{\text{env}} + \epsilon_{\text{sample}}$。工业界反复上演过同一幕尴尬场景：同一份开源模型权重、同一套公开题库，A 团队跑出 78.2%，B 团队复现却只有 64.5%，双方争论一周后才发现，问题根本不在权重或显卡，而是 B 团队的评测脚本在拼接系统提示词时多塞了一个换行符，或者沿用了旧版停止词把长推理提前腰斩。

评测框架不是几百行循环调用 API 的“胶水脚本”，而是精密的测量仪器。本章先拆解工业级<strong><a class="term-ref" href="/books/llm-eval/glossary#eval_harness" title="驱动模型评测全流程的自动化工程框架，包含任务加载、模板渲染、推理调度、沙箱桥接、判分与统计汇总">评测 Harness</a></strong>的六层架构，再逐一缉拿最隐蔽的五个工程刺客，最后给出六大开源框架的选型决策表。

---

## 13.1 现代评测 Harness 的六层模块化架构

无论评测单轮问答还是百步多轮 Agent，一套经得起跨月复现与跨团队审计的评测 Harness，都应严格解耦为六个职责正交的层次，严禁把提示词拼接、并发请求、沙箱执行与正则判分揉成一团：

<figure class="book-figure">
  <img src="/figures/llm-eval/eval-harness-arch.svg" alt="现代评测 Harness 六层模块化架构与五大分数刺客潜伏地图" loading="lazy">
  <figcaption><span class="book-figure__label">图 13-1</span>现代评测 Harness 六层数据流与防线设计。上方六层将题库、模板、推理、沙箱、判分与统计彻底解耦；红色警示条标出了最常制造 5–15 pp 幽灵分差的五个工程刺客潜伏位点。</figcaption>
</figure>

1. <strong>Task Registry（任务注册与版本锁定层）</strong>：将数据集快照、题目切分（Split）、聚类分组 ID（供第 1 章 <a class="term-ref" href="/books/llm-eval/glossary#clustered_se" title="按文档/仓库聚类层级计算的修正标准误">Clustered SE</a> 计算）与 Prompt 资产全部绑定 SHA-256 哈希，杜绝“远端仓库悄悄改了题、本地却浑然不知”的静默漂移；
2. <strong>Prompt / Chat Template 渲染层</strong>：负责把结构化消息列表、Few-shot 示例与工具 JSON Schema 渲染为底层模型期望的精确字符串或 Token 序列，并将渲染后的**完整最终输入原样留痕**；
3. <strong>Inference Adapter（推理适配与并发调度层）</strong>：抹平 OpenAI 兼容 API、vLLM、SGLang、Anthropic 等后端的协议差异，内置令牌桶限流（RPM/TPM）、指数退避重试、连接池复用与 Token 成本计量；
4. <strong>Agent Runtime / Sandbox Bridge（智能体运行时桥接层）</strong>：承载多轮工具循环、步数与墙钟超时守卫、上下文折叠，并隔离底层 Docker / MicroVM 沙箱与录制回放代理（详见[第 14 章](/books/llm-eval/chapters/chapter-14)），确保可按[第 8 章](/books/llm-eval/chapters/chapter-08)的方法解耦模型与<a class="term-ref" href="/books/llm-eval/glossary#scaffold" title="包裹在底层 LLM 之外的系统提示词、工具封装、循环规划与重试编排逻辑">脚手架</a>；
5. <strong>Extractor &amp; Scorer（答案抽取与判分层）</strong>：先从原始响应中按可版本化策略抽取候选答案，再路由至<a class="term-ref" href="/books/llm-eval/glossary#deterministic_verifier" title="通过符号化简、AST、单元测试或终态哈希给出客观判分的程序化裁判">确定性验证器</a>（SymPy / AST / 单元测试）或经 <a class="term-ref" href="/books/llm-eval/glossary#rogan_gladen" title="利用人类金标灵敏度与特异度对有偏观测通过率进行无偏还原的公式">Rogan-Gladen</a> 校准的 <a class="term-ref" href="/books/llm-eval/glossary#llm_as_a_judge" title="使用强语言模型按细则或成对比较自动判分的裁判范式">LLM-as-a-Judge</a>；
6. <strong>Trace Store &amp; Statistical Reporter（轨迹归档与统计报表层）</strong>：以只追加（Append-Only）格式落盘每道题的原始输入、完整响应、思考 Token、`finish_reason`、耗时与异常桶，并自动输出带 95% 置信区间、$\mathrm{pass}^k$ 与分层切片的评审级报表。

每次运行必须生成一份不可变的 **Run Manifest**（运行指纹）并随报告归档，确保半年后仍能逐比特还原现场：

```yaml
run_manifest:
  run_id: "eval-20261018-qwen3-32b-fp8"
  dataset: { name: "biz-agent-gold-v2.3", sha256: "7a91f0c4...", n_tasks: 500 }
  model: { id: "qwen3-32b-fp8", weights_sha: "e3b0c442...", engine: "vllm==0.10.2" }
  template: { jinja_sha256: "b2d81e11...", enable_thinking: true, add_bos: false }
  sampling: { temperature: 0.6, top_p: 0.95, max_tokens: 16384, stop: ["<|im_end|>"], n_samples: 4 }
  scorer: { extractor_ver: "math_v4.2", verifier: "sympy_1.13", judge_model: null }
```

---

## 13.2 缉拿潜伏的 5 个「分数刺客」

在开源复现与企业内部打榜中，以下五个工程缺陷是造成 5–15 个百分点幽灵分差的头号元凶，必须建立自动化上线前核验：

| 刺客编号 | 潜伏层级 | 典型触发机制 | 常见分数漂移 | 强制工程防线 |
| --- | --- | --- | --- | --- |
| **① 模板与控制符漂移** | Template 渲染层 | 手动拼 prompt 后推理引擎又叠加一次 BOS（双重 `<\|begin_of_text\|>`）；缺失 system 末尾换行；推理模型漏注 `<think>\n` 起始前缀 | $-4 \sim -15\text{ pp}$ | 抽检渲染后原始 Token ID 序列，与官方 `apply_chat_template` 逐位比对 |
| **② Stop / EOS 错配** | Inference Adapter | 沿用传统 QA 习惯配置 `stop=["\n\n"]` 提前腰斩多步推理；模型迭代更换 EOS ID（如 `<\|eot_id\|>`）未同步导致复读直至上限 | $-5 \sim -20\text{ pp}$ | 严禁对 CoT/Agent 任务加粗暴换行停机符；审计每个模型的 `stop_token_ids` |
| **③ 采样超参与 GPU 抖动** | Inference Adapter | 贪婪解码（$T=0$）对长推理模型易诱发死循环；且因连续批处理动态 Batch 尺寸与浮点归约非结合律，$T=0$ 仍存 1–3 pp 波动 | $\pm 1 \sim \pm 4\text{ pp}$ | 推理模型按官方推荐 $T \in [0.6, 0.7]$ 多次采样报均值与 CI；锁定引擎版本 |
| **④ 思考预算隐式截断** | Adapter / Runtime | 推理模型将思考链与终答合并计入 `max_tokens`，设为 2048/4096 导致思考未结束便强制停机，答案区为空 | $-8 \sim -25\text{ pp}$ | 单列监控 `finish_reason == "length"` 占比，超过 2% 即告警并放大预算 |
| **⑤ 答案抽取正则漂移** | Extractor 判分层 | 正则无法解析嵌套 `\boxed{\frac{1}{2}}`、全角括号、千分位逗号或多余 Markdown 围栏，把算对的答案错判为 0 分 | $-3 \sim -12\text{ pp}$ | 原始响应原样落盘支持离线重判；每次评测必随机抽查 30 条 0 分样本 |

### 工程现场最隐蔽的三类排雷实操

第一类高发暗坑是<strong>双重 BOS 与思考标签错位（刺客①）</strong>。许多团队习惯先在评测框架里调用 `tokenizer.apply_chat_template(..., tokenize=False)` 生成带 `<|begin_of_text|>` 的字符串，再发送到 `/v1/completions` 接口——而 vLLM/SGLang 服务端默认 `add_special_tokens=True`，会悄悄在最前面再拼入第二个 BOS！正确做法是统一走 `/v1/chat/completions` 由服务端单点渲染，或在调用裸补全接口时显式传入 `add_special_tokens=False` 并对前 3 条样本打印精确 `prompt_token_ids` 留证。

第二类高发暗坑是<strong>GPU 非确定性与采样温度误设（刺客③）</strong>。很多工程师误以为设 `temperature=0` 与固定 `seed` 就能实现逐比特复现，但在 vLLM/SGLang 连续批处理下，并发请求动态拼 Batch 会改变 GEMM 与归约算子的浮点累加顺序；遇到长思维链时，第 300 个 Token 上 $10^{-5}$ 的 Logit 差就足以分岔出完全不同的推理路径，带来 1–3 pp 的不可消除波动。更严重的是，不少推理模型在 $T=0$ 下极易陷入复读死循环。工程铁律是：遵循模型推荐采样温度（常取 $T=0.6,\; \text{top\_p}=0.95$），对每题做 $n \ge 4$ 次采样报告均值与置信区间，而非迷信单次贪婪解码。

第三类高发暗坑是<strong>思考预算隐式截断与正则误杀（刺客④⑤）</strong>。对于推理模型（如 R1、o3、Qwen3 Thinking 系列），单轮评测至少应预留 16,384–32,768 Token 的输出上限，并在判分层以**括号平衡栈 + 围栏剥离**取代脆弱单行正则，同时在 Statistical Reporter 中强制计算长度截断率与空抽取率：

```python
def audit_harness_health(records: list[dict]) -> dict:
    total = max(len(records), 1)
    length_cut = sum(1 for r in records if r["finish_reason"] == "length")
    empty_ext = sum(1 for r in records if r["extracted_answer"] is None)
    return {
        "length_truncation_rate": length_cut / total,  # > 0.02 需告警放大 max_tokens
        "empty_extraction_rate": empty_ext / total,    # > 0.01 需抽检 Extractor 正则
    }

def extract_last_boxed(text: str) -> str | None:
    idx = text.rfind(r"\boxed{")
    if idx < 0:
        return None
    depth, start = 0, idx + len(r"\boxed{")
    for i in range(start, len(text)):
        if text[i] == "{": depth += 1
        elif text[i] == "}":
            if depth == 0: return text[start:i].strip()
            depth -= 1
    return None
```

如果 `empty_extraction_rate` 显著高于 `length_truncation_rate`，几乎可以断定是答案解析正则写得太死板，把模型用自然语言或非标准 LaTeX 写对的答案冤杀成了 0 分。只要 Trace Store 保存了完整原始文本，团队就能在修完正则后秒级离线重判，无需重花一分钱推理算力。

::: warning 跨团队分数对不齐时的排障铁律
当复现结果比官方报告低 3 个百分点以上时，<strong>绝对不要第一反应怀疑“官方刷榜”或“权重损坏”</strong>。请严格按以下四步排障：第一步导出前 5 道题的**原始渲染文本与 Token ID** 核对控制符；第二步统计 `finish_reason == "length"` 比例排除思考截断；第三步对 0 分样本做 20 条人工抽检排除正则误杀；第四步核对是否混入了网络超时等 <a class="term-ref" href="/books/llm-eval/glossary#infra_vs_model_error" title="基础设施异常与模型能力失败严格分桶统计">infra_error</a>。九成以上的悬案会在前三步水落石出。
:::

---

## 13.3 六大主流开源评测框架深评与选型矩阵

不要陷入“自研一套大而全框架”的重复造轮子陷阱，也不要指望单一开源框架通吃预训练研究、多模态榜单、沙箱 Agent 与应用 CI。截至 2026 年，社区已经分化出六款定位极为清晰的工程主力：

<figure class="book-figure">
  <img src="/figures/llm-eval/eval-frameworks-matrix.svg" alt="六大主流开源评测框架定位象限与适用场景选型图" loading="lazy">
  <figcaption><span class="book-figure__label">图 13-2</span>六大开源评测框架的二维生态定位（横轴为任务与隔离复杂度，纵轴为底座科研 vs 应用敏捷重心）及按场景快速决策指引。</figcaption>
</figure>

| 框架名称 | 维护方 / 技术栈 | 核心强项与杀手级特性 | 沙箱与多轮 Agent | 典型短板与边界 | 最优适用场景 |
| --- | --- | --- | --- | --- | --- |
| **Inspect AI** | UK AISI（Python） | 现代模块化 `Task / Solver / Scorer` 抽象；原生支持 Docker/K8s 沙箱隔离与极佳的交互式 **Log Viewer** 轨迹审阅器 | <strong>极强（原生一流）</strong> | 偏生成与 Agent，传统基座似然（loglikelihood）题库不如 lm-eval 全 | 多轮 Agent、MCP/代码沙箱、安全红队与人工误差审阅首选 |
| **lm-evaluation-harness** | EleutherAI（Python） | 预训练与基座模型工业标准；对数似然、归一化准确率与 <a class="term-ref" href="/books/llm-eval/glossary#bpb" title="每字节比特数，消除分词器差异的跨模型压缩率指标">BPB</a> 口径对齐全社区，涵盖数百经典学术基准 | 较弱（以单轮为主） | 多轮交互、复杂工具编排与异步沙箱支持笨重 | 预训练 Checkpoint 监控、基座能力对标、论文可复现跑分 |
| **OpenCompass** | 上海人工智能实验室（Python） | 中文生态最全、支持 Slurm / DLC 百卡集群自动化分片与分布式并发编排，内置丰富推理后端加速 | 中等（逐步扩展） | 配置体系偏重，轻量级业务 PR CI 接入成本偏高 | 中文综合榜单、大规模多模型批量打榜与集群级训练评测 |
| **VLMEvalKit** | OpenCompass 生态（Python） | 统一封装百余视觉多模态基准（OCR、图表、数学视觉、视频理解）与主流开源/闭源 VLM 适配接口 | 弱（偏静态多模态） | 非视觉纯文本与复杂多轮环境不是其设计目标 | 视觉语言模型（VLM）、文档解析与多模态底座横向评测 |
| **Promptfoo** | 开源社区 / 企业版（TS/Node） | 声明式 YAML 配置极速上手、原生并行对比多模型/多 Prompt 矩阵，内置强大的红队提示注入扫描与 GitHub Actions 集成 | 中等（侧重 API 断言） | 深度容器化代码/OS 沙箱与复杂统计检验需外部扩展 | 企业级 Prompt 迭代回归、CI/CD 质量门禁与自动化安全红队 |
| **DeepEval** | Confident AI（Python） | 深度贴合 `pytest` 单元测试心智，开箱提供 RAG 忠实度/召回、幻觉检测与自定义 G-Eval 指标 | 中等（轨迹断言） | 大规模基座模型集群推理吞吐与底层沙箱隔离偏弱 | Python 应用工程团队将 RAG / 业务工作流评测融入日常单测 |

### 按组织形态落地的选型与自研边界

不同研发阶段切忌生搬硬套同一套工具链，可按团队形态直接对齐成熟组合：

- **预训练与基座算法团队**：以 **lm-evaluation-harness** 对齐国际论文与 BPB 口径，中文与多卡集群批量任务叠加 **OpenCompass**，多模态研发引入 **VLMEvalKit**；
- **复杂 Agent 与安全红队团队**：以 **Inspect AI** 作为唯一核心底座，依托其原生沙箱、异步 Tool Solver 与可视化轨迹 Log Viewer，直接承接第 16 章的人工 Open Coding 审阅流程；
- **企业应用与 RAG 工程团队**：在 GitHub Actions / GitLab CI 中以 **Promptfoo**（或 Python 栈下的 **DeepEval**）承担分钟级 PR 冒烟与红队回归，夜间重度多轮任务再交由 Inspect AI 异步跑完。

何时才需要写自研代码？唯一值得自研的往往不是底层调度循环，而是**贴合本公司私有业务系统的轻量薄层**：自定义工具沙箱适配、私有业务数据库的终态哈希验证器、以及统一输出第 16 章标准 Evaluation Card 的统计汇总脚本。

::: tip 工业界验证的「双框架组合拳」
中大型 AI 团队通常不需要维护六套工具，最稳健的最小组合是**按工作流二分**：模型研发团队以 `lm-evaluation-harness`（或中文场景 `OpenCompass` + `VLMEvalKit`）守住底座静态能力与 <a class="term-ref" href="/books/llm-eval/glossary#validity_reliability" title="效度衡量测得对不对，信度衡量测得稳不稳">重测信度</a>；Agent 与应用工程团队以 **Inspect AI** 跑深度沙箱评测和轨迹审阅，再以 **Promptfoo** 或 **DeepEval** 挂载到日常 PR 的轻量级 CI 门禁中。
:::

搭好 Harness 并排除模板与抽取刺客后，一旦评测对象进入“能删文件、能装依赖、能连外网”的多轮 Agent 阶段，真正的硬骨头才刚刚出现——如何做到千并发沙箱不炸机、外网接口不抖动、机器故障不污染分数？这正是[第 14 章](/books/llm-eval/chapters/chapter-14)要攻克的确定性基建。
