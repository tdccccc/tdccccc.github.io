# 第 19 章 离线 CI 闸门、线上 Tracing 与灰度 A/B 飞轮

<p class="chapter-summary">弥合离线评测与生产现场的断层：搭建“L1 PR 冒烟 → L2 夜间全量回归 → L3 影子流量与灰度 A/B”三级发布漏斗，基于 OpenTelemetry 实现全链路 Tracing，挖掘高覆盖率线上隐式质量信号并自动沉淀为永久防回归用例。</p>

离线黄金集建得再精致，上线第一天依然会遭遇真实世界的迎头痛击：用户问法随营销活动突变、上游模型厂商静默微调权重、外部工具接口悄悄改了字段格式，或是某个未被黄金集覆盖的边缘输入把 Agent 带进死循环。<strong>离线评测负责挡住已知退化，线上可观测性与灰度实验负责捕获未知风险，而自动化数据飞轮负责把今天的线上意外变成明天的离线铁壁。</strong>

<figure class="book-figure">
  <img src="/figures/llm-eval/online-offline-flywheel.svg" alt="三级发布漏斗（PR 冒烟、夜间回归、影子与灰度 A/B）与线上 Tracing 隐式信号反哺离线黄金集的自动化飞轮" loading="lazy">
  <figcaption><span class="book-figure__label">图 19-1</span>生产级 LLM 与 Agent 的双轨闭环。上轨为从代码提交到全量放线的三级防御漏斗；下轨通过全链路 Tracing 与隐式负向信号自动采样、脱敏聚类并反哺离线黄金集。</figcaption>
</figure>

---

## 19.1 三级发布防御漏斗：速度、统计功效与安全的三重平衡

许多团队在把评测接入 CI / CD 时容易走入两个极端：要么每次提 PR 都跑 2000 题导致合入排队三小时、研发纷纷绕过检查；要么干脆不做自动化回归，全靠上线后等用户骂街。成熟工程实践采用**三级防御漏斗**，在不同发布阶段精确匹配速度与置信度预算：

| 发布层级 | 触发时机 | 题量与环境 | 核心判分与统计要求 | 耗时与阻断策略 |
| --- | --- | --- | --- | --- |
| **L1 · PR 冒烟闸门** | 每次修改 Prompt、Tool Schema、编排或模型配置 | **50–80 题**高区分度核心题 + 100% 安全/政策红线 | <a class="term-ref" href="/books/llm-eval/glossary#deterministic_verifier" title="确定性验证器：通过代码规则、Schema 校验或单测给出客观判分的裁判">确定性断言</a> + <a class="term-ref" href="/books/llm-eval/glossary#replay_proxy" title="录制回放代理：缓存并确定性回放外部 API 响应以消除网络抖动的组件">Replay Proxy</a> | 小于 **5 分钟**；红线零退化、核心分跌幅超阈值直接阻断 Merge |
| **L2 · 夜间全量回归** | 每日定时与发版候选（RC） | **500–2000 题**（完整 Dev + 锁库 Holdout） | 隔离容器沙箱 + 用户模拟器 + <a class="term-ref" href="/books/llm-eval/glossary#paired_bootstrap" title="配对自助法：以题目为单位重采样计算两模型分差置信区间的非参数检验">Paired Bootstrap 95% CI</a> + RG 矫正 | 30–120 分钟；追踪 MDE、$\widehat{\mathrm{pass}^k}$、$\$/\text{Task}$ 与 P95 漂移 |
| **L3 · 影子与灰度 A/B** | 通过 L2 后上线验证 | 生产真实流量 1% → 5% → 20% → 100% | 真实业务北极星转化 + 线上护栏指标 + 租户级聚类检验 | 观察 24h–7d；护栏指标击穿立即自动回滚 |

落地三级漏斗时有四条最容易踩坑的工程铁律：

1. <strong>L1 绝不因为随机抖动制造“狼来了”</strong>：L1 题量小（50–80 题），MDE 高达 10%–16%（视配对相关性 $\rho \approx 0.5\text{–}0.8$ 而定），因此 L1 的定位不是测细微涨点，而是拦截**破坏性回归**（格式崩溃、工具 Schema 报错、红线越权、核心主路径大面积失效）。固定解码温度 $T=0$ 并用 Replay Proxy 锁定外网响应，确保误报阻断率低于 1%。
2. <strong>L2 必须把 <a class="term-ref" href="/books/llm-eval/glossary#infra_vs_model_error" title="infra_error vs model_failure：基础设施异常与模型真实能力失败严格分桶统计">infra_error 独立分桶</a></strong>：夜间批跑并发高，一旦遇到模型网关 429 限流或容器镜像拉取超时，必须标记为 `infra_error` 自动重试并单独告警，严禁按 0 分计入模型准确率造成虚假退化报警；同时绘制周级 MDE 与帕累托趋势曲线，第一时间捕捉上游闭源 API 的“静默模型漂移”。
3. **L3 影子流量的写副作用隔离红线**：<a class="term-ref" href="/books/llm-eval/glossary#shadow_canary" title="影子流量与灰度 A/B：异步暗跑对比与可控比例切流验证真实业务指标的发布机制">影子流量（Shadow Traffic）</a>把生产真实请求异步复制给候选 Agent 暗跑，用户无感知，非常适合暴露真实流量下的延迟毛刺、Token 账单飙升与未知格式崩溃。但**凡是含写副作用的工具（退款、发邮件、改数据库、合并代码），影子环境必须强制路由至只读 Mock 网关**，否则会酿成“暗跑一小时、真实扣款两千笔”的 P0 级事故。
4. **L3 灰度 A/B 必须按用户或租户分桶**：绝不能按单条 HTTP 请求随机分流——同一用户在多轮会话中忽而被 A 模型接待、忽而被 B 模型接管，既摧毁体验又污染实验。计算 A/B 显著性时以“用户/租户”为聚类单元计算 Clustered SE，并按阶梯放量周期盯死北极星与护栏指标：

| 灰度阶段 | 流量比例与最短观察窗 | 核心核查指标 | 自动熔断回滚条件（触发即切回旧版） |
| --- | --- | --- | --- |
| **Shadow 暗跑** | 5% 异步镜像（12–24h） | 格式解析崩溃率、Token 账单、模拟工具调用合规 | 解析失败率上升 $>1\text{pp}$ 或单任务成本涨幅 $>25\%$ |
| <strong>Canary 1%–5%</strong> | 按租户切流（24h） | P95 延迟、工具报错率、人工转接率、硬护栏拦截 | P95 延迟突破 SLA、5xx 报错飙升或触发任意红线告警 |
| <strong>Scale 20% → 100%</strong> | 跨工作日与周末周期（3–7d） | 工单一次解决率、代码 24h 留存率、会话风险分 $S_{\text{risk}}$ | 北极星指标在聚类 95% CI 下显著劣于对照组 |

下面是一份可直接改写落地的 CI 闸门策略配置示例，将统计边界、红线否决与异常分桶显式写成代码契约：

```yaml
# eval-gate.yaml：L1 PR 冒烟与 L2 夜间回归发布闸门契约
l1_pr_smoke:
  dataset: "eval-ticket-agent-v1.4.0#smoke_64"
  temperature: 0.0
  replay_proxy: "strict_cache"
  timeout_sec: 300
  gates:
    policy_redline_violations: "== 0"         # 红线越权零容忍，直接阻断合入
    core_pass_drop_pp: "<= 2.0"               # 容许极小边界波动，挡住破坏性退化
    infra_error_rate: "<= 0.02"               # 超阈值标红为环境故障，不误判模型退化

l2_nightly_rc:
  dataset: "eval-ticket-agent-v1.4.0#full_1200_with_holdout"
  repeats_for_write_ops: 5                    # 写操作采样 5 次计算无偏 pass^5
  gates:
    paired_ci95_low_diff: ">= -0.005"         # Paired Bootstrap 95% 下界无显著退化
    write_ops_pass_hat_5: ">= 0.75"
    rg_calibrated_youden_j: ">= 0.40"         # 评委退化预警
    cost_per_task_increase_pct: "<= 15.0"     # 联合帕累托成本护栏
```

---

## 19.2 全链路可观测性 Tracing：看见 Agent 的每一次呼吸

传统微服务监控只看 `HTTP 200`、QPS 和接口耗时，但对 LLM 与 Agent 而言，一次状态码 `200 OK` 的响应完全可能是胡说八道的幻觉、调用了 14 次无效工具烧掉 3 美元的失控循环，或者被间接注入劫持的静默泄密。

生产级可观测性应基于 <strong>OpenTelemetry（OTel GenAI 语义规范）</strong>构建树状 `Trace → Span` 追踪体系（标准协议属性采用 `gen_ai.*` 命名空间，业务与脚手架扩展字段归入自定义 `app.*` 属性），确保线上任意一条诡异失败都能一键拉回本地沙箱 100% 复现：

| Span 层级 | 必采关键属性（标准 `gen_ai.*` + 自定义 `app.*`） | 核心排障与反哺价值 |
| --- | --- | --- |
| <strong>Root Trace（会话/任务级）</strong> | `app.session_id`、脱敏 `app.tenant_id`、`app.ab_bucket`、`app.scaffold_git_sha`、`app.kb_index_version`、`app.user_acl_role` | 锁定隐式状态快照，解决“线上报错本地复现不了”的顽疾 |
| **LLM Generation Span** | 标准 `gen_ai.request.model`、`gen_ai.response.model`、`gen_ai.usage.input_tokens`、`gen_ai.usage.output_tokens`、`gen_ai.usage.cache_read.input_tokens`；自定义 `app.prompt_template_sha256`、`app.reasoning_tokens`、TTFT / TPOT、实时费用 | 精准归因上游静默变笨、Prompt Cache 失效或思考/输出爆表 |
| **Retrieval Span** | 自定义 `app.rewritten_query`、召回 `app.doc_ids` 与重排分数、`app.acl_filtered_count`、检索耗时 | 实现线上检索与生成解耦定位，监控索引陈旧度 |
| **Tool Execution Span** | 标准 `gen_ai.tool.name`；自定义校验前后参数、`app.exit_code`、`app.infra_error_flag`、返回字节数、重试次数 | 第一时间抓出工具死循环、超大观测撑爆上下文与下游故障 |
| **Guardrail / Eval Span** | 自定义 `app.guardrail_rule_hit`、异步旁路 Judge 抽检分（1%–5% 流量）与 `app.judge_version` | 构成线上安全拦截日志与质量漂移实时雷达 |

> **隐私与存储分层策略**：线上全量原始文本体量庞大且含敏感业务数据，工程上通常采用**脱敏元数据与 Span 指标 100% 全量采集 + 原始载荷分级留存**——正常会话加密短存或按 5% 采样归档，凡触发硬护栏、工具报错或隐式负向信号的异常轨迹 100% 保留待查。

---

## 19.3 线上隐式质量信号挖掘：绕过“用户懒得点踩”的盲区

很多团队在界面上放了点赞/点踩（👍 / 👎）按钮后，以为就拿到了线上质量雷达。现实极其骨感：生产环境中用户主动点踩的比例通常<strong>不到 1%–3%</strong>，且存在严重幸存者偏差（沉默的大多数答错后直接关掉页面再也不用）。

真正高覆盖率、难伪造的线上质量晴雨表，是<strong>隐式行为质量信号（Implicit Quality Signals）</strong>：

| 隐式质量信号 | 行为定义与捕获方式 | 反映的潜在失效 | 常见干扰项（需校正） |
| --- | --- | --- | --- |
| **代码 24h / 7d 留存率** | 按 Tab 采纳的补全行在 24 小时后仍保留在提交中的比例 | 识别“瞬时看着对、编不过或逻辑错随后全删”的伪高采纳 | 开发者大规模需求重构 |
| **重生成 / 30 秒内改写重问** | 用户点击 Regenerate，或紧接着换说法追问同一意图 | 首答未命中要点、格式不可用或信息不完整 | 用户在递进探索新子问题 |
| **流式输出中途打断率** | 生成未完成即点击 Stop 或直接离开会话 | 模型开篇即跑偏、过度啰嗦或首字太慢 | 用户已从前两行拿到答案 |
| **负面追问与纠错情绪** | 轻量分类器识别“你没看懂”“接口已废弃”“转人工”等追问 | 理解偏差、知识陈旧、政策机械拒绝 | 投诉类业务固有负面情绪 |
| **工具回滚与异常长步数** | 同一工具连续报错重试 $\ge 3$ 次、撤销写操作或步数超 P95 | Agent 陷入工具死循环、参数 Schema 幻觉 | 合法的多步骤超复杂任务 |

工程落地时，建议把上述隐式信号与 1%–5% 线上异步 Judge 抽检分做**周度相关性标定**，并定义可观测的<strong>会话异常风险分（Session Risk Score）</strong>作为实时灰度护栏：

$$
S_{\text{risk}}(t) = w_1\,\mathbf{1}[\text{重生成或30s改写}] + w_2\,\mathbf{1}[\text{负面纠错/转人工}] + w_3\,\mathbf{1}[\text{工具重试}\ge 3] + w_4\,\mathbf{1}[\text{步数}>\text{P95}], \qquad \sum_{i=1}^{4} w_i = 1,\; w_i \ge 0
$$

在灰度 A/B 期间，对新旧桶按租户聚合比较 $S_{\text{risk}}$ 均值与 P95 延迟——实证经验表明，“重生成率抬升 +1.8pp”或“工具异常长步数毛刺”往往比人工客诉工单**早 12–48 小时**发出精确警报。

---

## 19.4 Online-to-Offline 自动化沉淀飞轮

发现线上问题只是半程；如果每次修完 Bug 只改一行代码就翻篇，两个月后另一位同事改 Prompt 还会把同一个坑重新踩爆。必须建立制度化的 **Online-to-Offline 五步自动化沉淀飞轮**，让每一次线上流血都转化为永久防回归资产：

1. **规则 + 抽检双路自动捞取**：只要轨迹命中任意强负向触发器（$S_{\text{risk}}$ 超阈值、人工转接、硬护栏拦截或旁路 Judge 低于阈值），后台任务自动将其推入“待审 Bad Case 候选队列”；
2. **结构保真脱敏与沙箱打包**：流水线自动剥离 PII 与密钥，并将该 Trace 关联的检索快照、工具回包（导出为 Replay Proxy 录制文件）与权限角色打包为可本地一键重放的标准用例草稿；
3. **语义聚类与新簇优先排序**：对候选轨迹的失败表象与错误码做向量聚类，先与现有黄金集做近邻查重（命中已知老问题则仅累加线上发生频次，不重复入库），再按“频次 × 业务风险权重”把<strong>全新浮现的失败簇（Novel Failure Clusters）</strong>顶到待审队列最上方；
4. **周度专家 1–2 小时复核与分级分流**：每周固定召开精简 Error Review 会，算法工程师与业务专家共同审阅排名前 15–25 的新失败簇代表样本，执行 Open Coding 归因并按风险分流：
   - <strong>P0 致命红线（安全越权 / 资损 / PII 泄漏）</strong>：立即补齐确定性断言，永久升格写入 **L1 冒烟硬闸门**；
   - **P1 高频新型能力短板**：补齐可执行 Rubric 与终态断言，并入 **L2 滚动新鲜切片**；
   - **P2 极低频边缘噪声**：记入观察池追踪周频次，避免用一次性孤例污染主干题库；
5. **防膨胀瘦身审计**：按季度统计黄金集每道题的区分度（参考 [专题 B：IRT / CAT](/books/llm-eval/topics/irt-and-cat) 思路），把长期饱和且非安全红线的陈旧用例降级归档，维持题库锋利、低延迟且高信噪比。

当这套飞轮持续运转起来，团队手里握着的将不再是一堆零散报错，而是一张清晰量化的“失败根因排行榜”。下一个决定资源投入成败的核心问题是：<strong>面对榜单排第一的失败根因，到底该花两天改脚手架，还是该花三周砸算力跑 SFT 与 RLVR？</strong> 这正是全书与三部曲最终章要给出的终极答案。
