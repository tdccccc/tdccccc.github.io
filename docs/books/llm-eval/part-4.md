# 第四篇：评测基建、帕累托与误差归因

<p class="chapter-summary">把评测从“手搓脚本跑一次”升级为“可复现、抗抖动、算清 ROI、能指导排障”的工业级测量基础设施。</p>

## 本篇导览

哪怕题目设计得再精妙，一旦落地到工程执行层，依然有无数隐形陷阱能把评测分数打得面目全非：换了一个推理后端就悄悄丢了对话模板里的系统角色换行；线上搜索接口某天限流返回 429 却被记成模型答错；只看最高准确率选了思考 2 万 token 的模型，上线后账单和 P95 延迟双双爆表；或者跑完一轮评测只丢出一句“准确率 64%”，谁也不知道接下来该改哪一行代码。

本篇四章专注评测系统工程本身：第 13 章拆解现代评测 Harness 的六层模块、缉拿潜伏的 5 个“分数刺客”，并横向评测 Inspect AI、lm-evaluation-harness、OpenCompass、VLMEvalKit、Promptfoo 与 DeepEval；第 14 章深入高并发 Docker / MicroVM 沙箱池、HTTP 录制回放代理以及 `infra_error` 与 `model_failure` 的严格隔离；第 15 章与《LLM 推理工程》紧密联动，建立 **质量 × 成本 × 延迟联合帕累托前沿**；第 16 章给出可落地的 Open Coding 抽样编码法、Agent 七大根因失败谱系以及评审级评测报告范式。

## 本篇章节

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-eval/chapters/chapter-13">
    <div>
      <div class="part-card__num">CHAPTER 13</div>
      <div class="part-card__title">第 13 章 · 评测 Harness 架构与开源框架选型</div>
      <p class="part-card__desc">六层 Harness 模块、潜伏的 5 个分数刺客，以及 Inspect AI / lm-eval / OpenCompass / VLMEvalKit / Promptfoo / DeepEval 横评。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-14">
    <div>
      <div class="part-card__num">CHAPTER 14</div>
      <div class="part-card__title">第 14 章 · 沙箱隔离、录制回放与确定性治理</div>
      <p class="part-card__desc">Docker / MicroVM 快照池、只读测试挂载、HTTP/API 录制回放代理与 infra_error / model_failure 严格拆分。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-15">
    <div>
      <div class="part-card__num">CHAPTER 15</div>
      <div class="part-card__title">第 15 章 · 质量 × 成本 × 延迟联合帕累托评测</div>
      <p class="part-card__desc">联动《LLM 推理工程》，以 Accuracy vs $/Task 与 E2E P95 评估不同底座、量化档位、思考预算与脚手架的真实 ROI。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-eval/chapters/chapter-16">
    <div>
      <div class="part-card__num">CHAPTER 16</div>
      <div class="part-card__title">第 16 章 · 系统化误差分析、失败谱系与报告规范</div>
      <p class="part-card__desc">Open Coding 50–100 条轨迹编码法、Agent 七大根因失败谱系，以及面向架构与上线评审的标准报告模板。</p>
    </div>
  </a>
</div>
