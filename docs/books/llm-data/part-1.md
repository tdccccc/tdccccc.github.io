# 第一篇：数据第一性原理与度量底座

<p class="chapter-summary">先把大模型与 Agent 数据工程的“底层账本”算清楚：确立 Data-Constrained Scaling 与重复衰减直觉，拆解文本与多模态序列打包的底层 Token 账，并用小模型代理实验与全链路去污把住数据配方与防泄漏的底线。</p>

## 本篇导览

许多团队在启动预训练、后训练或 Agent 迭代时，习惯先写一堆抓取与清洗脚本，却忽略了最致命的前置问题：**新投入的数据到底能换来多少有效泛化收益？** 重复喂食 10 轮同一份语料、把多篇文档不加掩码硬拼在一起、或者在混入评测集泄漏样本的情况下宣称配方生效，都会让昂贵的百卡算力在虚假收益里空转。

本篇用三章紧凑篇幅确立全书的量化与度量底座：第 1 章导出 Data-Constrained Scaling 有效数据量 $D_{\text{eff}}$ 与洗数留存漏斗，建立“算力账 vs 数据成本账”联合视角；第 2 章深入文本分词生育率、图像/视频/音频多模态 Token 密度、Document Packing 块内掩码与模板静默毒化坑；第 3 章落地低成本小模型 Proxy 寻优（Micro-annealing / DoReMi / RegMix）与 TB/PB 级训练侧全模态去污红线。

阅读时可随时对照 [核心公式、数据账本与成本速查卡](/books/llm-data/toolkit/formulas-and-ledgers) 与 [最小可运行 Python 数据工具箱](/books/llm-data/toolkit/reference-code)。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-data/chapters/chapter-01">
    <div>
      <div class="part-card__num">CHAPTER 01</div>
      <div class="part-card__title">第 1 章 · 数据决定上限：Scaling Law 与有效数据账本</div>
      <p class="part-card__desc">Chinchilla vs 过训练、Data-Constrained Scaling 重复衰减、留存漏斗与全生命周期数据蓝图（含交互实验）。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-02">
    <div>
      <div class="part-card__num">CHAPTER 02</div>
      <div class="part-card__title">第 2 章 · 分词、多模态编码序列与样本打包账本</div>
      <p class="part-card__desc">文本 Fertility 账、图/视频/音频 Token 密度、Intra-doc Attention Masking、FIM 与模板静默毒化排雷。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-03">
    <div>
      <div class="part-card__num">CHAPTER 03</div>
      <div class="part-card__title">第 3 章 · 数据价值评估、配比寻优与训练侧去污红线</div>
      <p class="part-card__desc">小模型 Proxy 与 Micro-annealing 寻优、质量/多样性/难度探针，以及文本与跨模态大规模防泄漏去污。</p>
    </div>
  </a>
</div>
