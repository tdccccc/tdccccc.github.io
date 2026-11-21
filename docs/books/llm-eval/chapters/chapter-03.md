# 第 3 章 判分器工程与 LLM-as-a-Judge 统计校准

<p class="chapter-summary">系统拆解确定性验证器（SymPy、AST/JSON Schema 与 EvalPlus 强化单测）的隐蔽漏洞，梳理 LLM-as-a-Judge 三范式与六大偏见治理策略，并完整推导 Rogan-Gladen 统计矫正公式、Delta 法方差传播及 Youden 指数警戒线。</p>

第 1 章把观测分数的判分器误差记作 $\delta_{\text{judge}}$。在实际工程里，这往往是整个评测体系中**最隐蔽也最具破坏力的偏差源**——测试题挑得再好，如果裁判本身带着漏洞或系统偏见，模型和脚手架就会在不知不觉中向裁判的弱点演进。本章建立判分器工程的分层铁律：**凡是能程序化验证的，绝不交给大模型；必须启用 LLM-as-a-Judge 时，先做六大偏见工程减偏，再用小样本人类金标做 Rogan-Gladen 统计反演**。

---

## 3.1 确定性验证器工程：从 SymPy 到 EvalPlus 测试漏洞

<a class="term-ref" href="/books/llm-eval/glossary#deterministic_verifier" title="通过数学符号等价化简、AST/JSON Schema 校验、单元测试或环境终态给出客观判分的程序化裁判">确定性验证器</a>零随机性、零调用成本、可直接复用为 RLVR 训练奖励，但“确定性”绝不等于“没漏洞”。工业级验证器有三类高频翻车现场：

1. <strong>数学符号等价（SymPy 管线与防超时）</strong>：简单字符串匹配会把 `\frac{1}{2}`、`0.5`、`2^{-1}` 或 `(x+1)^2` 与 `x^2+2x+1` 误判为错（制造大量假阴性，严重压低推理模型得分）。工程标准做法是构建三级流水线：**LaTeX 规范化与提取**（`latex2sympy2` 清洗单位、千分位与 `\boxed{}`）→ **符号差值化简**（检验 `simplify(pred - gold) == 0`）→ **多点随机数值代入兜底**（应对三角/反常积分难以符号化简的情形）。**生死红线**：必须在独立子进程中对 SymPy `simplify` 强制施加 1–2 秒超时保护，否则模型吐出一个高阶嵌套幂式就能让整个评测 Worker 死锁挂起！
2. <strong>结构化输出与代码静态校验（AST / JSON Schema）</strong>：对工具调用、SQL 生成与结构化抽取任务，优先执行严格 JSON Schema（类型、必填字段、枚举值与数值范围）与 SQL/Python AST 等价校验；在 SQL 评测中，更进一步以“在沙箱数据库上执行并比对规范化结果集”替代脆弱的文本匹配，允许合法的不同 `JOIN` 或子查询写法通过。
3. **EvalPlus 揭露的单元测试漏洞**：代码基准的假阳性往往来自单测太薄。Liu 等人（2023，**EvalPlus**）指出，经典 HumanEval 平均每题仅 7.7 个测试用例，MBPP 甚至只有 3 个！通过 LLM 生成 + 变异模糊测试（Mutation Fuzzing），EvalPlus 将测试集分别扩充 <strong>80 倍（HumanEval+）</strong> 与 <strong>35 倍（MBPP+）</strong>，补充了空输入、负值、极值溢出、浮点精度与时间复杂度边界用例。结果令人震惊：几乎所有主流大模型在强化单测下的通过率**出现明显下滑**（`pass@1` 降幅最高达 19.3%，`pass@k` 降幅最高达 28.9%）——此前看似“通过”的大量代码不过是侥幸绕过了稀疏断言。

| 验证器类型 | 典型漏洞 / 误判来源 | 误差方向 | 工业级加固措施 |
| --- | --- | --- | --- |
| **SymPy 数学验证** | LaTeX 格式差异、嵌套指数导致 `simplify` 挂死 | 假阴性 + Worker 崩溃 | 三级管线（规范化 → 符号化简 → 多点数值兜底）+ 2s 子进程强杀 |
| **JSON / AST 校验** | 字段顺序敏感、宽松类型转换掩盖 Schema 违规 | 假阴性或假阳性 | 严格 `additionalProperties: false` + 规范化 AST 等价树比对 |
| **代码单元测试** | 边界输入缺失、未限复杂度、允许硬编码查表 | 严重假阳性（刷分漏洞） | 变异测试扩充边界集（EvalPlus 范式）+ CPU/内存限额 + 随机输入 |
| **Agent 终态断言** | 仅查目标字段，未检查误删/未授权副作用 | 隐性假阳性 | 全量状态哈希 Diff + 否定断言（确认无关记录未被篡改） |

::: tip 隐藏边界用例设计清单
自建代码或 Agent 确定性验证器时，务必覆盖五类反作弊断言：(1) 空集/单元素/极值输入；(2) 时间与内存上限（拦截 $O(n^2)$ 暴力解）；(3) 随机化防硬编码输入（拦截 `if x == 42: return 7` 式刷题作弊）；(4) 副作用与环境干净度检查（防止修改测试脚本或环境变量）；(5) 否定断言（确认未被授权删除或篡改的文件保持原哈希）。
:::

---

## 3.2 LLM-as-a-Judge 三范式与六大偏见治理

遇到摘要撰写、深度研究报告、客服共情沟通或复杂多步推理归因时，确定性规则鞭长莫及，必须引入<a class="term-ref" href="/books/llm-eval/glossary#llm_as_a_judge" title="使用强语言模型按绝对分、两两对比或评分细则对开放式输出进行自动化判分的范式">LLM-as-a-Judge</a>。三种主流范式的成本与适用边界截然不同：

| 评判范式 | 核心机制 | 比较复杂度 | 优势与核心短板 | 最佳适用场景 |
| --- | --- | --- | --- | --- |
| <strong>Pointwise（单点打分）</strong> | 对单条输出给 1–5 分或 Pass/Fail | $O(M)$ | 成本低、易做跨版本纵向曲线；易出现分数聚类（80% 扎堆 4/5 分）与漂移 | CI 回归监控、大规模日志质量巡检 |
| <strong>Pairwise（成对盲比）</strong> | 并排展示 A 与 B，判胜/负/平 | $O(M^2)$ 或 $O(M\log M)$ | 细微质量辨别力最强、与人类偏好相关性高；位置偏见重、难给绝对门槛 | 模型选型终审、生成 Arena BT 排名 |
| <strong>Rubric-based（细则拆解）</strong> | 将任务拆成 $K$ 条原子核查项逐条判二值 | $O(M \cdot K)$ | **信噪比最高**、可定位具体失分维度、易复用为 RL 细则奖励；前期撰写成本高 | 企业黄金集、Deep Research、复杂 Agent 轨迹 |

### 六大经典评委偏见与工程对策

大量实证研究（Zheng 等，2023 MT-Bench；Wang 等，2024）表明，未经治理的 LLM 裁判普遍存在六类系统性<a class="term-ref" href="/books/llm-eval/glossary#judge_biases" title="LLM-as-a-Judge 常见的位置、冗长、自我偏好、奉承权威、排版与分数聚类六类系统误差">评委偏见（Judge Biases）</a>，工程落地时必须逐项上锁：

1. <strong>位置偏见（Position Bias）</strong>：Pairwise 评判时系统性偏爱排在第一位（或第二位）的回复，换位翻转率常高达 15%–35%。**对策**：强制执行<strong>双向位置交换（Bidirectional Swap）</strong>——同时跑 `(A, B)` 与 `(B, A)` 两次，仅当两次胜负一致时判胜，翻转不一致一律记作平局（Tie）或转交人工/更强裁判。
2. <strong>冗长偏见（Verbosity Bias）</strong>：哪怕多出来的段落全是车轱辘话，裁判也倾向给字数更长的回复高分。**对策**：在 Rubric 中显式加入“冗余扣分项”；Pairwise 对比时尽量控制候选输出长度预算或做 Style Control 协变量剥离。
3. <strong>自我偏好 / 同族偏见（Self-Preference）</strong>：模型天然赋予自身或同族模型生成的低困惑度文本更高评分（偏幅可达 5%–10%）。**对策**：严禁“自己判自己”——采用<strong>跨模型族评审团（Cross-Family Panel）</strong>（至少跨两个独立研发家族取多数投票），并剥离一切模型身份署名。
4. <strong>奉承与权威偏见（Sycophancy & Authority）</strong>：盲信语气笃定、夹杂术语或编造参考文献的错误答案。**对策**：始终提供<strong>参考答案或检索证据（Reference-Guided Judging）</strong>，禁止裁判仅凭参数记忆做无依据事实裁定。
5. <strong>格式与排版偏见（Format Bias）</strong>：过度奖励 Markdown 标题、加粗与 Emoji。**对策**：在进入内容判分前清洗非必要修饰排版，将“事实正确性”与“表达可读性”拆成独立细则分别汇报。
6. <strong>分数锚定与聚类（Anchoring & Central Clustering）</strong>：在 1–10 分宽量表上，裁判几乎只打 7 或 8 分，失去区分度。**对策**：优先采用**二值 Pass/Fail** 或 **3–4 档锚定量表**（每一档配具体正反例）；且强制使用<strong>证据先行（Evidence-First / CoT-before-Verdict）</strong>输出结构，确保 JSON Schema 键序严格遵循以下因果流：

```json
{
  "evidence_quotes": ["先从待测回复与参考资料中逐字摘录关键句"],
  "rubric_checks": [{"id": "R1_factual", "passed": true, "note": "数值与参考一致"}],
  "defect_summary": "明确列出所有事实错误或约束违背，再做综合权衡",
  "verdict": "PASS"
}
```

把 `verdict` 放在最后一个字段并非形式主义：自回归模型一旦先吐出 `PASS`，后续推理就会退化为为既定结论辩护的事后合理化；强迫先引证、再核查、最后下判，可将复杂 Rubric 判分一致性稳定拉高 5–12 个百分点。

<figure class="book-figure">
  <img src="/figures/llm-eval/verifier-and-judge-calibration.svg" alt="确定性验证器、LLM Judge 六偏见缓解与 Rogan-Gladen 统计校准全链路架构" loading="lazy">
  <figcaption><span class="book-figure__label">图 3-1</span>判分器工程全链路：优先走确定性验证轨道；开放式任务经 LLM Judge 与六偏见滤网得到原始分 p̂_raw 后，结合独立人类金标集的 (q₁, q₀) 执行 Rogan-Gladen 无偏反演与 Youden 红绿灯拦截。</figcaption>
</figure>

---

## 3.3 评委自身评测与 Rogan-Gladen 统计矫正完整推导

即便把上述六项工程减偏全部做足，LLM Judge 依然不是完美的真值神谕——它仍然存在假阳性（宽容漏杀）与假阴性（误杀好答案）。把一个有偏裁判跑出来的原始通过率 $\hat p_{\text{raw}}$ 直接当成真实通过率 $\theta$ 上报，无异于拿一把零点没归零的体重秤报体重。

### 观测混叠关系与 Rogan-Gladen 反演公式

记人类专家金标判定为 $Y \in \{0, 1\}$，待测模型在评测集上的**真实通过率**为 $\theta = P(Y = 1)$；自动化评委的二值判定为 $\hat Y \in \{0, 1\}$。在独立的人类金标校准集（包含 $m_1$ 条真实正例与 $m_0$ 条真实负例，采集协议见第 4 章）上，我们可预先测得评委的两项基础诊断参数：
- <strong>灵敏度（TPR）</strong>：$q_1 = P(\hat Y = 1 \mid Y = 1)$，评委把真对的样本判对的概率；
- <strong>特异度（TNR）</strong>：$q_0 = P(\hat Y = 0 \mid Y = 0)$，评委把真错的样本拦下来的概率（假阳性率 $\mathrm{FPR} = 1 - q_0$）。

对评测集上观测到的评委原始通过率 $p_{\text{raw}} = P(\hat Y = 1)$ 应用全概率公式，立得经典线性混叠方程：

$$
p_{\text{raw}} = \theta\,q_1 + (1 - \theta)(1 - q_0) = \theta\,(q_1 + q_0 - 1) + (1 - q_0)
$$

记 $J = q_1 + q_0 - 1$ 为 **Youden 指数**（衡量评委超越随机瞎猜的净辨别力）。只要 $J > 0$，将上式关于 $\theta$ 反解并裁剪到合法概率区间 $[0, 1]$，即得到由流行病学引入大模型评测的<a class="term-ref" href="/books/llm-eval/glossary#rogan_gladen" title="利用评委灵敏度 q₁ 与特异度 q₀ 对有偏观测通过率进行无偏还原的经典统计矫正公式">Rogan-Gladen 矫正估计量</a>（Rogan & Gladen, 1978；Lee 等, 2025，`arXiv:2511.21140`）：

$$
\hat\theta_{\text{RG}} = \operatorname{clip}_{[0, 1]}\!\left(\frac{\hat p_{\text{raw}} + \hat q_0 - 1}{\hat q_1 + \hat q_0 - 1}\right)
$$

### Delta 法方差传播：揭示“人类校准集瓶颈”

真实工程中，$\hat p_{\text{raw}}$ 来自规模为 $N$ 的待测集，而 $\hat q_1, \hat q_0$ 本身也是从有限人类校准集（$m_1, m_0$）估计出来的随机量！将 $\hat\theta_{\text{RG}} = g(\hat p_{\text{raw}}, \hat q_1, \hat q_0)$ 对三个独立估计量求一阶偏导：

$$
\frac{\partial g}{\partial p} = \frac{1}{J}, \qquad
\frac{\partial g}{\partial q_1} = -\frac{p + q_0 - 1}{J^2} = -\frac{\theta}{J}, \qquad
\frac{\partial g}{\partial q_0} = \frac{J - (p + q_0 - 1)}{J^2} = \frac{1 - \theta}{J}
$$

利用三个独立二项比例的方差与一阶 Delta 法，得到包含**全链路不确定性**的近似方差公式（与[公式速查卡](/books/llm-eval/toolkit/metrics-and-stats)完全一致）：

$$
\widehat{\mathrm{Var}}(\hat\theta_{\text{RG}}) \approx \frac{1}{(\hat q_1 + \hat q_0 - 1)^2}\Bigg[\underbrace{\frac{\hat p_{\text{raw}}(1 - \hat p_{\text{raw}})}{N}}_{\text{评测集抽样方差}} \;+\; \underbrace{\hat\theta_{\text{RG}}^2\frac{\hat q_1(1 - \hat q_1)}{m_1} + (1 - \hat\theta_{\text{RG}})^2\frac{\hat q_0(1 - \hat q_0)}{m_0}}_{\text{人类校准集估计方差}}\Bigg]
$$

### 实战数值算例与 Youden 指数 $J$ 警戒线

假设某宽容型 LLM Judge 在 $N = 1{,}000$ 道客服工单上测得原始通过率 $\hat p_{\text{raw}} = 68.0\%$。但在 $m_1 = 100$ 正例、$m_0 = 100$ 负例的人类金标集上，该评委灵敏度 $\hat q_1 = 0.90$、特异度仅 $\hat q_0 = 0.60$（40% 假阳性漏放！），Youden 指数 $\hat J = 0.90 + 0.60 - 1 = 0.50$：

1. **真实通过率还原**：$\hat\theta_{\text{RG}} = (0.68 + 0.60 - 1) / 0.50 = 0.28 / 0.50 = \mathbf{56.0\%}$——未经校准的原始报表竟然凭空虚高了 <strong>+12.0 pp</strong>！
2. **三项方差拆解**：括号内三项分别为评测集方差 $0.68\times 0.32 / 1000 = 0.000218$、正例校准方差 $0.56^2 \times 0.09 / 100 = 0.000282$、负例校准方差 $0.44^2 \times 0.24 / 100 = 0.000465$，求和除以 $J^2 = 0.25$ 得 $\widehat{\mathrm{Var}} = 0.00386$，标准误 $\mathrm{SE} = 6.21\text{ pp}$，95% CI 为 $56.0\% \pm 12.2\text{ pp}$。
3. **直击痛点的发现**：括号中来自人类校准集的两项占了总方差的 <strong>77.4%</strong>！就算你烧钱把 LLM Judge 评测集从 1,000 题暴扩到 100,000 题，最终 $\mathrm{SE}$ 依然被死死卡在 $5.47\text{ pp}$ 以上。**不扩充人类金标或提升评委精度，盲目扩大自动评测规模纯属浪费算力**。

| Youden 指数 $J = q_1 + q_0 - 1$ | 方差放大倍率 $1/J^2$ | 工程状态 | 行动建议与校准集门槛 |
| --- | --- | --- | --- |
| **$J \ge 0.70$** | $1.0\times\text{–}2.0\times$ | **绿灯健康** | 直接启用 Rogan-Gladen 矫正并附带 Delta 法 95% CI（$m_1, m_0 \ge 75$） |
| **$0.40 \le J < 0.70$** | $2.0\times\text{–}6.3\times$ | **黄灯警戒** | 仅可用于粗趋势观测，需扩充人类校准集至 $m_1, m_0 \ge 150$ 并同步优化 Rubric |
| **$J < 0.40$** | $> 6.3\times$（方差爆炸） | **红灯熔断** | **禁止强行代数矫正**！先拆解细则、改用更强裁判或下沉为确定性子断言 |

<EvalJudgeBiasWidget />

::: warning 跨模型族 (q₁, q₀) 条件误差漂移红线
Rogan-Gladen 隐含一条关键前提——**条件误差不变性**：即评委在候选模型 $B$ 上的 $(q_1, q_0)$ 与校准时所用模型 $A$ 上保持一致。一旦新候选模型跨了模型家族（例如从 GPT 系列切到 Claude 或开源推理模型），或者在 RL 训练中学会了迎合评委的套话风格，$(q_1, q_0)$ 就会发生隐性漂移。**工程铁律：每次评估新模型家族或重大后训练跃迁时，必须在分层抽样的小批新模型输出上重新核验 $(q_1, q_0)$**。
:::

Rogan-Gladen 公式把评委偏差转化为了清晰可算的统计账，而这一切的锚点都落在那份 100–300 题的**人类金标校准集**上。怎样低成本造出一份标注者高度一致的高纯度金标，又如何守住评测集不被数据污染侵蚀？请看第 4 章。
