# 第 7 章 万亿 Token 分布式数据处理基建

<p class="chapter-summary">把预训练配方真正落到百 TB 与万卡集群的硬核系统层：算清 100 TB WARC → 3T 净 Token 的 CPU、GPU、内存与对象存储全链路账单（$0.03–$0.12 / 1B tokens），横向对比 Parquet、Lance、WebDataset 与 Megatron IndexedDataset 介质选型，拆解 Datatrove、Ray Data、Spark 与 NeMo Curator 的瓶颈与容错，并落地确定性混洗、扩缩容精确续训与在线动态混配喂料。</p>

在小样本笔记本上跑通一份 Trafilatura 提取脚本或 MinHash 原型只需半小时，但要把同一套逻辑稳定、廉价、可复现地推过 **100 TB CommonCrawl WARC、数千万份 PDF 与万亿级 Token**，并让下游上千张 H100 训练卡永远保持 99% 满载不出现 Data Wait 饥饿，问题就彻底从“算法脚本”切换为**大规模分布式系统工程**。本章作为第二篇的收官，把预训练数据基建的资源账、存储格式、处理引擎与流式喂料机制彻底拆透。

---

## 7.1 100 TB WARC → 3T 净 Token 的全链路计算与 I/O 成本账本

在规划集群预算前，先把一笔具象的资源账算到小数点。以全书统一基准算例——处理 **100 TB 压缩 WARC 归档（解压后 ~350–400 TB HTML，含 ~25T 原始 Token）**、经全流水线提纯产出 **~3T 净训练 Token（~12 TB 未压缩纯文本 / ~3.5 TB Zstd Parquet）**——拆解各阶段真实资源消耗与系统瓶颈：

| 处理阶段 | 输入 → 输出体积 | 核心硬件瓶颈 | 估算资源消耗（单次全跑） | 参考云成本（Spot 基准） | 关键系统优化抓手 |
| --- | --- | --- | --- | --- | --- |
| **1. 解压 + HTML 解析 + 语种/启发** | 100 TB gz → ~25 TB Silver | CPU 解压与 DOM 解析；对象存储读带宽 | ~10,000–14,000 vCPU-hr；100 TB 读 I/O | **$350–$650** | 同区域对象存储免出网费；流式解压零本地落盘；单分片 256–512 MB 避小文件风暴 |
| **2. Exact + MinHash LSH 去重** | 25 TB → ~15 TB | **高内存节点 RAM 与全局 Shuffle 网络** | 128 台 256 GB RAM 节点跑 2–4 hr（~800 节点时） | **$450–$1,000** | 按 Band 分桶外排（External Merge Sort）；高基数热桶截断防长尾倾斜（Straggler） |
| **3. FastText / 110M 编码器打分** | 15 TB（~4T 候选）→ 3T 净 | FastText 吃 CPU；110M Encoder 吃 FP16 GPU | CPU ~2,500 vCPU-hr 或 GPU ~400–800 H100-hr | **$100**（CPU）或 **$800–$1,600**（GPU） | 动态长度分桶组 Batch（减少 50% Padding）；FP16/BF16 + FlashAttention 推理 |
| **4. 预分词 + 打包写出** | ~12 TB 文本 → ~6 TB uint16/32 | Tokenizer 多进程 CPU + 顺序写带宽 | ~2,000 vCPU-hr + 6 TB 对象存储写 | **$100–$200** | Rust `tokenizers` / `tiktoken` 并行化；直接按目标格式顺序落盘 |
| **全链路单 pass 合计** | **100 TB WARC → 3T 净 Token** | 异构混合（CPU + 高内存 + 轻量 GPU） | 总计（含 20% 容错重跑与临时存储） | **$1,200–$3,600** | **折合基准单价：$0.03–$0.12 / 1B tokens** |

这笔账揭示了三个最容易把新手团队坑惨的基建铁律：
1. **跨区出网费比计算本身贵几倍**：计算节点与对象存储必须严格**同云同区（Co-located）**。一旦跨可用区或跨云拉取 100 TB WARC，单是网络出口流量费（Egress Fee，约 $0.05–$0.09/GB）就会高达 **$5,000–$9,000**，瞬间反超整套洗数集群的 CPU/GPU 账单！
2. **百万小文件风暴（Small-File Storm）数值算例**：假设将 100 TB 语料存成 1 亿个平均 1 MB 的小文件，对象存储按千次 GET 请求收费（约 $0.0004 / 千次），单轮全扫仅 API 请求费就达 $400，且受限于单前缀 QPS 上限与每次建立 TLS 连接的几十毫秒握手延迟，有效吞吐会腰斩 80% 以上；而合并为 **20 万个 512 MB 标准分片**后，API 请求费降至不到 **$0.10**，且每台 Worker 均可稳定跑满 2–5 GB/s 的持续顺序读带宽。
3. **全局 Shuffle 是内存死穴**：真正最容易把集群跑崩的不是 GPU 打分，而是 <a class="term-ref" href="/books/llm-data/glossary#minhash_lsh" title="通过 b×r 频带桶碰撞召回近似重复文档的大规模模糊去重算法">MinHash + LSH</a> 的全网 Shuffle——只要一个高频模板桶聚集了百万篇文档，单台 Worker 就会 OOM 连环雪崩，必须靠分桶盐化（Salting）与桶容量上限兜底。

---

## 7.2 存储与流式格式选型：Parquet vs Lance vs WebDataset vs Megatron

不存在一种“通吃全链路”的万能数据格式。从 Silver 清洗分析到多模态随机抽检，再到万卡纯文本极限喂料，必须按读写访问模式分层选型：

| 格式介质 | 底层布局特征 | 顺序读吞吐 | 随机行查 / 列裁剪 | 最佳适用层级 | 致命短板与避坑点 |
| --- | --- | --- | --- | --- | --- |
| **Apache Parquet** | 列式压缩 + 行组统计（Zstd） | 高（数 GB/s） | 列裁剪极强；单行随机查极慢 | **Silver 清洗分析层**（元数据筛选、打分列追加、SQL 审计） | 读大块图像/视频 Blob 时行组解压膨胀严重；不宜直接做多模态随机喂料 |
| **Lance** | 现代列式 + 零拷贝随机索引 + 原生向量索引 | 极高 | **随机访问比 Parquet 快 100×+**；原生 ANN 检索 | **多模态与 Agent <a class="term-ref" href="/books/llm-data/glossary#data_lakehouse" title="面向多模态非结构化语料与 Agent 轨迹的分层存储管理架构">数据湖仓</a>**（图文/视频/交互排错、版本回滚） | 生态相对较新，极简纯文本预训练不如扁平二进制轻便 |
| **WebDataset / Mosaic MDS** | 顺序 TAR 或分片二进制流（对象存储原生） | **极高（贴近网卡线速）** | 不支持任意随机行查（MDS 支持分片级索引） | **大规模<a class="term-ref" href="/books/llm-data/glossary#streaming_dataset" title="将数据切分为顺序可读的二进制分片存于对象存储，训练节点按需异步预取与确定性混洗的架构">流式数据集</a>**（多模态与云原生直连对象存储训练） | 需严格控制单分片 64–512 MB，并用本地 NVMe 环形缓存平滑对象存储抖动 |
| **Megatron `.bin/.idx`** | 预分词连续 `uint16/uint32` 扁平阵列 + 偏移索引 | **极致（`mmap` 零拷贝、零 CPU 分词）** | $O(1)$ 任意文档偏移精准寻址 | **万卡纯文本预训练与退火终态喂料** | 强绑定单一词表（换 Tokenizer 需全量重制）；扩展元数据列不灵活 |

---

## 7.3 四大分布式处理引擎横评、瓶颈与容错设计

面对不同阶段的计算形态，四大主流开源引擎各占生态位，实践中往往**按任务特征串联混用，而非强求一套引擎打天下**：

| 引擎框架 | 核心执行模型 | 最强优势场景 | 主要短板与系统瓶颈 | 容错与断点续跑机制 |
| --- | --- | --- | --- | --- |
| **Datatrove** | 极简无中心分片并行（Python + 队列） | CommonCrawl WARC 解析、启发式、FastText 清洗 | 缺乏通用 SQL 算子；跨节点全局 Shuffle 需手写切桶 | 分片级 `.completed` 标志 + 原子写，天然适配 Spot 节点抢占 |
| **Ray Data** | **异构 CPU + GPU 流式 Actor 流水线** | OCR-VLM、110M 编码器打分、批改写合成、多模态预处理 | 大规模全网关系型 Shuffle 成熟度弱于 Spark | 自动流式背压防 OOM；失败 Task 级谱系重算 |
| **Apache Spark** | 成熟 DAG 批处理 + AQE 自适应 Shuffle | PB 级 SQL 元数据治理、MinHash 全局 Shuffle 与连通分量 | JVM 序列化重；与 PyTorch GPU 异步批推理协同笨重 | RDD/Shuffle 血缘重试 + AQE 自动拆分倾斜分区 |
| **NVIDIA NeMo Curator** | GPU 原生加速（RAPIDS cuDF + Dask-CUDA） | 富余 GPU 集群下的极速小时级 MinHash 与语义去重 | GPU 显存受限，单行超长文本易 OOM 需前置截断切分 | Dask 任务调度重试 + 分批检查点落盘 |

<figure class="book-figure">
  <img src="/figures/llm-data/distributed-data-infra.svg" alt="万亿 Token 分布式数据处理基建架构：对象存储、异构处理引擎、列式与流式格式及确定性在线混洗加载器" loading="lazy">
  <figcaption><span class="book-figure__label">图 7-1</span>10T+ 预训练数据基建四段式全链路：从对象存储原始分片出发，按任务特性路由至 CPU（Datatrove/Spark）与异构 GPU（Ray Data/NeMo Curator）引擎，落盘至分层列式/流式介质，最终经确定性混洗与动态权重喂料器零等待供给万卡训练集群。</figcaption>
</figure>

### 生产级容错与“毒丸样本”隔离铁律

在千节点连续运行数天的批处理任务中，**Spot 节点抢占与畸形坏样本崩溃是 100% 必然发生的常态**。任何万亿级管线上线前必须内建三条防线：
1. **幂等分片原子提交（Atomic Rename）**：Worker 先写入临时路径 `_tmp/<shard>.parquet`，全部校验通过后再执行原子重命名；即便节点在 99% 处被云厂商抢占，重启后只需重算该 256 MB 分片，绝不留下半截损坏文件污染下游。
2. **毒丸样本死信队列（Dead-Letter Queue, DLQ）**：针对触发正则回溯死循环、损坏 PDF 字节流或单行 100 MB 畸形 JSON 的文档，施以单条处理超时保护（如 5 秒强杀）与异常捕获，把毒丸 ID 与报错栈转存死信队列后继续推进，绝不让 1 条坏网页拖垮整片 1,000 核集群。
3. **异常留存率熔断与<a class="term-ref" href="/books/llm-data/glossary#data_lineage" title="记录从原始采集源、清洗脚本、过滤阈值到最终训练快照与模型权重的有向无环图">血缘 DAG</a>埋点**：实时统计每个分片在各环节的<a class="term-ref" href="/books/llm-data/glossary#yield_funnel" title="原始语料经过过滤与去重后最终进入训练集的端到端留存比例与损益账本">留存率</a>分布，一旦某批次丢弃率偏离历史均值 3 个标准差（例如编码配置错把 UTF-8 当 Latin-1 解码），立刻熔断报警而非闷头跑完三天产出废料。

---

## 7.4 确定性混洗、扩缩容精确续训与在线动态混配

洗好的 15T 数据终于进了训练集群，但 DataLoader 层的最后三道坎一旦失守，就会让千万美元级的分布式训练暗埋隐形内伤：

1. **<a class="term-ref" href="/books/llm-data/glossary#deterministic_shuffling" title="基于固定随机种子与分片/行索引映射实现的全局伪随机采样顺序，确保断点续训或扩缩容后既不漏看也不意外重复样本">确定性混洗（Deterministic Shuffling）</a>与弹性扩缩容精确续训**：千卡集群平均每 1–3 天就会因硬件故障重启，或中途从 512 卡弹性扩至 1,024 卡。若使用朴素 `DataLoader(shuffle=True)` 仅依赖进程局部随机数，重启或改变 Data Parallel World Size 后采样序会彻底打乱——部分数据被意外重复读 2–3 遍（直接诱发 Loss 尖刺与局部过拟合），另一些数据则永远被跳过！
   - **工业正解（双射全局置换 + 弹性游标快照）**：采用如 MosaicML Streaming / Megatron Stateful DataLoader 架构——通过确定性伪随机双射置换（如基于 `(seed, epoch)` 的分片内块置换或 Feistel 置换）为全量 $N$ 条样本定义全局唯一读取序 $\pi(0), \pi(1), \dots, \pi(N-1)$，每次保存模型 Checkpoint 时同步原子落盘**全局已消费样本游标快照**：

```json
{
  "global_step": 148000,
  "global_seed": 20260401,
  "domain_cursors": {
    "web_edu":   {"epoch": 1, "global_sample_idx": 482910400, "weight": 0.25},
    "code_repo": {"epoch": 2, "global_sample_idx": 119042880, "weight": 0.25},
    "math_syn":  {"epoch": 1, "global_sample_idx": 164201600, "weight": 0.30},
    "long_doc":  {"epoch": 1, "global_sample_idx":  38105600, "weight": 0.20}
  }
}
```

   重启后无论卡数从 512 变为 768 还是 1,024，每个 Rank 只需按新 World Size 与全局步号重新切分 `global_sample_idx` 步长即可精准接续，实现**一帧不漏、一帧不重、跨拓扑 100% 比特级可复现**。
2. **在线动态混配权重（Online Dynamic Mixing $w_m(t)$）**：绝不要在磁盘上把网页、代码、数学物理混合并复制成一份死板的 15T 混合文件！一旦切入第 6 章的<a class="term-ref" href="/books/llm-data/glossary#mid_training" title="预训练末段学习率衰减期显著上调数学、代码、长文档与合成数据配比的阶段">Mid-training 退火阶段</a>或中途发现某域过拟合想微调权重，物理重混意味着重写几十 TB 数据并浪费数天窗口。正确架构是**各域独立分桶存储，在流式 DataLoader 侧按可编程权重曲线 $w_m(t)$ 实时按比例抽样拼接**，实现零磁盘重物化的配方热切换。
3. **双缓冲异步预取消灭 GPU I/O 饥饿**：在每个计算节点部署本地 NVMe 环形缓存区与多进程异步预取线程，提前将未来 2–4 个 Shard 从对象存储拉取解压并钉在页锁定内存（Pinned Memory）中，死守 GPU 端 `Data Wait Time < 1%` 的单步耗时红线。

::: tip 绝不让高价 GPU 节点干 CPU 的脏活
一个高频反模式是在 8×H100 训练节点的 DataLoader 进程里实时执行正则清洗、长文本分词甚至实时解码 4K 视频帧——单卡每小时价值数美元，却常因宿主机 CPU 抢占导致 8 张 H100 整体 MFU 暴跌 15%–25%！**所有重计算预处理（解析、去重、分词、视频关键帧解码与缩放压缩）必须彻底前置到廉价 CPU 离线流水线固化落盘**，训练节点只做纯顺序读取、轻量打包与张量传输。
:::

::: warning 利用确定性索引实现 Loss Spike 五分钟精准溯源
预训练中途突发剧烈梯度爆炸或 Loss Spike 时，超过 60% 的罪魁祸首并非优化器超参，而是一条穿透过滤网的极端异常样本（如超长重复符号序列、损坏 UTF-8 或极低信息熵死循环）。依托确定性混洗与全局样本游标，工程团队可在 **5 分钟内按 `(step, global_batch_idx)` 精准反查出事发步的原始 `doc_id` 与来源 URL**，将其写入隔离黑名单并从前一个健康检查点无缝回滚续训。
:::

至此，第二篇的万亿级预训练与中期训练数据工程全链路宣告闭环——我们从百 TB 原始网页、论文与代码仓出发，亲手建起了高保真解析、过滤打分、四尺度去重、改写合成、退火扩窗与分布式流式基建的完整工业底座。但一个刚完成预训练与退火的基座模型，依然只是一头博学却难以驾驭的“原始巨兽”。从下一篇（第 8 章）开始，数据的评判哲学将发生 180 度翻转——**告别万亿 Token 的规模竞赛，进入以“少而精信噪比、能力树覆盖、复杂度筛选与 Long-CoT 拒绝采样”为核心的第三篇：后训练数据工程**。
