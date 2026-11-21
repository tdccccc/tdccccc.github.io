# 第五篇：Agentic RL 与多轮环境

<p class="chapter-summary">当模型走出单轮问答、进入代码仓库、终端沙箱与多智能体协同，强化学习的瓶颈从纯公式转向多轮建模、信用分配与规模化环境工程。</p>

## 本篇导览

单轮数学推理仍是确定性状态转移：每个 token 拼在末尾，环境不会反击。一旦进入软件工程修复（SWE）、深度检索（Deep Research）、浏览器与计算机操作等真实智能体场景，模型必须执行几十到上千步“思考 → 工具调用 → 接收外部观测”的循环。本篇用三章系统覆盖这一 2025–2026 最前沿的主战场：第 14 章建立多轮随机 POMDP 建模与“观测掩码 + Token-in-Token-out”两条工程铁律；第 15 章探讨长程信用分配难题与 Kimi K2.5 PARL 并行多智能体编排；第 16 章落到规模化沙箱环境池、动态课程学习与 GLM-5 异步解耦 Agent RL 实践。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-rl/chapters/chapter-14">
    <div>
      <div class="part-card__num">CHAPTER 14</div>
      <div class="part-card__title">第 14 章 · 多轮工具交互与 Agentic 建模</div>
      <p class="part-card__desc">梳理多轮 POMDP、损失掩码 μ_t、Token-in-Token-out 铁律、上下文折叠与 SWE/Search/GUI 环境构造。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-15">
    <div>
      <div class="part-card__num">CHAPTER 15</div>
      <div class="part-card__title">第 15 章 · 长程信用分配与并行多智能体</div>
      <p class="part-card__desc">应对百轮稀疏奖励与过程反馈利用，深拆 Kimi K2.5 PARL 编排者训练与关键路径步数指标。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-16">
    <div>
      <div class="part-card__num">CHAPTER 16</div>
      <div class="part-card__title">第 16 章 · 规模化环境、课程与异步 Agent RL</div>
      <p class="part-card__desc">设计高并发容错沙箱与防钻空子机制、Sweet Spot 动态难度课程，及 GLM-5 异步长程训练实践。</p>
    </div>
  </a>
</div>
