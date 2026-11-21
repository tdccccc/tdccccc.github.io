# 第六篇：规模化训练系统与工程归因

<p class="chapter-summary">算法决定上限，系统决定你能不能稳定跑到上限：从 Rollout 长尾与显存账本，到训练-推理不一致修复、开源框架选型与 ScaleRL 排障手册。</p>

## 本篇导览

本篇直接与本站姊妹书 [《LLM 推理工程：原理与方法》](/books/llm-inference/) 汇合。在大模型 RL 中，高达 70%–85% 的墙钟时间消耗在推理引擎的 Rollout 生成上，而推理引擎（vLLM / SGLang）与训练框架（FSDP / Megatron-LM）的数值与路由差异，又成了百卡规模下训练崩溃的头号元凶。第 17 章手算长尾气泡与显存账本，梳理共卡/分离与同步/异步架构；第 18 章深入剖析训练-推理不一致与 MoE 路由抖动的全套修复工具（TIS、MIS、IcePop、R3、PR2、Mu-GRPO）；第 19 章横评七大主流开源 RL 框架；第 20 章以 ScaleRL 扩展规律收束，给出可直接落地的超参配置与 9 项监控指标排障归因树。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-rl/chapters/chapter-17">
    <div>
      <div class="part-card__num">CHAPTER 17</div>
      <div class="part-card__title">第 17 章 · RL 系统架构与显存/时间账本</div>
      <p class="part-card__desc">手算长尾气泡与四模型显存账，对比 Colocated/Disaggregated、权重同步与 Partial Rollout / PipelineRL。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-18">
    <div>
      <div class="part-card__num">CHAPTER 18</div>
      <div class="part-card__title">第 18 章 · 训练-推理不一致与 MoE 稳定性</div>
      <p class="part-card__desc">定位 π_train ≠ π_infer 根因，掌握 TIS/IcePop/Mu-GRPO、MoE 路由回放 R3/PR2 与精度工程权衡。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-19">
    <div>
      <div class="part-card__num">CHAPTER 19</div>
      <div class="part-card__title">第 19 章 · 主流开源 RL 框架横评与选型</div>
      <p class="part-card__desc">拆解 HybridFlow 等控制流抽象，对比 veRL、slime、AReaL、OpenRLHF、ROLL、NeMo-RL 与 TRL。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-rl/chapters/chapter-20">
    <div>
      <div class="part-card__num">CHAPTER 20</div>
      <div class="part-card__title">第 20 章 · ScaleRL 扩展规律与排障归因手册</div>
      <p class="part-card__desc">用 S 形扩展曲线区分提效与提上限技巧，沉淀核心超参数量级与 9 大监控指标排障归因树。</p>
    </div>
  </a>
</div>
