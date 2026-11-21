# 第 14 章 多轮工具交互与 Agentic RL 建模

<p class="chapter-summary">当大模型从单轮问答迈向多轮工具调用、代码调试与环境操作，系统从确定性 MDP 跃迁为随机 POMDP。本章建立多轮轨迹的数学形式化，立下“观测损失掩码”与“Token-in-Token-out”两条工程铁律，并拆解主流可验证 Agent 环境。</p>

前面十三章讨论的数学题、单轮代码生成与对话对齐，都有一个极其省心的前提：**状态转移是完全确定且封闭的**——模型吐出一个 token $y_t$，新状态就是把它直接拼到前缀末尾 $s_{t+1} = (x, y_{\le t})$，外部世界在生成结束前不会插一句话。

一旦让模型化身真正的**智能体（Agent）**——去修一个真实 GitHub 仓库的复杂 Bug、在命令行里反复跑 `pytest` 看报错、在浏览器里翻十几页网页交叉求证——情况瞬间天翻地覆。模型写完一个工具调用，外部环境才会吐回一段充满随机性、甚至可能超时或报错的观测文本。本篇用三章系统攻克 **Agentic RL** 的建模、信用分配与规模化环境工程。

---

## 14.1 从确定性单轮 MDP 到多轮随机 POMDP

在多轮工具交互中，一次完整回合（Episode）是一条由模型动作与环境观测交替拼接而成的长轨迹 $\tau$：

$$
\tau = \big(x,\; a^{(1)},\; o^{(1)},\; a^{(2)},\; o^{(2)},\; \dots,\; a^{(H)},\; o^{(H)}\big)
$$

其中每轮 $h = 1, \dots, H$ 包含：
- **模型动作段 $a^{(h)}$**：由策略自回归生成的一串 token（通常内部包含 `<think>` 推理 + `<tool_call>` 工具调用参数，或最后一轮的最终答复）；
- **环境观测段 $o^{(h)} \sim P_{\text{env}}(\cdot \mid \text{state}_{\text{env}}, a^{(h)})$**：外部沙箱、搜索引擎、数据库或浏览器返回的执行结果（stdout/stderr、网页片段、文件 diff、API JSON）。

在强化学习形式化下，这是一个标准的<strong><a class="term-ref" href="/books/llm-rl/glossary#pomdp" title="POMDP，部分可观测马尔可夫决策过程：智能体只能通过历史交互观测间接推断环境真实隐状态">部分可观测马尔可夫决策过程（POMDP）</a></strong>：
1. **环境隐状态不可全观**：比如代码仓库有上千个文件、网页背后的数据库不可见，模型只能靠主动调用 `grep`/`ls`/`read_file` 等**信息搜集动作**逐步揭开环境状态；
2. **状态转移随机且由外部决定**：同一条搜索查询或并发网络请求在不同时刻可能返回不同结果；
3. **整条轨迹的联合概率分解为策略项与环境项之积**：

$$
P_\theta(\tau \mid x) = \prod_{h=1}^{H} \underbrace{\pi_\theta\big(a^{(h)} \mid x, a^{(<h)}, o^{(<h)}\big)}_{\text{受参数 } \theta \text{ 控制}} \cdot \underbrace{P_{\text{env}}\big(o^{(h)} \mid \text{history}_h, a^{(h)}\big)}_{\text{与参数 } \theta \text{ 无关}}
$$

对上式取对数再关于 $\theta$ 求梯度，所有环境转移项 $\nabla_\theta \log P_{\text{env}} \equiv 0$ 全部自动消去！这从第一性原理上直接导出了多轮 Agent RL 的第一条工程铁律。

---

## 14.2 两条不可违背的多轮轨迹工程铁律

把整条多轮轨迹展平为一条连续的 token 序列 $z = (z_1, \dots, z_T)$ 送入训练框架时，下面两条规则只要违反任何一条，训练就会轻则掉点、重则彻底崩溃：

<figure class="book-figure">
  <img src="/figures/llm-rl/agent-pomdp-mask.svg" alt="多轮 Agentic RL 轨迹拼接、损失掩码 μ_t 与 Token-in-Token-out 铁律" loading="lazy">
  <figcaption><span class="book-figure__label">图 14-1</span>多轮轨迹在显存里的真实形态。策略梯度、裁剪与 KL 惩罚必须严格乘以损失掩码 $\mu_t$，且 rollout 阶段生成的原始 token ID 必须原封不动透传给训练器。</figcaption>
</figure>

### 铁律 1：精确的观测<a class="term-ref" href="/books/llm-rl/glossary#loss_masking" title="损失掩码 μ_t：在多轮交互中屏蔽非策略生成的观测与提示 token，仅对动作 token 计算策略梯度">损失掩码（Loss Masking）</a> $\mu_t \in \{0, 1\}$

为序列中的每一个位置维护一个二值掩码 $\mu_t$：
- 当 $z_t$ 属于**模型自己生成的动作 token**（思考、工具调用、最终答复）时，置 $\mu_t = 1$；
- 当 $z_t$ 属于**系统提示、用户提问或外部环境返回观测 $o^{(h)}$** 时，置 $\mu_t = 0$。

代入任意策略优化目标（以 DAPO/GRPO 式聚合为例），损失分母与分子都只统计 $\mu_{i,t} = 1$ 的有效动作 token：

$$
J_{\text{agent}}(\theta) = \mathbb{E}\Bigg[\frac{1}{\sum_{i=1}^G \sum_{t=1}^{|z_i|} \mu_{i,t}}\sum_{i=1}^{G}\sum_{t=1}^{|z_i|} \mu_{i,t}\cdot\min\big(\rho_{i,t}\hat A_{i,t},\;\operatorname{clip}(\rho_{i,t}, 1-\varepsilon_{\text{low}}, 1+\varepsilon_{\text{high}})\hat A_{i,t}\big)\Bigg]
$$

**为什么漏加或错位 1 个 token 的掩码就是灾难？** 如果环境返回的报错信息被误算进 $\mu_t = 1$，遇到正优势轨迹时梯度会强迫模型去“最大化沙箱输出文本的似然”，破坏语言与工具调用边界；遇到负优势轨迹时，模型甚至会被惩罚“不该预测出真实环境会吐出的报错”。

### 铁律 2：Token-in-Token-out（严禁“解码再重分词”）

在单轮 RL 里，很多初学者图省事，让 vLLM 输出字符串 `response_text`，落盘后再在训练器里用 `tokenizer.encode(prompt + response_text)` 重新分词。这在多轮交互里是**头号隐形杀手**：

BPE / SentencePiece 分词器不具备严格的前缀拼接可逆性——在两段文本的拼接边界（尤其是工具标签 `</tool_call>\n<tool_response>`、空格、缩进或 Unicode 字符处），`encode(A) + encode(B)` 往往**不等于** `encode(A + B)`！一旦重新分词后的 token ID 与推理引擎采样时吐出的原始 token ID 哪怕错开了一个位置：
- 推理侧记录的 $\log \pi_{\text{infer}}(y_t\mid s_t)$ 与训练侧算出的 $\log \pi_{\text{train}}(y_t\mid s_t)$ 会立刻发生剧烈漂移；
- 重要性比 $\rho_t$ 瞬间爆表，轻则整段轨迹被裁剪废掉，重则直接炸毁训练（详见第 18 章）。

**唯一正确做法（Token-in-Token-out）**：推理引擎直接返回精确的 `output_token_ids` 与对应的 `rollout_logprobs`；外部工具观测仅对新增片段单独 `encode` 并直接拼接到 `token_id` 数组末尾，同时追加等长的 `0` 到掩码数组 $\mu$ 中，**全程以整数 ID 数组为唯一事实源**，绝不经过字符串往返重编码！

---

## 14.3 上下文膨胀管理与主流可验证 Agent 环境

当交互轮数达到 30–100 轮时，单条轨迹极易突破 64k–128k 上下文上限。如果直接把长输出硬截断或粗糙摘要，又会打破多轮轨迹的马尔可夫前缀连续性：
- **观测截断与结构化摘要**：在环境侧对超长 stdout / 网页 HTML 先做确定性截断（例如保留头尾各 100 行 + 行数提示），让模型学会主动用 `sed`/`grep` 精确定位；
- **显式上下文折叠（Context Compaction / Working Memory）**：当历史接近上限时，把“调用压缩工具归档历史状态”本身也设计成一种合法动作，使模型在 RL 中学会主动管理工作记忆；
- **轮次分段切块（Sliding / Trajectory Splitting）**：若环境强制清理旧观测，则切分后的每段训练样本必须保持与其 Rollout 推理时**完全一致**的上下文视窗，切忌推理时丢弃了旧观测、训练时却把完整历史塞进去。

### 四类最具代表性的可验证 Agentic RL 环境

与第 5 章的静态 RLVR 相比，Agentic RL 的核心资产是**可执行、可复现、可自动判分的交互环境**：

| 环境类别 | 典型动作空间 | 确定性验证方式 | 核心难点 |
| --- | --- | --- | --- |
| **软件工程（SWE）** | Bash 终端、文件读写/Patch、Git、`pytest` | 在隔离 Docker 镜像里应用补丁，运行隐藏 `FAIL_TO_PASS` 与 `PASS_TO_PASS` 测试套件 | 容器冷启动与磁盘 I/O 吞吐高、测试运行动辄数十秒、极易出现修改测试文件的奖励作弊 |
| **深度检索（Deep Research / Search）** | 搜索查询、打开 URL、页内查找、Python 计算 | 事实性问答的精确匹配、多跳证据链核验，或 Rubrics 细则评判 | 线上搜索引擎延迟抖动与结果不可复现（生产训练常搭建离线本地快照索引或缓存代理） |
| **终端与系统运维** | Shell 命令、进程/网络/配置检查与修复 | 检查目标系统终态断言（服务端口、配置文件、数据校验和） | 脏状态残留与危险命令（如破坏容器环境），需要轻量级快照秒级回滚 |
| **GUI / 计算机操作** | 鼠标点击坐标、键盘输入、滚动、截屏观测 | 检查桌面/网页 DOM 终态或数据库变更断言 | 视觉多模态输入极大增加显存与 Prefill 成本、动作坐标精度与长尾等待 |

搭好了单条多轮轨迹的建模与环境，紧接着就会撞上 Agentic RL 最棘手的两座大山：上百步交互里只有最后一句 `All tests passed` 时**信用怎么分**，以及当任务复杂到需要**多个子智能体并行协作**时该训谁？这正是下一章的主题。
