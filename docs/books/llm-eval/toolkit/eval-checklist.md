# 基准选型与评测上线避坑清单

<p class="chapter-summary">工位常备一页式速查手册：覆盖按业务/研发目标选公开基准与开源 Harness 的决策矩阵、评测报告与模型上线前 12 项必查红线清单、统计与工程安全起手阈值，以及 8 大异常分数波动快速排障对照表。</p>

> 配套工具：[统计公式与指标口径速查卡](/books/llm-eval/toolkit/metrics-and-stats) · [最小可运行 Python 评测工具箱](/books/llm-eval/toolkit/reference-code)

---

## 一、按业务与研发目标选型决策矩阵

| 你的核心目标 | 推荐公开基准 / 私有集策略 | 首选开源 Harness | 核心指标与避坑提示 |
| --- | --- | --- | --- |
| **底座通用推理与知识摸底** | MMLU-Pro + GPQA Diamond + LiveBench + AIME（按年份防污染） | `lm-eval` / OpenCompass | 核对 BPB 或统一对话模板，严禁混比不同提取正则 |
| **长上下文与真实检索抗干扰** | RULER + NoLiMa + 私有跨页大表 / 冲突条款 RAG 黄金集 | Inspect AI / DeepEval | 拆开测检索 Recall@k 与生成引用核验，按文档聚类算 SE |
| <strong>代码补全与软件工程（SWE）</strong> | LiveCodeBench + SWE-bench Verified + 内部私有仓 PR 切片 | SWE-bench Harness / Inspect AI | 必须只读挂载测试集；私有场景联动 24h 代码留存率 |
| **工具调用与多轮业务 Agent** | BFCL v3/v4 + $\tau^2$-bench + Terminal-Bench + 隔离模拟业务库 | Inspect AI / 自研容器池 | 必报 $\widehat{\mathrm{pass}^k}$ 连续可靠性与数据库终态断言 |
| **多模态理解与 GUI 操作** | MMMU-Pro + DocVQA + OSWorld / WebArena | VLMEvalKit / Inspect AI | 锁定图像分辨率、帧率与 DOM/容器初始快照，防环境漂移 |
| **安全红队与间接提示注入** | AgentDojo + HarmBench + XSTest + 内部业务越权红队剧本 | Promptfoo / Inspect AI | 同步画 ASR（攻击成功率）与 ORR（过度拒绝率）帕累托曲线 |
| **量化 / 加速 / 跨芯片精度回归** | 200–400 题高灵敏退化探针（长文 + 数学 + 严格式工具调用） | `lm-eval` / OpenCompass | 用 McNemar 配对检验对比 FP16 基线，重点查截断与复读 |
| **私域业务 EDD 迭代与 CI 闸门** | 50–80 题 L1 冒烟 + 500–2000 题 L2 回归（70% Dev / 30% Holdout） | Promptfoo / Inspect AI + Replay Proxy | L1 耗时小于 5 分钟且红线零容忍，Holdout 物理锁库防过拟合 |

---

## 二、评测报告与模型上线前 12 项必查红线清单

发布模型选型结论、论文对比表或批准 Agent 上线灰度前，逐项打勾核验以下 12 条红线，缺一不可：

- [ ] **1. 模板与分词指纹锁定**：核验 Chat Template、停止符（EOS / Stop Sequences）、System Prompt 与特殊工具标签的 `SHA-256` 指纹一致，杜绝跨引擎暗改格式导致无故掉点。
- [ ] **2. 截断率与推理预算披露**：明确报告 `max_tokens`、思考预算与截断比例（Truncated Ratio）；截断率超过 2% 即告警、超过 5% 硬阻断排查是否将正确长推理硬截断判 0。
- [ ] **3. 配对检验与置信区间齐全**：同题库对比强制使用 Paired Bootstrap 或 McNemar 检验并给出 95% CI（及分差 $\Delta$）；严禁只报无区间标量分或误用独立样本 $t$ 检验。
- [ ] **4. 聚类标准误修正**：多道子题共享同一文档、代码仓或会话上下文时，必须按簇计算 Liang-Zeger 聚类标准误（Clustered SE）与设计效应 DEFF，防止区间虚窄 1.5–3 倍。
- [ ] **5. 采样口径与可靠性双报**：需要验证器重试的编码/数学用无偏组合公式 $\widehat{\mathrm{pass@}k}$（严禁朴素代入 $1-(1-c/n)^k$）；生产多轮 Agent 必报 $\widehat{\mathrm{pass}^k}$（如 $k=5$）。
- [ ] **6. LLM Judge 校准与偏见治理**：在人类金标正负集 $(m_1, m_0)$ 上标定灵敏度 $q_1$、特异度 $q_0$（要求 Youden 指数 $J = q_1 + q_0 - 1 \ge 0.4$），施加 Rogan-Gladen 矫正并做正反序交换去位置偏见。
- [ ] **7. 异常严格分桶**：API 限流 429、容器 OOM、镜像超时等基础设施异常全部归入 `infra_error` 单独上报与重跑，严禁按 0 分混入 `model_failure` 准确率分母。
- [ ] **8. 沙箱隔离与外网确定性**：测试脚本与隐藏用例只读挂载，外网检索与第三方 API 通过录制回放代理（Replay Proxy）锁定，每次任务执行前彻底重置环境快照。
- [ ] **9. 数据污染与 Holdout 隔离审计**：训练前与评测前完成 13-gram / MinHash 与语义近邻去污检查；确认 Holdout 锁库未被研发人工翻看或回流进训练集。
- [ ] **10. 安全、权限与政策零容忍核验**：权限越界泄漏率 $= 0\%$、资金/高危写操作硬政策违规 $= 0\%$、间接提示注入 ASR 与良性过度拒绝 ORR 双达标。
- [ ] **11. 质量 × 成本 × 延迟联合帕累托**：报告同屏列明核心质量指标、单任务美元开销（$\$/\text{Task}$）与端到端 P95 延迟，拒绝“靠十倍 Token 账单换 1% 涨点”的无效方案。
- [ ] **12. 误差归因与可复现版本包归档**：附带 50–100 条失败轨迹的 Open Coding 根因占比分布，以及模型版本、脚手架 Git SHA、数据集版本与判分器版本的四元组快照。

---

## 三、统计与工程安全起手阈值速查

启动一个新业务评测体系时，可直接采用以下经工程验证的安全基线参数，后续再随业务风险微调：

- **题量规划**：L1 PR 冒烟 **50–80 题**（$<5$ 分钟）；L2 常规配对回归 **300–500 题**（MDE $\approx 4\%\text{–}5\%$）；精细微调或发布闸门 **800–2000 题**（MDE $\approx 2\%\text{–}3\%$）（同底座迭代配对 $\rho \approx 0.80$；跨模型族 $\rho \approx 0.50$ 时题量约需翻倍）；
- **黄金集切分与轮换**：物理切分 **70% Dev / 30% Holdout**（按文档/仓库整簇切分）；每季度保留 **70% 固定核心 + 30% 滚动新鲜集**；
- **标注与评委校准**：核心 Rubric 双人盲标目标 Cohen's $\kappa \ge 0.75$；Judge 人类金标校准集每类不少于 $m_1, m_0 \ge 100$ 条，Youden 指数 $J < 0.4$ 时先修评委再矫正；
- **采样配置**：无偏 $\widehat{\mathrm{pass@}k}$ 推荐采样次数 $n \ge 2k$；生产 Agent 稳定性评测至少采样 $n = 5\text{–}8$ 次上报 $\widehat{\mathrm{pass}^5}$；L1 冒烟回归固定温度 $T = 0$。

---

## 四、8 大常见异常分数波动快速排障对照表

| 异常现象 | 最可能根因（按概率排序） | 立即核查与止血动作 |
| --- | --- | --- |
| <strong>换推理后端（HF → vLLM/SGLang）同模型掉点 3%–10%</strong> | ① Chat Template 或 BOS/EOS 特殊符号不一致 ② 工具解析器或思考标签提取正则错位 ③ 默认 `max_tokens` 被收紧 | 逐 token 比对两侧渲染后的原始 `input_ids`；核查截断率与提取失败样本占比 |
| **离线单轮评测高分，上线后客诉不降反升** | ① 黄金集脱节真实日志分布 ② 多轮情绪施压导致奉承越权 ③ 忽略 $\widehat{\mathrm{pass}^k}$ 稳定性 | 拉取线上 Tracing 隐式负信号轨迹做 Open Coding；将高频失败簇与施压剧本沉淀进 L1 / L2 |
| **相同配置连跑两次分数波动超过 2–4 个百分点** | ① 题量 $N$ 过小导致 MDE 过大 ② 外部 API/搜索未接 Replay Proxy ③ 解码温度 $T>0$ 且样本过少 | 用 `mde_and_required_n` 核算题量；启用 Replay Proxy；关键回归设 $T=0$ 或多采样均值 |
| **LLM Judge 给出 90+ 高分，人工抽检漏洞百出** | ① 触发冗长偏见或自我偏好 ② Rubric 过于空泛 ③ Judge 自身特异度 $q_0$ 过低（老好人评委） | 抽检 50 条负例算 $q_0$ 与 Youden $J$；将 Rubric 拆成原子二值检查项并换跨族强模型评判 |
| $\mathrm{pass@}1$ 看似达标（85%），生产工单仍频频翻车 | ① 多轮长链误差累乘（$0.85^5 \approx 44\%$）② 工具调用偶发参数错漏缺少代码兜底 | 在 L2 强制上报 $\widehat{\mathrm{pass}^5}$；工具网关层加确定性参数校验与退避自愈提示 |
| **某次 Prompt 改版涨点 1.2%，发版复测优势完全消失** | ① 涨幅小于当前题库 MDE（纯抽样噪声）② 误把 Dev 集当最终裁判触发人工过拟合 | 查 Paired Bootstrap 95% CI 是否跨 0；一切重大改版必须经锁库 Holdout 盲测裁决 |
| <strong>Agent 沙箱单测通过率突然异常飙升至 95%+</strong> | ① 容器测试脚本未只读挂载被模型篡改 ② 沙箱未重置残留上次答案 ③ 发生训练数据污染 | 审计容器内 `git diff` 是否动了测试目录；核对沙箱快照哈希；执行 13-gram 污染自检 |
| **开启 FP8 / W4A16 量化后常规问答无损，Agent 任务暴跌** | ① 量化破坏长上下文注意力与严格式 JSON/工具参数精度 ② 触发重复复读陷入截断 | 跑 [专题 C](/books/llm-eval/topics/quant-and-chip-regression) 退化探针集，用 McNemar 定位退化切片；对关键层回退 BF16 |

---

## 五、评审级评测报告最小必备元数据包

任何面向管理层拍板、模型选型或发版审批的评测报告，末尾必须附带以下可复现版本快照清单（缺失任意一项不得归档生效）：

```yaml
eval_run_manifest:
  model_id: "qwen3-32b-instruct@sha256:9f3c..."    # 精确权重或 API snapshot 版本
  inference_engine: "vllm-0.8.2 (bf16, temp=0.0, max_tokens=8192)"
  template_fingerprint: "sha256:7a1b..."           # Chat Template + Stop Token 哈希
  scaffold_git_sha: "4e92c1d"                      # Prompt / Tool Schema / 编排版本
  dataset_version: "eval-rag-v1.3.0 (dev=420, holdout=180)"
  judge_calibration: "q1=0.91, q0=0.86, J=0.77 (m1=120, m0=120)"
  error_buckets: "model_failure=59, infra_error=3 (retried=3)"
  pareto_summary: "acc_rg=93.4% [91.1%, 95.5%], cost=$0.018/task, p95=3.1s"
```
