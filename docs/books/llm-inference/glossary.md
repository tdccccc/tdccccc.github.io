# 术语表

正文首次出现的专业术语自动链接至本页；将鼠标悬停在带虚线下划线的术语上即可查看精简解释。

[硬件规格与模型速查](/books/llm-inference/toolkit/hardware-models) · [测量口径与分析方法](/books/llm-inference/toolkit/methodology)

## 屋顶线模型（Roofline model） {#roofline}

用峰值算力、峰值显存带宽和算术强度估算 kernel 性能上限的模型

常见写法：`Roofline`、`Roofline 模型`。

## 算术强度（arithmetic intensity） {#arithmetic_intensity}

每搬运 1 字节数据所执行的浮点运算次数（FLOP/Byte）

常见写法：`算术强度`、`arithmetic intensity`。

## 脊点（ridge point） {#ridge_point}

硬件峰值算力与峰值显存带宽之比，划分带宽受限区与计算受限区

常见写法：`脊点`、`ridge point`。

## 显存带宽受限（memory-bound） {#memory_bound}

运行时间主要受显存数据搬运速度限制的状态

常见写法：`显存带宽受限`、`memory-bound`、`memory bound`。

## 计算受限（compute-bound） {#compute_bound}

运行时间主要受算力单元吞吐限制的状态

常见写法：`计算受限`、`compute-bound`、`compute bound`。

## 首 token 延迟（Time to First Token） {#ttft}

从发出请求到收到首个非空生成内容的时间，包含排队与 prefill

常见写法：`TTFT`。

## token 间延迟（Inter-Token Latency） {#itl}

同一请求相邻两个输出 token 之间的时间间隔，决定流式输出是否卡顿

常见写法：`ITL`。

## 每输出 token 平均时间（Time Per Output Token） {#tpot}

解码阶段总跨度除以输出 token 数减一，衡量平均生成速度

常见写法：`TPOT`。

## 预填充（prefill） {#prefill}

并行处理输入 prompt 并写入初始 KV 缓存的前向阶段

常见写法：`prefill`、`Prefill`、`预填充`。

## 解码（autoregressive decoding） {#decode}

逐 token 自回归生成输出、并每步复用历史 KV 缓存的阶段

常见写法：`decode`、`Decode`、`解码阶段`。

## 键值缓存（Key-Value Cache） {#kv_cache}

保存历史 token 注意力 K/V 向量、避免 decode 阶段重复计算的显存区域

常见写法：`KV 缓存`、`KV Cache`、`KV cache`。

## 多头注意力（Multi-Head Attention） {#mha}

每个 query 头拥有独立 K/V 头的标准注意力结构

常见写法：`MHA`。

## 分组查询注意力（Grouped-Query Attention） {#gqa}

多个 query 头共享一组 K/V 头，以成倍降低 KV 显存占用与访存量

常见写法：`GQA`。

## 多头潜变量注意力（Multi-head Latent Attention） {#mla}

将 K/V 压缩到低维潜变量缓存，并利用矩阵结合律在查询侧吸收上投影的注意力结构

常见写法：`MLA`。

## 混合专家（Mixture of Experts） {#moe}

每个 token 经路由仅激活少数专家子网络，实现总参数容量与单步计算量脱钩

常见写法：`MoE`。

## 分页注意力（Paged Attention） {#paged_attention}

将 KV 缓存切为固定大小 block，通过块表映射到非连续物理显存的注意力管理机制

常见写法：`PagedAttention`、`Paged Attention`。

## 块表（block table） {#block_table}

记录序列逻辑 KV block 到物理显存 block 映射的每请求索引数组

常见写法：`block table`。

## 连续批处理（continuous batching） {#continuous_batching}

以单次迭代为粒度动态组批，已完成请求立即退出、等待请求即时补入的调度机制

常见写法：`连续批处理`、`continuous batching`、`Continuous Batching`。

## 分块预填充（chunked prefill） {#chunked_prefill}

将长 prompt 的 prefill 切为定长小块，与 decode 请求混批以消除解码卡顿

常见写法：`chunked prefill`、`Chunked Prefill`、`分块 prefill`、`分块 Prefill`。

## 前缀缓存（prefix caching） {#prefix_caching}

跨请求复用相同 prompt 前缀已计算出的 KV 缓存，跳过重复 prefill

常见写法：`prefix caching`、`Prefix Caching`、`前缀缓存`。

## 基数树注意力（Radix Attention） {#radix_attention}

用压缩前缀树（Radix Tree）按 token 粒度管理、共享与 LRU 淘汰 KV 缓存的机制

常见写法：`RadixAttention`、`Radix Attention`。

## 量化（quantization） {#quantization}

用更低位宽表示权重或激活，以降低显存占用与带宽搬运量

常见写法：`量化`、`quantization`。

## 激活感知权重量化（Activation-aware Weight Quantization） {#awq}

依据激活幅值分布保护关键权重通道的低比特权重量化方法

常见写法：`AWQ`。

## GPT 权重量化（Generative Pre-trained Transformer Quantization） {#gptq}

基于近似二阶海森信息逐列补偿量化误差的训练后权重量化方法

常见写法：`GPTQ`。

## SmoothQuant 平滑量化（SmoothQuant） {#smoothquant}

通过等价通道缩放将激活离群值转移到权重侧，使 W8A8 量化更平滑的方法

常见写法：`SmoothQuant`。

## 8 位浮点（8-bit Floating Point） {#fp8}

使用 8 位浮点表示权重或激活的低精度格式，Hopper 及更新架构提供原生 Tensor Core 加速

常见写法：`FP8`。

## 4 位整数（4-bit Integer） {#int4}

每权重仅占 4 bit 的极低位宽格式，常以 W4A16 形式大幅缓解显存与带宽压力

常见写法：`INT4`。

## 投机解码（speculative decoding） {#speculative_decoding}

先由低成本草稿模型预测多步候选 token，再由目标大模型单次并行验证的无损加速方法

常见写法：`投机解码`、`speculative decoding`。

## KV 缓存淘汰（KV cache eviction） {#kv_eviction}

按策略丢弃部分历史 KV（如保留 Attention Sink 与滑窗），以控制超长上下文显存

常见写法：`KV 淘汰`、`KV eviction`、`KV cache eviction`。

## 预填充-解码解耦（prefill-decode disaggregation） {#pd_disaggregation}

将算力密集的 Prefill 与带宽密集的 Decode 拆分到独立计算池，消除相互干扰

常见写法：`PD 解耦`、`prefill-decode disaggregation`、`解耦式服务`。

## 有效吞吐（goodput） {#goodput}

同时满足延迟（TTFT/ITL）SLO 与正确性约束的有效请求吞吐

常见写法：`goodput`、`有效吞吐`。

## 水平 Pod 自动扩缩容（Horizontal Pod Autoscaler） {#hpa}

Kubernetes 中根据队列或业务指标自动增减副本数的控制器

常见写法：`HPA`。

## Kubernetes 事件驱动扩缩容（Kubernetes Event-driven Autoscaling） {#keda}

将 Prometheus 队列深度等外部指标接入 Kubernetes 自动扩缩容的组件

常见写法：`KEDA`。

## TensorRT-LLM 推理引擎（TensorRT-LLM） {#tensorrt_llm}

NVIDIA 面向数据中心 GPU 的高性能 LLM 推理系统，当前默认采用 PyTorch 执行后端

常见写法：`TensorRT-LLM`。

## DeepInfer 推理引擎（DeepInfer） {#deepinfer}

DeepSeek 开源的生产级高性能大模型推理引擎（Apache 2.0），面向 DeepSeek-V4.1-Flash 等超大稀疏 MoE 模型深度垂直协同，支持 NVIDIA SM100 与华为昇腾 950

常见写法：`DeepInfer`、`deepseek-ai/DeepInfer`。

## DSpark 投机解码（DSpark） {#dspark}

DeepSeek 与北大提出的置信度调度半自回归投机解码框架（arXiv:2607.05147），结合 Markov 头与负载感知动态截断验证

常见写法：`DSpark`。

## 专家并行负载均衡（Expert Parallelism Load Balancing） {#eplb}

在 MoE 专家并行中将高热逻辑专家冗余复制到多个物理槽位并动态分流的均衡策略

常见写法：`EPLB`。

## TileLang 算子编程语言（TileLang） {#tilelang}

基于 TVM 演进的 Pythonic 分块 GPU/NPU 算子领域专用语言与编译器，显式掌控线程块切分与片上存储搬运流水

常见写法：`TileLang`。

## 统一计算设备架构（Compute Unified Device Architecture） {#cuda}

NVIDIA 的 GPU 并行计算平台与编程模型

常见写法：`CUDA`。

## CUDA 图（CUDA Graph） {#cuda_graph}

将一连串 GPU kernel 启动录制成静态图单次重放，显著降低 CPU 发射开销

常见写法：`CUDA Graph`、`CUDA 图`。

## Triton GPU 编程语言（Triton） {#triton}

以 Block 级张量抽象用 Python 编写高性能 GPU kernel 的语言与编译器

常见写法：`Triton`。

## 共享内存（shared memory） {#shared_memory}

同一线程块（SM）内可见、带宽极高、延迟仅数十周期的可编程片上存储

常见写法：`shared memory`、`Shared Memory`、`共享内存`。

## 线程束（warp） {#warp}

NVIDIA GPU 中以 32 个线程为一组按 SIMT 方式同步调度的最小硬件执行单元

常见写法：`warp`、`Warp`。

## 占用率（occupancy） {#occupancy}

SM 上实际驻留活跃 warp 数占硬件最大支持 warp 数的比例

常见写法：`occupancy`、`Occupancy`、`占用率`。

## 存储体冲突（bank conflict） {#bank_conflict}

同一 warp 内多个线程同时访问同一 shared memory bank 的不同地址而导致的串行化

常见写法：`bank conflict`、`Bank Conflict`、`存储体冲突`。

## 通用矩阵乘法（General Matrix Multiplication） {#gemm}

Transformer 投影层、MLP 与输出头的核心基础计算算子

常见写法：`GEMM`。

## FlashAttention {#flash_attention}

通过片上分块与在线 Softmax 消除 N×N 中间矩阵 HBM 读写的 IO 感知精确注意力算法

常见写法：`FlashAttention`。

## 在线 Softmax（online softmax） {#online_softmax}

分块扫描时动态维护运行最大值与归一化分母、与整行计算精确等价的数值稳定算法

常见写法：`online softmax`、`Online Softmax`、`在线 softmax`。

## CUTLASS 模板库（CUDA Templates for Linear Algebra Subroutines） {#cutlass}

NVIDIA 开源的可组合高性能 GEMM 与流水线 C++/CuTe 模板库

常见写法：`CUTLASS`。

## 昇腾神经网络计算架构（Compute Architecture for Neural Networks） {#cann}

华为昇腾 NPU 的分层异构计算软件栈与算子开发平台

常见写法：`CANN`。

## AscendC 算子编程语言（Ascend C） {#ascendc}

面向华为昇腾 NPU 的 C++ 自定义算子编程接口，显式管理片上 UB 与硬件流水

常见写法：`AscendC`、`Ascend C`。

## 神经网络处理器（Neural Processing Unit） {#npu}

专为矩阵与向量张量计算设计的专用人工智能加速处理器

常见写法：`NPU`。

## vLLM 昇腾插件（vLLM Ascend plugin） {#vllm_ascend}

将昇腾 NPU 平台、算子库与通信后端无缝挂载到 vLLM 主干的官方硬件插件

常见写法：`vllm-ascend`。

## 算子覆盖（operator coverage） {#operator_coverage}

模型推理所需算子在目标硬件上由原生或专用实现承接的比例与清单

常见写法：`算子覆盖`、`operator coverage`。

## 张量并行（tensor parallelism） {#tensor_parallelism}

将单层权重矩阵切分到多张加速卡上并行计算并通过集合通信汇总的并行策略

常见写法：`张量并行`、`tensor parallelism`。

## 模型算力利用率（Model FLOPs Utilization） {#mfu}

实际有效模型计算吞吐占硬件理论峰值算力的比例

常见写法：`MFU`。

## 服务等级目标（Service Level Objective） {#slo}

对服务延迟分位数（如 TTFT/ITL p95）与可用性设定的可度量目标

常见写法：`SLO`。

## 每秒请求数（Queries Per Second） {#qps}

系统每秒到达或完成的请求数量

常见写法：`QPS`。

## Nsight Compute（NVIDIA Nsight Compute） {#ncu}

采集单个 GPU kernel 硬件计数器、指令与访存瓶颈的微观性能分析器

常见写法：`ncu`。

## Nsight Systems（NVIDIA Nsight Systems） {#nsys}

采集 CPU、GPU、内存拷贝与跨进程同步全景时间线的系统级分析器

常见写法：`nsys`。

## 张量加速引擎（Tensor Boost Engine） {#tbe}

昇腾 CANN 上一代基于 Python DSL 描述计算与自动调度的算子开发框架

常见写法：`TBE`。

## 旋转位置编码（Rotary Position Embedding） {#rope}

通过旋转 query/key 向量注入相对位置信息的经典位置编码方法

常见写法：`RoPE`。
