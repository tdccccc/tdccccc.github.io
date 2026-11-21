# 专题 B：多模态与生成式模型后训练 RL

<p class="chapter-summary">将纯文本后训练强化学习的方法论横向延伸至视觉语言模型（VLM）视觉推理、GUI 视觉智能体，以及图像/视频扩散模型的偏好对齐与 Flow-GRPO。</p>

全书主线聚焦于纯文本与工具调用大语言模型，但本书推导的核心数学工具——KL 正则闭式解、DPO、GRPO、RLVR 与训练-推理一致性——在 2025–2026 年已经全面渗透进<strong>多模态理解（VLM）</strong>与<strong>图像/视频生成（Diffusion / Flow Matching）</strong>的后训练流水线。本专题浓缩梳理这两个延伸战场的特有挑战与适配关键。

---

## B.1 视觉语言模型（VLM）的 RLVR 与“看图思考”

当输入提示 $x$ 从纯文本扩展为“高分辨率图像/视频帧 + 文本提问”，GRPO 与 RLVR 几乎可以无缝迁移，并在几何数学、图表解析、空间定位与多模态科学题上展现出类似 R1-Zero 的涌现效应：

- <strong>可验证视觉奖励拓展</strong>：除了最终答案符号等价比较，视觉任务引入了丰富的确定性空间奖励——目标检测与视觉定位（Grounding）直接以边界框的 <strong>IoU（交并比）</strong>作为连续或阈值奖励；图表与 OCR 任务结合结构化表格匹配判分；
- **Thinking with Images（视觉工具链 Agent RL）**：2025–2026 年的前沿视觉推理模型（如 OpenAI o3 范式与 Kimi K2.5 视觉智能体）不再只对着一张静态压缩图“干想”，而是把**图像裁剪放大（Crop/Zoom）、旋转、画辅助线、执行 Python OpenCV 脚本**纳入第 14 章的多轮工具交互循环，让模型通过 RL 学会“看不清就自己放大局部再算”；
- **系统瓶颈转移**：高分辨率动态切图（AnyRes / Native Resolution）动辄产生数千个视觉输入 token，导致 Rollout 阶段的 **Prefill 与 ViT 视觉编码器**占比大幅升高，工程上必须在推理引擎与训练器之间复用视觉特征缓存，并严防多模态位置编码（如 M-RoPE）在跨引擎间的数值不一致。

---

## B.2 扩散与流匹配模型（Diffusion / Flow Matching）的 RL 对齐

文本生成是离散词表上的自回归过程，而图像/视频生成（Diffusion / Rectified Flow）则是连续隐空间里的多步去噪轨迹 $x_T \to x_{T-1} \to \dots \to x_0$。两者的 RL 建模呈现出高度优雅的对偶性：

| 概念 | 自回归 LLM | 扩散 / 流匹配模型 |
| --- | --- | --- |
| **回合与步数** | $T \sim 10^3\text{–}10^5$ 个 token | $K \sim 20\text{–}50$ 步去噪 ODE / SDE 采样 |
| **策略 $\pi_\theta(a_t\mid s_t)$** | 离散 softmax 词表分布 | 去噪步上的条件高斯转移分布 $p_\theta(x_{k-1}\mid x_k, c)$ |
| **奖励来源** | 规则验证器 / 文本 RM | 美学评分、图文对齐（CLIP / PickScore）、OCR 文字渲染准确率、物理一致性与人类偏好 |

围绕这一映射，生成式视觉对齐演化出三条主流算法线：
1. **离线偏好优化（Diffusion-DPO）**：将第 7 章的 DPO 目标直接套用到去噪证据下界（ELBO）上，用人类挑选的“好图 vs 坏图”成对偏好微调，显著提升美学质感与指令遵循；
2. <strong>在线策略梯度（DDPO / Flow-GRPO）</strong>：由于确定性 ODE 采样没有随机探索空间、无法计算步级对数概率 $\log \pi_\theta$，<strong>Flow-GRPO</strong> 等方法在采样阶段将确定性流 ODE 转换为分布等价的<strong>随机微分方程（SDE）</strong>注入可控探索噪声，对同一提示采样 $G$ 张图像/视频，直接用组内标准化奖励做 PPO/GRPO 裁剪更新；
3. **防作弊挑战更严峻**：视觉奖励模型（如美学模型）极易被过度饱和的霓虹色调、高频锐化纹理或特定构图模板钻空子（第 6 章的视觉版 Reward Hacking），因此 KL 正则与多维度解耦奖励（如文字渲染 RLVR + 美学 RM + 构图 Rubrics）尤为关键。

---

## B.3 具身智能（VLA）简览：从像素到机械臂动作

在视觉-语言-动作（VLA, Vision-Language-Action）具身策略中，动作空间变成连续关节力矩或离散化动作分块（Action Chunking）。由于真机物理交互昂贵且有安全风险，当前主线普遍采用 **“海量遥操作 SFT / 离线 RL 打底 + 高保真物理仿真器（Isaac Gym / MuJoCo）大规模并行 RLVR 微调 + Sim-to-Real 迁移”** 的混合路线，其样本复用、off-policy 稳定性与奖励塑形挑战与第 15–18 章的 Agentic RL 高度同源。
