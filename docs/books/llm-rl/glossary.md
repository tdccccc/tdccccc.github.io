# 术语表

正文首次出现的专业术语链接至本页；将鼠标悬停在带虚线下划线的术语上即可查看精简释义。

[全局符号约定与公式速查](/books/llm-rl/toolkit/notation-and-formulas) · [算法选型与排障速查](/books/llm-rl/toolkit/debugging-checklist)

## 监督微调（Supervised Fine-Tuning） {#sft}

在人工或强模型编写的示范回复 $(x, y^\star)$ 上最小化交叉熵的后训练第一阶段，本质为教师强制最大似然。

常见写法：`SFT`、`监督微调`。

## 暴露偏差（Exposure Bias） {#exposure_bias}

训练阶段依赖真实前缀（教师强制）、推理阶段依赖自生成前缀造成的分布错配，一旦出错会逐步累积。

常见写法：`暴露偏差`、`exposure bias`。

## 马尔可夫决策过程（Markov Decision Process） {#mdp}

由状态空间、动作空间、转移概率与奖励函数构成的序贯决策模型，下一状态仅依赖当前状态与当前动作。

常见写法：`MDP`。

## 部分可观测马尔可夫决策过程（POMDP） {#pomdp}

智能体无法直接观测环境完整隐状态、只能依赖历史动作与外部观测序列做决策的序贯模型，常见于多轮工具调用 Agent。

常见写法：`POMDP`。

## 上下文多臂老虎机（Contextual Bandit） {#contextual_bandit}

每轮接收上下文 $x$、做出单次动作 $y$ 并立即获得标量奖励 $r(x,y)$ 即结束的单步决策模型，对应把整条回复视为一个动作的视角。

常见写法：`Contextual Bandit`、`上下文 bandit`。

## 信用分配（Credit Assignment） {#credit_assignment}

在稀疏或延迟奖励下，将最终成败归因到具体推理步骤、工具调用或关键 token 的问题。

常见写法：`信用分配`、`credit assignment`。

## 同策略与异策略（On-Policy / Off-Policy） {#on_off_policy}

训练数据由当前正在优化的策略采样时称为同策略（on-policy）；数据来自更旧策略、其他模型或离线数据集时称为异策略（off-policy）。

常见写法：`on-policy`、`off-policy`、`同策略`、`异策略`。

## KL 散度（Kullback-Leibler Divergence） {#kl_divergence}

衡量两个概率分布差异的非负不对称量 $\mathbb{D}_{\mathrm{KL}}[p\|q] = \mathbb{E}_p[\log(p/q)]$；前向 KL 倾向覆盖多峰，反向 KL 倾向寻模集中。

常见写法：`KL 散度`、`KL 惩罚`、`相对熵`。

## 策略梯度（Policy Gradient） {#policy_gradient}

利用对数导数技巧直接对期望奖励关于策略参数求梯度、从而无需对奖励函数求导的强化学习方法族。

常见写法：`策略梯度`、`PG`、`REINFORCE`。

## 优势函数（Advantage Function） {#advantage}

衡量在给定状态下采取某动作相比平均水平的超额收益 $A(s,a) = Q(s,a) - V(s)$，用于在保持梯度方向无偏的同时大幅降低方差。

常见写法：`优势函数`、`优势`、`advantage`。

## 价值函数 / 评论家（Value Function / Critic） {#critic}

估计从状态 $s_t$ 出发所能获得的期望未来累积回报 $V_\psi(s_t)$ 的辅助模型，对应被优化的策略称为 Actor（行动者）。

常见写法：`Critic`、`价值函数`、`评论家`。

## 广义优势估计（Generalized Advantage Estimation） {#gae}

用参数 $\lambda$ 对多步时序差分（TD）误差按 $(\gamma\lambda)^l$ 指数加权求和，在低方差高偏差与高方差无偏之间平滑折中的优势估计方法。

常见写法：`GAE`。

## 重要性采样（Importance Sampling） {#importance_sampling}

通过乘以目标分布与采样分布的概率比 $\rho_t = \pi_\theta / \pi_{\theta_{\text{old}}}$，用旧策略采样的样本来估计当前策略下期望的统计技术。

常见写法：`重要性采样`、`IS`、`重要性比`。

## 近端策略优化（Proximal Policy Optimization） {#ppo}

通过裁剪重要性比替代目标来限制单次策略更新步幅的一阶信赖域近似算法，是经典 RLHF 的主力优化器。

常见写法：`PPO`。

## 基于人类反馈的强化学习（RLHF） {#rlhf}

收集人类对候选回复的偏好排序、拟合奖励模型再用强化学习优化策略的经典大模型对齐范式。

常见写法：`RLHF`。

## Bradley-Terry 模型（BT Model） {#bradley_terry}

假设每个回复存在潜在标量分 $r(x,y)$，并令成对胜出概率满足 $P(y_w \succ y_l\mid x) = \sigma(r(x,y_w) - r(x,y_l))$ 的成对比较统计模型。

常见写法：`BT 模型`、`Bradley-Terry`。

## 可验证奖励强化学习（RLVR） {#rlvr}

以数学符号验证、代码单元测试或确定性规则程序直接产出低噪声二值/分档奖励的强化学习范式，是推理模型崛起的核心引擎。

常见写法：`RLVR`、`可验证奖励`。

## 评分细则奖励（Rubrics as Rewards） {#rar}

为开放式无标准答案任务生成一组带权重检查项，由评判模型逐项判定是否满足并加权聚合为标量奖励的方法。

常见写法：`RaR`、`Rubrics`、`评分细则奖励`。

## 结果奖励与过程奖励（ORM / PRM） {#orm_prm}

ORM 仅对最终答案或整条回复给分；PRM 对推理链中的每个中间步骤打分，用于细粒度信用分配或推理搜索引导。

常见写法：`ORM`、`PRM`、`过程奖励`、`结果奖励`。

## 奖励作弊（Reward Hacking） {#reward_hacking}

策略在强优化压力下利用代理奖励或验证器漏洞刷取高分，却偏离真实人类意图的 Goodhart 失效现象。

常见写法：`奖励作弊`、`Reward Hacking`、`奖励过优化`。

## 直接偏好优化（Direct Preference Optimization） {#dpo}

利用 KL 正则最优策略的闭式解消去配分函数，将偏好对齐转化为无需显式奖励模型与 RL 采样的离线分类损失。

常见写法：`DPO`。

## 组相对策略优化（Group Relative Policy Optimization） {#grpo}

对同一提示采样 $G$ 条回复，用组内标准化奖励直接作为序列级优势从而去掉独立 Critic 模型的策略优化算法。

常见写法：`GRPO`。

## 留一法 REINFORCE（RLOO） {#rloo}

为组内第 $i$ 条回复用其余 $G-1$ 条回复的平均奖励作基线，满足严格无偏基线条件且无需 Critic 的策略梯度算法。

常见写法：`RLOO`。

## 非对称裁剪与动态采样（DAPO） {#dapo}

针对长思维链 RLVR 提出的 GRPO 改进组合，核心包含 Clip-Higher、过滤零方差组的动态采样、token 级损失聚合与超长奖励塑形。

常见写法：`DAPO`、`Clip-Higher`。

## 组序列策略优化（GSPO） {#gspo}

将重要性比与裁剪从 token 级提升到整条序列的几何平均比率 $g_i(\theta)$，显著改善长序列与 MoE 模型 RL 稳定性的算法。

常见写法：`GSPO`。

## 裁剪重要性权重策略优化（CISPO） {#cispo}

只对重要性权重本身做裁剪并加 stop-gradient，使包括反思性低概率 token 在内的所有 token 在 off-policy 更新中仍保留梯度。

常见写法：`CISPO`。

## 最大似然强化学习（MaxRL） {#maxrl}

在二值可验证奖励下将优化目标从期望通过率 $p$ 替换为最大似然 $\log p$，通过除以组均值 $\bar r$ 放大难题梯度并兼顾 pass@k 覆盖率。

常见写法：`MaxRL`。

## 组内奖励解耦归一化（GDPO） {#gdpo}

在多目标 RL 中先对每个奖励维度分别做组内标准化再加权与批归一化，避免先求和再标准化导致的优势坍塌。

常见写法：`GDPO`。

## 自蒸馏策略优化（SDPO） {#sdpo}

将环境报错、测试输出或评语等丰富反馈放入上下文让同一模型充当教师，逐 token 反向 KL 蒸馏给学生的稠密信用分配算法。

常见写法：`SDPO`。

## 在线蒸馏（On-Policy Distillation） {#opd}

由学生策略自行采样回复，再由教师策略在每个 token 位置提供目标分布并最小化反向 KL 的训练方法，数学上等价于教师参考的纯 KL 强化学习。

常见写法：`OPD`、`在线蒸馏`。

## 策略熵与熵坍缩（Entropy Collapse） {#entropy_collapse}

策略输出分布的不确定度 $\mathcal{H}$ 在 RL 训练早期骤降趋近于零，导致探索枯竭与性能提前触顶的现象。

常见写法：`熵坍缩`、`策略熵`。

## 截断重要性采样（TIS） {#tis}

在训练框架与推理引擎算出的概率 $\pi_{\text{train}}$ 与 $\pi_{\text{infer}}$ 存在数值不一致时，乘以截断比率 $\min(\pi_{\text{train}}/\pi_{\text{infer}}, C_{\text{TIS}})$ 修正梯度偏差的稳定性技术。

常见写法：`TIS`、`MIS`、`IcePop`。

## 路由回放（Routing Replay） {#routing_replay}

针对 MoE 模型在 RL 训练与推理阶段专家选择不一致的问题，记录 rollout 路由并在训练前向复用的稳定性机制（如 R3 与预测式 PR2）。

常见写法：`R3`、`PR2`、`路由回放`。

## 损失掩码（Loss Masking） {#loss_masking}

在多轮工具交互轨迹中用二值掩码 $\mu_t \in \{0,1\}$ 屏蔽环境返回观测与系统提示，确保梯度仅作用在模型自身生成的动作 token 上。

常见写法：`损失掩码`、`loss mask`。

## 并行智能体强化学习（PARL） {#parl}

由主编排者动态派生并行子智能体协作执行长程任务，训练时冻结子智能体仅优化编排者策略、并以关键路径步数度量延迟的 Agent RL 范式。

常见写法：`PARL`。
