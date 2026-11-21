# 专题 D：经典深度 RL 脉络速览

<p class="chapter-summary">为希望向上追溯强化学习完整理论版图的读者准备的一页式地图：串起值函数方法（DQN）、最大熵连续控制（SAC）、基于模型规划（MCTS / MuZero / World Models）与保守离线 RL（CQL / IQL），并指明它们与 LLM 后训练的血缘联系。</p>

本书主线为了最大程度聚焦大模型后训练，在第一篇直奔策略梯度、GAE、PPO 与 KL 正则闭式解，跳过了经典深度强化学习（Deep RL）在游戏控制与机器人领域的大量分支。但后训练领域里的许多看似崭新的发明，其实都能在经典 RL 史里找到清晰原型。本专题为你快速补齐这四块经典拼图。

---

## D.1 值函数方法：Q-Learning、DQN 与致命三角

在策略梯度之外，经典 RL 的另一大支柱是<strong>基于值函数（Value-Based）</strong>的方法：不直接参数化策略，而是通过 Bellman 最优方程迭代逼近最优动作价值函数 $Q^\star(s, a)$，执行时直接取 $\arg\max_a Q(s, a)$：

$$
Q(s_t, a_t) \leftarrow Q(s_t, a_t) + \alpha\Big(r_t + \gamma \max_{a'} Q(s_{t+1}, a') - Q(s_t, a_t)\Big)
$$

- <strong>DQN（Mnih 等，2013/2015）</strong> 引入<strong>经验回放池（Experience Replay）</strong>打散样本相关性，并引入<strong>目标网络（Target Network）</strong>稳定自举（Bootstrapping）目标，首次用端到端深度网络打通 Atari 像素游戏；
- <strong>致命三角（Deadly Triad）</strong>：Sutton & Barto 指出，当<strong>函数逼近（神经网络）+ 自举（TD 更新）+ 异策略（Off-Policy）</strong>三者同时出现时，值函数估计极易发散爆炸；
- **与 LLM 后训练的联系**：在 LLM 中，单步动作空间高达 $|\mathcal{V}| \sim 10^5$ 且长轨迹极度稀疏，直接对每个 token 训 $Q(s_t, y_t)$ 极易触碰致命三角；但在第 4–5 章的 **PRM 过程奖励** 与 PPO 的 **Critic 价值头 $V_\psi$** 训练中，你能清晰看到目标网络、TD 自举和回放稳定化的影子。

---

## D.2 最大熵连续控制：DDPG、TD3 与 SAC

面向机器人关节力矩等**连续动作空间**，深度 RL 从确定性策略梯度（DDPG / TD3，配合双 Critic 裁剪抑制 $Q$ 值高估）演进至极其成功的 **SAC（Soft Actor-Critic，Haarnoja 等，2018）**：

$$
J_{\text{SAC}}(\pi) = \sum_{t} \mathbb{E}_{(s_t, a_t)\sim\rho_\pi}\Big[\,r(s_t, a_t) + \alpha\,\mathcal{H}\big(\pi(\cdot\mid s_t)\big)\,\Big]
$$

- **与 LLM 后训练的直接血缘**：注意相对均匀先验的熵 $\mathcal{H}(\pi)$ 恰好等于 $-\mathbb{D}_{\mathrm{KL}}[\pi \,\|\, \text{Uniform}] + \text{const}$！把均匀先验换成 SFT 参考模型 $\pi_{\text{ref}}$、把温度 $\alpha$ 写成 $\beta$，SAC 的最大熵目标就**严丝合缝地变成了第 2 章全书出发点 $J_\beta(\theta)$**，其最优软策略 $\pi^\star \propto \exp(Q/\alpha)$ 正是闭式倾斜解的经典前身。

---

## D.3 基于模型的规划（Model-Based RL）与世界模型

无模型（Model-Free）RL 直接从交互轨迹里学策略或价值，样本效率较低；**基于模型（Model-Based）RL** 额外学习一个环境动力学模型（即**世界模型，World Model**）$\hat P(s_{t+1}, r_t \mid s_t, a_t)$，让智能体先在“脑海里的模拟器”中做前瞻推演（Planning）再落子：

- **Dyna 架构**：同时用真实环境样本更新世界模型与策略，并用世界模型生成的虚拟想象轨迹额外训练策略；
- <strong>AlphaGo / AlphaZero / MuZero（DeepMind）</strong>：将<strong>蒙特卡洛树搜索（MCTS）</strong>与策略网络、价值网络结合——用树搜索产生比当前策略更强的落子分布，再反过来把搜索分布蒸馏回神经网络（专家迭代，Expert Iteration）；MuZero 甚至不再重建原始像素，只在隐空间里学习预测奖励、价值与策略；
- **与 LLM 后训练的联系**：第 11 章 R1 阶段 3 的“搜索/拒绝采样 + SFT”，以及专题 C 的“PRM 树搜索 + 蒸馏回主干”，在思想血缘上正是语言空间里的 **Expert Iteration / AlphaZero 循环**；而在多轮 Agentic RL 中，训练一个轻量级环境模拟器预测工具执行结果以降低昂贵真机/沙箱成本，也是世界模型思想的当代回归。

---

## D.4 保守离线 RL（Offline RL）：CQL 与 IQL

在医疗、自动驾驶或工业控制中，不允许在线试错，只能从既有历史日志数据集 $\mathcal{D}_{\text{offline}}$ 里学策略。直接套用 Q-Learning 会遭遇严重的**分布外动作高估（OOD Action Extrapolation）**：$\max_{a'} Q(s', a')$ 专挑数据集里从未见过、因此被神经网络瞎猜出虚高 $Q$ 值的动作。

经典离线 RL 给出了两套优雅解法：
- **CQL（Conservative Q-Learning）**：显式压低分布外动作的 $Q$ 值、抬高数据集内动作的 $Q$ 值，学出保守下界；
- **IQL（Implicit Q-Learning）**：用分位数回归（Expectile Regression）直接在数据集支撑内估计状态价值，彻底避免查询分布外动作的 $Q$ 值，再用加权回归（AWR，Advantage-Weighted Regression）提取策略。

**与 LLM 后训练的联系**：第 7 章的 **DPO / IPO / KTO / SimPO** 本质上正是面向语言偏好数据的**离线 RL**，它们同样面临完全相同的分布外漂移与过优化幽灵——因此第 6 章的 KL 约束、CQL 的保守下界、与第 7 章 DPO 的似然位移问题，归根结底都是在对抗同一个统计敌人。
