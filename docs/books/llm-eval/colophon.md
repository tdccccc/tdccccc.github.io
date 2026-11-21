# 来源、口径与许可

<p class="chapter-summary">说明本书在 Tdccccc's Atlas 三部曲中的定位、一手基准与论文引用原则、2026 年前沿口径边界，以及 CC BY 4.0 知识共享许可。</p>

## 一、定位与三部曲脉络

《LLM 与 Agent 评测：原理、基准与工程实践》是 **Tdccccc's Atlas** 的第三本系统技术专著，与第一本 [《LLM 推理工程：原理与方法》](/books/llm-inference/)、第二本 [《LLM 强化学习：原理与后训练实践》](/books/llm-rl/) 体例完全对称，共同构成<strong>「推理底座 × RL 后训练 × 评测闭环」</strong>工程三部曲：

- **第一本（推理底座）** 解决“跑得快、算清显存与延迟账”；
- **第二本（RL 后训练）** 解决“训得强、守住奖励与训练稳定性”；
- **第三本（评测闭环）** 解决“测得准、拆开模型与脚手架、落到企业业务并安全反哺后训练”。

全书刻意打破传统评测手册“大段罗列静态榜单”的写法，将 65% 的篇幅倾注在 **Agent 专项评测、可复现工程基建、联合帕累托分析与企业业务落地闭环**，同时在第一篇保留全部硬核统计推导、三个原生交互实验与可直接运行的 Python 工具代码。

---

## 二、资料选用与数字口径原则

1. **一手基准论文与官方文档优先**：所有公开基准（如 MMLU-Pro、GPQA Diamond、HLE、RULER、NoLiMa、LiveCodeBench、BFCL、$\tau$-bench / $\tau^2$-bench、SWE-bench Verified / Pro / Live、Terminal-Bench、GAIA、BrowseComp、OSWorld、WebArena、LoCoMo、LongMemEval 等）与开源框架（Inspect AI、lm-evaluation-harness、OpenCompass、VLMEvalKit、Promptfoo、DeepEval）均追溯至原始论文或仓库文档，集中归档于 [专题 A：核心评测基准与论文口径档案](/books/llm-eval/topics/benchmark-archive)。
2. **时间截点与前沿口径**：本书内容整理截至 **2026 年 10 月**。评测榜单排名与各旗舰模型具体得分迭代极快，因此正文侧重**不随具体模型型号过时的测量学原理、基准设计缺陷、判分校准与工程归因方法**；凡引用特定年份公开成绩时均附带测试口径与基线前提。
3. **教学算例与交互演示声明**：第 1–3 章交互实验组件及部分企业业务成本/延迟算例（如第 15 章帕累托表、第 18 章三类业务门槛）采用教学与工程代表性参数，用于建立数量级直觉，不对应任何特定闭源厂商的保密线上 SLA。
4. **统计符号统一**：全书严格遵循 [统计公式、检验方法与指标口径速查卡](/books/llm-eval/toolkit/metrics-and-stats)，避免 $\theta$（真实通过率）与 IRT 能力参数（统一记作 $\eta_m$）等跨社区符号冲突。

---

## 三、许可协议

本书全部正文、25 张原创机制矢量图、3 个交互实验组件与参考工具箱代码遵循 **[知识共享署名 4.0 国际许可协议（CC BY 4.0）](https://creativecommons.org/licenses/by/4.0/)** 共享。在保留署名与出处链接的前提下，欢迎用于团队内训、评测体系建设与二次改编。
