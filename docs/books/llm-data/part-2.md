# 第二篇：预训练与中期训练数据工程

<p class="chapter-summary">深入万亿级预训练与退火阶段的数据工业流水线：从 WARC 原始网页、论文 PDF 与代码仓的高保真解析起步，依次攻克启发式与模型打分过滤、MinHash/Suffix/语义多尺度去重、教科书改写与 Mid-training 退火配方，最终落到 10T+ 分布式基建账本。</p>

## 本篇导览

预训练数据工程的本质是在百 TB 级别的噪声海洋里做“工业级冶金”：原始 CommonCrawl 网页中真正高信息密度的教育、技术与推理语料往往不足 15%，且提取器、去重阈值与末段退火配方的微小差异，就会在千亿参数规模下被放大为跨代的能力差距。

第 4 章拆解预训练数据源谱系与 HTML / PDF / 代码仓库级高保真解析管线；第 5 章剖析从 C4/Gopher 启发式规则到 FineWeb-Edu / DCLM 分类器打分，以及 Exact / MinHash LSH / Suffix Array / SemDeDup 四级去重引擎的精度与内存权衡；第 6 章讲透“网页见顶”后的教科书化改写合成、最后 5%–10% 的 Mid-training 退火跃迁以及 128K–1M 长上下文数据构造；第 7 章算清 10T+ Token 批处理的集群 I/O 账，横评 Datatrove、Ray Data、Spark 与 NeMo Curator 及确定性流式加载机制。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-data/chapters/chapter-04">
    <div>
      <div class="part-card__num">CHAPTER 04</div>
      <div class="part-card__title">第 4 章 · 预训练数据源谱系与高保真解析管线</div>
      <p class="part-card__desc">WARC vs WET 差异、HTML/PDF 公式表格抽取、仓库级代码拼接与原始数据冷热分层存储账本。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-05">
    <div>
      <div class="part-card__num">CHAPTER 05</div>
      <div class="part-card__title">第 5 章 · 大规模过滤、模型打分与多尺度去重</div>
      <p class="part-card__desc">启发式规则误杀分析、轻量分类器打分过滤与 Exact / MinHash LSH / Suffix / SemDeDup 四级引擎（含交互实验）。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-06">
    <div>
      <div class="part-card__num">CHAPTER 06</div>
      <div class="part-card__title">第 6 章 · 预训练改写合成与 Mid-training 退火配方</div>
      <p class="part-card__desc">教科书化与问答重塑合成、Decay 阶段高密度退火机制，以及长上下文聚类与跨文档依赖构造。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-07">
    <div>
      <div class="part-card__num">CHAPTER 07</div>
      <div class="part-card__title">第 7 章 · 万亿 Token 分布式数据处理基建</div>
      <p class="part-card__desc">CPU/I/O 吞吐账、Parquet/Lance/WebDataset 选型、Datatrove/Ray Data/NeMo Curator 横评与确定性混洗。</p>
    </div>
  </a>
</div>
