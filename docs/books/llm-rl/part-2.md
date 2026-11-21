# 第二篇：奖励工程与防作弊

<p class="chapter-summary">强化学习的上限由奖励决定：从人类偏好模型、AI 反馈、可验证规则与评分细则，到 Goodhart 定律下的奖励过优化与系统防线。</p>

## 本篇导览

再精巧的策略优化算法，也只能把策略推向奖励函数 $r(x,y)$ 所定义的高分区域。如果奖励本身噪声巨大或存在漏洞，更强的 RL 优化器反而会让模型更快走偏。本篇按“人工介入从多到少”的顺序系统梳理现代后训练的全部奖励形态：第 4 章讲透 Bradley-Terry 标量奖励模型、生成式评委与 Constitutional AI / RLAIF；第 5 章深入推理模型赖以起飞的可验证奖励（RLVR）、面向开放任务的评分细则（RaR / Rubric-ARM）以及结果奖励与过程奖励（ORM vs PRM）的路线之争；第 6 章专题剖析奖励过优化曲线、五类典型奖励作弊形态与工程防御体系。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-rl/chapters/chapter-04">
    <div>
      <div class="part-card__num">CHAPTER 04</div>
      <div class="part-card__title">第 4 章 · 人类偏好、奖励模型与 RLAIF</div>
      <p class="part-card__desc">推导 Bradley-Terry 损失与平移不变性，对比标量 RM、生成式 RM 与原则驱动的 Constitutional AI。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-05">
    <div>
      <div class="part-card__num">CHAPTER 05</div>
      <div class="part-card__title">第 5 章 · 可验证奖励、评分细则与 PRM</div>
      <p class="part-card__desc">拆解数学/代码 RLVR、开放任务评分细则（RaR 与 Rubric-ARM），以及 ORM 与 PRM 的真实取舍。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-06">
    <div>
      <div class="part-card__num">CHAPTER 06</div>
      <div class="part-card__title">第 6 章 · 奖励过优化与奖励作弊</div>
      <p class="part-card__desc">结合 Goodhart 定律与过优化缩放规律，剖析五类奖励作弊形态、不对齐泛化风险与工程审计防线。</p>
    </div>
  </a>
</div>
