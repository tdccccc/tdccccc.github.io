# 第一篇：理论底座与问题建模

<p class="chapter-summary">先把大模型后训练的“出发点、统一目标与三块数学基石”立稳：SFT 与 RL 的本质分界、MDP/Bandit 与 KL 闭式解、策略梯度与 PPO 裁剪。</p>

## 本篇导览

很多工程师在读 GRPO、DPO 或 DAPO 论文时，常常被零散的公式和技巧绕晕。本篇用三章篇幅把面向 LLM 后训练最核心的理论底座一次铺平：第 1 章从 SFT 的四个结构性局限出发，说明 RL 究竟换掉了什么；第 2 章把语言生成形式化为 token 级 MDP 与序列级 Bandit，导出贯通全书的 KL 正则闭式最优策略 $\pi^\star$ 与 $k_1/k_2/k_3$ 估计量；第 3 章完整推导策略梯度定理、基线降方差、GAE 望远镜求和与 PPO 裁剪目标。

阅读过程中如遇符号对照，可随时查阅[全局符号约定与核心公式速查卡](/books/llm-rl/toolkit/notation-and-formulas)。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-rl/chapters/chapter-01">
    <div>
      <div class="part-card__num">CHAPTER 01</div>
      <div class="part-card__title">第 1 章 · 为什么需要后训练 RL</div>
      <p class="part-card__desc">从预训练、SFT 到 RL 的三阶段跃迁，拆解 SFT 的四大局限，并证明 SFT 只是特化的策略梯度。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-02">
    <div>
      <div class="part-card__num">CHAPTER 02</div>
      <div class="part-card__title">第 2 章 · MDP、Bandit 与 KL 闭式解</div>
      <p class="part-card__desc">建立 token 级与序列级双视角，推导 KL 正则闭式解 π*，用交互实验理解温度 β 与 k1/k2/k3 估计量。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-03">
    <div>
      <div class="part-card__num">CHAPTER 03</div>
      <div class="part-card__title">第 3 章 · 策略梯度、GAE 与 PPO 裁剪</div>
      <p class="part-card__desc">完整推导对数导数技巧、基线方差缩减、GAE 望远镜求和与 PPO 分段裁剪目标（含交互实验）。</p>
    </div>
  </a>
</div>
