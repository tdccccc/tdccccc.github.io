# 第一篇：统计口径与判分校准底座

<p class="chapter-summary">先把评测这把“尺子”校准：建立统计显著性与最小可检测效应直觉，厘清 pass@k、pass^k 与 Arena 排名口径，攻克确定性验证器漏洞与 LLM-as-a-Judge 统计矫正，并筑牢人类金标与防污染防线。</p>

## 本篇导览

许多团队在模型选型、Prompt 迭代或后训练实验里踩的最大坑，并不是没有跑评测，而是**拿了一把有刻度偏差、而且肉眼看不出抖动幅度的尺子在做决策**。本篇用四章紧凑篇幅把评测测量学的硬核底座一次立稳：

第 1 章确立评测在选型、训练指南针（与《LLM 强化学习》RLVR 奖励互为镜像）和上线闸门中的三重角色，给出配对 Bootstrap、McNemar 检验、MDE 样本量账本与聚类标准误；第 2 章拆解似然指标与生成抽答的根本分歧，讲透 $\mathrm{pass@}k$、$\mathrm{maj@}k$、$\tau$-bench 可靠性指标 $\mathrm{pass}^k$ 以及 Bradley-Terry / Arena 风格控制；第 3 章覆盖确定性验证器漏洞与 LLM-as-a-Judge 六大偏见，导出工业级 **Rogan-Gladen 统计矫正公式**；第 4 章落地小样本人类金标校准协议、一致性指标（Krippendorff's $\alpha$ / Fleiss' $\kappa$）与全链路数据污染治理。

阅读时可随时对照 [统计公式、检验方法与指标口径速查卡](/books/llm-eval/toolkit/metrics-and-stats) 与 [最小可运行 Python 评测工具箱](/books/llm-eval/toolkit/reference-code)。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-eval/chapters/chapter-01">
    <div>
      <div class="part-card__num">CHAPTER 01</div>
      <div class="part-card__title">第 1 章 · 评测测量学与统计显著性</div>
      <p class="part-card__desc">三重角色与四大失效模式，配对 Bootstrap / McNemar 检验、MDE 样本量账本与聚类标准误（含交互实验）。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-02">
    <div>
      <div class="part-card__num">CHAPTER 02</div>
      <div class="part-card__title">第 2 章 · pass@k、pass^k 与 Arena 排名</div>
      <p class="part-card__desc">似然指标 vs 生成抽答分歧，无偏 pass@k 与连续可靠性 pass^k，Bradley-Terry 与风格控制（含交互实验）。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-03">
    <div>
      <div class="part-card__num">CHAPTER 03</div>
      <div class="part-card__title">第 3 章 · 判分器工程与 Judge 统计校准</div>
      <p class="part-card__desc">确定性验证器盲区、LLM Judge 三范式与六大偏见，用 Rogan-Gladen 公式从有偏评委还原真实通过率（含交互实验）。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-04">
    <div>
      <div class="part-card__num">CHAPTER 04</div>
      <div class="part-card__title">第 4 章 · 人类校准协议与数据污染防治</div>
      <p class="part-card__desc">小样本人类金标标注与盲测协议、Krippendorff's α / Fleiss' κ、三类数据污染检测与活基准治理。</p>
    </div>
  </a>
</div>
