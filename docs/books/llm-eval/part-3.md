# 第三篇：Agent 评测专项

<p class="chapter-summary">全书最核心的实战高地：从单轮问答跃迁到多轮环境交互，建立终态×轨迹×环境×边界的四层评测框架，逐一攻克工具调用与 MCP、Coding/SWE、Deep Research/RAG、GUI、长期记忆与多智能体协同。</p>

## 本篇导览

过去两年里，大模型应用已经从“一次输入、一段文本”全面转向“自主规划、调用工具、读写代码、操作界面、跨会话记忆与多智能体协作”。但评测方法一旦沿用单轮 QA 的思路，就会立刻失灵：同一套模型换个脚手架分数能差 20 个百分点；终态没变但轨迹里删库重来；网页或数据库不可复现；用户模拟器悄悄把答案剧透给 Agent。

本篇用五章把现代 Agent 评测的核心战场逐一打透：第 8 章提出四层第一性框架并给出一套严谨的**模型与脚手架控制变量解耦实验法**；第 9 章深入 BFCL、动态 MCP 编排、$\tau$-bench / $\tau^2$-bench 政策遵从与数据库终态哈希，以及用户模拟器信度治理；第 10 章剖析 SWE-bench 演进谱系、Terminal-Bench 与“改测试作弊”审计；第 11 章把 Deep Research 与复杂 RAG 的检索层和生成层彻底解耦，并量化长报告的引用可核验率；第 12 章攻克 GUI 桌面与 DOM 终态判定、跨会话长期记忆更新与冲突覆盖，以及多智能体通信税与关键路径步数。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-eval/chapters/chapter-08">
    <div>
      <div class="part-card__num">CHAPTER 08</div>
      <div class="part-card__title">第 8 章 · Agent 评测第一性框架与脚手架解耦</div>
      <p class="part-card__desc">五大范式断裂，终态×轨迹×环境状态×成本安全四层框架，以及控制变量拆解模型与 Scaffold 各自贡献。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-09">
    <div>
      <div class="part-card__num">CHAPTER 09</div>
      <div class="part-card__title">第 9 章 · 工具调用、MCP 与多轮用户交互</div>
      <p class="part-card__desc">BFCL AST 与拒调测试、动态 MCP 发现与错误自愈、τ-bench / τ²-bench 数据库终态校验与用户模拟器防泄题。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-10">
    <div>
      <div class="part-card__num">CHAPTER 10</div>
      <div class="part-card__title">第 10 章 · Coding / SWE 与终端执行 Agent</div>
      <p class="part-card__desc">SWE-bench Full→Verified→Pro/Live 演进、Terminal-Bench 终态断言、依赖腐化与“改测试作弊”防线及补丁质量评估。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-11">
    <div>
      <div class="part-card__num">CHAPTER 11</div>
      <div class="part-card__title">第 11 章 · Deep Research、RAG 与长报告工作流</div>
      <p class="part-card__desc">GAIA / BrowseComp 多跳检索、RAG 检索层（Recall/MRR/NDCG）与生成层解耦归因、引用可核验率与多维 Rubrics。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-12">
    <div>
      <div class="part-card__num">CHAPTER 12</div>
      <div class="part-card__title">第 12 章 · GUI 操控、长期记忆与多智能体协同</div>
      <p class="part-card__desc">OSWorld / WebArena / AndroidWorld 终态校验、LoCoMo / LongMemEval 冲突记忆测试、多智能体通信税与关键路径步数。</p>
    </div>
  </a>
</div>
