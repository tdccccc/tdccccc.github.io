# 第四篇：国产芯片适配原理与方法

<p class="chapter-summary">跳出 CUDA 生态，以华为昇腾为主线系统掌握国产芯片软件栈、插件机制、CANN/AscendC、覆盖归因与算子迁移。</p>

## 本篇导览

本篇以华为昇腾 Ascend 为主线，按“先画地图 → 再看部署与插件 → 再钻 CANN/AscendC 底层 → 查覆盖与回退 → 做跨芯片迁移”的顺读顺序推进。

第 18 章建立四面墙 × 五层软件栈坐标系；第 19 章拆解昇腾环境链与 `vllm-ascend` 插件架构；第 20 章走完 AscendC 硬件流水与算子四环；第 21 章讲透算子覆盖率与四类回退定位；第 22 章系统梳理从 CUDA/Triton 到 Ascend 的六类语义差异。其他国产平台生态见[专题 E](/books/llm-inference/topics/domestic-ecosystems)。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-inference/chapters/chapter-18">
    <div>
      <div class="part-card__num">CHAPTER 18</div>
      <div class="part-card__title">第 18 章 · 国产芯片全景与软件栈地图</div>
      <p class="part-card__desc">以四面墙与五层软件栈建立国产芯片坐标系，对比平台插件与 FlagGems 统一算子层，附主流平台实填表。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-19">
    <div>
      <div class="part-card__num">CHAPTER 19</div>
      <div class="part-card__title">第 19 章 · 昇腾部署架构与 vllm-ascend 插件机制</div>
      <p class="part-card__desc">理顺昇腾版本咬合链、驱动→框架→插件三层诊断模型与 vllm-ascend 模块架构，对比 CUDA 关键差异。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-20">
    <div>
      <div class="part-card__num">CHAPTER 20</div>
      <div class="part-card__title">第 20 章 · CANN 分层与 AscendC 算子全链路</div>
      <p class="part-card__desc">打通 CANN 五层映射、TBE/AscendC 抽象、MTE2/VEC/MTE3 双缓冲流水线，沿 RMSNorm 走完算子四环。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-21">
    <div>
      <div class="part-card__num">CHAPTER 21</div>
      <div class="part-card__title">第 21 章 · 算子覆盖分析与回退定位方法</div>
      <p class="part-card__desc">区分 CPU 回退、图外执行、精度降级与静默回退，用三口径覆盖率、四象限法则与示范 Profiler 清单定位瓶颈。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/chapters/chapter-22">
    <div>
      <div class="part-card__num">CHAPTER 22</div>
      <div class="part-card__title">第 22 章 · 跨芯片算子迁移：从 CUDA / Triton 到 Ascend</div>
      <p class="part-card__desc">对照 GPU 与 Ascend 存储流水架构，逐条拆解六类 CUDA 假设失效点与小引擎/Triton 迁移思路。</p>
    </div>
  </a>
</div>
