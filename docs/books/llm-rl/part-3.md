# 第三篇：对齐与策略优化算法演进

<p class="chapter-summary">所有后训练 RL 算法都在回答同一个三元组问题：优势怎么估计、步幅怎么约束、反馈信号有多密。本篇打通 2022–2026 完整算法谱系。</p>

## 本篇导览

从 2022 年 InstructGPT 的四模型 PPO，到 2023 年绕开 RL 循环的 DPO，再到 2024–2025 年引爆推理模型的 GRPO 及其修正家族（Dr.GRPO、DAPO、GSPO、CISPO），直至 2026 年改写目标函数与信号密度的 MaxRL、GDPO 与 SDPO——表面看新缩写层出不穷，底层却高度连贯。本篇用四章把这条主线全部推导清楚，并借助交互实验直观比较不同优势估计对难题与简单题的梯度权重分配。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-rl/chapters/chapter-07">
    <div>
      <div class="part-card__num">CHAPTER 07</div>
      <div class="part-card__title">第 7 章 · PPO-RLHF 与 DPO 偏好优化族</div>
      <p class="part-card__desc">复盘四模型 PPO 数据流与 Critic 瓶颈，三步推导 DPO 及其四大局限，横评迭代 DPO、IPO、KTO 与 SimPO。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-08">
    <div>
      <div class="part-card__num">CHAPTER 08</div>
      <div class="part-card__title">第 8 章 · 无 Critic 时代：RLOO 与 GRPO</div>
      <p class="part-card__desc">对比 ReMax、RLOO 留一法与 REINFORCE++，推导 GRPO 与二值优势闭式，并通过交互组件验证组相对优势。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-09">
    <div>
      <div class="part-card__num">CHAPTER 09</div>
      <div class="part-card__title">第 9 章 · GRPO 修正：Dr.GRPO / DAPO / GSPO / CISPO</div>
      <p class="part-card__desc">按“去偏、探索、序列级稳定、保留梯度”四条脉络逐一拆解 2025 年核心改进与完整算法矩阵。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-10">
    <div>
      <div class="part-card__num">CHAPTER 10</div>
      <div class="part-card__title">第 10 章 · 新一代目标：MaxRL、GDPO 与 SDPO</div>
      <p class="part-card__desc">推导最大似然 RL（MaxRL）、多奖励解耦（GDPO/GD²PO）与反馈自蒸馏（SDPO），绘出二维方法全景图。</p>
    </div>
  </a>
</div>
