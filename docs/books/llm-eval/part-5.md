# 第五篇：企业业务落地与迭代闭环

<p class="chapter-summary">打通“私有黄金评测集 → 三大核心企业场景实战 → 离线 CI 与线上 Tracing 灰度飞轮 → 脚手架重构与 SFT / RLVR 后训练反哺”的完整工程闭环。</p>

## 本篇导览

公开基准最多帮团队缩小底座模型的候选圈，真正决定产品成败与团队迭代效率的，永远是**贴着自身业务痛点生长出来的私有评测体系与数据飞轮**。

本篇用四章把前十六章的方法论全部收束到企业真实生产现场：第 17 章系统阐述评测驱动开发（EDD），手把手构建从真实日志挖掘、能力/风险矩阵覆盖、Rubrics 细化到版本冻结轮换的业务黄金集；第 18 章端到端拆解**企业知识库 RAG**、**带工具与业务政策的客服/运维工单 Agent** 以及**内部研发代码 Copilot** 三大高频落地场景；第 19 章搭建 PR 冒烟 → 夜间全量回归 → 影子流量与灰度 A/B 的三级漏斗，并从线上采纳率、重生成、打断与工具回滚等隐式信号自动反哺离线用例；第 20 章作为全书与三部曲的总收官，建立**改脚手架（Harness Engineering）vs 改模型**的归因决策矩阵，打通失败轨迹安全流向 SFT / DPO / RLVR 后训练的工程红线，并展望可扩展监督、防隐藏能力（Sandbagging）与自适应考试前沿。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-eval/chapters/chapter-17">
    <div>
      <div class="part-card__num">CHAPTER 17</div>
      <div class="part-card__title">第 17 章 · 评测驱动开发：构建业务黄金评测集</div>
      <p class="part-card__desc">真实日志 Bad Case 挖掘、能力/风险分层矩阵、专家联合标注与 Rubrics 细化、对抗样本合成与版本轮换治理。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-18">
    <div>
      <div class="part-card__num">CHAPTER 18</div>
      <div class="part-card__title">第 18 章 · 三大高频企业业务实战拆解</div>
      <p class="part-card__desc">端到端拆解企业知识库 RAG、客服/运维工单 Agent、内部研发 Copilot 的数据集设计、判分校准、门槛与排障。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-19">
    <div>
      <div class="part-card__num">CHAPTER 19</div>
      <div class="part-card__title">第 19 章 · 离线 CI 闸门、线上 Tracing 与灰度飞轮</div>
      <p class="part-card__desc">PR 冒烟→夜间回归→影子与灰度 A/B 三级漏斗，挖掘线上隐式质量信号实现 Online-to-Offline 自动化沉淀。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-20">
    <div>
      <div class="part-card__num">CHAPTER 20</div>
      <div class="part-card__title">第 20 章 · 从评测到演进：脚手架、SFT 与 RLVR 闭环</div>
      <p class="part-card__desc">改脚手架 vs 改模型决策矩阵、失败轨迹向后训练安全转化与物理隔离红线，以及可扩展监督与防 Sandbagging 前沿。</p>
    </div>
  </a>
</div>
