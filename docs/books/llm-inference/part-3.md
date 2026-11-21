# 第三篇：GPU 算子优化与引擎接入

<p class="chapter-summary">下潜到硬件与内核：GPU 执行模型与四版 GEMM、Triton、FlashAttention、量化 Matmul、CUTLASS 与自定义算子接入。</p>

## 本篇导览

本篇打开推理引擎内部的算子黑盒：第 12 章从 GPU 执行模型切入四版 GEMM 优化阶梯；第 13 章建立 Triton Block 编程心智并写透最小 2D GEMM；第 14–15 章手推并拆解 Fused Attention 与量化 Matmul；第 16 章导读 FlashAttention 2/3 与 CUTLASS/CuTe 工业实现；第 17 章讲清自定义算子接入 vLLM 的注册、启用与分发全链路。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-inference/chapters/chapter-12">
    <div>
      <div class="part-card__num">CHAPTER 12</div>
      <div class="part-card__title">第 12 章 · GPU 执行模型与 GEMM 四版优化阶梯</div>
      <p class="part-card__desc">从 Thread/Warp/SM 存储层级出发，走完 GEMM 朴素、Shared 分块、向量化防 Bank 冲突与线程粗化四版阶梯。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-13">
    <div>
      <div class="part-card__num">CHAPTER 13</div>
      <div class="part-card__title">第 13 章 · Triton 编程模型：从向量加到 2D GEMM</div>
      <p class="part-card__desc">建立 Triton Block 级编程思维，打通 1D Mask、Fused Softmax 与最小 2D GEMM 广播指针。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-14">
    <div>
      <div class="part-card__num">CHAPTER 14</div>
      <div class="part-card__title">第 14 章 · Fused Attention 深讲：Online Softmax 与分块实现</div>
      <p class="part-card__desc">推导 Online Softmax 精确更新与代码化简，算清 SRAM/寄存器上限，拆解完整实现与 Causal 跳块。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-15">
    <div>
      <div class="part-card__num">CHAPTER 15</div>
      <div class="part-card__title">第 15 章 · 量化 Matmul 算子原理：W8A8 与 W8A16</div>
      <p class="part-card__desc">看懂 Scale 粒度如何决定 Kernel 结构，对比 W8A8 与 W8A16 Fused Dequant 双路径及 L2 Swizzle。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-16">
    <div>
      <div class="part-card__num">CHAPTER 16</div>
      <div class="part-card__title">第 16 章 · 工业级实现导读：FlashAttention 2/3 与 CUTLASS</div>
      <p class="part-card__desc">图解 FlashAttention 2 的 Split-Q 与 cp.async 流水、FA3 Hopper TMA/Warp Specialization 与 CUTLASS/CuTe。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-17">
    <div>
      <div class="part-card__num">CHAPTER 17</div>
      <div class="part-card__title">第 17 章 · 把自定义算子接入推理引擎</div>
      <p class="part-card__desc">走通 vLLM CustomOp 注册、启用、分发三道门，规避静默失效，并用 Amdahl 归因与扩展地图收口。</p>
    </div>
  </a>
</div>
