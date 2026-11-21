# 专题 A：核心论文精读与推导档案

<p class="chapter-summary">集中索引 1992–2026 大模型后训练强化学习里程碑文献，统一归档 arXiv 编号、核心机制、原文符号映射与实验口径边界，便于严谨引用与延伸精读。</p>

大模型 RL 领域的论文跨度从 1992 年经典策略梯度一直延续到 2026 年的 MaxRL、GDPO、SDPO、DeepSeek-V4 与 PARL。本档案按全书脉络分类整理全部关键一手文献，并在涉及 2026 年前沿工作时明确标明**作者自报口径**与实验前提。符号统一约定见 [全局符号约定与公式速查卡](../toolkit/notation-and-formulas.md)。

---

## A.1 理论基石（1992–2020）

| 论文 / 文献 | 年份 / 出处 | 核心贡献 | 本书位置 |
| --- | --- | --- | --- |
| [Simple Statistical Gradient-Following Algorithms for Connectionist RL](https://doi.org/10.1007/BF00992696)（Williams） | 1992 · Machine Learning | 提出 REINFORCE 与对数导数策略梯度 | [第 3 章](../chapters/chapter-03.md) |
| [Trust Region Policy Optimization (TRPO)](https://arxiv.org/abs/1502.05477)（Schulman 等） | 2015 · `1502.05477` | 证明局部替代目标与 KL 信赖域下的单调改进保证 | [第 3 章](../chapters/chapter-03.md) |
| [High-Dimensional Continuous Control Using GAE](https://arxiv.org/abs/1506.02438)（Schulman 等） | 2015 · `1506.02438` | 提出广义优势估计 $\text{GAE}(\gamma,\lambda)$ 折中偏差与方差 | [第 3 章](../chapters/chapter-03.md) |
| [Proximal Policy Optimization Algorithms (PPO)](https://arxiv.org/abs/1707.06347)（Schulman 等） | 2017 · `1707.06347` | 一阶裁剪替代目标 $L^{\text{CLIP}}$（原文概率比记作 $r_t$，本书改作 $\rho_t$） | [第 3 章](../chapters/chapter-03.md) · [第 7 章](../chapters/chapter-07.md) |
| [Deep RL from Human Preferences](https://arxiv.org/abs/1706.03741)（Christiano 等） | 2017 · `1706.03741` | 奠定人类成对偏好 + 奖励模型 + RL 的现代 RLHF 范式 | [第 4 章](../chapters/chapter-04.md) |
| [Approximating KL Divergence](https://joschu.net/blog/kl-approx.html)（Schulman 博客） | 2020 · 博客 | 系统分析单样本 KL 估计量 $k_1 / k_2 / k_3$ 的无偏性与方差 | [第 2 章](../chapters/chapter-02.md) |

---

## A.2 RLHF、奖励工程与离线偏好优化（2022–2025）

| 论文 / 文献 | 年份 / 出处 | 核心贡献与关键口径 | 本书位置 |
| --- | --- | --- | --- |
| [InstructGPT](https://arxiv.org/abs/2203.02155)（Ouyang 等，OpenAI） | 2022 · `2203.02155` | 首个公开完整 LLM SFT → RM → PPO 流程；$n=4\text{–}9$ 排序同批防过拟合 | [第 4 章](../chapters/chapter-04.md) · [第 7 章](../chapters/chapter-07.md) |
| [Scaling Laws for Reward Model Overoptimization](https://arxiv.org/abs/2210.10760)（Gao 等） | 2022 · `2210.10760` | 定量刻画 $d=\sqrt{\text{KL}}$ 与代理/黄金奖励背离曲线 | [第 6 章](../chapters/chapter-06.md) |
| [Constitutional AI](https://arxiv.org/abs/2212.08073)（Bai 等，Anthropic） | 2022 · `2212.08073` | 原则驱动自我改写与 AI 偏好反馈（RLAIF 奠基） | [第 4 章](../chapters/chapter-04.md) |
| [Direct Preference Optimization (DPO)](https://arxiv.org/abs/2305.18290)（Rafailov 等） | 2023-05 · `2305.18290` | 闭式解消去 $Z(x)$，将偏好对齐转化为隐式奖励二分类 | [第 7 章](../chapters/chapter-07.md) |
| [Let's Verify Step by Step](https://arxiv.org/abs/2305.20050)（Lightman 等，OpenAI） | 2023-05 · `2305.20050` | 发布 PRM800K，证明测试时搜索中 PRM 显著优于 ORM | [第 5 章](../chapters/chapter-05.md) |
| [IPO](https://arxiv.org/abs/2310.12036)（Azar 等） | 2023-10 · `2310.12036` | 平方损失约束有限间隔 $\frac{1}{2\tau}$，解决确定性偏好过拟合 | [第 7 章](../chapters/chapter-07.md) |
| [Math-Shepherd](https://arxiv.org/abs/2312.08935)（Wang 等） | 2023-12 · `2312.08935` | 以蒙特卡洛 rollout 展开自动合成 PRM 步骤标签 | [第 5 章](../chapters/chapter-05.md) |
| [KTO](https://arxiv.org/abs/2402.01306)（Ethayarajh 等） | 2024-02 · `2402.01306` | 前景理论损失，仅需单条好/坏二值反馈，无需成对偏好 | [第 7 章](../chapters/chapter-07.md) |
| [SimPO](https://arxiv.org/abs/2405.14734)（Meng 等） | 2024-05 · `2405.14734` | 去参考模型 + 长度归一似然（原文间隔记作 $\gamma$，本书改作 $m$） | [第 7 章](../chapters/chapter-07.md) |
| [Tülu 3](https://arxiv.org/abs/2411.15124)（Lambert 等，AI2） | 2024-11 · `2411.15124` | 正式命名 RLVR（可验证奖励强化学习）并公开完整配方 | [第 5 章](../chapters/chapter-05.md) |
| [Rubrics as Rewards (RaR)](https://arxiv.org/abs/2507.17746)（Gunjal 等） | 2025-07 · `2507.17746` | 开放任务加权检查项奖励；HealthBench 相对 Likert 最高提升约 31% | [第 5 章](../chapters/chapter-05.md) |

---

## A.3 GRPO 家族、推理动态与稳定性系统（2023–2025）

| 论文 / 文献 | 年份 / 出处 | 核心贡献与关键口径 | 本书位置 |
| --- | --- | --- | --- |
| [ReMax](https://arxiv.org/abs/2310.10505)（Li 等） | 2023-10 · `2310.10505` | 以贪心解码回复奖励作无 Critic 基线 | [第 8 章](../chapters/chapter-08.md) |
| [DeepSeekMath (GRPO)](https://arxiv.org/abs/2402.03300)（Shao 等） | 2024-02 · `2402.03300` | 首次提出组相对策略优化 GRPO，用组内标准化取代 Critic | [第 8 章](../chapters/chapter-08.md) |
| [Back to Basics (RLOO)](https://arxiv.org/abs/2402.14740)（Ahmadian 等） | 2024-02 · `2402.14740` | 留一法无偏基线 REINFORCE，在 LLM 对齐上媲美甚至超越 PPO | [第 8 章](../chapters/chapter-08.md) |
| [HybridFlow (veRL)](https://arxiv.org/abs/2409.19256)（Sheng 等） | 2024-09 · `2409.19256` | 单控制器编排 + 多控制器执行，奠定现代开源 RL 框架抽象 | [第 19 章](../chapters/chapter-19.md) |
| [REINFORCE++](https://arxiv.org/abs/2501.03262)（Hu） | 2025-01 · `2501.03262` | 无 Critic + 全局批级优势归一化 + 逐 token KL | [第 8 章](../chapters/chapter-08.md) |
| [Kimi k1.5](https://arxiv.org/abs/2501.12599)（Kimi Team） | 2025-01 · `2501.12599` | 128k 长上下文 RL、Partial Rollout、长度惩罚与 long2short | [第 11 章](../chapters/chapter-11.md) · [第 17 章](../chapters/chapter-17.md) |
| [DeepSeek-R1](https://arxiv.org/abs/2501.12948)（DeepSeek-AI） | 2025-01 · `2501.12948` | R1-Zero 纯 RLVR（AIME'24 15.6%→71.0%）与四阶段配方 + 小模型蒸馏 | [第 11 章](../chapters/chapter-11.md) |
| [DAPO](https://arxiv.org/abs/2503.14476)（Yu 等，字节 Seed/清华） | 2025-03 · `2503.14476` | Clip-Higher、动态采样、Token 级聚合、超长塑形；Qwen2.5-32B AIME'24 达 50 | [第 9 章](../chapters/chapter-09.md) |
| [Understanding R1-Zero-Like Training (Dr.GRPO)](https://arxiv.org/abs/2503.20783)（Liu 等） | 2025-03 · `2503.20783` | 揭露 GRPO 长度与标准差偏差，改用去标准差 + 常数 $L_{\max}$ 归一 | [第 9 章](../chapters/chapter-09.md) · [第 11 章](../chapters/chapter-11.md) |
| [Does RL Really Incentivize Reasoning Beyond Base?](https://arxiv.org/abs/2504.13837)（Yue 等） | 2025-04 · `2504.13837` | 提出大 $k$ 下基座反超 RL 模型的锐化假说 | [第 12 章](../chapters/chapter-12.md) |
| [The Entropy Mechanism of RL for Reasoning LMs](https://arxiv.org/abs/2505.22617)（Cui 等） | 2025-05 · `2505.22617` | 发现 $R=-ae^{\mathcal H}+b$ 与协方差熵变公式，提出 Clip-Cov / KL-Cov | [第 12 章](../chapters/chapter-12.md) |
| [ProRL](https://arxiv.org/abs/2505.24864)（Liu 等，NVIDIA） | 2025-05 · `2505.24864` | 参考模型周期重置，拉长 RL 至 2000+ 步扩展弱项边界 | [第 12 章](../chapters/chapter-12.md) |
| [MiniMax-M1 (CISPO)](https://arxiv.org/abs/2506.13585)（MiniMax） | 2025-06 · `2506.13585` | 混合注意力 + CISPO 裁剪权重并 stop-gradient 保留全部 token 梯度 | [第 9 章](../chapters/chapter-09.md) · [第 11 章](../chapters/chapter-11.md) |
| [RLVR Implicitly Incentivizes Correct Reasoning](https://arxiv.org/abs/2506.14245)（Wen 等） | 2025-06 · `2506.14245` | 剔除“蒙对答案”后按推理过程正确统计，RLVR 确有大 $k$ 增益 | [第 12 章](../chapters/chapter-12.md) |
| [GSPO](https://arxiv.org/abs/2507.18071)（Zheng 等，Qwen） | 2025-07 · `2507.18071` | 序列级几何平均比率 $g_i(\theta)$（原文记 $s_i$），显著稳定 MoE RL | [第 9 章](../chapters/chapter-09.md) · [第 18 章](../chapters/chapter-18.md) |
| [GRPO is Secretly a Process Reward Model](https://arxiv.org/abs/2509.21154) | 2025-09 · `2509.21154` | ICML 2026：共享前缀下组内比较隐式实现子轨迹信用分配 | [第 5 章](../chapters/chapter-05.md) |
| [Rollout-Training Mismatch (TIS)](https://opt-ml.org/papers/2025/paper116.pdf)（Yao 等） | 2025 · OPT 2025 | 提出截断重要性采样 TIS 修正 $\pi_{\text{train}} \ne \pi_{\text{infer}}$ | [第 18 章](../chapters/chapter-18.md) |
| [IcePop](https://ringtech.notion.site/icepop)（蚂蚁 Ring 团队） | 2025 · 博客 | 对跨引擎比率过大或过小的 token 做双侧掩码屏蔽 | [第 18 章](../chapters/chapter-18.md) |
| [Rollout Routing Replay (R3)](https://arxiv.org/abs/2510.11370) | 2025-10 · `2510.11370` | 复用推理阶段 MoE 专家路由，源头消除路由翻转 | [第 18 章](../chapters/chapter-18.md) |
| [ScaleRL](https://arxiv.org/abs/2510.13786)（Khatri 等，Meta） | 2025-10 · `2510.13786` | 40 万 GPU 小时测出 S 形扩展曲线（渐近上限本书记作 $R_\infty$） | [第 20 章](../chapters/chapter-20.md) |
| [On-Policy Distillation](https://thinkingmachines.ai/blog/on-policy-distillation/)（Thinking Machines） | 2025-10 · 博客 | 系统阐述反向 KL 在线蒸馏（AIME'24 约 1/10 算力追平 RL） | [第 13 章](../chapters/chapter-13.md) |
| [Stabilizing RL with LLMs](https://arxiv.org/abs/2512.01374)（Qwen Team） | 2025-12 · `2512.01374` | 将 TIS/裁剪/R3 统一收束于“序列目标一阶近似成立条件” | [第 18 章](../chapters/chapter-18.md) |
| [DeepSeek-V3.2](https://arxiv.org/abs/2512.02556)（DeepSeek-AI） | 2025-12 · `2512.02556` | 修正 off-policy 下 $k_3$ KL 估计量的重要性比偏误 | [第 2 章](../chapters/chapter-02.md) |

---

## A.4 2026 前沿工作档案（截至 2026 年 10 月）

> 以下条目中的性能提升、倍速与通过率数字均来源于作者自报结果，阅读与引用时请结合原论文实验基线审慎评估。

| 论文 / 报告 | 时间 / 出处 | 核心改动与作者自报口径 | 本书位置 |
| --- | --- | --- | --- |
| [GDPO](https://arxiv.org/abs/2601.05242)（Liu 等，NVIDIA · ICML 2026） | 2026-01 · `2601.05242` | 多奖励先分项组内标准化再批归一化，避免总分标准化信息坍塌 | [第 10 章](../chapters/chapter-10.md) |
| [SDPO](https://arxiv.org/abs/2601.20802)（Hübotter, Krause 等，ETH） | 2026-01 · `2601.20802` | 环境反馈条件化自身作教师逐 token 蒸馏；单题测试时 SDPO 发现率提效约 3× | [第 10 章](../chapters/chapter-10.md) · [专题 C](test-time-compute.md) |
| [Rubric-ARM](https://arxiv.org/abs/2602.01511) | 2026-02 · `2602.01511` | 细则生成器与评判器交替 RL 训练，多基准平均提升约 4.7% | [第 5 章](../chapters/chapter-05.md) |
| [Kimi K2.5 (PARL)](https://arxiv.org/abs/2602.02276) & [技术博客](https://www.kimi.com/blog/kimi-k2-5) | 2026-02 · `2602.02276` | 只训编排者冻结子智能体，关键路径步数度量，端到端耗时最多缩 4.5× | [第 15 章](../chapters/chapter-15.md) |
| [MaxRL](https://arxiv.org/abs/2602.02710)（Tajwar, Salakhutdinov 等 · ICML 2026） | 2026-02 · `2602.02710` | 目标从 $p$ 换为 $\log p$（截断阶数本书记作 $M$），pass@k 覆盖帕累托优于 GRPO | [第 10 章](../chapters/chapter-10.md) |
| [GLM-5](https://arxiv.org/abs/2602.15763)（GLM-5 Team） | 2026-02 · `2602.15763` | 基于 slime 的彻底解耦异步 Agent RL 与长程 token 级 IS 修正 | [第 16 章](../chapters/chapter-16.md) · [第 19 章](../chapters/chapter-19.md) |
| [Revisiting On-Policy Distillation](https://arxiv.org/abs/2603.25562) | 2026-03 · `2603.25562` | 剖析 OPD 多样性流失与高熵脆弱性，提出 Top-K 截断反向 KL | [第 13 章](../chapters/chapter-13.md) |
| [Restoring the Sweet Spot](https://arxiv.org/abs/2605.27765) | 2026-05 · `2605.27765` | 按通过率加权的自蒸馏推理改进，缓解 SDPO 难度失衡 | [第 10 章](../chapters/chapter-10.md) |
| [Mu-GRPO](https://arxiv.org/abs/2605.17570) | 2026-05 · `2605.17570` | 过滤负优势上不稳定的陈旧 off-policy 更新，墙钟提速约 2× | [第 18 章](../chapters/chapter-18.md) |
| [PR2: Predictive Routing Replay](https://arxiv.org/abs/2606.00395) | 2026-06 · `2606.00395` | 预测 off-policy 更新后的短期 MoE 路由变化再回放 | [第 18 章](../chapters/chapter-18.md) |
| [GD²PO](https://arxiv.org/abs/2606.16771)（Liu 等） | 2026-06 · `2606.16771` | 在 GDPO 基础上进一步屏蔽多奖励方向冲突的回复 | [第 10 章](../chapters/chapter-10.md) |
| [DeepSeek-V4](https://arxiv.org/abs/2606.19348)（DeepSeek-AI） | 2026-04 / `2606.19348` | 各领域独立 RL 训专家 + 多教师在线蒸馏整合，替换混合 RL 阶段 | [第 13 章](../chapters/chapter-13.md) |
