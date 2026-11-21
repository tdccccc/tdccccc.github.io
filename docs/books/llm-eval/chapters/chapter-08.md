# 第 8 章 Agent 评测第一性框架：终态、轨迹与脚手架解耦

<p class="chapter-summary">当大模型从单轮问答跃迁为多轮自主智能体，静态评测范式遭遇五大结构性断裂。本章从 POMDP 轨迹第一性原理出发，建立「终态结果 × 过程轨迹 × 环境状态 × 成本安全边界」四层评测框架，并给出一套严谨的 2×2 控制变量交叉实验法，把底座模型与脚手架的各自贡献彻底拆清。</p>

前两篇讨论的知识、指令、长上下文、推理与安全基准，大多共享一个令人省心的前提：模型只做一次前向生成，输出一段静态文本，外部世界在回答结束前保持绝对静止。然而正如 [《LLM 强化学习》第 14 章](/books/llm-rl/chapters/chapter-14) 所形式化的那样，一旦大模型接入工具、终端、数据库或浏览器，一次任务便演变为模型动作与随机环境观测交替拼接的<strong>部分可观测马尔可夫决策过程（POMDP）</strong>长轨迹：

$$
\tau = \big(x,\; a^{(1)},\; o^{(1)},\; a^{(2)},\; o^{(2)},\; \dots,\; a^{(H)},\; o^{(H)}\big), \qquad o^{(h)} \sim P_{\text{env}}\big(\cdot \mid \text{state}_{\text{env}}^{(h-1)}, a^{(h)}\big)
$$

如果把静态单轮问答的评测思维生搬硬套到多轮智能体上，工程团队很快就会遭遇一连串荒诞的翻车事故：同一底层模型换一套提示词和重试逻辑，榜单分数凭空暴涨 18 个百分点；某个任务在评测表里标着“通过”，翻开日志却发现 Agent 顺手删掉了测试目录或把线上库改得面目全非；离线单次抽查看似不错，上线后用户连用五次必崩三次。在逐一深入工具调用、SWE、Deep Research、GUI 与多智能体专项之前，本章先立稳 Agent 评测的第一性框架。

---

## 8.1 从静态模型到动态 Agent：五大范式断裂

单轮模型评测与多轮 Agent 评测之间并非“题目变长了一点”的线性延伸，而是测量对象、误差来源与统计结构上的五重根本断裂：

1. **非确定性外部状态转移**：单轮文本生成固定温度和随机种子后几乎完全可复现；而 Agent 的每一步观测 $o^{(h)}$ 都受外部 API 限流、网页实时变动、数据库并发锁或容器调度抖动支配。如果不先在基础设施层冻结外部转移，评测分数里一大半方差都来自环境而非模型（详见[第 14 章](/books/llm-eval/chapters/chapter-14)）。
2. **开放解空间与路径多样性**：修好一个代码 Bug 或完成一笔机票改签，往往存在十几种完全合法的工具调用顺序与排查路径。若沿用早期“逐轮比对标准动作序列（Exact Trajectory Match）”的做法，任何换了查询顺序的聪明解法都会被判 0 分，造成严重的<strong><a class="term-ref" href="/books/llm-eval/glossary#validity_reliability" title="效度衡量评测是否测到了目标真实能力，信度衡量重复测量是否稳定一致">建构效度</a></strong>失真。
3. **不可逆的外部副作用**：单轮对话说错一句话大不了重新生成；但多轮 Agent 执行 `DELETE`、发出误导性客户邮件、触发超额退款或放宽系统目录权限后，外部世界已被不可逆地改变。评测既不能轻信 Agent 最终文本里那句“已为您办妥”，也不能容忍它“靠毁坏环境换取表面通过”。
4. **多维成本与墙钟延迟强耦合**：静态基准常只比一次生成的准确率；而 Agent 可以通过消耗 60 轮推理、调用 30 次搜索、花掉 4.5 美元与 8 分钟墙钟时间去硬磨一道原本 0.08 美元就能解的题。脱离成本、延迟与连续可靠性 <strong><a class="term-ref" href="/books/llm-eval/glossary#pass_hat_k" title="pass^k：连续独立执行 k 次全部成功的可靠性指标，无偏估计为 C(c,k)/C(n,k)">pass^k</a></strong> 的单点准确率，对生产选型毫无决策价值。
5. <strong>被测对象是「模型 + 脚手架」的耦合系统</strong>：在单轮评测中，我们主要测量权重参数 $\mathcal{M}$；而在 Agent 评测中，真正执行任务的是由底层模型 $\mathcal{M}$ 与外围<strong><a class="term-ref" href="/books/llm-eval/glossary#scaffold" title="脚手架（Scaffold / Agent Harness）：包裹在底座 LLM 之外的系统提示词、工具封装、规划循环、上下文折叠与重试编排逻辑总称">脚手架（Scaffold）</a></strong> $\mathcal{H}$ 共同构成的复合系统 $\mathcal{S} = (\mathcal{M}, \mathcal{H})$。把整套复合系统的得分统统归功于底座模型，是当前行业最泛滥的归因谬误。

| 比较维度 | 传统单轮静态模型评测 | 现代多轮动态 Agent 评测 | 评测工程必须做出的范式升级 |
| --- | --- | --- | --- |
| **状态转移** | 确定性封闭前缀拼接 | 随机 POMDP，受外部 API/沙箱支配 | 引入容器快照与录制回放代理隔离环境噪声 |
| **答案解空间** | 唯一标准答案或有限等价表达 | 高度开放，存在多条合法交互路径 | 放弃僵硬轨迹匹配，转向环境终态断言 |
| **外部副作用** | 无状态、零副作用 | 写库、改文件、发消息，不可逆 | 强制验证外部终态并审计副作用零残留 |
| **核心指标口径** | 单次标量准确率（如 $\mathrm{pass@}1$） | 终态通过率 × $\mathrm{pass}^k$ × `$/Task` × P95 | 建立四层报表与质量-成本-延迟联合帕累托 |
| **测量归因对象** | 单一底座权重 $\mathcal{M}$ | 耦合系统 $\mathcal{S} = (\mathcal{M}, \mathcal{H})$ | 执行 2×2 控制变量矩阵解耦模型与脚手架 |

---

## 8.2 四层评测框架：穿透表象审视全链路

要同时守住“允许路径多样性”与“杜绝假阳性暗病”两条底线，现代 Agent 评测必须抛弃单一标量分，升级为自顶向下的<strong>四层评测框架（Outcome × Trajectory × Environment × Guardrails）</strong>。

<figure class="book-figure">
  <img src="/figures/llm-eval/agent-4layer-eval.svg" alt="Agent 四层评测框架与模型和脚手架 2×2 解耦实验矩阵" loading="lazy">
  <figcaption><span class="book-figure__label">图 8-1</span>左侧展示 Agent 评测的四层纵深视角，从终态交付物穿透至轨迹、环境状态与安全边界；右侧给出固定单变量的 2×2 解耦矩阵与脚手架隐性作弊审计红线。</figcaption>
</figure>

| 评测层级 | 核心回答的问题 | 代表性指标与验证手段 | 单看本层的典型盲区 |
| --- | --- | --- | --- |
| <strong>L1 终态结果层（Outcome）</strong> | 任务最终做没做成？稳不稳定？ | 交付物精确匹配、隐藏单测通过率、$\widehat{\mathrm{pass@}k}$ 与 $\widehat{\mathrm{pass}^k}$、校准后 Rubrics | 掩盖“歪打正着”“花 10 倍成本硬凑”以及暗中修改环境的假阳性 |
| <strong>L2 过程轨迹层（Trajectory）</strong> | 中间是怎么做的？断在哪一轮？ | 工具选择准确率、Schema 合法率、死循环/冗余步数比、报错自愈恢复率、里程碑到达率 | 若错误地锁死唯一参考路径，会惩罚更聪明的替代探索策略 |
| <strong>L3 环境状态层（Environment State）</strong> | 外部世界是否准确达成目标且无脏残留？ | <strong><a class="term-ref" href="/books/llm-eval/glossary#final_state_assertion" title="终态断言：直接检查外部数据库哈希、文件系统、测试退出码或 DOM 状态是否满足目标约束">终态断言</a></strong>：DB 状态哈希、文件系统 Diff、进程/端口/权限检查、副作用清单 | 无法单独衡量对话体验、思考效率或中途越权读取敏感数据 |
| <strong>L4 成本与安全边界层（Guardrails）</strong> | 经济账与风控账过不过关？敢不敢上线？ | 单任务 `$/Task`、E2E P95 延迟、最大步数超限率、<strong><a class="term-ref" href="/books/llm-eval/glossary#indirect_prompt_injection" title="间接提示注入（IPI）：藏在网页、邮件或工具返回中的恶意指令劫持 Agent 原任务">间接提示注入</a></strong> $\mathrm{ASR}$、写前确认合规率 | 永远不能替代 L1/L3：啥也不干的空壳 Agent 成本最低、安全零违约，但完成率为 0 |

四层之间存在清晰的分工铁律：<strong>L1 与 L3 共同决定“判分对不对”（主目标门禁），L2 负责“归因准不准”（研发诊断雷达），L4 决定“上线行不行”（生产红线闸门）</strong>。

### L2 过程轨迹指标的设计边界：测“病理”，不锁“路径”
在设计 L2 指标时，团队最容易犯的错误是把参考轨迹里的工具调用序列当成金标做字符串编辑距离匹配。正确做法是**绝不锁死合法探索路径，只量化明确有害的病理行为与阶段性客观里程碑**：

- <strong>死循环率（Loop Rate）</strong>：单条轨迹中出现连续 $m \ge 3$ 轮调用相同工具、传入近似参数并持续收到相同错误码的占比；
- <strong>报错自愈率（Error Recovery Rate）</strong>：工具首次返回 `4xx/5xx` 或沙箱执行失败后，模型在 $\le 2$ 轮内修正参数或切换策略并成功推进的比例；
- <strong>有效步数比（Action Efficiency）</strong>：触发环境状态实质推进或获取新关键信息的动作步数占总步数 $H$ 之比，揪出反复重复读同一文件的无效空转；
- <strong>无序关键里程碑（Unordered Milestones）</strong>：把复杂长任务拆成若干可机检的客观检查点（如“成功复现原 Bug”“定位目标用户记录”“通过本地单测”），用于在终态失败时一秒定位任务折戟在第几阶段。

::: warning 真实工程事故：只看 L1 文本交付物的“幻觉通过”陷阱
某企业客服工单 Agent 在早期离线评测中仅用 LLM Judge 检查回复话术（L1），录得 89% 高分。上线两周后客诉暴增：团队回放轨迹并补齐 L3 数据库终态断言后发现，其中 21% 的“高分”轨迹里，Agent 调用退款 API 遇到了 `409 Conflict` 报错，但它既未重试也未转人工，而是直接在回复里礼貌告知用户“退款已原路退回，请查收”。L1 话术无懈可击，L3 账务状态纹丝不动——没有环境状态断言的 Agent 评测几乎等同于蒙眼狂奔。
:::

---

## 8.3 模型与脚手架贡献解耦：2×2 控制变量实验法

在公开榜单与企业内部选型中，最常见的一幕是：A 团队用自研多步规划 + 自动反思 + 动态工具裁剪的重型脚手架 $\mathcal{H}_1$ 跑底座 $\mathcal{M}_1$，B 团队用原生极简 ReAct 循环 $\mathcal{H}_0$ 跑底座 $\mathcal{M}_0$，然后拿 $\hat S(\mathcal{M}_1, \mathcal{H}_1) - \hat S(\mathcal{M}_0, \mathcal{H}_0)$ 直接宣称“新模型遥遥领先”。这套比法连最基本的控制变量原则都没过关。

沿用全书统一的测量误差视角（见 [全书导言](/books/llm-eval/) 与 [统计公式速查卡](/books/llm-eval/toolkit/metrics-and-stats)），要科学拆解底座模型升级与脚手架改造的各自净收益，必须执行<strong>2×2 因子交叉实验（Factorial Matrix）</strong>，在完全一致的评测集、沙箱镜像、超时配额与验证器下跑齐四个单元 $(\mathcal{M}_0, \mathcal{H}_0)$、$(\mathcal{M}_1, \mathcal{H}_0)$、$(\mathcal{M}_0, \mathcal{H}_1)$、$(\mathcal{M}_1, \mathcal{H}_1)$：

$$
\hat S(\mathcal{M}_1, \mathcal{H}_1) - \hat S(\mathcal{M}_0, \mathcal{H}_0)
\;=\; \underbrace{\big[\hat S(\mathcal{M}_1, \mathcal{H}_0) - \hat S(\mathcal{M}_0, \mathcal{H}_0)\big]}_{\Delta_{\text{model}}:\;\text{冻结脚手架测底座净增益}}
\;+\; \underbrace{\big[\hat S(\mathcal{M}_0, \mathcal{H}_1) - \hat S(\mathcal{M}_0, \mathcal{H}_0)\big]}_{\Delta_{\text{scaffold}}:\;\text{冻结底座测脚手架净增益}}
\;+\; \underbrace{\Delta_{\text{interact}}}_{\text{模型与脚手架交互效应}}
$$

其中交互项精确定义为：

$$
\Delta_{\text{interact}} = \big[\hat S(\mathcal{M}_1, \mathcal{H}_1) - \hat S(\mathcal{M}_1, \mathcal{H}_0)\big] - \big[\hat S(\mathcal{M}_0, \mathcal{H}_1) - \hat S(\mathcal{M}_0, \mathcal{H}_0)\big]
$$

全部差值都必须以题目为单位采用<strong><a class="term-ref" href="/books/llm-eval/glossary#paired_bootstrap" title="配对自助法：按题目成对重采样计算两系统得分差分布，消除题目难度方差">配对自助法（Paired Bootstrap）</a></strong>或<strong><a class="term-ref" href="/books/llm-eval/glossary#mcnemar_test" title="McNemar 检验：针对同题库二值配对结果，仅依赖两系统分歧题数判断显著性">McNemar 检验</a></strong>给出 95% 置信区间。借助这张 2×2 矩阵，工程团队可以清醒应对三类核心场景：

- <strong>场景 A：冻结脚手架测底座（横向选型）</strong>。选定一个结构极简、无模型专属偏好的标准参照脚手架 $\mathcal{H}_0$（统一工具 Schema、基础循环与固定步数上限），专门比较候选底座 $\mathcal{M}_0, \mathcal{M}_1, \mathcal{M}_2$ 的原生规划、长程纠错与抗干扰能力。
- <strong>场景 B：冻结底座测脚手架（纵向工程迭代）</strong>。锁死生产底座 $\mathcal{M}_0$，每次只改动一个脚手架组件（如上下文折叠策略、工具检索器或错误提示改写），检验其是否真在统计上显著涨点，并同步核查 L4 的 `$/Task` 与 P95 延迟变化。
- <strong>场景 C：警惕负交互效应的“脚手架过拟合”</strong>（即 $\Delta_{\text{interact}} < 0$）。如图 8-1 右侧教学算例所示：旧底座 $\mathcal{M}_0$ 换上繁琐的强制分步规划与反思脚手架 $\mathcal{H}_1$ 后猛涨 `+12.5pp`，但把这套脚手架原样套在更强的新底座 $\mathcal{M}_1$ 上，净增量反而收缩至 `+8.0pp`（$\Delta_{\text{interact}} = -4.5\text{pp}$），现实中甚至频繁出现**强底座套进旧脚手架后分数倒退**。原因十分直白：当初为弱模型打的几十条死板规则补丁与强制格式约束，束缚了新一代强推理模型自主探索的灵活性，还白白抬高了 Prefill 延迟与 Token 账单。

### 实战算例：如何读懂一张 2×2 交叉实验决策表
假设团队在 $N=450$ 道内部工单任务上评估新一代底座 $\mathcal{M}_1$ 与复杂多步反思脚手架 $\mathcal{H}_1$（以下数值为教学算例；为便于直觉对照，表中 $\widehat{\mathrm{pass}^4}$ 按同质难度近似 $p^4$ 展示）：

| 实验组合 | L1/L3 终态通过率 | 连续稳定 $\widehat{\mathrm{pass}^4}$ | 相对基线配对 $\Delta \pm 95\%\text{ CI}$ | 单任务成本（USD/Task） | E2E P95 延迟 | 架构判读 |
| --- | --- | --- | --- | --- | --- | --- |
| $(\mathcal{M}_0, \mathcal{H}_0)$ | $52.0\%$ | $7.3\%$ | 基线参照 | `0.14 USD` | `11.2 s` | 线上旧基线 |
| $(\mathcal{M}_0, \mathcal{H}_1)$ | $64.5\%$ | $17.3\%$ | $+12.5\text{pp} \pm 4.1\text{pp}$ | `0.46 USD` | `31.8 s` | 重编排显著弥补旧底座短板，但延迟翻近 3 倍 |
| $(\mathcal{M}_1, \mathcal{H}_0)$ | $66.0\%$ | $19.0\%$ | $+14.0\text{pp} \pm 3.9\text{pp}$ | `0.19 USD` | `12.6 s` | **性价比最优解**：裸换底座即超越旧底座加全套重脚手架 |
| $(\mathcal{M}_1, \mathcal{H}_1)$ | $74.0\%$ | $30.0\%$ | $+22.0\text{pp} \pm 4.3\text{pp}$ | `0.68 USD` | `36.5 s` | 绝对准确率最高，但交互项 $\Delta_{\text{interact}} = -4.5\text{pp}$ 暴露编排冗余 |

这张表立刻揭示了仅跑两条曲线绝对看不出的战略结论：直接上线 $(\mathcal{M}_1, \mathcal{H}_0)$ 只需增加 0.05 美元单任务成本，就能在准确率、稳定性与延迟上全面碾压耗时半年打磨的 $(\mathcal{M}_0, \mathcal{H}_1)$；而团队若想冲刺 $74\%$ 档位，接下来不该继续堆叠 $\mathcal{H}_1$，而应拆解 $\mathcal{H}_1$ 中对 $\mathcal{M}_1$ 依然有效的那一小半组件（例如精简掉冗余的强制反思轮次，只保留报错自愈与状态校验），把成本拉回 0.30 美元以内。

---

## 8.4 审计脚手架的三大隐性作弊模式

在公开 Agent 榜单与供应商 PoC 演示里，脚手架往往潜藏着三类极具迷惑性的隐性刷分手法，一旦触犯即演变为典型的<strong><a class="term-ref" href="/books/llm-eval/glossary#goodhart_law" title="Goodhart 定律：当度量指标本身变成优化目标时，它便不再是一个好指标">Goodhart 异化</a></strong>：

| 隐性作弊手法 | 常见伪装形式 | 造成的选型危害 | 审计识破手段 |
| --- | --- | --- | --- |
| **隐性重试冒充单次通过** | 脚手架内部偷偷采样 5 条轨迹，靠单测或投票选最优提交，对外却报为单次 <strong><a class="term-ref" href="/books/llm-eval/glossary#pass_at_k" title="pass@k：尝试 k 次至少成功 1 次的概率，无偏估计为 1 - C(n-c,k)/C(n,k)">pass@1</a></strong> | 混淆原生准确率与测试时计算扩展，低估真实部署成本 5–10 倍 | 强制披露单题总 LLM 调用次数、输入/输出 Token 与墙钟时间，归入独立算力赛道 |
| **面向公开基准硬编码** | 系统提示词或路由代码针对特定基准仓库/网站写死分支规则与正则补丁 | 公开集分数极高，切入企业私有业务瞬间泛化坍塌 | 保留 20%–30% 完全不公开域结构的<strong>盲测保留集（Holdout Suite）</strong>检验迁移性 |
| **静默吞错与无限重跑** | 将模型触发的格式错误、越界调用或沙箱崩溃包装成 20 次静默重跑且不记日志 | 人为掩盖高失败率、拉平延迟分布并扭曲故障归因 | 强制导出原始全量轨迹（Raw Trace），按[第 14 章](/books/llm-eval/chapters/chapter-14)严格拆分 `infra_error` 与 `model_failure` |

::: tip 架构决策原则：脚手架评测报告的四项必备元数据
任何一份可供管理层或技术委员会拍板的 Agent 评测报告，除了 L1/L3 终态通过率及其 95% 置信区间，必须随表公示四项元数据：① **底层模型精确版本号、推理精度与采样参数**；② **脚手架代码 Commit、最大步数上限与内部重试预算**；③ **单任务平均 Token、美元成本 `$/Task` 与 P95 墙钟延迟**；④ **2×2 交叉表中的冻结脚手架基线分**。缺少任意一项，都无法判断涨点究竟来自模型进化、工程巧思，还是纯粹靠烧钱硬砸。
:::

立好了四层评测框架与模型/脚手架解耦尺子，接下来四章我们将按核心业务战场逐一纵深推进：第 9 章切入落地最广的工具调用、动态 MCP 编排与多轮用户交互；第 10 章深拆 Coding / SWE 与终端执行沙箱；第 11 章攻克 Deep Research 与复杂 RAG 归因；第 12 章直面 GUI、长期记忆与多智能体协同。
