# LLM 强化学习：原理与后训练实践

<p class="chapter-summary">从策略梯度与 KL 正则的第一性原理出发，系统打通奖励工程、PPO / DPO / GRPO 及 2026 新一代算法、长思维链推理与在线蒸馏、多轮 Agentic RL，以及大规模训练系统的显存账本与稳定性归因。</p>

大模型后训练中的强化学习，本质上始终在围绕同一条核心目标演进：

$$
\max_\theta\;\; \mathbb{E}_{x\sim\mathcal{D}}\Big[\;\mathbb{E}_{y\sim\pi_\theta(\cdot\mid x)}\big[\,r(x,y)\,\big]\;-\;\beta\,\mathbb{D}_{\mathrm{KL}}\big[\pi_\theta(\cdot\mid x)\,\big\|\,\pi_{\text{ref}}(\cdot\mid x)\big]\Big]
$$

这条公式看似简洁，却在真实工程里分裂出数十种算法名称与系统难题：为什么 SFT 解决不了推理上限？PPO 为什么被 DPO 与 GRPO 轮番替代，而 2025–2026 年的 Dr.GRPO、DAPO、GSPO、CISPO、MaxRL、GDPO、SDPO 又分别改了哪一行？为什么同一组权重在推理引擎和训练框架里算出的概率不一致，甚至让百卡 MoE 训练无征兆崩溃？本书沿<strong>「先建统一目标、再拆奖励与算法、最后算清系统与稳定性账」</strong>的主线，把大模型后训练 RL 的理论与工业实践一次讲透。

<div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin:1.1rem 0 1.4rem;">
  <a href="/books/llm-rl/chapters/chapter-01" style="display:inline-flex;align-items:center;padding:0.55rem 1.15rem;border-radius:8px;background:var(--vp-c-brand-1);color:#fff;font-weight:600;text-decoration:none;">从第 1 章开始 →</a>
  <a href="#reading-paths" style="display:inline-flex;align-items:center;padding:0.55rem 1.05rem;border-radius:8px;border:1px solid var(--vp-c-divider);color:var(--vp-c-text-1);font-weight:600;text-decoration:none;">按角色选路线</a>
  <a href="/books/llm-rl/toolkit/notation-and-formulas" style="display:inline-flex;align-items:center;padding:0.55rem 1.05rem;border-radius:8px;border:1px solid var(--vp-c-divider);color:var(--vp-c-text-1);font-weight:600;text-decoration:none;">全局符号与公式速查</a>
</div>

<figure class="book-figure">
  <img src="/figures/llm-rl/rl-fullstack-map.svg" alt="LLM 强化学习全栈地图" loading="lazy">
  <figcaption><span class="book-figure__label">全景图</span>自上而下打通推理/Agent 范式、策略优化算法、奖励工程与分布式训练系统四层，贯穿一条“统一优化目标与稳定性归因”主轴，对应全书 6 篇 20 章。</figcaption>
</figure>

## 按角色选择阅读路线 {#reading-paths}

不必从头到尾线性读完。结合你当前的研发角色选一条主线，遇到数学推导或系统细节再随时跳转查阅。

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-rl/part-1">
    <div>
      <div class="part-card__num">ROUTE 01 · 第 1–10 章</div>
      <div class="part-card__title">算法推导与对齐主线</div>
      <p class="part-card__desc">吃透 MDP/Bandit 建模、KL 闭式解、策略梯度与 GAE、各类奖励信号及防作弊，按统一符号系统推导 PPO、DPO、RLOO、GRPO 到 DAPO/GSPO/CISPO/MaxRL/SDPO。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/part-4">
    <div>
      <div class="part-card__num">ROUTE 02 · 第 5 + 8–16 章</div>
      <div class="part-card__title">推理模型与 Agentic RL 实战</div>
      <p class="part-card__desc">聚焦 RLVR 与长思维链配方（R1 / k1.5 / Qwen3）、熵坍缩机理、在线蒸馏与 DeepSeek-V4 专家整合，以及多轮工具交互、PARL 并行编排与异步 Agent 课程训练。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/part-6">
    <div>
      <div class="part-card__num">ROUTE 03 · 第 2–3 + 9 + 16–20 章</div>
      <div class="part-card__title">RL Infra 与大规模稳定性排障</div>
      <p class="part-card__desc">衔接《LLM 推理工程》，算清 Rollout 长尾气泡与四模型显存账，攻克训练-推理概率不一致（TIS / IcePop / R3 / PR2）、veRL / slime / AReaL 选型与 ScaleRL 排障。</p>
    </div>
  </a>
</div>

## 全书结构总览

### 六篇 20 章主线

| 篇目 | 章节范围 | 核心问题 | 入口 |
|---|---|---|---|
| **第一篇 理论底座与问题建模** | 第 1–3 章 | 为什么 SFT 不够？如何把生成建模为 RL？策略梯度、GAE、KL 闭式解与 PPO 裁剪怎么推导？ | [进入第一篇](/books/llm-rl/part-1) |
| **第二篇 奖励工程与防作弊** | 第 4–6 章 | 奖励从哪来（人类偏好、AI 反馈、可验证规则、评分细则、过程监督）？如何识别与防御 Reward Hacking？ | [进入第二篇](/books/llm-rl/part-2) |
| **第三篇 对齐与策略优化算法演进** | 第 7–10 章 | PPO-RLHF、DPO 族、RLOO/GRPO、Dr.GRPO/DAPO/GSPO/CISPO 到 MaxRL/GDPO/SDPO 分别改了什么？ | [进入第三篇](/books/llm-rl/part-3) |
| **第四篇 推理涌现、探索动态与蒸馏融合** | 第 11–13 章 | R1/k1.5/Qwen3 如何炼成长思维链？熵为何坍缩？RL 与在线蒸馏在 V4 时代怎样分工？ | [进入第四篇](/books/llm-rl/part-4) |
| **第五篇 Agentic RL 与多轮环境** | 第 14–16 章 | 多轮工具调用如何掩码与构造轨迹？长程信用如何分配？PARL 与异步沙箱环境怎样规模化？ | [进入第五篇](/books/llm-rl/part-5) |
| **第六篇 规模化训练系统与工程归因** | 第 17–20 章 | Rollout 与训练如何协同？训练-推理不一致与 MoE 抖动怎么修？如何用 ScaleRL 与指标仪表盘排障？ | [进入第六篇](/books/llm-rl/part-6) |

### 横切参考区

| 区域 | 页面 | 适用场景 |
|---|---|---|
| 进阶专题库 | [专题 A：核心论文精读与推导档案](/books/llm-rl/topics/paper-notes) | 集中检索 1992–2026 核心论文的实验条件、原文符号对照与关键结论口径 |
| 进阶专题库 | [专题 B：多模态与生成式模型后训练 RL](/books/llm-rl/topics/multimodal-rl) | 了解视觉推理（VLM RLVR）与图像/视频扩散模型的偏好对齐拓展 |
| 进阶专题库 | [专题 C：测试时计算与在线自适应](/books/llm-rl/topics/test-time-compute) | 打通 Best-of-N、PRM 搜索、多数投票与 Test-Time SDPO 的推理扩展视角 |
| 进阶专题库 | [专题 D：经典深度 RL 脉络速览](/books/llm-rl/topics/classical-rl-map) | 快速回溯 DQN、SAC、MCTS、世界模型与离线 RL（CQL/IQL）的经典血缘 |
| 参考工具箱 | [全局符号约定与核心公式速查卡](/books/llm-rl/toolkit/notation-and-formulas) | 全书唯一符号源，杜绝论文间 $r/\rho$、$s/g$、$T/M$ 撞车，附核心推导索引 |
| 参考工具箱 | [算法选型矩阵与排障速查表](/books/llm-rl/toolkit/debugging-checklist) | 速查算法差异、超参数量级与 9 项核心监控指标异常排障路径 |
| 参考工具箱 | [核心算法最小 PyTorch 参考实现](/books/llm-rl/toolkit/reference-code) | 对照阅读 PPO、DPO、GRPO、DAPO、GSPO、CISPO、MaxRL 与 TIS 的精简张量代码 |

## 阅读约定与交互体验

- **全书符号统一**：不同社区的 RL 论文符号冲突严重（例如 PPO 原文用 $r_t$ 表示概率比、SimPO 用 $\gamma$ 表示间隔、GSPO 用 $s_i$ 表示序列比率）。本书统一遵循 [全局符号约定](/books/llm-rl/toolkit/notation-and-formulas)，引用原文公式时一律改写并注明原记号。
- **严谨口径标注**：本书内容整理截至 **2026 年 10 月**；2026 年前沿条目均标注首次发布时间与 arXiv 编号，论文自报效果均附实验基线说明。
- **内嵌交互实验**：第 2 章（$\beta$ 指数倾斜）、第 3 章（PPO / DAPO 裁剪曲线）与第 8 章（GRPO / Dr.GRPO / RLOO / MaxRL 分组优势对比）内置实时交互滑块，可直接在页面内调参验证直觉。
- **配图放大与术语悬停**：点击任意机制图支持全屏缩放预览；正文首次出现的专业术语带虚线下划线，悬停可查释义并跳转 [术语表](/books/llm-rl/glossary)。

[术语表](/books/llm-rl/glossary) · [来源、口径与许可](/books/llm-rl/colophon) · [← 返回 Tdccccc's Atlas 首页](/)
