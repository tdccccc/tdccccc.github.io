# 第二篇：推理引擎与部署优化

<p class="chapter-summary">打开主流推理引擎与生产架构：vLLM、SGLang、监控与容量评估、量化、投机解码、TensorRT-LLM、DeepSeek DeepInfer 与四引擎横评，以及 PD/路由落地。</p>

## 本篇导览

本篇拆解现代 LLM 推理引擎如何组织显存、调度和计算，并梳理生产环境的核心优化杠杆。

第 5–6 章沿请求旅程精讲 vLLM（分页与连续批处理）与 SGLang（基数树前缀复用）；第 7 章串联监控指标与容量拐点；第 8–9 章深入量化、投机解码与 KV 淘汰的收益边界；第 10 章拆解 NVIDIA 原厂 TensorRT-LLM 的 PyTorch 后端与三预算账；第 11 章剖析 DeepSeek 开源的模型原厂垂直协同引擎 DeepInfer，并将 vLLM V1、SGLang、TensorRT-LLM 与 DeepInfer 放上同一张九维工程天平；第 12 章落地 PD 解耦、队列扩缩容与成本路由。大规模集群 PD 详见[专题 B](/books/llm-inference/topics/cluster-pd-mooncake)。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-inference/chapters/chapter-05">
    <div>
      <div class="part-card__num">CHAPTER 05</div>
      <div class="part-card__title">第 5 章 · vLLM：一条请求如何穿过推理引擎</div>
      <p class="part-card__desc">沿一条请求的完整旅程，拆解 vLLM V1 双进程架构、PagedAttention、连续批处理与调度抢占。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-06">
    <div>
      <div class="part-card__num">CHAPTER 06</div>
      <div class="part-card__title">第 6 章 · SGLang：RadixAttention 与前缀复用</div>
      <p class="part-card__desc">从整段哈希到 Block 哈希再到基数树，走完 RadixAttention 前缀复用、调度生命周期与分块 Prefill。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-07">
    <div>
      <div class="part-card__num">CHAPTER 07</div>
      <div class="part-card__title">第 7 章 · 可观测性与容量评估</div>
      <p class="part-card__desc">先定义指标再看看板：掌握 Prometheus 三类指标、速率扫描曲线、Little 定律与过载抢占边界。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-08">
    <div>
      <div class="part-card__num">CHAPTER 08</div>
      <div class="part-card__title">第 8 章 · 量化原理与取舍</div>
      <p class="part-card__desc">看清低比特如何省搬运与提算力，用微型算例拆解离群值、SmoothQuant、AWQ/GPTQ 与硬件边界。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-09">
    <div>
      <div class="part-card__num">CHAPTER 09</div>
      <div class="part-card__title">第 9 章 · 投机解码与长上下文 KV 淘汰</div>
      <p class="part-card__desc">先建立草稿并行验证直觉与无损拒绝采样原理，再看清 QPS 交叉点与 Attention Sink 淘汰机制。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-10">
    <div>
      <div class="part-card__num">CHAPTER 10</div>
      <div class="part-card__title">第 10 章 · TensorRT-LLM：PyTorch 后端与执行预算</div>
      <p class="part-card__desc">破除静态编译刻板印象，厘清 TensorRT-LLM PyExecutor 执行循环、三预算账与原厂低精度/EAGLE-3 路径。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-11">
    <div>
      <div class="part-card__num">CHAPTER 11</div>
      <div class="part-card__title">第 11 章 · DeepInfer：模型原厂垂直协同与四引擎横评</div>
      <p class="part-card__desc">拆解 DeepSeek 开源的 DeepInfer 异步调度、Balanced CP、EPLB、五大算子栈、SWA 重放与 DSpark，并以九维总表横评四大引擎。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-12">
    <div>
      <div class="part-card__num">CHAPTER 12</div>
      <div class="part-card__title">第 12 章 · 生产架构：PD 解耦、扩缩容与成本路由</div>
      <p class="part-card__desc">算清 PD 解耦传输税与 K8s 排队深度扩缩容逻辑，建立单位 Token 经济学与多后端预算路由。</p>
    </div>
  </a>
</div>
