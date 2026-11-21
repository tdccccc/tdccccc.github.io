# 第二篇：基础模型选型速评

<p class="chapter-summary">摒弃面面俱到的榜单罗列，站在“为 Agent 与企业业务挑选底座模型”的实战视角，用三章精讲知识/指令/长上下文/事实校准、推理/代码/多模态，以及安全与间接提示注入边界。</p>

## 本篇导览

企业工程团队做模型选型时，最大的信息过载来自于各家厂商发布会上动辄二三十项的静态跑分。这些分数里哪些真正决定了一个模型能否扛起多轮 Agent 与核心业务？

本篇只聚焦真正影响选型成败的三块核心能力标尺：第 5 章拆解知识上限、复杂约束指令遵循、长上下文真伪辨别（为什么“大海捞针”全绿依然会在真实任务里丢信息）以及事实幻觉与拒答校准（ECE / Brier / Abstention）；第 6 章分析数学与形式化推理的忠实度、抗污染活代码基准、思考 token 效率帕累托，以及视觉多模态基准中“不看图也能蒙对”的盲测清洗；第 7 章直面安全与可用性的权衡前沿，特别剖析 Agent 接入外部网页与工具后最致命的**间接提示注入**及奖励作弊泛化审计。

若需系统查询各公开基准的题量与原始论文出处，可配合查阅 [专题 A：核心评测基准与论文口径档案](/books/llm-eval/topics/benchmark-archive)。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-eval/chapters/chapter-05">
    <div>
      <div class="part-card__num">CHAPTER 05</div>
      <div class="part-card__title">第 5 章 · 知识、指令遵循、长上下文与校准</div>
      <p class="part-card__desc">MMLU-Pro 到 HLE、IFEval / Multi-IF、NIAH vs RULER / NoLiMa 有效上下文衰减，以及 SimpleQA / FactScore 与置信度校准。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-06">
    <div>
      <div class="part-card__num">CHAPTER 06</div>
      <div class="part-card__title">第 6 章 · 推理、代码与多模态底座评测</div>
      <p class="part-card__desc">AIME / FrontierMath 与思维链忠实度、LiveCodeBench 活基准、Accuracy vs Thinking Tokens 效率前沿与 VLM 盲测清洗。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-07">
    <div>
      <div class="part-card__num">CHAPTER 07</div>
      <div class="part-card__title">第 7 章 · 安全、提示注入与边界风险</div>
      <p class="part-card__desc">ASR vs 过度拒绝帕累托前沿、自动化多轮红队、Agent 间接提示注入防线以及前沿安全与作弊泛化审计。</p>
    </div>
  </a>
</div>
