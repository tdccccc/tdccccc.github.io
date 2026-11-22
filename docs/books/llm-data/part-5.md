# 第五篇：Agent 数据工程（核心加厚）

<p class="chapter-summary">全书占比最高的核心高地（24% 篇幅）：从多轮 POMDP 统一轨迹 IR、精确 Loss Mask 与“环境即数据”出发，系统拆解 Tool/MCP、Coding/SWE、Deep Research/多模态 RAG、GUI/Computer-Use 四大专项数据工厂，以及轨迹去伪筛选、失败反事实修复、长程记忆与多智能体协作数据。</p>

## 本篇导览

Agent 数据工程是当前工业界公认最稀缺、技术壁垒最高的方向。静态文本语料几乎被挖尽，而真实多轮交互轨迹不仅嵌套了外部工具、文件系统、浏览器 DOM、屏幕截图与非确定性环境报错，还面临**环境难复现、假成功（Lucky Hack）毒化训练、以及动辄数万 Token 长轨迹的信用归因**等硬骨头。

本篇用六章重磅篇幅把 Agent 数据全链路拆透：第 15 章奠定 Trajectory IR、Token-level Loss Mask 与 **Environment-as-Data** 底座；第 16 章构建 MCP/API 工具依赖图、Stateful Mock 与用户模拟器多轮交互合成；第 17 章深入 Coding/SWE 与 Terminal 自动化容器镜像、Bug 注入与 Fail-to-Pass 数据工厂；第 18 章攻克 Deep Research 多跳研究与多模态企业 RAG 句级引用归因；第 19 章打通 GUI/Computer-Use 截图×A11y/DOM 对齐、UI Grounding 与逆向任务合成；第 20 章落脚轨迹筛选、失败分叉点反事实修复、Context Compaction、长期记忆与 Multi-Agent 协作数据。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-data/chapters/chapter-15">
    <div>
      <div class="part-card__num">CHAPTER 15</div>
      <div class="part-card__title">第 15 章 · Agent 轨迹全景、Trajectory IR 与环境即数据</div>
      <p class="part-card__desc">多轮状态转移建模、统一多模态轨迹 Schema、精确 Loss Mask 铁律与可断言沙箱环境资产化。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-16">
    <div>
      <div class="part-card__num">CHAPTER 16</div>
      <div class="part-card__title">第 16 章 · 工具调用、MCP 与多轮人机交互合成</div>
      <p class="part-card__desc">MCP Schema 清洗、Stateful Mock 模拟器、User Simulator 多轮追问、报错自恢复与权限确认轨迹。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-17">
    <div>
      <div class="part-card__num">CHAPTER 17</div>
      <div class="part-card__title">第 17 章 · Coding / SWE 与终端运维数据工厂</div>
      <p class="part-card__desc">PR/Issue 挖掘、Docker 环境自动构建、Bug 注入与 Fail-to-Pass 测试合成及多文件调试轨迹提纯。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-18">
    <div>
      <div class="part-card__num">CHAPTER 18</div>
      <div class="part-card__title">第 18 章 · Deep Research、多模态 RAG 与知识 Agent 数据</div>
      <p class="part-card__desc">多跳研究规划、跨多模态企业文档证据链合成、句级 Citation Grounding 与冲突/无证拒答样本。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-19">
    <div>
      <div class="part-card__num">CHAPTER 19</div>
      <div class="part-card__title">第 19 章 · GUI、Computer-Use 与跨端多模态操控数据</div>
      <p class="part-card__desc">Web/Desktop/Mobile 录屏、截图×A11y/DOM 双模态对齐、UI Grounding 坐标与逆向任务合成。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-data/chapters/chapter-20">
    <div>
      <div class="part-card__num">CHAPTER 20</div>
      <div class="part-card__title">第 20 章 · 轨迹筛选、反事实修复、长记忆与多智能体协作</div>
      <p class="part-card__desc">Lucky Hack 去伪、关键分叉点反事实修复与 Step-DPO、Context Compaction、跨会话记忆与 Sub-agent 委派。</p>
    </div>
  </a>
</div>
