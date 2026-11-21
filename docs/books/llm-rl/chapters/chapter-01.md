# 第 1 章 为什么需要后训练 RL：从 SFT 到在自己的分布上学习

<p class="chapter-summary">从预训练、监督微调（SFT）到强化学习（RL）的三阶段范式出发，拆解 SFT 的四个结构性局限，并用一行梯度对照证明：SFT 不过是“离线示范、奖励恒为 1”的特化策略梯度。</p>

预训练让大语言模型在万亿级互联网语料上最小化下一个 token 的交叉熵。得到的基座模型（Base Model）知识渊博，但它的目标函数决定了它只会做一件事——**像训练语料一样续写文本**，而不是**把用户的复杂问题答对、答好**。你问它一道竞赛数学题，基座模型完全可能顺手再续写出三道同类习题，而不是动手求解。

把基座模型转化为可靠、有用、擅长长程推理和工具交互的助手，是<strong>后训练（Post-Training）</strong>的核心任务。现代大模型的后训练通常由两根支柱构成：<a class="term-ref" href="/books/llm-rl/glossary#sft" title="Supervised Fine-Tuning，监督微调：在示范回复上最小化交叉熵的后训练第一阶段">监督微调（SFT）</a>与强化学习（RL）。本章先回答一个最根本的问题：既然 SFT 训练稳定、公式简单、显存友好，为什么工业界依然要投入几十万 GPU 小时去啃难调、易崩的强化学习？

<figure class="book-figure">
  <img src="/figures/llm-rl/three-stage-posttraining.svg" alt="大模型训练三阶段对比：预训练、SFT 与 RL" loading="lazy">
  <figcaption><span class="book-figure__label">图 1-1</span>大模型训练的三阶段演进。预训练与 SFT 均在静态离线文本上做最大似然模仿；进入 RL 后，样本由当前策略自己生成，监督信号从“示范”切换为“评价”。</figcaption>
</figure>

---

## 1.1 SFT 做了什么：教师强制下的最大似然

给定一批由人类专家或更强模型编写的示范数据 $\mathcal{D}_{\text{SFT}} = \{(x, y^\star)\}$，SFT 的损失函数与预训练完全同源，只是把交叉熵限定在回复部分 $y^\star = (y^\star_1, \dots, y^\star_{|y^\star|})$ 上：

$$
\mathcal{L}_{\text{SFT}}(\theta) = -\,\mathbb{E}_{(x, y^\star)\sim\mathcal{D}_{\text{SFT}}}\Bigg[\sum_{t=1}^{|y^\star|}\log\pi_\theta\big(y^\star_t \mid x, y^\star_{<t}\big)\Bigg]
$$

在每一步 $t$，模型看到的条件前缀永远是标准答案的真实前缀 $y^\star_{<t}$，训练目标是让模型把概率质量尽可能押在示范里的下一个 token $y^\star_t$ 上——这就是经典序列建模中的**教师强制（Teacher Forcing）**。

SFT 极其高效：只需要数千到数百万条示范，就能迅速教会基座模型对话模板、指令格式、安全拒答基线与基本的工具调用语法。但它也带有四项与生俱来的结构性瓶颈。

---

## 1.2 SFT 的四个结构性局限

1. **只有正例，缺乏对比边界。**
   SFT 数据只告诉模型“应该写成什么样”，从不告诉模型“哪些看似通顺的写法其实很差”。两份同样流畅的回复，一份推导严谨，另一份在第三步偷换了概念，交叉熵损失无法显式压低错误路径的概率，只能指望 softmax 归一化顺带挤占非目标 token 的空间。
2. **<a class="term-ref" href="/books/llm-rl/glossary#exposure_bias" title="Exposure Bias，暴露偏差：训练依赖真实前缀而推理依赖自生成前缀导致的分布错配">暴露偏差（Exposure Bias）</a>。**
   训练时模型始终站在示范前缀 $y^\star_{<t}$ 的肩膀上预测下一步；推理时模型却必须基于自己先前生成的 $y_{<t}$ 继续往下写。一旦在某一步写出了示范分布里未曾覆盖的表达或中间步骤，模型便跌出训练分布，错误会像滚雪球一样逐 token 累积放大。
3. **示范天花板（Generator-Verifier Gap）。**
   在大量高价值任务上，**判断好坏比写出完美答案容易得多**。普通标注员未必能徒手写出复杂定理的优雅证明，却能可靠地比较两份候选证明谁更清晰；单元测试程序写不出修复 Bug 的补丁，却能百分百确定补丁是否通过全部用例。SFT 只能吃进示范 $(x, y^\star)$，天然用不上这类远比示范便宜且上限更高的评判与验证信号。
4. **推理轨迹不是模型自己的。**
   人类写出的解题过程往往是“事后整理版”，省略了大量试错、死胡同与自我纠偏。强行让模型在 SFT 里背诵别人的干净思路，模型学到的是表面文风，而非在自己卡壳时如何回溯、换路与验证的能力。

---

## 1.3 RL 换掉了什么：SFT 是一种特殊的策略梯度

强化学习的基本目标非常简单——最大化当前策略 $\pi_\theta$ 在自身采样输出上的期望奖励：

$$
J(\theta) = \mathbb{E}_{x\sim\mathcal{D}}\,\mathbb{E}_{y\sim\pi_\theta(\cdot\mid x)}\big[r(x,y)\big]
$$

它与 SFT 存在两处本质切换：
- **数据分布切换（离线 → <a class="term-ref" href="/books/llm-rl/glossary#on_off_policy" title="On-Policy，同策略：训练样本由当前正在优化的策略自己采样生成">同策略 On-Policy</a>）**：期望是在 $\pi_\theta$ *自己生成*的 $y$ 上取的。模型直接在自己真实会犯错、会犹疑的前缀分布上接受反馈，从根源上正面回应暴露偏差。
- **监督信号切换（示范 → 评价）**：不再要求给定标准回复 $y^\star$，只需要一个可打分的函数 $r(x,y)$。好回复拿到高分、差回复拿到低分，负例同样能产生清晰的学习梯度。

第 3 章将严格推导<a class="term-ref" href="/books/llm-rl/glossary#policy_gradient" title="Policy Gradient，策略梯度：直接对期望奖励关于策略参数求梯度的强化学习方法">策略梯度</a> $\nabla_\theta J(\theta) = \mathbb{E}_{y\sim\pi_\theta}[r(x,y)\,\nabla_\theta\log\pi_\theta(y\mid x)]$。现在先把它和 SFT 的负梯度并排写在一起：

$$
-\nabla_\theta \mathcal{L}_{\text{SFT}}(\theta) = \mathbb{E}_{y^\star \sim \mathcal{D}_{\text{SFT}}}\Big[\,\mathbf{1} \cdot \nabla_\theta\log\pi_\theta(y^\star\mid x)\,\Big]
$$

$$
\nabla_\theta J(\theta) = \mathbb{E}_{y \sim \pi_\theta}\Big[\,r(x,y) \cdot \nabla_\theta\log\pi_\theta(y\mid x)\,\Big]
$$

::: tip 核心直觉：SFT 是特化的策略梯度，也是 RL 的发射台
把两行梯度并列后，一切豁然开朗：**SFT 就是“样本来自离线示范、权重恒为 $+1$”的策略梯度**。RL 恰好把这两项同时解放：样本换成了模型自己生成的 $y \sim \pi_\theta$，权重换成了可高可低（减去基线后可正可负）的奖励信号。

这条对照也解释了为什么工业配方几乎总是 **先 SFT、再 RL**：如果初始策略在某类任务上采样一万次都拿不到一次正奖励，梯度信号几乎处处为零，RL 根本无从起步。SFT（尤其是冷启动 SFT）的作用就是把策略先搬运到“偶尔能做对”的可探索区域。DeepSeek-R1-Zero（第 11 章）证明足够强大的基座模型可以跳过冷启动直接做 RL，但前提依然是基座本身已具备非零的解题通过率。
:::

---

## 1.4 后训练范式的三代演进

站在 2026 年回看过去四年的大模型后训练，强化学习的角色经历了三次清晰跃迁，本书的六篇主线也正对应这一演进脉络：

| 阶段 | 代表工作 | 奖励来源 | 核心算法 | RL 扮演的角色 |
| --- | --- | --- | --- | --- |
| **第一代：偏好对齐（2022–2023）** | InstructGPT、Claude、Llama 2 | 人类偏好 + 标量奖励模型（RM） | PPO-RLHF、DPO 及其离线变体 | 让模型“更听话、更礼貌、更安全”，以防偏离 $\pi_{\text{ref}}$ 为先 |
| **第二代：推理涌现（2024–2025）** | OpenAI o1、DeepSeek-R1、Kimi k1.5、Qwen3 | 可验证奖励（<a class="term-ref" href="/books/llm-rl/glossary#rlvr" title="RL with Verifiable Rewards，可验证奖励强化学习">RLVR</a>：数学/代码规则） | GRPO、Dr.GRPO、DAPO、GSPO、CISPO | 激发数万 token 长思维链、反思与验证，成为核心能力发动机 |
| **第三代：多轮 Agent 与稠密融合（2025–2026）** | DeepSeek-V4、Kimi K2.5 PARL、GLM-5、SDPO、MaxRL | 多维解耦奖励、评分细则（Rubrics）、环境报错反馈、专家教师分布 | MaxRL、GDPO、SDPO、在线蒸馏（OPD）、异步 Agent RL | 从单轮答题走向百轮工具编排与“专家 RL + 蒸馏整合”新分工 |

理解了“为什么要做 RL”，下一章我们就把大语言模型的文本生成严谨地放进强化学习的数学框架里，推导贯通全书的 KL 正则闭式解。
