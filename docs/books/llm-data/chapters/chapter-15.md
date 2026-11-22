# 第 15 章 Agent 数据范式全景、统一轨迹 Schema 与“环境即数据”

<p class="chapter-summary">剖析多轮 POMDP 交互轨迹为何比单轮文本难一个数量级，设计跨 Tool/SWE/Research/GUI 通用的统一轨迹中间表示（Trajectory IR）与精确 Token 级 Loss Mask，确立“环境即数据”的可重置沙箱范式，并建立四层 Agent 数据质量金字塔。</p>

如果说静态预训练与单轮 SFT 是教模型“熟读万卷书并答好闭卷题”，那么 Agent 后训练就是教模型“走进变化莫测的真实工位、手握工具连贯办成复杂业务”。自本章起，全书进入篇幅最厚、工程含金量最高的**第五篇——Agent 数据工程高地（第 15–20 章）**。很多团队在把单轮对齐经验直接套到 Agent 上时，往往会撞上一堵隐形高墙：花了十倍算力收集了数百万条交互日志，微调后模型反而学会了自行编造工具返回、在报错日志里死循环，甚至上线两周就因为 API 字段升级而大面积崩坏。要跨过这堵墙，必须先把 Agent 数据的数学本质、数据结构与基础设施彻底重构。

---

## 15.1 从单轮文本到 POMDP 轨迹：Agent 数据的五重工程壁垒

在单轮监督微调中，一条样本只是静态映射 $x \mapsto y$；而一个真实 Agent 的一次完整任务执行，本质上是**部分可观测马尔可夫决策过程（POMDP）**下的一条多轮交互轨迹：

$$
\tau = (s_0, a_0, o_0, s_1, a_1, o_1, \dots, s_T), \qquad a_t = (\text{think}_t, \text{act}_t), \qquad o_t \sim P_{\text{env}}(\cdot \mid s_t, a_t)
$$

其中 $s_t$ 是外部环境（数据库、代码仓、操作系统或互联网）在时刻 $t$ 的真实隐状态，$a_t$ 是模型输出的思维推演与工具/界面动作，$o_t$ 则是环境执行动作后返回的异构观测。正是这种闭环交互，使 Agent 数据在采集、存储、清洗与训练上呈现出五重远超单轮语料的工程壁垒：

| 工程维度 | 单轮静态文本 / CoT 数据 | 多轮 Agent 交互轨迹数据 | 典型工程失控后果 |
| --- | --- | --- | --- |
| **状态耦合性** | 样本自包含、无外部状态依赖 | 动作 $a_t$ 永久改变 $s_{t+1}$，每一步强依赖历史状态 | 无法脱离执行环境离线拼接假对话，否则前后状态自相矛盾 |
| **环境非确定性** | 静态字符串完全可复现 | 并发限流、网络抖动、时钟变化与异步渲染引入噪声 | 同一条轨迹重跑结果漂移，验证信号充满随机假阴性 |
| **接口漂移与老化** | 语言知识数十年内基本稳定 | 工具 JSON Schema、依赖库与前端 UI 按周改版（<a class="term-ref" href="/books/llm-data/glossary#trajectory_staleness" title="因工具 Schema 变更、UI 改版或业务规则更新导致历史轨迹变成过时错误示范的现象">轨迹老化</a> $\psi_{\text{stale}}$） | 半年沉淀的百万轨迹变成教模型调用废弃字段的毒样本 |
| **异构多模态观测** | 纯文本或单图配短描述 | 混合文本、超长终端 `stdout`、HTML/DOM 树与高分截图（$T_{\text{img}}$） | JSONL 塞入 Base64 截图直接打爆磁盘 I/O 与数据加载内存 |
| **上下文二次爆炸** | 单条样本普遍 1K–4K tokens | 单轨常达 20K–128K tokens，且合成推理 Prefill 呈轮次平方增长 | 不做掩码与观测压缩，训练梯度与合成推理费同时失控 |

### 数值账本：15 轮多模态/工具轨迹的 Token 结构与合成算力账

以一条典型的 15 轮企业混合 Agent 轨迹为例（系统提示与 25 个工具 Schema 占 $2{,}200$ tokens；用户任务 $300$ tokens；每轮模型生成思考加工具调用平均 $246$ tokens；每轮环境返回含 JSON 载荷、报错日志与 3 次高清截图调用 $T_{\text{img}} = 1{,}600$ tokens，平均观测 $1{,}227$ tokens）：

- **单条轨迹终态总长度**：$L_{\text{total}} = 2{,}200 + 300 + 15 \times 246 + 15 \times 1{,}227 = \mathbf{24{,}605}$ tokens。
- **有效动作占比**：模型真正生成的全部 Token（含终答）仅有 $L_{\text{act}} = 3{,}690$ tokens，仅占整条序列的 **$15.0\%$**；其余 **$85.0\%$** 均为系统提示与外部环境观测 $o_t$。
- **在线 Rollout 合成时的累积 Prefill 账**：在无 KV Cache 跨请求复用时，15 轮自回归交互的累积输入 Token 高达 $\sum_{k=1}^{15} L_{\text{ctx}}^{(k)} \approx \mathbf{198{,}000}$ tokens——是终态序列长度的 **$8.0\times$**！按离线批推理均价 $c_{\text{in}} = \$0.20 / \text{1M}$、$c_{\text{out}} = \$0.80 / \text{1M}$ 计算，单次 Rollout 推理费 $C_{\text{gen}} \approx \$0.043$（开启前缀缓存 Prefix Caching 后可压降 $60\%\text{–}75\%$）。

---

## 15.2 统一轨迹中间表示（Trajectory IR）与 Schema 设计

绝大多数团队的 Agent 数据债，始于“每个业务线各自发明一套非标准 JSON 日志”：工具组用 OpenAI Chat 格式、SWE 组存原始 bash transcript、GUI 组把几百张 PNG 塞进嵌套目录。结果到了联合后训练、统一去伪（第 20 章）或<a class="term-ref" href="/books/llm-data/glossary#data_lineage" title="记录从原始源、脚本 Commit、过滤阈值到最终训练快照的 DAG 血缘图">数据血缘</a>审计时，数据加载器充斥着数百个易碎的正则补丁。

工业界成熟的解法，是在采集层出口即强制归一化为全平台唯一的<a class="term-ref" href="/books/llm-data/glossary#trajectory_ir" title="跨工具调用、终端执行、网页检索与 GUI 操控的标准化 JSON/Parquet 轨迹数据结构">统一轨迹中间表示（Trajectory IR）</a>。其物理存储遵循**“列式结构元数据（Parquet）+ 外部大对象内容寻址（S3/OSS Blob URI）”**双层解耦原则——严禁将截图 Base64 或兆字节级终端日志直接内联写死在 JSONL 行中。一个完备的 Trajectory IR 逻辑结构如下：

```json
{
  "trajectory_id": "trj_20261122_8f91c2",
  "domain": "swe | tool_mcp | deep_research | gui_os",
  "env_spec": {
    "image_digest": "sha256:9c4a...",
    "tool_schema_hash": "sha256:3b10...",
    "seed": 42, "clock_utc": "2026-10-01T00:00:00Z"
  },
  "turns": [
    {
      "turn_idx": 1, "role": "assistant", "loss_mask": 1,
      "think": "先用 rg 定位 timeout 配置，避免盲改全仓。",
      "tool_calls": [{"id": "tc_1", "name": "bash", "args": {"cmd": "rg -n timeout src/"}}]
    },
    {
      "turn_idx": 2, "role": "tool", "loss_mask": 0, "tool_call_id": "tc_1",
      "obs_text": "src/client.py:48: DEFAULT_TIMEOUT = 30",
      "media_refs": [{"type": "image/png", "uri": "s3://lake/blob/a1b2.png", "w": 1280, "h": 800, "sha256": "..."}],
      "truncated": false, "latency_ms": 142
    }
  ],
  "assertions": [{"name": "pytest_f2p", "passed": true, "stdout_uri": "s3://..."}],
  "outcome": {"verified_pass": true, "tier": "T2", "total_tokens": 24605, "cost_usd": 0.052}
}
```

这套 Schema 天然具备四项工程红利：**跨领域统一 Loader**（SFT、Step-DPO、RLVR 共用一套 Token 渲染与掩码引擎）、**精确版本锚定**（通过 `tool_schema_hash` 与 `image_digest` 秒级检索受接口改版影响的老化轨迹）、**低成本媒体复用**（相同网页/界面截图按 SHA-256 去重，磁盘直省 $60\%$ 以上）以及**分叉树扩展性**（只需附加 `parent_trajectory_id` 与 `branch_turn_idx` 即可原生表达第 20 章的反事实回滚修复与 Step-DPO 对比分支）。

---

## 15.3 精确 Token 级 Loss Mask 与未掩码灾难案例

把 Trajectory IR 渲染为训练序列 $x = (x_1, \dots, x_L)$ 时，最核心也最容易写错的防线是逐 Token 的<a class="term-ref" href="/books/llm-data/glossary#loss_mask" title="在多轮 Agent 监督训练中精确区分模型动作置 1 与外部环境观测置 0 的逐 Token 梯度开关">轨迹损失掩码（Loss Mask）</a>。沿用[核心公式与数据账本速查卡](/books/llm-data/toolkit/formulas-and-ledgers)的全局统一记号，带掩码的多轮 Agent 监督目标为：

$$
\mathcal{L}_{\text{Agent}}(\theta) = -\frac{\sum_{t=1}^{L} m_t \log \pi_\theta(x_t \mid x_{<t})}{\sum_{t=1}^{L} m_t}, \qquad
m_t = \begin{cases} 1, & x_t \in \{\text{Think}, \text{ToolCall}, \text{FinalAnswer}, \text{AssistantEOS}\} \\ 0, & x_t \in \{\text{System}, \text{User}, \text{ToolObservation}, \text{EnvError}, \text{RoleHeader}\} \end{cases}
$$

<figure class="book-figure">
  <img src="/figures/llm-data/agent-trajectory-ir-mask.svg" alt="统一轨迹中间表示 Trajectory IR、逐 Token Loss Mask 机制与未掩码灾难对照图" loading="lazy">
  <figcaption><span class="book-figure__label">图 15-1</span>统一 Trajectory IR 的四段式数据结构、多轮序列的逐 Token Loss Mask 边界规则，以及观测漏掩码灾难与 Environment-as-Data 闭环的工程对照。</figcaption>
</figure>

### 真实灾难案例：当 `tool_obs` 漏掉掩码时会发生什么？

某团队在微调 32B 代码与工具 Agent 时，直接复用了旧版对话 SFT 脚本——该脚本仅对 `user` 轮次置 $m_t = 0$，却把自定义标签 `<tool_response>...</tool_response>` 错误归并到了 `assistant` 连续文本中（$m_t = 1$）。训练 2 个 Epoch 后，离线 Loss 曲线异常平滑漂亮，但一上沙箱评测通过率竟从基线 $42\%$ **暴跌至 $9\%$**。根因剖析揭示了三重毁灭性机制：

1. **梯度信噪比被稀释 $5.7\times$**：由 15.1 节账本可知，环境观测占整条轨迹 $85\%$ 的 Token。未掩码意味着每 100 步反向传播中，有 85 步算力在强迫模型背诵毫无预测规律的随机 UUID、HTTP 响应头、时间戳与杂乱 traceback。
2. **学会“自演环境返回”的致命幻觉**：由于训练时 `<tool_call>` 后紧跟着被计入损失的 `<tool_response>{"status": "ok"}` 与 `12 passed in 0.41s`，模型习得了极强的条件概率——在线上推理吐完工具调用后不输出停止符，而是自己接着编造一段全绿的测试通过日志并直接宣布“任务已完成”！
3. **边界 Token 一位之差导致控制权死锁**：与漏掩码相反的另一种隐蔽 Bug 是“过度掩码”——把模型每轮动作末尾的 `<|im_end|>` / EOS Token 也误置为 $m_t = 0$。后果是模型永远学不会在发起工具调用后主动停下来把控制权交还给运行时，输出陷入无限续写。此外，将多条短轨迹打包进单条长序列时，必须严格配合第 2 章的<a class="term-ref" href="/books/llm-data/glossary#intra_doc_masking" title="在多文档打包序列中于注意力矩阵里阻断跨样本 Token 互见的块对角掩码">块内注意力掩码</a>，防止轨迹 B 的推理偷看轨迹 A 的工具返回。

---

## 15.4 “环境即数据”范式与可验证沙箱基建

单靠人工录屏或专家手写静态对话，不仅每条轨迹成本高达 **$15–$60**，而且永远追不上业务工具与代码仓的演化速度。Part 5 贯穿始终的核心方法论是<a class="term-ref" href="/books/llm-data/glossary#environment_as_data" title="把可重置、可并发实例化、带确定性状态断言的沙箱应用/数据库/代码仓本身当作一等数据资产来规模化生产和管理">环境即数据（Environment-as-Data）</a>：**不要只把静态轨迹文本当作数据资产，而要把“可重置、可高并发实例化、自带确定性状态断言的沙箱环境”当作上游一等数据资产来工程化生产与版本管理**。

一个合格的“环境即数据”底座必须满足三项硬指标：**毫秒级快照回滚**（为第 20 章的反事实修复与 RLVR 树采样提供低成本分叉能力）、**严密隔离与确定性**（无外网泄漏、固定时钟与随机种子）、**程序化终态断言**（直接校验 SQLite/Postgres 表变更、文件系统校验和、单测退出码或浏览器存储状态，把验证成本压到微秒级）。不同沙箱方案的工程权衡账本如下：

| 沙箱基建层级 | 典型技术栈 | 单实例重置延迟 | 单节点并发密度（64C/256G） | 单次 Rollout 环境费 $C_{\text{env}}$ | 适用 Agent 场景 |
| --- | --- | --- | --- | --- | --- |
| **进程级状态 Mock** | 内存 SQLite + FastAPI/MCP 进程池 | **1–5 ms** | 2,000–5,000 路 | $< \$0.0005$ | 第 16 章 Tool/MCP 多轮合成 |
| **CoW 容器复用** | Docker + OverlayFS / Kata / gVisor | **30–120 ms** | 200–600 路 | $\$0.004\text{–}\$0.012$ | 第 17 章 SWE / Linux 终端工厂 |
| **轻量微虚机快照** | Firecracker MicroVM + 内存页快照 | **80–250 ms** | 120–300 路 | $\$0.010\text{–}\$0.025$ | 第 17 章内核级运维、高隔离代码执行 |
| **完整桌面/移动仿真** | QEMU/KVM + Xvfb + Android Emulator | **1.5–4.0 s**（快照恢复） | 24–64 路 | $\$0.035\text{–}\$0.090$ | 第 19 章 GUI / Computer-Use |

一旦把环境做成版本化镜像与种子工厂，算力经济性会发生质变：构建 1 个高质量可重置沙箱的工程成本，可以摊销到 50–200 道不同任务、再乘以多轮<a class="term-ref" href="/books/llm-data/glossary#rlvr_data" title="由清晰难题 Prompt 与抗作弊确定性验证器成对构成的可验证奖励强化学习数据资产">可验证奖励（RLVR）</a>在线探索与离线拒绝采样，让单条高质量多轮轨迹的合成成本稳定落在 **$0.08–$0.80** 区间（仅为人工精标的 $1\%$–$3\%$）。

---

## 15.5 四层 Agent 数据质量金字塔

并非所有轨迹都适合塞进同一个训练阶段。工程实践中应按验证强度与信噪比，将全平台沉淀的 Trajectory IR 资产严格划分为四层金字塔，并实施分级入库与差异化配比：

| 层级 | 资产名称 | 核心验真门槛 | 典型端到端留存 $\eta_{\text{pass}}$ | 参考有效单价 $C_{\text{eff}}$ | 最佳消费训练阶段 |
| --- | --- | --- | --- | --- | --- |
| **Tier 0** | 原始未验真交互日志 | 仅做 PII 脱敏与基础格式解析，无终态校验 | $70\%\text{–}85\%$ | $< \$0.01$ | 严禁直接用于精调；仅作任务分布挖掘与错因聚类 |
| **Tier 1** | 语法合规可执行轨迹 | JSON Schema 100% 合法、工具可正常返回、无截断崩溃，但缺严格终态真值 | $40\%\text{–}60\%$ | $\$0.02\text{–}\$0.08$ | 少量混入中期训练（Mid-training）扩充工具协议先验 |
| **Tier 2** | 终态可验证净化轨迹 | 确定性终态断言 100% 通过 + 清除<a class="term-ref" href="/books/llm-data/glossary#lucky_hack" title="虽侥幸触发通过判定但存在篡改单测、盲目瞎蒙或严重冗余的毒化轨迹">假成功（Lucky Hack）</a>与冗余死循环 | $10\%\text{–}30\%$ | $\$0.08\text{–}\$0.80$ | Agent SFT 主力燃料、离线 RFT 与 RLVR 题池底座 |
| **Tier 3** | 过程校验与反事实精炼金轨 | Tier 2 基础上叠加分叉点<a class="term-ref" href="/books/llm-data/glossary#counterfactual_repair" title="对失败轨迹定位首个关键偏航步并回滚沙箱注入专家修复动作以构造高质量正样本与步级对比对的技术">反事实修复</a>、步级过程校验与专家抽检仲裁 | $5\%\text{–}15\%$（或由失败盘活） | $\$0.35\text{–}\$3.00$（人工达 $\$30+$） | Step-DPO、PRM 训练、高难长程与安全红线终局冲刺 |

::: tip 工程黄金法则：Tokenizer 往返掩码单测必须进入数据入库 CI
在把任何一批新合成或新采集的 Trajectory IR 投入训练集群前，务必在 CI 中对随机抽取的 500 条样本执行 **Decode-Inspect Mask Audit**：将 `mask == 1` 的 Token 单独拼回文本（高亮绿色），将 `mask == 0` 的 Token 拼回文本（高亮灰色），并编写确定性断言检查三件事——① 绿色片段中绝不出现 `<tool_response>`、`stderr` 或用户原话；② 每一段绿色 `assistant` 输出末尾严格以模型对应的 EOS/Stop Token 结尾；③ 绿色 Token 总占比落在合理区间（$5\%\text{–}40\%$）。这 30 行自动化测试能挡掉 $90\%$ 以上的 Agent 微调离奇事故。
:::

::: warning 严禁把“活体外部生产 API”直接接入训练 Rollout 闭环
切勿为了省去搭建 Mock 沙箱的工夫，直接让合成/RLVR 并发 Worker 去调用真实的第三方 SaaS、电商或企业生产写接口。除了极易触发封号限流、产生真实资金与数据脏写之外，实时 API 的响应内容会随外部库存与实时新闻剧烈漂移，不仅让轨迹彻底不可复现，还会把第三方网页中的未知恶意提示注入直接引入训练集。所有面向训练的 Rollout 必须在离线可重置快照或 Stateful Mock 中闭环完成。
:::

搭建好统一 Trajectory IR、精确 Loss Mask 与“环境即数据”的共同底座后，接下来四章我们将逐一拆解四大高频 Agent 战场的垂直数据工厂。下一章先攻克企业落地最广泛的领域：工具调用、MCP 生态与多轮人机博弈数据合成。
