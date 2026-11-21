# 第一篇：性能直觉与度量方法

<p class="chapter-summary">先把“为什么慢”和“怎么量”想透：Roofline 三区间、模型显存与算力账本、延迟分布与 Profiling 诊断。</p>

## 本篇导览

本篇为全书建立统一的物理直觉与测量标尺：第 1 章用 Roofline 分清计算、带宽与启动开销三区间；第 2 章算清参数、KV 缓存、MoE 与线性注意力的显存和算力账；第 3 章把“快”拆成 TTFT、ITL、吞吐、排队与长尾分布；第 4 章用 Profiling 双泳道把时间落到具体算子与空白。

全书默认以 **NVIDIA A100 80GB / H100** 与 **Llama-3.1-8B / Qwen3-8B** 作为主线教学算例，完整规格随时可查[硬件规格与模型账本速查](/books/llm-inference/toolkit/hardware-models)。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-inference/chapters/chapter-01">
    <div>
      <div class="part-card__num">CHAPTER 01</div>
      <div class="part-card__title">第 1 章 · 推理为什么慢：Roofline 与三区间直觉</div>
      <p class="part-card__desc">用算术强度、硬件脊点与计算/带宽/启动三区间，判断一次推理或融合算子究竟卡在哪。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-02">
    <div>
      <div class="part-card__num">CHAPTER 02</div>
      <div class="part-card__title">第 2 章 · 模型的显存与计算账本</div>
      <p class="part-card__desc">拆解权重、KV 缓存（MHA/GQA/MLA）、MoE 稀疏激活与混合线性注意力的显存与计算账。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-03">
    <div>
      <div class="part-card__num">CHAPTER 03</div>
      <div class="part-card__title">第 3 章 · 推理度量与压测方法</div>
      <p class="part-card__desc">把“快”拆成 TTFT、ITL/TPOT、吞吐与排队，掌握分位数分布、SSE 计时原理与拐点读法。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-04">
    <div>
      <div class="part-card__num">CHAPTER 04</div>
      <div class="part-card__title">第 4 章 · Profiling 方法论：看时间花在哪</div>
      <p class="part-card__desc">按 torch.profiler → nsys → ncu 三层粒度读懂 CPU/GPU 双泳道，定位热点与时间线空白。</p>
    </div>
  </a>
</div>
