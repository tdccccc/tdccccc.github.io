# LLM 推理工程：原理与方法

<p class="chapter-summary">从单条请求的延迟拆解，到推理引擎调度、GPU 算子优化与国产芯片适配——以直观图解、手算账本与可复用的工程方法，打通大语言模型推理全栈。</p>

大语言模型推理是一门贴近物理极限的系统工程：换一块算力翻倍的显卡为什么解码速度几乎不动？并发翻倍后为什么吞吐见顶而尾延迟骤增？PagedAttention、量化、投机解码、FlashAttention 和国产 NPU 适配各自到底在省什么？本书统一采用 **A100 80GB / H100 + Llama-3.1-8B / Qwen3-8B** 与 **昇腾 Ascend 910B** 教材口径，按「先算清账、再看机制、最后归因」的主线展开。

<div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin:1.1rem 0 1.4rem;">
  <a href="/books/llm-inference/chapters/chapter-01" style="display:inline-flex;align-items:center;padding:0.55rem 1.15rem;border-radius:8px;background:var(--vp-c-brand-1);color:#fff;font-weight:600;text-decoration:none;">从第 1 章开始 →</a>
  <a href="#reading-paths" style="display:inline-flex;align-items:center;padding:0.55rem 1.05rem;border-radius:8px;border:1px solid var(--vp-c-divider);color:var(--vp-c-text-1);font-weight:600;text-decoration:none;">按角色选路线</a>
  <a href="/books/llm-inference/toolkit/hardware-models" style="display:inline-flex;align-items:center;padding:0.55rem 1.05rem;border-radius:8px;border:1px solid var(--vp-c-divider);color:var(--vp-c-text-1);font-weight:600;text-decoration:none;">硬件与模型速查</a>
</div>

<figure class="book-figure">
  <img src="/figures/llm-inference/fullstack-map.svg" alt="LLM 推理工程四层全栈地图" loading="lazy">
  <figcaption><span class="book-figure__label">全景图</span>从上层服务接入到底层异构硬件，贯穿一条「性能度量与 Profiling」主轴，对应全书 5 篇 23 章。</figcaption>
</figure>

## 按角色选择阅读路线 {#reading-paths}

不必线性读完所有章节。结合你当前的工程目标选一条主线，遇到底层概念再随时按图索骥。

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-inference/part-1">
    <div>
      <div class="part-card__num">ROUTE 01 · 第 1–11 章</div>
      <div class="part-card__title">推理框架与部署优化</div>
      <p class="part-card__desc">掌握 Roofline 与模型账本、延迟分布与 Profiling 读法，吃透 vLLM / SGLang / TensorRT-LLM 核心机制、量化、投机解码、PD 解耦与成本路由。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/part-3">
    <div>
      <div class="part-card__num">ROUTE 02 · 第 1–4 + 12–17 章</div>
      <div class="part-card__title">GPU 算子与底层 Kernel</div>
      <p class="part-card__desc">建立 GPU 执行模型与存储层级心智，走完 GEMM 四版优化阶梯、Triton Block 编程、FlashAttention 在线 Softmax、量化 Matmul、CUTLASS 与引擎注册分发。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/part-4">
    <div>
      <div class="part-card__num">ROUTE 03 · 第 1–6 + 18–23 章</div>
      <div class="part-card__title">国产芯片适配与跨芯片归因</div>
      <p class="part-card__desc">看懂国产芯片四面墙与五层软件栈，深入昇腾 CANN / AscendC、vllm-ascend 插件机制、算子覆盖与回退定位、跨芯片算子迁移与精度性能归因。</p>
    </div>
  </a>
</div>

## 全书结构总览

### 五篇 23 章主线

| 篇目 | 章节范围 | 核心问题 | 入口 |
|---|---|---|---|
| **第一篇 性能直觉与度量方法** | 第 1–4 章 | 为什么慢？显存与计算怎么算账？怎么正确量出延迟与切时间线？ | [进入第一篇](/books/llm-inference/part-1) |
| **第二篇 推理引擎与部署优化** | 第 5–11 章 | vLLM / SGLang / TRT-LLM 怎么调度？量化、投机解码、PD 与路由何时生效？ | [进入第二篇](/books/llm-inference/part-2) |
| **第三篇 GPU 算子优化与引擎接入** | 第 12–17 章 | CUDA 与 Triton 怎么压榨带宽和算力？Fused Attention 与量化核如何接进引擎？ | [进入第三篇](/books/llm-inference/part-3) |
| **第四篇 国产芯片适配原理与方法** | 第 18–22 章 | 国产芯片软件栈怎么分层？昇腾 CANN / AscendC、`vllm-ascend` 与跨芯片算子怎么迁？ | [进入第四篇](/books/llm-inference/part-4) |
| **第五篇 综合分析与方法收口** | 第 23 章 | 如何控制变量做跨芯片精度回归与性能归因，并写出经得起质疑的分析报告？ | [进入第五篇](/books/llm-inference/part-5) |

### 两个横切参考区

| 区域 | 页面 | 适用场景 |
|---|---|---|
| 进阶专题库 | [专题 A：前沿长上下文与混合架构深度拆账](/books/llm-inference/topics/advanced-architectures) | 拆解 Qwen3.5/3.6、DeepSeek V4、Gemma 4 的 MoE、MLA、线性注意力与 KV 稀疏压缩账本 |
| 进阶专题库 | [专题 B：大规模集群 PD 与分布式 KV 池](/books/llm-inference/topics/cluster-pd-mooncake) | 深入 Mooncake 架构、RDMA 跨机 KV 传输账、池配比与故障域设计 |
| 进阶专题库 | [专题 C：端侧与浏览器推理运行时](/books/llm-inference/topics/edge-runtimes) | 梳理 llama.cpp、ONNX Runtime、MLC/WebLLM 等本地与端侧部署边界 |
| 进阶专题库 | [专题 D：各章核心论文精读与数据口径](/books/llm-inference/topics/paper-notes) | 集中查阅 PagedAttention、FlashAttention、SmoothQuant、Speculative Decoding 等关键论文要点 |
| 进阶专题库 | [专题 E：主流国产芯片生态速查](/books/llm-inference/topics/domestic-ecosystems) | 对比昇腾、海光 DCU、寒武纪、壁仞、沐曦、摩尔线程等软件栈与 vLLM 适配路径 |
| 参考工具箱 | [硬件规格与模型账本速查](/books/llm-inference/toolkit/hardware-models) | 查阅 A100 / H100 / Ascend 910B 硬件参数与 Llama-3.1 / Qwen3 等模型手算表 |
| 参考工具箱 | [测量口径与对比分析方法](/books/llm-inference/toolkit/methodology) | 统一压测条件、分位数口径、精度检验与跨配置对比边界 |
| 参考工具箱 | [工程脚本与配置参考](/books/llm-inference/toolkit/tools-and-configs) | 获取 SSE 流式压测脚本、Prometheus 监控配置与常见引擎启动参数参考 |

## 阅读说明

为保证全书公式与数量级直觉前后一致，主线算例统一采用 **NVIDIA A100 80GB SXM**（FP16 312 TFLOPS，HBM 2 TB/s，脊点 156 FLOP/B）与 **NVIDIA H100 80GB SXM**（FP16 989.5 TFLOPS，HBM 3.35 TB/s，脊点 295 FLOP/B）作为 GPU 基准，以 **Llama-3.1-8B**（FP16 权重 16 GB，KV 128 KiB/token）与 **Qwen3-8B**（BF16 权重 16.38 GB，KV 144 KiB/token）作为主线模型，国产芯片主线采用 **昇腾 Ascend 910B（64 GB HBM）**。文中的手算数字旨在建立清晰的数量级直觉与优化方向感，换用其他卡型或模型时可按同一套公式直接代换；完整规格速查见 [硬件规格与模型账本速查](/books/llm-inference/toolkit/hardware-models)。

- **双栏目录导航**：左侧栏按篇目与章节切换，右侧常驻本页二级 / 三级节目录并随阅读位置高亮，页面底部提供上一页 / 下一页连续阅读入口。
- **配图放大预览**：点击任意机制矢量图即可全屏放大，支持滚轮缩放、拖拽平移、多图切换与新标签页打开原图。
- **术语悬停**：正文首次出现的专业术语带虚线下划线，悬停即可查看精简释义，点击跳转 [术语表](/books/llm-inference/glossary)。

[术语表](/books/llm-inference/glossary) · [来源、贡献与许可](/books/llm-inference/colophon) · [← 返回 Tdccccc's Atlas 首页](/)
