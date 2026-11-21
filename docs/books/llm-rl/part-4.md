# 第四篇：推理涌现、探索动态与蒸馏融合

<p class="chapter-summary">剖析长思维链推理模型的完整工业配方，揭开熵坍缩与“锐化 vs 新能力”的底层机理，并厘清 RL 与在线蒸馏在现代后训练中的新分工。</p>

## 本篇导览

2024 年底的 o1 与 2025 年初的 DeepSeek-R1 改写了大模型的能力曲线：强化学习不再只是让回复“更礼貌、更安全”，而是成为激发多步探索、自我验证与回溯推理的主发动机。本篇聚焦这一范式变革背后的实证规律与工程配方：第 11 章拆解 R1-Zero、R1 四阶段与 Kimi k1.5 / Qwen3 / MiniMax-M1 的配方取舍；第 12 章用熵-性能经验律与协方差机制解释为什么训练会过早饱和，并系统审视“RL 是在锐化分布还是创造新能力”的学术争论；第 13 章推导在线蒸馏（OPD）与纯 KL 强化学习的等价性，拆解 DeepSeek-V4“专家 RL + 多教师在线蒸馏整合”的工业新流水线。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-rl/chapters/chapter-11">
    <div>
      <div class="part-card__num">CHAPTER 11</div>
      <div class="part-card__title">第 11 章 · 长思维链推理模型与工业配方</div>
      <p class="part-card__desc">从 R1-Zero 审慎复盘到 R1 四阶段、Kimi k1.5、Qwen3 与 MiniMax-M1 的冷启动、长度与模式融合设计。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-12">
    <div>
      <div class="part-card__num">CHAPTER 12</div>
      <div class="part-card__title">第 12 章 · 熵坍缩、长度控制与能力边界</div>
      <p class="part-card__desc">掌握熵机制公式与协方差定律，梳理 ProRL 长程探索、过度思考抑制，以及 pass@k 覆盖率之争。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-13">
    <div>
      <div class="part-card__num">CHAPTER 13</div>
      <div class="part-card__title">第 13 章 · 在线蒸馏与专家整合范式</div>
      <p class="part-card__desc">证明反向 KL 在线蒸馏等价于教师参考 RL，剖析 DeepSeek-V4 专家整合架构及多样性流失修正。</p>
    </div>
  </a>
</div>
