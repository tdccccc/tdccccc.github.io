# 第 11 章 Deep Research、复杂 RAG 与长报告工作流评测

<p class="chapter-summary">面对跨多跳搜索、企业知识库与万字研究报告的复杂工作流，端到端打一个模糊总分既看不出病根，又极易被注水长文骗分。本章从 GAIA 与 BrowseComp 切入，系统建立检索层与生成层的彻底解耦归因实验，并落地声明级引用可核验率流水线与衔接 Rogan-Gladen 矫正的加权 Rubrics 评判。</p>

过去两年，以 Deep Research 为代表的多步自主调研 Agent 与企业级复杂 RAG 迅速成为知识工作者的标配。然而，这类系统的评测却长期陷入“两头失灵”的窘境：要么只测单跳短问答，与真实多源综合相去甚远；要么把五千字长报告直接丢给未经校准的 LLM Judge 打 1–10 分，结果文采斐然、篇幅冗长但关键数字全是编造的报告稳拿 9 分，反倒把严谨克制、如实披露资料缺失的报告挤到了后面。

要治好这套系统的测量失真，核心心法只有八个字：**逐级解耦、声明锚定**。

---

## 11.1 深度检索与网页推理基准：GAIA 与 BrowseComp

当被测 Agent 需要自主构造多轮查询、打开网页、解析 PDF/表格附件、运行 Python 验算并在几十步交互中收敛出准确事实时，两类标杆基准划定了最具区分度的能力坐标：

| 基准名称 | 核心考察范式 | 题目与验证设计 | 工程评测中的核心挑战 |
| --- | --- | --- | --- |
| **GAIA** | 多工具现实通用助理（Level 1–3 分级，覆盖搜索、文件解析、代码计算与多模态读图） | 每题刻意收敛为**唯一简洁确定性答案**（数字、实体名或短语），彻底规避开放文本评判的主观漂移 | 公网页面改版、链接失效与反爬限流会导致同模型跨月跑分自然漂移 |
| **BrowseComp** | 极难多跳反查与信息综合（“极难找到，极易核验”的非对称难度设计） | 刻意隐去目标实体的显式关键词，仅给 4–6 条跨领域间接线索，必须靠多轮假说-检索-排除反推出唯一答案 | 极度考验持久化搜索规划、死胡同回溯与长轨迹防遗忘；单次关键词搜索召回率接近 0% |

**活网不可复现的工程破解**：直接对着实时互联网跑 GAIA 或 BrowseComp，今天排第 1 的网页下周可能返回 404 或被 SEO 农场挤出首页，导致前后两轮模型对比完全丧失可比性。工业级评测必须采用两类确定性机制之一（详见[第 14 章](/books/llm-eval/chapters/chapter-14)）：对同一批对比实验架设<strong><a class="term-ref" href="/books/llm-eval/glossary#replay_proxy" title="录制回放代理：截获并缓存外部 HTTP/API/搜索响应，确保复测时按确定性键回放一致结果">录制回放代理（Replay Proxy）</a></strong>冻结搜索与页面响应，或将离线网页快照与企业知识库封存为版本化静态索引，让配对对比的候选系统站在完全一致的信息起跑线上。

---

## 11.2 复杂 RAG 检索层与生成层的彻底解耦归因

企业 RAG 与 Deep Research 团队最常犯的昂贵误判，是看到端到端问答准确率只有 62%，便立刻拍板“花十倍预算换最强旗舰模型”，结果换完一测只涨了 1.5 个百分点——因为 80% 的错题里，**关键文档压根就没被检索引擎召回进上下文**！

科学的评测体系必须坚持<strong><a class="term-ref" href="/books/llm-eval/glossary#rag_decoupling" title="检索与生成解耦：将复杂 RAG 失败拆分为检索漏召回与入窗未忠实利用两段独立归因">检索与生成解耦（RAG Decoupling）</a></strong>，像漏斗一样逐级定位证据从知识库流向最终报告的真实损耗（如图 11-1 所示）：

<figure class="book-figure">
  <img src="/figures/llm-eval/deepresearch-rag-decoupling.svg" alt="Deep Research 与复杂 RAG 解耦归因漏斗：检索层、生成层、引用核验与长报告 Rubrics" loading="lazy">
  <figcaption><span class="book-figure__label">图 11-1</span>复杂 RAG 与 Deep Research 的四级解耦归因漏斗：上方度量检索召回、入窗利用、声明级引用双率与多维 Rubrics，下方对应四象限失分根因诊断与工程修复抓手。</figcaption>
</figure>

### 第一段：检索层独立评测（证据进没进窗、排得靠不靠前）
在人工或半自动标定每道查询对应的金标证据切片集合 $\mathcal{D}_i^\star$ 后，完全脱离生成模型，沿用 [统计公式速查卡](/books/llm-eval/toolkit/metrics-and-stats) 统一口径评估检索链路：

$$
\mathrm{Recall@}k = \frac{1}{N}\sum_{i=1}^{N}\frac{\lvert \mathcal{R}_i^{(k)} \cap \mathcal{D}_i^\star \rvert}{\lvert \mathcal{D}_i^\star \rvert}, \qquad
\mathrm{MRR} = \frac{1}{N}\sum_{i=1}^{N}\frac{1}{\operatorname{rank}_i}, \qquad
\mathrm{NDCG@}k = \frac{1}{N}\sum_{i=1}^{N}\frac{\sum_{r=1}^{k}\frac{2^{\text{rel}_{i,r}}-1}{\log_2(r+1)}}{\mathrm{IDCG@}k_i}
$$

借助这组无大语言模型噪声干扰的纯 IR 指标，团队可以秒级执行可控消融，精准算出四项检索工程改动的独立净增益：
- **切片粒度与边界策略**（按文档结构语义切块 vs 固定 Token 窗与重叠率，防止表格表头与数值被硬截断）；
- **查询改写与多跳分解**（将复合问题拆为多条原子检索句，衡量多跳全证据集合召回率 $\text{All-Evidence Recall@}k$）；
- **混合检索配权**（BM25 词法匹配救回产品料号、人名与错误码，Dense 向量补足语义改写）；
- **Reranker 精排贡献**（量化引入 Cross-Encoder 重排后，在相同上下文长度预算下的 $\Delta\mathrm{MRR}$ 与 $\Delta\mathrm{NDCG@}k$）。

### 第二段：生成层独立评测与“检索到了却没用上”定位
证据入窗之后，生成层重点量化三大能力：<strong>上下文忠实度（Faithfulness）</strong>（所有结论是否完全受入窗证据支撑、无参数记忆擅自脑补）、<strong>答案相关性（Relevance）</strong>（是否直面问题而非答非所问），以及**抗干扰鲁棒性**（在 Top-$k$ 里掺入高字面相似但过期或相反结论的干扰切片时，准确率下跌多少）。

为彻底拆开“没检出来”与“检索到了却没用上”，工程上最犀利的一把手术刀是 **Oracle Context 对照 + 位置扰动实验**：
1. 测得端到端真实流水线得分 $S_{\text{e2e}}$；
2. 绕过检索器，直接向生成器注入纯净金标证据 $\mathcal{D}_i^\star$，测得生成能力理论上限 $S_{\text{oracle}}$；
3. 将金标证据混入 $k-1$ 条真实检出的噪声切片，分别置于上下文的**首部、正中、尾部**，测得位置曲线 $S_{\text{head}}, S_{\text{mid}}, S_{\text{tail}}$。

据此构建直观的四象限归因表，直接把研发预算砸在真瓶颈上：

| 诊断观测信号 | 真实故障根因 | 正确工程修复动作 | 常见错误操作 |
| --- | --- | --- | --- |
| $\mathrm{Recall@}k$ 低，且 $S_{\text{oracle}} - S_{\text{e2e}}$ 巨大 | **故障 Ⅰ：检索漏召回** | 优化切块边界、多跳查询改写、BM25+向量混合召回 | 盲目花大钱换更贵的旗舰生成模型 |
| $\mathrm{Recall@}k$ 高，但 $S_{\text{mid}} \ll S_{\text{oracle}}$ | **故障 Ⅱ：Lost-in-the-Middle / 噪声淹没** | 强化 Reranker 压低噪声比例、重排高分切片至首尾、升级强<strong><a class="term-ref" href="/books/llm-eval/glossary#effective_context_length" title="有效上下文长度：模型在真实多跳推理与抗干扰检索中仍能保持高准确率的可用窗口">有效上下文</a></strong>底座 | 继续把 Top-$k$ 从 10 粗暴拉大到 50 |
| 入窗准确但 `Citation Precision` 低 | **故障 Ⅲ：生成幻觉与假引用** | 强约束逐句证据锚定、训练信息不足诚实拒答、上线 NLI 拦截器 | 只调系统提示词里空洞的“请不要编造” |
| 引用都对但报告注水、缺核心维度 | **故障 Ⅳ：覆盖度虚胖** | 引入去重有效事实密度与多维加权清单 Rubrics | 继续放任未经校准的粗糙 Judge 偏爱长文 |

---

## 11.3 长篇研究报告评测工程：声明级引用核验与加权 Rubrics

面对动辄数千字的 Deep Research 研报，短答案精确匹配彻底失效。工业级长报告评测必须拆成<strong>可客观核验的事实引用流水线</strong>与<strong>经统计校准的多维 Rubrics 评判</strong>两条并行轨道。

### 轨道一：句子/声明级引用可核验率自动流水线
借鉴 ALCE 与 FactScore 的细粒度核验思想，长报告的事实严谨度必须穿透到每一句独立主张，经由四步自动化流水线完成量化：
1. <strong>原子声明拆解（Claim Decomposition）</strong>：剥离纯修辞过渡句与标题，将复合长句拆解为不可再分的最小可证伪事实声明集合 $\mathcal{C} = \{c_1, \dots, c_M\}$；
2. <strong>证据溯源拉取</strong>：提取每条声明绑定的引用编号 `[1][3]`，从录制快照或版本化索引中调取精确对应源文 $\mathcal{E}(c_m)$；
3. <strong>蕴含关系核验（Entailment Verification）</strong>：使用专门微调的 NLI 判别器或经校准的独立裁判验证“源文 $\mathcal{E}(c_m)$ 是否**直接且完整支持**声明 $c_m$”（而非仅出现相同关键词）；
4. <strong>计算引用召回与逐条引用精度双率（对齐 ALCE 语义）</strong>：

$$
\mathrm{Citation\ Recall} = \frac{1}{\lvert \mathcal{C}_{\text{fact}} \rvert}\sum_{m \in \mathcal{C}_{\text{fact}}} \mathbb{I}\big[\mathcal{E}(c_m) \models c_m\big], \qquad
\mathrm{Citation\ Precision} = \frac{\sum_{m \in \mathcal{C}_{\text{fact}}}\sum_{e \in \mathcal{E}(c_m)} \operatorname{rel}(e, c_m)}{\sum_{m \in \mathcal{C}_{\text{fact}}} \lvert \mathcal{E}(c_m) \rvert}
$$

其中 `Citation Recall` 检验声明 $c_m$ 所引全部源文 $\mathcal{E}(c_m)$ 是否**联合蕴含** $c_m$（未附引用即 $\mathcal{E}(c_m)=\emptyset$ 时记 $0$）；`Citation Precision` 采用 ALCE 逐条引用判定 $\operatorname{rel}(e, c_m) = \mathbb{I}\big[\mathcal{E}(c_m) \models c_m \;\wedge\; (e \models c_m \,\vee\, \mathcal{E}(c_m)\setminus\{e\} \not\models c_m)\big]$，衡量每条具体引用 $(c_m, e)$ 中真正支撑或不可或缺的比例，从而严厉惩罚在有效引用后盲目堆砌无关链接 `[2][3][4]` 的刷分行为（工程初筛时亦可附报声明级支撑率 $\frac{1}{\lvert \mathcal{C}_{\text{cited}} \rvert}\sum_{m \in \mathcal{C}_{\text{cited}}}\mathbb{I}[\mathcal{E}(c_m)\models c_m]$ 作为快速上界代理）。

::: warning 长报告里最隐蔽的两类“假引用”
在真实业务盲审中，大量排版堪比券商研报的 AI 长文会在声明级核验下原形毕露，高发两种伪造形态：① **挂羊头卖狗肉**：附带的 URL 确实可访问且主题相近，但原文里压根没有出现模型写下的“2025 年营收同比增长 34.2%”；② <strong>过度外推（Over-Extrapolation）</strong>：源文仅表述“三家试点医院观察到成本下降”，模型却挂上该链接断言“全国医疗行业已普遍降本 30%”。单靠校验链接 HTTP 200 状态码完全放行这两类幻觉，唯有声明级蕴含验证能将其精准钉死。
:::

### 轨道二：去重信息覆盖度与衔接 Rogan-Gladen 矫正的加权 Rubrics
高引用精度只是底线——一篇只复述三条常识的短报告也能轻松拿到 100% `Citation Precision`。评估开放长报告的真正含金量需要叠加两项机制：
- **去重信息覆盖度与密度**：将所有通过引用核验的原子声明按语义聚类去重，衡量报告覆盖专家预设关键子议题的比例，并计算**每千字有效去重事实数**，彻底封杀靠车轱辘话凑字数讨好<strong><a class="term-ref" href="/books/llm-eval/glossary#judge_biases" title="评委偏见：LLM Judge 常见的冗长偏见、位置偏见、自我偏好与权威格式偏见">冗长偏见</a></strong>的注水长文。
- **多维加权清单 Rubrics + Rogan-Gladen 统计校准**：为每个调研议题制定 10–25 条二值化检查细则（Checklist Rubrics），按业务权重覆盖核心事实覆盖、跨源数字冲突披露（当两份权威报告统计口径打架时是否并列说明）、推演逻辑自洽与资料空白诚实声明。先用<strong><a class="term-ref" href="/books/llm-eval/glossary#llm_as_a_judge" title="LLM-as-a-Judge：使用强语言模型按细则对开放式生成进行自动化核查的裁判范式">LLM-as-a-Judge</a></strong>逐条打分，再严格衔接[第 3 章](/books/llm-eval/chapters/chapter-03)协议：在人类专家盲标金标子集上测量该裁判的灵敏度 $q_1$（TPR）与特异度 $q_0$（TNR），套用<strong><a class="term-ref" href="/books/llm-eval/glossary#rogan_gladen" title="Rogan-Gladen 矫正估计量：利用评委的灵敏度 q₁ 与特异度 q₀ 对有偏原始通过率进行无偏还原">Rogan-Gladen 公式</a></strong>还原真实清单达标率：

$$
\hat\theta_{\text{RG}} = \operatorname{clip}_{[0,1]}\!\left(\frac{\hat p_{\text{raw}} + q_0 - 1}{q_1 + q_0 - 1}\right)
$$

严格对齐[第 3 章](/books/llm-eval/chapters/chapter-03)的 Youden 指数三档红绿灯（$J < 0.40$ 红灯熔断禁止矫正；$0.40 \le J < 0.70$ 黄灯警戒须扩充校准集至 $m_1, m_0 \ge 150$；$J \ge 0.70$ 绿灯健康），生产发版门禁推荐优先达标 $J \ge 0.70$（若部分高难主观维度落入黄灯区，至少须满足 $J \ge 0.50$ 且配齐 $m_1, m_0 \ge 150$ 的人类金标校准集），方可将矫正后的加权 Rubrics 得分及其 Delta 法置信区间（见[统计公式速查卡](/books/llm-eval/toolkit/metrics-and-stats)）纳入发版决策，彻底告别“长报告质量全凭体感拍脑袋”的混沌局面。

### 长报告加权 Rubrics 与 Rogan-Gladen 联合校准算例
下表展示一份面向行业竞品调研长报告的四维检查清单（教学算例，假设每项神经裁判均已在 $m_1 = 150,\; m_0 = 150$ 的人类金标集上完成灵敏度与特异度标定，满足第 3 章黄灯区校准门槛）：

| 评测维度 | 权重 | 原子化二值判定标准（节选） | 评委 $(q_1, q_0)$ | 原始观测 $\hat p_{\text{raw}}$ | RG 矫正 $\hat\theta_{\text{RG}}$ |
| --- | --- | --- | --- | --- | --- |
| **关键数据覆盖** | $35\%$ | 准确列出全部 4 家头部厂商近两季核心指标且口径一致 | $(0.92, 0.88)$ | $76.0\%$ | $80.0\%$ |
| **引用精确核验** | $30\%$ | URL/切片存在性确定性校验 ∧ 声明级 NLI 蕴含（`Citation Precision` $\ge 90\%$ 且无过度外推） | $(0.94, 0.90)$（NLI 标定） | $84.5\%$ | $88.7\%$ |
| **跨源冲突披露** | $20\%$ | 当财报与第三方估算差异 $> 10\%$ 时并列披露分歧原因 | $(0.85, 0.78)$ | $58.0\%$ | $57.1\%$ |
| **边界与缺失声明** | $15\%$ | 对公开渠道未披露的非上市指标明确标注“无公开数据” | $(0.88, 0.72)$ | $64.0\%$ | $60.0\%$ |

注意第二行与第四行：第二行的 URL 与切片存在性虽为确定性校验，但负责判定“源文是否蕴含声明”的 NLI 裁判仍属于神经判别器，同样存在漏检与误报，必须按人工金标标定 $(q_1, q_0) = (0.94, 0.90)$ 并执行 RG 矫正（将原始 $84.5\%$ 还原为 $\frac{0.845 + 0.90 - 1}{0.94 + 0.90 - 1} = 88.7\%$）；而第四行评委特异度仅 $q_0 = 0.72$（容易把含糊其辞误判为“诚实披露缺失”），原始通过率被高估了 4 个百分点，经 Rogan-Gladen 还原后不仅给出无偏达标率，还能同时把 $J = 0.60$ 带来的估计方差纳入发版置信区间，防止团队在评委偏见里误判版本胜负。

::: tip Deep Research 评测上线前的三步快筛法
1. 先跑 **检索层离线指标 + Oracle Context 对照**，30 分钟拍板该优化检索器还是换生成底座；
2. 抽 30 篇长报告跑 **声明级引用核验流水线**，将 `Citation Precision < 85%` 设为一票否决红线；
3. 对开放质量维使用 **二值原子清单 Rubrics + 人类小样本 Rogan-Gladen 校准**，同步公示“每千字去重有效事实数”防注水。
:::

至此，文本工具、代码终端与知识调研三大 Agent 主战场已逐一拆透。最后一章专项评测，我们将视野推进至更高维的物理与时间空间：像人类一样看屏操控软件的 GUI Agent、横跨数月知识冲突的长期记忆，以及多个智能体并行协作时的通信税与关键路径效率。
