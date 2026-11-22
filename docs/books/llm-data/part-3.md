# 第三篇：后训练数据工程（SFT / 偏好 / RLVR）

<p class="chapter-summary">面向 [《LLM 强化学习》](/books/llm-rl/) 的直接燃料供应篇：彻底跳出“盲目堆百万指令”的误区，系统掌握少而精 SFT 与 Long-CoT 冷启动构造、On-policy 偏好与高区分度 Rubric 标注工厂、RLVR 甜点区可验证题库，以及多任务负迁移与过度拒绝的配比博弈。</p>

## 本篇导览

如果说预训练决定模型的知识底蕴与世界表征，后训练数据则决定这些潜能能否被干净地唤醒为可控的指令遵循、深度推理与安全边界。在这一阶段，数据的评判标准从“规模与覆盖”彻底切换为**信噪比、复杂度分布与验证器零作弊**。

第 8 章剖析 SFT 的本质作用，落地能力分类树（Taxonomy）、质量×复杂度二维筛选与 Long-CoT 拒绝采样冷启动；第 9 章深入 On-policy vs Off-policy 偏好对构造、长度与奉承偏置清洗、开放任务 Rubric 原子细则与人类专家标注工厂质检；第 10 章聚焦 RLVR 核心壁垒，构建数学/编程/逻辑可验证题库与 Pass@k 甜点区动态课程池；第 11 章拆解多任务负迁移跷跷板、精准拒绝与反过度拒绝配方以及多专家蒸馏数据整合。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-data/chapters/chapter-08">
    <div>
      <div class="part-card__num">CHAPTER 08</div>
      <div class="part-card__title">第 8 章 · SFT 指令数据：多样性、复杂度与长思维链</div>
      <p class="part-card__desc">少而精信噪比法则、能力分类树与 DEITA 二维筛选、强模型蒸馏与 Long-CoT 拒绝采样清洗。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-09">
    <div>
      <div class="part-card__num">CHAPTER 09</div>
      <div class="part-card__title">第 9 章 · 偏好数据、评分细则与人类专家标注工程</div>
      <p class="part-card__desc">On-policy 偏好去偏、高区分度 Rubric 原子细则编写、金标埋点质检、分歧仲裁与标注成本账。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-10">
    <div>
      <div class="part-card__num">CHAPTER 10</div>
      <div class="part-card__title">第 10 章 · RLVR 提示词库与可验证任务数据工厂</div>
      <p class="part-card__desc">Prompt + 抗作弊 Verifier 生产工厂、防记忆改写、单测与符号验证接入及 Pass@k 甜点区课程池。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-11">
    <div>
      <div class="part-card__num">CHAPTER 11</div>
      <div class="part-card__title">第 11 章 · 多任务混配、负迁移治理与安全对齐数据</div>
      <p class="part-card__desc">通用/推理/代码/长文本混配跷跷板归因、安全边界与防过度拒绝数据配方、多专家蒸馏整合。</p>
    </div>
  </a>
</div>
