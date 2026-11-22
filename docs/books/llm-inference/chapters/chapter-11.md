# 第 11 章 DeepInfer：模型原厂垂直协同与四引擎横评

<p class="chapter-summary">拆解 DeepSeek 开源的生产级推理引擎 DeepInfer（Apache 2.0）：从“通用适配 vs 垂直协同”的范式分叉出发，走通 C++ 零开销异步调度、Attention DP / Balanced CP 与 MoE EP/EPLB 并行编排、五大定制算子栈、SWA 有界重放、DSpark 置信度投机解码与 SM100/昇腾 950 双一线硬件栈，最后以九维架构总表横评 vLLM V1、SGLang、TensorRT-LLM 与 DeepInfer 四大引擎。</p>

前面几章已经走完三种代表性引擎范式：[第 5 章 vLLM](chapter-05.md) 以分页与统一调度扛起通用多模型生态，[第 6 章 SGLang](chapter-06.md) 以基数树和轻量重叠调度领跑高复用前缀与 Agent 工作流，[第 10 章 TensorRT-LLM](chapter-10.md) 代表 NVIDIA 硬件原厂把 Hopper/Blackwell 算子与执行预算压到极致。

然而，当单模型参数规模迈向 700B+ 超稀疏 <a class="term-ref" href="/books/llm-inference/glossary#moe" title="Mixture of Experts，混合专家：每个 token 经路由仅激活少数专家子网络，实现总参数容量与单步计算量脱钩">MoE</a>、注意力演进为编解码分离（CED）+ 稀疏索引跨层共享（CSA2）+ FP4 混合 KV（低至 **890 B/token**）时，第四种工程范式站上了台前——<strong>模型原厂垂直协同推理引擎</strong>。2026 年 10 月 20 日，DeepSeek 以 **Apache 2.0** 协议正式开源其大规模生产基础设施的核心引擎 <strong><a class="term-ref" href="/books/llm-inference/glossary#deepinfer" title="DeepSeek 开源的生产级高性能大模型推理引擎（Apache 2.0），面向 DeepSeek-V4.1-Flash 等超大稀疏 MoE 模型深度垂直协同，支持 NVIDIA SM100 与华为昇腾 950">DeepInfer</a></strong>（`deepseek-ai/DeepInfer`）及配套协议编解码组件 **`deepseek-recipe`**。本章将完整拆解 DeepInfer 的架构边界、异步调度与并行编排、算子栈、算法-系统协同加速与双一线硬件抉择，并在章末把四大主流引擎摆上同一张工程天平。

---

## 11.1 范式分叉：通用引擎 vs 模型原厂垂直协同

### 为什么通用抽象在 DeepSeek-V4.1-Flash 级架构上会漏水？

DeepInfer 首发并不追求“开箱跑通 Hugging Face 上的几百个模型”，而是高度专精于 **DeepSeek-V4.1-Flash** 这一类极致压榨长上下文与激活稀疏度的前沿模型（该模型的完整存储与算力拆账见[专题 A](../topics/advanced-architectures.md)：主干 $551.57\text{B}$ + Engram 外部记忆表 $196.93\text{B} = 748.50\text{B}$，40 层 384 选 6 稀疏 MoE，前 20 层因果编码器 + 后 20 层因果解码器的 CED 结构，38 层全局注意力拆为 4 Full + 4 Reindex + 30 Reuse 的 CSA2 候选池，每 token 全局 KV 仅 **$890\text{ B}$**）。

这类架构把传统通用推理引擎的三条默认假设几乎同时打破：

1. **Prefill 与 Decode 的激活结构不再对称**：传统 Decoder-only 引擎默认所有层对所有输入 token 跑同一条前向循环；而在 CED 架构中，Prefill 阶段仅激活约 **8B** 参数（后 20 层解码器仅重放末尾短窗），Decode 阶段才激活约 **16B** 参数，通用循环要么无法跳过冗余解码计算，要么只能打补丁式特判。
2. **上下文状态不再是单一齐整的 Paged KV 块**：一条活跃请求同时挂着四类生命周期和位宽截然不同的状态——仅 4 层独立保存且跨层共享的 **FP4 主 KV（E2M1 + 每 16 通道缩放）**、128 维轻量**索引键（Index Key）**、40 层 **FP8 局部滑动窗口（SWA）环形状态**，以及驻留主机 DRAM 或外部存储层、需要与前层计算异步预取重叠的 **196.93B 级 Engram 查表**。
3. **单卡 GEMM 不再是第一瓶颈，跨卡通信与热专家倾斜才是生死线**：主干中高达 **98.6%** 的参数落在路由专家内，单步真正决定 <a class="term-ref" href="/books/llm-inference/glossary#mfu" title="Model FLOPs Utilization，模型算力利用率：实际有效模型计算吞吐占硬件理论峰值算力的比例">MFU</a> 和尾延迟的，是 `All-to-All` 专家分发通信能否被计算严丝合缝藏住、热点专家会不会把某几张卡打成木桶短板。

通用框架为了兼容上百种模型与硬件，必须在调度器、KV 管理器和 Attention 后端之间保留厚重的抽象接口；而模型原厂自建的 DeepInfer 选择了完全相反的路径：**以单一旗舰架构的物理账本为中心，从模型定义、C++ 调度器、块管理器一直垂直贯通到底层编译算子与集合通信库**。

### 刻意划清的开源边界：核心执行引擎 + `deepseek-recipe`，剥离集群外围壳

阅读 `deepseek-ai/DeepInfer` 时，工程师最容易产生的误判是把它当成类似 `vllm serve` 的“开箱即用在线 HTTP 服务器”。事实上，DeepSeek 在开源架构上划出了一条极其清醒的工程边界：

- **纳入开源核心（Apache 2.0）**：面向高吞吐**离线批处理推理**（`deepinfer.entrypoints.LLM`）与单域极致执行所需的全部核心引擎层——C++ 异步调度器、多态块管理器、混合并行与 EPLB 编排、五大定制底层算子栈、DSpark 投机解码、SWA 有界重放、文法结构化掩码以及确定性推理支持。
- **配套开源协议契约层（`deepseek-recipe`）**：独立以 **Rust 编写并提供 Python 绑定**的高性能协议编解码器，负责把外部标准 Chat Completions / Messages / Tool-call 请求严丝合缝地编译为模型内部控制 Token 序列，并将模型输出流准确拆解回思维过程（Reasoning）、正文与工具调用事件。大模型的控制 Token 属于严格的运行时契约——用松散的字符串拼接极易在社区自托管时引发格式漂移或提示注入风险，`deepseek-recipe` 保证了开源引擎与官方 API 行为的 100% 协议对齐。
- **刻意剥离的集群外围基础设施**：DeepSeek 明确未将与其内部生产集群深度绑定的三大外围系统打进引擎核——**分布式持久化 KV 存储（如基于 3FS 的跨机块缓存池）**、**跨机器的实例级 PD 解耦编排**与**大规模多副本流量负载均衡器**。这并非能力缺失，而是清晰的架构分层：单域计算与通信极限由执行引擎吃透，跨机存储、PD 路由与弹性扩缩由集群编排层解耦演进（完整集群架构将在[第 12 章](chapter-12.md)与[专题 B](../topics/cluster-pd-mooncake.md)展开）。

<figure class="book-figure">
  <img src="/figures/llm-inference/deepinfer-arch-stack.svg" alt="DeepInfer 垂直协同全栈架构与开源边界：左侧为协议对齐、C++ 异步调度核、混合并行、五大定制算子栈与 SM100/昇腾 950 双一线硬件；右侧虚线框标出刻意剥离的分布式 KV 池、PD 解耦与副本负载均衡" loading="lazy">
  <figcaption><span class="book-figure__label">图 11-1</span>自上而下阅读左侧五层开源核心：从 Rust 编写的 <code>deepseek-recipe</code> 协议层穿过 C++ 零开销异步运行时、混合并行编排与五大定制算子栈，直达 NVIDIA SM100 与华为昇腾 950 双一线硬件；右侧虚线框标出刻意剥离的集群外围组件。结论：DeepInfer 交付的是“压榨到极限的核心运行时”，在线生产化需配合外围集群编排栈。</figcaption>
</figure>

---

## 11.2 异步 C++ 调度核、混合并行与定制算子栈

### 代码分层、零开销异步调度与批次无关确定性

打开 `deepseek-ai/DeepInfer` 的工程目录，Python 控制面与 C++/CUDA/Ascend 执行面分工利落：

```text
DeepInfer/
├── deepinfer/
│   ├── entrypoints/                  # 离线批推理核心 API（LLM / generate）
│   ├── model_executor/layers/
│   │   └── tilelang_ops/             # 近百个面向硬件精细调优的 TileLang 定制核
│   ├── config.py                     # 并行拓扑、硬件与低精度运行配置
│   └── utils.py                      # IPC 封装与调试辅助工具
├── csrc/
│   └── engine/
│       ├── scheduler.hpp / .cpp      # C++ 零开销异步调度器与跨 Rank 同步投票
│       ├── block_manager.hpp         # 分页主 KV、索引键与 SWA 环形窗多态块管理
│       └── mtp_varlen.hpp            # 变长多 token 预测与 DSpark 验证数据结构
└── examples/offline_inference.py     # 标准离线高吞吐批推理与校验入口
```

在运行循环上，DeepInfer 的核心设计围绕三个关键工程问题展开：

1. **C++ 零开销异步批调度（Zero-Overhead Async Scheduling）**：如果 CPU 每步都苦等 GPU/NPU 采样完再做下一轮组批，超快加速卡在毫秒级 Decode 步间会频繁陷入空等。DeepInfer 将核心调度器下沉到 C++（`scheduler.cpp`），在设备执行第 $N$ 步前向的同时，CPU 端**乐观组装第 $N+1$ 步批次**并异步消化投机验证反馈，实现 CPU 调度与设备执行的完全重叠。更关键的是，在多卡 DP + EP 混合执行中，MoE 层的 `All-to-All` 是全局同步集合通信——一旦某些 Rank 选了 Prefill、另一些 Rank 选了 Decode 或已空转，跨卡通信会立刻死锁；因此 `_schedule()` 内置跨 Rank 同步投票与状态协调机制，保证所有参与 EP 通信的 Rank 步调一致。
2. **结构化输出与批次无关确定性推理（Batch-Invariant Inference）**：采样层内嵌文法自动机编译（支持 Regex、JSON Schema、EBNF），在前向后动态掩码非法词表槽位，避免在外部做低效重采样。此外，针对 NVIDIA 平台提供 **`DEEPINFER_BATCH_INVARIANT=1`** 环境变量开关：标准 GPU 归约核因并行块切分随 batch 大小动态变化，浮点加法非结合律会导致同一条 Prompt 放在 `batch=1` 和 `batch=32` 里吐出细微差异的 logits（在强化学习 Rollout 训推对齐与严格精度回归中极易放大为系统性偏差）。开启批次无关模式后，底层核函数固定归约顺序，确保跨批次组成下数值严格一致——这为[第 24 章](chapter-24.md)的精度归因提供了理想的确定性参照。

### 混合并行编排：Attention DP / Balanced CP ↔ MoE EP + EPLB

面对 700B+ 超稀疏 MoE，把整网粗暴切成大张量并行（TP=8/16）是一笔极不划算的账：每层 Attention 都要反复 `AllReduce`，且各卡不得不重复存储或细碎切分 KV。DeepInfer 在 Attention 层与 MoE 层之间执行清晰的**并行范式切换**：

- **Attention 侧：数据并行（DP）+ 均衡上下文并行（Balanced CP）**：
  - 中短序列下，各 DP Rank 各自持有独立请求集合与独立 KV 池，免去 Attention 阶段的跨卡通信；
  - 面对 128K–1M 超长 Prompt，单张卡串行 Prefill 会把首字延迟顶穿，必须启用 **上下文并行（Context Parallelism, CP）** 将单条长序列拆分到多张卡协同处理。然而因果注意力掩码下，位置越靠后的 token 需要关注越长的左侧历史，算力负载呈三角形剧烈倾斜！

**手算一笔 Balanced CP 算力账**：假设把一条超长序列等长切分给 **4 张 CP 卡**，对比“朴素顺序切分”与 DeepInfer 的 **Balanced CP 镜像切分（`cp_align` 对齐）**：

- **朴素顺序切分**（每卡连续领走 $L/4$ 个 token）：4 张卡各自覆盖的因果注意力下三角面积占比依次为：

$$
\frac{1}{16} = \mathbf{6.25\%},\qquad \frac{3}{16} = \mathbf{18.75\%},\qquad \frac{5}{16} = \mathbf{31.25\%},\qquad \frac{7}{16} = \mathbf{43.75\%}
$$

  最慢的 Rank 3 承担了全序列近一半注意力算力，是理想均摊值（25%）的 **$1.75\times$**；前 3 张卡算完后只能在同步栅栏前干等！
- **Balanced CP 首尾镜像配对**：把序列细切成 $2 \times 4 = 8$ 块（各块算力权重依次正比于 $1, 3, 5, 7, 9, 11, 13, 15$，总和 $64$），按“头尾配对”分给 4 张卡——Rank 0 拿 `(块 1, 块 8)`、Rank 1 拿 `(块 2, 块 7)`、Rank 2 拿 `(块 3, 块 6)`、Rank 3 拿 `(块 4, 块 5)`：

$$
1 + 15 = 3 + 13 = 5 + 11 = 7 + 9 = 16 \implies \text{每卡精确均为 } \frac{16}{64} = \mathbf{25.0\%}
$$

  四张卡的因果注意力配对数达到 **100% 理论均衡**，彻底消除长上下文 Prefill 的尾卡木桶效应。

- **MoE 侧：专家并行（EP）+ 热点负载均衡（EPLB）+ 双微批重叠（Two-Batch Overlap）**：
  - 离开 Attention 层后，系统通过 DeepEP 执行 `All-to-All` Dispatch 将各 DP Rank 的 token 按路由发往目标专家所在卡，执行 Grouped GEMM 后再 `Combine` 归位；
  - 真实业务语料中，专家路由存在严重长尾偏斜——少数“热门专家”可能吸引远超均值的 token，拖慢全集群同步步调。DeepInfer 集成 **<a class="term-ref" href="/books/llm-inference/glossary#eplb" title="Expert Parallelism Load Balancing，专家并行负载均衡：在 MoE 专家并行中将高热逻辑专家冗余复制到多个物理槽位并动态分流的均衡策略">EPLB</a>（专家并行负载均衡）**，统计路由热度后将高热逻辑专家冗余复制到多个物理槽位，把拥堵流量均匀摊开；
  - 同时将单步大批拆成两个交替推进的微批（Microbatch A/B）：当微批 A 正在走 DeepEP `Dispatch / Combine` 通信时，计算单元无缝切去跑微批 B 的 Attention 或 MoE Grouped GEMM，把跨卡通信延迟严丝合缝藏在算力计算背后（见图 11-2 左侧下部）。

### 五大深度定制底层算子栈

为了不把调度层辛辛苦苦省下来的时间重新漏回低效通用内核，DeepInfer 将 DeepSeek 自研的五套底层算子库打通成一条垂直栈：

| 底层算子库 | 核心攻坚对象 | 在 DeepInfer 中的关键工程角色 |
|---|---|---|
| **FlashMLA** | <a class="term-ref" href="/books/llm-inference/glossary#mla" title="Multi-head Latent Attention，多头潜变量注意力：将 K/V 压缩到低维潜变量缓存，并利用矩阵结合律在查询侧吸收上投影的注意力结构">MLA</a> 与 CSA2 稀疏压缩注意力 | 原生处理低维潜变量吸收、FP4/FP8 内联缩放 KV 读取与稀疏候选池索引访存，同步覆盖 SM100 与昇腾 950 |
| **DeepGEMM** | 低精度矩阵乘与 MoE 分组乘 | 针对 FP8、FP4、INT8 与 BF16 精细压榨块缩放 GEMM、MoE Grouped GEMM 与稀疏索引打分吞吐 |
| **DeepEP**（含 **DeepEP-Ascend**） | MoE `All-to-All` 专家通信 | 分别针对高吞吐 Prefill 与低延迟 Decode 提供无锁/低开销 Dispatch 与 Combine 原语（NVIDIA 侧压榨 NVLink/RDMA，昇腾侧基于 Ascend C + HCCL/URMA/UBMEM） |
| **DeepSelect** | 高频 Top-$K$ 路由与稀疏索引筛选 | 替代通用 PyTorch `topk`，以数倍吞吐承接 MoE 专家路由、CSA2 稀疏索引筛选与采样候选挑选 |
| **<a class="term-ref" href="/books/llm-inference/glossary#tilelang" title="基于 TVM 演进的 Pythonic 分块 GPU/NPU 算子领域专用语言与编译器，显式掌控线程块切分与片上存储搬运流水">TileLang</a> / TileKernels** | 跨架构定制融合算子编排 | 以 Pythonic 分块 DSL 显式掌控线程块 Tiling、片上存储搬运与硬件内联指令，在 `tilelang_ops/` 下生成近百个面向特定硬件布局的定制核 |

---

## 11.3 算法-系统协同加速与双一线硬件抉择

DeepInfer 真正区别于传统框架的杀手锏，在于它把<strong>模型结构（CED / SWA）</strong>、<strong>投机算法（DSpark）</strong>和<strong>新一代硬件特性（SM100 / 昇腾 950）</strong>拧成了同一条优化闭环。

### 一、SWA Bounded Replay：用 $O(140)$ 重放换掉半数 Prefill 与持久化 SWA KV

回顾[专题 A](../topics/advanced-architectures.md)对 DeepSeek-V4.1-Flash 的账本拆解：模型 40 层切为前 20 层因果编码器 + 后 20 层因果解码器，解码器的全局 KV 由编码器末层投影跨层共享，而解码器每层的局部滑动窗口注意力（SWA，窗宽 128）只依赖最近窗口内的局部上下文。

如果在 Prefill 阶段老老实实把长 Prompt 喂进全部 40 层，后 20 层解码器对前 $L - 128$ 个 token 算出的局部 SWA KV 根本活不到 Decode 第一步就会滑出窗口，纯属白算；而如果为了前缀复用或跨机换出把 40 层 FP8 SWA 缓存连同全局 KV 一起持久化到 HBM/SSD，又会额外增加每请求约 $2.58\text{ MiB}$ 的热写状态。

DeepInfer 为此实现 **SWA Bounded Replay（有界滑窗重放）**，由环境变量 `DEEPINFER_YOCO_PREFILL_KEEP_TOKENS=140` 与 `DEEPINFER_YOCO_PREFILL_TRUNCATION_MODE=compact` 控制：

- **完全不持久化 SWA 状态**：只把每 token 仅 **890 B** 的 FP4/FP8 全局历史与索引写入持久层（1M 上下文全局核心缓存不足 1 GiB）；
- **截断有界重放**：在 Prefill 跨入后 20 层解码器或缓存重建时，引擎自动裁掉前 $L - 140$ 个历史 token，**仅重放最末尾固定 $n_{\text{win}} = 140$ 个 token**（覆盖 128 窗宽 + 投机解码回退与块对齐余量）。

结果两本账同时大幅翻绿：8K Prompt 下，后 20 层解码器算力从 $140.20\text{ TFLOPs}$ 断崖跌至 $2.18\text{ TFLOPs}$，**整次 8K Prefill 总算力直降 49%**；更重要的是，无论上下文拉长到 128K 还是 1M，重建全部 40 层 SWA 状态的代价都被钉死在常数 $O(140)$，彻底与序列总长脱钩（当然，若请求本身短于 140 token，全部输入落入重放窗内，这项跳过红利便不会触发）。

### 二、DSpark 投机解码：半自回归起草 + 置信度动态截断验证

[第 9 章](chapter-09.md)已经算清传统投机解码的两道硬约束：一方面，纯并行多头草稿缺乏块内 token 间依赖，越往后接受率塌陷越快（“后缀衰减”）；另一方面，固定草稿长度 $\gamma$ 在低并发下如虎添翼，可一旦线上 QPS 跨过 <a class="term-ref" href="/books/llm-inference/glossary#roofline" title="Roofline model，屋顶线模型：用峰值算力、峰值显存带宽和算术强度估算 kernel 性能上限的模型">Roofline</a>脊点，大量低概率尾巴反而会挤占 Batch 算力拖垮吞吐。

DeepInfer 原生集成由 DeepSeek 与北京大学联合提出的 <strong><a class="term-ref" href="/books/llm-inference/glossary#dspark" title="DeepSeek 与北大提出的置信度调度半自回归投机解码框架（arXiv:2607.05147），结合 Markov 头与负载感知动态截断验证">DSpark</a></strong>（arXiv:2607.05147），把“猜得准”与“验得巧”同步收进引擎调度循环：

1. **半自回归起草（Semi-Autoregressive Generation）**：先由并行草稿主干在单次前向中并行输出整块候选的隐藏态 $h_k$，再用极轻量的串行头融合前一位草稿 token 的 **Markov Embedding（$W_1[x_{k-1}]$）**，以极低代价在块内注入从左到右的条件依赖，有效遏制纯并行起草器的后缀衰减。
2. **置信度头 + 序列温度缩放（Confidence Head + STS）**：轻量线性投影 + Sigmoid 为每个草稿位置 $k$ 预测条件存活概率 $c_k \in (0, 1)$（以草稿分布与目标分布之间的解析接受率监督训练）。由于原始神经网络置信度普遍过度自信，直接连乘会高估长前缀存活率；DSpark 在留出校准集上执行 **序列温度缩放（Sequential Temperature Scaling, STS）**，把累计存活率预测误差从约 3%–8% 压低到约 **1%** 级别，使调度器敢拿它做真实算力预算决策。
3. **负载感知置信度调度验证（Confidence-Scheduled Verification）**：结合 `mtp_varlen.hpp` 的变长验证路径，调度器根据实时集群吞吐曲线与每条请求逐位校准后的存活概率，**动态为每条请求截断最优验证长度**——轻载时放长验证块榨干单用户极限速度，重载高并发时果断截去低置信度后缀、把宝贵的 Batch 算力留给其他活跃请求。在 DeepSeek-V4 真实线上流量口径下，同等系统吞吐下较原生 MTP-1 单用户生成提速 **60%–85%**。

<figure class="book-figure">
  <img src="/figures/llm-inference/deepinfer-swa-dspark-parallel.svg" alt="DeepInfer 三大协同加速机制：左侧对比 Balanced CP 镜像切分消除因果注意力 1.75 倍拖尾与 MoE 双微批重叠；右侧展示 CED + SWA 仅重放末尾 140 token 与 DSpark 按置信度和负载动态截断验证长度" loading="lazy">
  <figcaption><span class="book-figure__label">图 11-2</span>左侧对照 4 卡 CP 的因果算力占比（顺序切分尾卡 43.75% 拖尾 vs 镜像配对四卡精确 25%）及双微批隐藏 DeepEP 通信延迟；右侧上方展示 CED 后 20 层跳过前 <em>L</em> − 140 仅重放末尾 140 token，下方展示 DSpark 依据 STS 校准置信度与集群并发压力动态截断验证尾巴。结论：算法结构与底层调度一体协同，是垂直专精引擎跑赢通用框架的根因。</figcaption>
</figure>

### 三、双一线硬件绑定：为什么是 SM100 与昇腾 950，而非旧代 Hopper？

DeepInfer 开源声明中最具战略信号的一条决策，在于其极其克制而锋利的硬件支持矩阵：**首发仅原生支持 NVIDIA SM100（Blackwell 架构 B200/GB200，要求 CUDA 13）与华为昇腾 Ascend 950 NPU（要求 CANN 9.2），明确未将上一代主力卡 NVIDIA Hopper（H100/H200，SM90）列入默认支持列表**。

这背后不是随意取舍，而是赤裸的硬件第一性原理：

- **为什么锚定 NVIDIA SM100（Blackwell）而非回兼容 SM90（Hopper）？**
  - DeepSeek-V4.1-Flash 的显存与算力账本建立在 **原生 FP4（E2M1 块缩放）** 权重/主 KV 缓存与超高稀疏 MoE 通信之上。SM100 具备硬件原生 FP4 Tensor Core、Tensor Memory（TMEM）与更高代际 NVLink 域带宽；而 SM90 既缺乏原生 FP4 计算单元、底层指令流水与片上存储结构也与 SM100 迥异。如果为了兼容旧卡强行在内核里维护庞大的软件反量化与双架构条件分支，代码复杂度和性能折损会迅速拖慢核心演进。
- **为什么华为昇腾 Ascend 950 获得与 SM100 同等的 Day-0 一线地位？**
  - 在 DeepInfer 仓库中，华为昇腾 950 并非事后社区打补丁的“二等公民”，而是与 SM100 同步落地了完整生产算子闭环：底层依托 **CANN 9.2**、**DeepJIT** 与 **Ascend C** 实现 **DeepEP-Ascend**（打通 HCCL / URMA / UBMEM 的 MoE 低延迟 `All-to-All` 通信）与昇腾版 **FlashMLA**，中层通过 **TileLang** 复用定制融合算子，执行层利用 **ACLGraph** 对标 NVIDIA 的 <a class="term-ref" href="/books/llm-inference/glossary#cuda_graph" title="CUDA 图：将一连串 GPU kernel 启动录制成静态图单次重放，显著降低 CPU 发射开销">CUDA Graph</a>消除 Host 下发气泡。
  - 这标志着国产顶尖 NPU 首次在“超大规模稀疏 MoE + 低比特压缩注意力 + 复杂专家通信”的最前沿模型上，与最新一代 NVIDIA 旗舰卡同步走通原生生产闭环（本书第四篇 [第 19–23 章](chapter-19.md) 将继续以昇腾 910B 为教学主线，深入拆解 CANN、AscendC 流水线、覆盖归因与跨芯片迁移的通用底层方法论）。

::: warning 工程现实边界：切勿把 DeepInfer 当成普通单卡服务器的“一键替代品”
如果你手里是消费级显卡（如 RTX 4090/5090）、上一代服务器卡（A100/H100/H200）或存量昇腾 910B，或者你需要快速部署 Qwen / Llama / Gemma 多模型对外提供 OpenAI 在线服务，**DeepInfer 并不是开箱即用的目标选项**。它的直接落地门槛极高（SM100 + CUDA 13 或 Ascend 950 + CANN 9.2 集群 + 外围在线编排栈）；对大多数团队而言，它既是特定旗舰硬件上跑 DeepSeek-V4.1-Flash 的极限武器，更是向社区公开的一份**超大规模 MoE 推理顶级工程参考源码**——其中诸如双微批重叠、DeepEP、DSpark 与 SWA 有界重放等设计思想，也正迅速被 vLLM 与 SGLang 社区吸收借鉴。
:::

---

## 11.4 四大主流推理引擎全景横评与选型矩阵

走完 vLLM V1、SGLang、TensorRT-LLM 与 DeepInfer 四大代表性引擎，我们不再陷入“某周谁在某个脚本里高了 5%”的短期跑分口水战，而是把四者的**架构哲学、调度机制、算子栈、硬件矩阵与工程边界**摆在同一张九维总表上彻底看透。

### 九维深度架构横评：vLLM V1 vs SGLang vs TensorRT-LLM vs DeepInfer

| 对比维度 | vLLM V1 | SGLang | TensorRT-LLM（PyTorch 后端） | DeepInfer（DeepSeek） |
|---|---|---|---|---|
| **1. 架构定位与演进范式** | **多模型通用底座**：V1 重构多进程架构，解耦 API 与 EngineCore，强调极致模块化与生态广度 | **程序级高并发先锋**：轻量紧凑 Python 引擎，深度围绕多轮 Agent、前缀复用与极低调度开销设计 | **硬件原厂通用专精**：从静态 `.engine` 全面转向原生 `PyExecutor` PyTorch 后端，保留 NVIDIA C++/CUDA 内核优势 | **模型原厂垂直协同**：从 DeepSeek 生产基础设施抽离，以 DeepSeek-V4.1-Flash 物理账本为中心全栈贯通 |
| **2. 调度与 CPU-GPU 重叠** | 统一 Chunked Prefill 调度字典，支持优先级与抢占恢复，双进程隔离前端分词 | **Zero-Overhead 重叠调度器**将 CPU 组批与 GPU 前向异步重叠，小模型高并发优势突出 | **In-flight Batching**（Generation 优先护 ITL），围绕 `max_batch_size / max_seq_len / max_num_tokens` 三预算闭环 | **C++ 零开销异步调度器**（`scheduler.cpp`）乐观预组步 $N+1$ + 跨 Rank 同步投票防 EP 通信死锁 |
| **3. KV 缓存与状态管理** | <a class="term-ref" href="/books/llm-inference/glossary#paged_attention" title="Paged Attention，分页注意力：将 KV 缓存切为固定大小 block，通过块表映射到非连续物理显存的注意力管理机制">PagedAttention</a>分页块表 + 自动前缀缓存（APC，块级哈希），支持多级 KV 卸载连接器 | <a class="term-ref" href="/books/llm-inference/glossary#radix_attention" title="Radix Attention，基数树注意力：用压缩前缀树（Radix Tree）按 token 粒度管理、共享与 LRU 淘汰 KV 缓存的机制">RadixAttention</a>基数树全局按 token/页粒度共享 + 缓存感知调度，天然契合树状分叉工作流 | 分页块管理器 + **基数树 KV 块复用**（支持部分块复用与优先级 LRU），默认开启跨请求共享 | `block_manager.hpp` 管理 **FP4 主 KV + 索引键 + SWA 环形窗**多态状态；<strong>SWA 有界重放（140 tok）</strong>免持久化局部缓存 |
| **4. 编译、执行图与确定性** | 默认 `torch.compile` 融合 + **分段 CUDA Graph**，在动态 Attention 间隙拼合静态图 | 多档位预捕获 CUDA Graph + FlashInfer 融合路径，冷启动轻盈敏捷 | 自定义核 + JIT + `torch.compile` + CUDA Graph（含 padding/分段），精细面向 NVIDIA 调优 | NVIDIA 侧 **CUDA Graph** / 昇腾侧 **ACLGraph**；NVIDIA 平台提供 **`DEEPINFER_BATCH_INVARIANT=1`** 批次无关确定性推理 |
| **5. 底层算子与量化生态** | **量化生态最全**（FP8/AWQ/GPTQ/Marlin/GGUF/BnB），兼容 FA / FlashInfer / Triton | 深度集成 **FlashInfer** 与 Triton/CUTLASS，原生 FP8、MLA 块量化与 MoE 核跟进极快 | **NVIDIA 标杆**：Hopper FP8、Blackwell NVFP4、CUTLASS/cuBLASLt GEMM 与专属融合核常年领先 | 全栈自研闭环：**FlashMLA + DeepGEMM（FP4/FP8）+ DeepEP + DeepSelect + TileLang（近百核）** |
| **6. 并行范式与超大 MoE** | 支持 TP / PP / DP / EP 与 DBO（吸收自 DeepSeek 生态），通用多机扩展稳健 | 大规模 DP + EP、DeepEP 与双微批重叠跟进最快，是开源社区部署 DeepSeek MoE 的热门主力 | 深度压榨 NVIDIA NVLink / NVSHMEM 多卡 MoE 通信与低精度 Grouped GEMM | **原生 Attention DP + Balanced CP（镜像均衡）↔ MoE EP + EPLB 热专家冗余 + 双微批重叠** |
| **7. 投机、结构化与服务化边界** | 全家桶投机（Draft/N-gram/EAGLE/MTP）+ XGrammar/Outlines；**完整在线 HTTP 服务 + K8s 编排** | EAGLE-2/3 & MTP + **压缩 FSM 零开销结构化标杆**；**完整在线 HTTP 服务 + Mooncake/NIXL PD** | EAGLE-3 & MTP + 引导解码；**完整在线服务 + 内置 NIXL `cache_transceiver` PD 编排** | **DSpark 置信度动态投机** + 文法掩码；**聚焦核心离线引擎 + Rust `deepseek-recipe`，刻意剥离分布式 KV 池、PD 编排与集群 LB** |
| **8. 硬件与模型覆盖广度** | **广度第一**：新开源模型常年 Day-0 支持，覆盖 NVIDIA / AMD / TPU / 昇腾（`vllm-ascend`）等异构芯片 | 前沿旗舰模型（DeepSeek/Qwen3 等）适配极快；覆盖 NVIDIA / AMD / 部分国产 NPU | **仅限 NVIDIA GPU 矩阵**（Ampere 至 Blackwell）；主流旗舰模型稳健，冷门新架构偏慢 | **极度聚焦**：首发深度特化 DeepSeek-V4.1-Flash；**NVIDIA SM100（CUDA 13）与华为昇腾 950（CANN 9.2）双一线**，不主推 Hopper 等旧卡 |
| **9. 典型工程定位** | 企业级多模型推理中台“默认安全牌” | 高前缀复用 Agent、结构化输出与通用集群 MoE 先锋 | 纯 NVIDIA H100/B200 集群榨取主流模型极限延迟与吞吐 | 拥有 SM100 / 昇腾 950 集群的 DeepSeek 专属极限降本引擎 & 顶级 MoE 架构源码标杆 |

::: info 工程取舍：跨引擎基准横评必须守住“四同一”铁律
做内部选型压测时，任何跨引擎对比都必须严格对齐四个前提：**同一硬件与驱动/工具链栈、同一权重文件/量化格式/协议模板（如对齐 `deepseek-recipe`）、同一精确输入输出 token 分布与采样参数、同一延迟分位数（p50/p95/p99）与稳态 <a class="term-ref" href="/books/llm-inference/glossary#goodput" title="goodput：同时满足延迟（TTFT/ITL）SLO 与正确性约束的有效请求吞吐">有效吞吐</a>口径**。常见“伪对比”包括：用 FP4/FP8 的专精引擎对比 BF16 的通用引擎、未清空 <a class="term-ref" href="/books/llm-inference/glossary#prefix_caching" title="prefix caching：跨请求复用相同 prompt 前缀已计算出的 KV 缓存，跳过重复 prefill">前缀缓存</a>导致第二轮 TTFT 虚低、或者拿离线核心批引擎的裸吞吐直接对比含 HTTP 网关与流式反分词的在线服务。
:::

### 按业务场景快速决策选型指南

回到真实业务架构评审，你可以直接按以下八类典型场景快速收口技术选型：

| 业务场景特征 | 首选推荐 | 备选方案 | 核心决策理由 |
|---|---|---|---|
| **1. 多模型中台 / 频繁上线新开源模型 / 企业级标准平台** | **vLLM V1** | SGLang | 模型覆盖最广、Day-0 响应快、K8s `production-stack` 与 Prometheus 生态成熟，团队运维与排障成本最低 |
| **2. 多轮 Agent、Tree-of-Thought、复杂工具调用、重度 JSON/Schema 输出** | **SGLang** | vLLM V1 | RadixAttention 缓存感知调度 + 压缩 FSM 零开销结构化解码，高共享前缀与严格格式下综合吞吐优势最大 |
| **3. 纯 H100 / B200 集群、主流单一主力模型（Llama/Qwen 等）、压榨 FP8/NVFP4** | **TensorRT-LLM** | SGLang | NVIDIA 原厂针对 Hopper/Blackwell 深度打磨的 FP8/NVFP4 算子与执行计划，在大流量稳定模型上把卡压到极致 |
| **4. 存量 H100 / H200 / A100 集群部署 DeepSeek MLA / 超大稀疏 MoE 在线服务** | **SGLang** | vLLM V1 / TensorRT-LLM | SGLang 与 vLLM 在存量 Hopper/Ampere 卡上提供开箱即用的在线 API、MLA 吸收、DeepEP 与 PD 连接器支持 |
| **5. 拥有 SM100 或昇腾 950 集群、主力 DeepSeek-V4.1-Flash、大吞吐离线批推理 / 自建在线集群** | **DeepInfer**（配 `deepseek-recipe` + 外围编排） | SGLang / TensorRT-LLM | 吃透 CED + CSA2 + FP4 KV、SWA 有界重放、Balanced CP、EPLB 与 DSpark，且同步解锁昇腾 950 原生生产性能；前提是团队具备自建分布式 KV/PD/LB 能力 |
| **6. 多云异构硬件（含 AMD GPU、存量昇腾 910B 或其他国产 NPU 混合纳管）** | **vLLM V1**（配 `vllm-ascend` 等插件） | SGLang | vLLM 通过统一平台插件体系（见[第 20 章](chapter-20.md)）屏蔽多芯片差异，TensorRT-LLM 绑定 NVIDIA、DeepInfer 仅瞄准 SM100/950 双旗舰 |
| **7. 超大规模跨节点 PD 解耦 + 分布式共享 KV 池集群** | **SGLang / vLLM V1**（配 Mooncake/NIXL） | TensorRT-LLM（配 NIXL） / DeepInfer（自建外围） | 前三者开箱支持 NIXL/Mooncake 编排；若以 DeepInfer 作核心执行域，则需在外围自行对接 3FS/Mooncake 级 KV 池与路由 |
| **8. 极低并发交互式应用（代码补全、实时对话）或强化学习确定性 Rollout** | **TensorRT-LLM / SGLang**（开 EAGLE-3）或 **DeepInfer**（开 DSpark / Batch-Invariant） | vLLM V1（开 EAGLE-3） | 交互低延迟比拼目标模型上的 EAGLE-3 / DSpark 端到端 TPOT p95；需要跨批次严格数值可复现时重点关注 DeepInfer 的 `DEEPINFER_BATCH_INVARIANT=1` |

---

## 11.5 小结

如果说 vLLM V1、SGLang 与 TensorRT-LLM 共同确立了现代通用推理引擎的<strong>“加载期编译融合 + 图捕获 + 运行期迭代调度”</strong>底座，那么 DeepSeek 开源的 **DeepInfer** 则完整展示了当模型架构走向 700B+ 超稀疏 MoE、CED 编解码分离与 890 B/token 极致低比特压缩时，**模型原厂垂直协同**能把工程边界推到多远：

- 在**架构边界**上，它以 Rust 编写的 `deepseek-recipe` 死守协议与控制 Token 契约，以 C++ 零开销异步调度与五大自研算子栈（FlashMLA / DeepGEMM / DeepEP / DeepSelect / TileLang）吃透单域极限，同时果断剥离强耦合集群外围系统；
- 在**算法-系统协同**上，Balanced CP 镜像切分消灭长序列 1.75× 尾卡拖尾，EPLB + 双微批隐藏超稀疏 MoE 通信，SWA 有界重放（140 token）腰斩长输入解码器 Prefill，DSpark 以半自回归 Markov 头 + STS 校准置信度破解高并发投机算力争抢；
- 在**硬件生态**上，将华为昇腾 950（CANN 9.2）与 NVIDIA SM100（CUDA 13）置于同等 Day-0 原生地位，为超大规模国产算力落地树立了全新工程标杆。

单机与单域推理引擎的潜力全部拆透之后，要把这些引擎真正组装成扛住亿级日活、严守 TTFT/ITL 双红线且算清每一分钱账单的线上集群，我们必须补上 DeepInfer 刻意留给外围的那一半拼图。[下一章](chapter-12.md)将系统展开 **PD 解耦、Kubernetes 队列弹性扩缩容、单位 Token 经济学与多后端成本路由**。
