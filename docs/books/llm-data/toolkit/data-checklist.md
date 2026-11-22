# 数据入库与上线红线清单

<p class="chapter-summary">工位常备一页式实操手册：覆盖六大核心研发场景的数据流水线选型矩阵、数据入库与训练发版前 15 项必查硬红线、8 类高频训练异常的数据根因快速排障表，以及不可变数据快照的最小血缘清单模板。</p>

> 配套工具：[核心公式、数据账本与成本速查卡](/books/llm-data/toolkit/formulas-and-ledgers) · [最小可运行 Python 数据工具箱](/books/llm-data/toolkit/reference-code)

---

## 一、按研发场景选型的数据流水线决策矩阵

| 研发场景 | 核心原材料与解析底座 | 关键清洗与去重工艺 | 必配验证 / 门禁与核心指标 | 本书主线 |
| --- | --- | --- | --- | --- |
| **通用预训练与中期退火** | WARC 原始网页 + PDF 公式/表格解析 + 仓库级代码 | 启发式过滤 + FastText/编码器 <a class="term-ref" href="/books/llm-data/glossary#model_based_filtering" title="用轻量分类器打分截取高信息密度语料">模型打分</a> + <a class="term-ref" href="/books/llm-data/glossary#minhash_lsh" title="以 MinHash 签名与分带分桶召回近似重复文档">MinHash LSH</a> + <a class="term-ref" href="/books/llm-data/glossary#suffix_array_dedup" title="精确切除跨文档超长重复子串的去重技术">后缀数组去重</a> | 小模型 <a class="term-ref" href="/books/llm-data/glossary#micro_annealing" title="从中间检查点短程退火灵敏检出数据源价值">Micro-annealing</a> + 13-gram 去污 + 留存漏斗 $\eta_{\text{yield}}$ | [第 4–7 章](/books/llm-data/part-2) |
| **多模态（VLM / 视频 / 全双工语音）** | 原图 + <a class="term-ref" href="/books/llm-data/glossary#interleaved_data" title="保留网页图文自然顺序的连续多模态序列">图文交错文档</a> + 镜头切分视频 + 双声道语音 | CLIP/SigLIP 过滤 + <a class="term-ref" href="/books/llm-data/glossary#dense_recaptioning" title="用强 VLM 重新生成高信息密度视觉描述">密集重打标</a> + 视觉 <a class="term-ref" href="/books/llm-data/glossary#dynamic_resolution" title="按原图长宽比自适应切分图块保留小字细节">AnyRes</a> 切片 + 音画对齐 | 解码坏图率 $= 0\%$ + 多模态 Token 占比账本 + 纯文本能力防遗忘回放 | [第 12–14 章](/books/llm-data/part-4) |
| **SFT 指令与 Long-CoT 冷启动** | 技能树种子 + 专家精标 + 强模型 <a class="term-ref" href="/books/llm-data/glossary#rejection_sampling" title="多次采样后经外部验证器筛选通过样本的微调范式">拒绝采样</a> 推理链 | <a class="term-ref" href="/books/llm-data/glossary#taxonomy_coverage" title="追踪各技能叶节点覆盖密度的能力分类树">能力分类树</a> 覆盖校验 + 复杂度×质量二维筛 + <a class="term-ref" href="/books/llm-data/glossary#semdedup" title="剔除措辞不同但语义高度雷同样本的方法">SemDeDup</a> | 模板/EOS 指纹校验 + 负迁移回归 + 良性边界防 <a class="term-ref" href="/books/llm-data/glossary#overrefusal" title="安全对齐过严导致良性请求被错误拒绝的现象">过度拒绝</a> | [第 8–9、11 章](/books/llm-data/part-3) |
| **RLVR 可验证强化学习** | 竞赛数学/代码/逻辑题 + 抗作弊确定性 Verifier | 防记忆数字/条件改写 + 答案唯一性校验 + <a class="term-ref" href="/books/llm-data/glossary#sweet_spot_curriculum" title="筛选中等通过率难题以最大化梯度信噪比的动态课程">甜点区</a> 动态分桶 | $p_i \in [0.1, 0.8]$ 占比审计 + 零梯度死题率 + 作弊漏洞红队测试 | [第 10 章](/books/llm-data/chapters/chapter-10) |
| **多轮 Agent 轨迹工厂** | <a class="term-ref" href="/books/llm-data/glossary#environment_as_data" title="把可重置带断言的沙箱环境作为一等数据资产管理">可重置沙箱</a>（MCP / Docker / 浏览器 / 桌面 VM） | 统一 <a class="term-ref" href="/books/llm-data/glossary#trajectory_ir" title="跨任务与多模态观测的标准化轨迹数据结构">Trajectory IR</a> + <a class="term-ref" href="/books/llm-data/glossary#fail_to_pass" title="补丁前稳定失败、补丁后稳定通过的单元测试标准">Fail-to-Pass</a> / 终态断言 + <a class="term-ref" href="/books/llm-data/glossary#counterfactual_repair" title="定位首个错误步回滚沙箱修正轨迹的方法">反事实修复</a> | 逐 Token <a class="term-ref" href="/books/llm-data/glossary#loss_mask" title="仅对模型思考与动作置 1、对环境观测置 0 的梯度开关">Loss Mask</a> 抽检 + <a class="term-ref" href="/books/llm-data/glossary#lucky_hack" title="虽触发通过判定但逻辑作弊或死循环凑巧命中的毒化轨迹">Lucky Hack</a> 清洗 + 镜像哈希锁定 | [第 15–20 章](/books/llm-data/part-5) |
| **企业私有湖仓与线上回流飞轮** | 私有财报/工单/代码 PR + 生产全链路 Tracing 日志 | 湖仓分层（Raw→Silver→Gold）+ 隐式负反馈挖掘 + 过期清理 | <a class="term-ref" href="/books/llm-data/glossary#dual_track_isolation" title="将生产回流数据与评测黄金集按哈希物理隔离的防泄漏机制">双轨物理隔离</a> + 全模态 PII 擦除 + 老化率 $\psi_{\text{stale}} < 5\%$ | [第 22–24 章](/books/llm-data/part-6) |

---

## 二、数据入库与训练上线前 15 项必查红线清单

任何数据集晋升至 `Gold` 训练层、生成不可变训练快照或进入百卡预训练 / 后训练 / Agent RL 任务前，必须逐项勾选过闸，任一红线失守即硬阻断入库：

- [ ] **1. 训测双向去污零泄漏（Decontamination）**：对所有公开评测基准与企业锁库 Holdout 执行 13-gram 精确匹配与高相似度向量近邻扫描；命中样本强制剔除或归档隔离，污染检出率与处理记录随快照入库。
- [ ] **2. 对话模板、特殊符与 EOS 指纹锁定**：随机抽样 50 条渲染后的原始 `input_ids` 解码反查，核验 BOS / EOS、`<think>` 标签与工具调用分隔符与推理引擎 `SHA-256` 一致，确保无截断丢 EOS 或多出空格导致复读失控。
- [ ] **3. 块内掩码与多轮 Loss Mask 逐 Token 抽检**：预训练打包序列确认开启 <a class="term-ref" href="/books/llm-data/glossary#intra_doc_masking" title="打包多篇文档时阻断跨文档 Token 互见的块对角掩码">块内注意力掩码</a>；Agent / SFT 轨迹抽样逐 Token 打印 `loss_mask`，确认 `system / user / tool_observation / env_error` 严格置 `0`，`think / tool_call / assistant` 严格置 `1`，且有效监督 Token 占比非零。
- [ ] **4. MinHash 模糊去重与子串去重边界审计**：核对 $(b, r_{\text{lsh}})$ 与拐点阈值 $t^\star$（默认网页口径 $b=14, r_{\text{lsh}}=8$），抽检被删样本确认未误杀高价值代码模板、法律条款或结构化财务报表。
- [ ] **5. 重复轮数与有效数据预算核验**：依据 Data-Constrained Scaling 核算各子集重复轮数 $E$；高质唯一语料重复原则不超过 **4–6 轮**，防止算力浪费在边际效率跌破 70% 的饱和区。
- [ ] **6. 沙箱镜像与 MCP Schema 哈希冻结**：所有 Agent 轨迹与 RLVR 代码题必须绑定精确的 Docker/VM 镜像 digest、`git commit` 与 <a class="term-ref" href="/books/llm-data/glossary#mcp_schema" title="标准化工具发现与参数 JSON Schema 协议">MCP Schema</a> 版本号，确认测试脚本目录在运行期为只读挂载。
- [ ] **7. Lucky Hack 假成功与基建脏轨迹剔除**：拦截修改测试用例、暴力死循环凑巧命中、跳过权限确认的假成功轨迹；彻底剥离含 API 429 限流、容器 OOM、网络超时等 `infra_error` 的半截日志。
- [ ] **8. RLVR 题库甜点区与验证器抗作弊体检**：基于当前基座模型 $\widehat{\mathrm{pass@}k}$ 剔除全错（$p_i < 0.1$）与全对（$p_i > 0.8$）零梯度死题；对验证器跑对抗样本（空串、乱序答案、精度边界、多解等价）确保误判率 $< 1\%$。
- [ ] **9. 全模态 PII 脱敏与一致假名化审计**：完成文本（身份证/手机/密钥/邮箱）、图像截图（账号/人脸/车牌/水印）、DICOM 头与音频声纹的联合脱敏扫描，并校验多页文档内同一实体假名映射一致。
- [ ] **10. 间接提示注入与投毒语料拦截**：扫描网页隐藏 DOM、PDF 不可见文字、代码注释与屏幕 OCR 中的 <a class="term-ref" href="/books/llm-data/glossary#indirect_prompt_injection" title="暗藏在外部文档或界面文字中诱发越权操作的恶意指令">间接提示注入</a> 及高频异常后门触发样本（<a class="term-ref" href="/books/llm-data/glossary#data_poisoning" title="向公开语料或标注渠道植入含触发词后门样本的安全威胁">数据投毒</a>），高危命中全部隔离审查。
- [ ] **11. 合成占比、真实锚定与抗坍缩熵监测**：确认混合配方中高质量真实人类/真实环境语料占比 **$\ge 20\%\text{–}30\%$**；对比上个基线快照监控 N-gram 词汇熵、长度分布与冷门切片占比，防止静默滑入早期 <a class="term-ref" href="/books/llm-data/glossary#model_collapse" title="递归合成导致尾部知识消失与分布收缩的退化现象">模型坍缩</a>。
- [ ] **12. 多模态解码完整率与跨模态配比核验**：验证 100% 图像/音视频分片可无错解码、无黑屏静帧与音画时漂；检查单样本视觉/视频 Token 上限与纯文本回放语料底仓，严防视觉微调拖垮纯文本逻辑。
- [ ] **13. 生产回流双轨隔离与轨迹老化检查**：线上回流样本必须按用户/会话哈希与评测黄金集物理分轨；对超过 TTL 或关联工具 Schema / 前端 UI 已改版的历史轨迹执行自动回放校验，确保 <a class="term-ref" href="/books/llm-data/glossary#trajectory_staleness" title="因线上工具 Schema 或 UI 改版导致历史 Agent 轨迹失效的现象">轨迹老化率</a> $\psi_{\text{stale}} < 5\%$。
- [ ] **14. 版权、协议白名单与 Opt-out 合规审计**：校验上游公开语料商业授权条款（规避闭源 API 蒸馏传染）、代码仓 SPDX 宽松许可白名单及版权方/用户删除（Opt-out）清单执行状态。
- [ ] **15. 不可变快照与端到端血缘清单归档**：验证 <a class="term-ref" href="/books/llm-data/glossary#data_lakehouse" title="分层管理多模态语料与不可变快照的 AI 数据湖仓">AI 数据湖仓</a> Snapshot 只读锁定且 <a class="term-ref" href="/books/llm-data/glossary#data_lineage" title="记录原始源、清洗脚本、阈值到训练快照的双向血缘图谱">端到端数据血缘</a> 清单字段齐全，支持任一异常权重 10 分钟内回溯至具体清洗脚本与样本分片。

---

## 三、工程安全起手阈值速查

启动一条新数据工程管线时，可直接采用以下经大规模实战验证的安全起手基线，再随业务消融结果微调：

- **重复与去重基线**：高质预训练语料重复不超过 **4–6 Epoch**；网页模糊去重起手选 MinHash $(b=14, r_{\text{lsh}}=8, t^\star \approx 0.719)$，代码/论文收紧至 $(16, 10, t^\star \approx 0.758)$；语义去重余弦阈值建议从 $0.92\text{–}0.95$ 起步防误删细微推理题。
- **后训练与 RLVR 池基线**：SFT 精筛优先保证技能树全覆盖而非盲堆百万量级；RLVR 离线题池将通过率锁定在 **$p_i \in [0.1, 0.8]$**，确保 $G=8$ 组采样零梯度浪费率压至 **$< 25\%$**；验证器对抗误判率必须 **$< 1\%$**。
- **抗坍缩与防遗忘底仓**：规模化合成混合池中**高质量真实人类/真实环境数据占比 $\ge 20\%\text{–}30\%$**；垂直行业 SFT 或多模态指令微调保留 **30%–60% 通用底座回放语料**，同步监控通用回归集防负迁移。
- **生产飞轮治理基线**：回流日志强制按用户/会话哈希物理隔离 30% Holdout；Agent 历史轨迹每隔 30–60 天或工具 Schema 升级后执行一次沙箱回放体检，将轨迹老化率 $\psi_{\text{stale}}$ 压在 **$5\%$ 以内**。

---

## 四、8 类高频训练与上线异常 → 数据根因快速排障表

| 异常现象 | 最可能的数据工程根因（按概率排序） | 立即核查与止血动作 |
| --- | --- | --- |
| **训练 Loss 正常下降，推理时疯狂复读或不停输出** | ① 打包截断切掉了末尾 EOS Token ② Chat Template 停止符与训练拼接不一致 ③ 高重复模板页未过后缀数组去重 | 打印 20 条训练样本尾部 Token ID 核查 EOS 留存率；复核 `Intra-doc Masking` 与模板 SHA |
| **Agent 学会自己伪造 `tool_observation` 假装调完工具** | ① **Loss Mask 漏置 0**，把工具返回段落计入了监督梯度 ② 工具返回角色标签映射错误 | 用 `build_agent_trajectory_loss_mask` 对入库 Parquet 跑全量断言，确认观测位掩码 100% 为 `0` |
| **RLVR 训练多轮后 Reward 曲线纹丝不动，算力空转** | ① 题库难度失衡，大量题 $p_i \approx 0$ 或 $p_i \approx 1$ 落入零梯度死区 ② 验证器解析正则过严把正确格式判 0 | 统计题池 $p_i$ 分布与零梯度浪费率；切入甜点区 $p_i \in [0.1, 0.8]$ 并抽检 50 条被判 0 样本 |
| **加入长思维链 / 领域 SFT 后，短对话与通用评测暴跌** | ① 单一领域或 Long-CoT 占比过高触发负迁移 ② 缺乏通用指令与短回复锚定回放 ③ 样本格式过度单一 | 上调通用锚定回放至 50%–70%；限制长思维链与单源占比；按能力分类树重配权重 |
| **开源基准分数飙升 10+ 分，真实私域业务毫无起色** | ① 混入未经去污的开源聚合集导致基准泄漏 ② 线上回流飞轮未做双轨隔离造成自测自训 | 立即跑 13-gram + 语义近邻双向去污审计；检查评测 Holdout 与训练池用户哈希交集 |
| **安全对齐后模型“变傻”，正常业务咨询频繁拒答** | ① 安全数据中“一刀切拒绝”样本过重 ② 缺少与敏感词高度相似但合法的良性对比正例 | 补充良性边界正例与“安全引导式回答”，在 XSTest + 业务良性集上同步盯紧过拒率 ORR |
| **视觉多模态微调后，图片小字看错且纯文本数学掉点** | ① 高分图被强行缩成低分辨率单图丢掉细节 ② 网页低质 Alt-text 占比过高 ③ 纯文本回放配比不足 | 启用 AnyRes 动态切片 + OCR/图表密集重打标；混入 20%–35% 高质纯文本推理语料 |
| **多轮生产 Agent 上线两周后工具调用报错率持续攀升** | ① 线上业务 API 参数或前端 UI 已改版，但微调集仍充斥过期轨迹（高 $\psi_{\text{stale}}$） | 按工具 Schema 版本扫描历史轨迹池并淘汰过期批次；启用沙箱自动回放校验门禁 |

---

## 五、入库级数据快照最小血缘清单模板（YAML）

任何 `Gold` 层训练快照生效前，须在湖仓目录附带以下不可变 `dataset_manifest.yaml`（缺失任意核心字段不得触发训练调度）：

```yaml
dataset_snapshot_manifest:
  snapshot_id: "ds-agent-swe-v2.4.0@sha256:8c4a..."      # 不可变快照 ID 与清单哈希
  stage: "post_train_agent_sft"                          # pretrain | midtrain | sft | rlvr | agent
  lineage:
    raw_sources: ["swe-smith@rev:9a1f", "internal-pr-2026q1@v3"]
    pipeline_git_sha: "7d3e21b"                          # 清洗/过滤/合成脚本精确 Commit
    generator_models: ["teacher-72b-v2 (temp=0.7)"]      # 若含合成数据必须声明模型与温度
    sandbox_image_digest: "ghcr.io/org/swe-env@sha256:f10b..."
  quality_and_safety_gates:
    decontamination: "13-gram + embedding (0 hits vs SWE-Verified & internal-holdout)"
    dedup_config: "minhash(b=14, r=8, t*=0.719) + semdedup(cos>0.92)"
    loss_mask_audit: "100% verified (obs_masked=1.00, avg_sup_ratio=0.38)"
    real_anchor_ratio: 0.32                              # 真实人类/真实环境锚定占比 >= 0.20
    pii_and_ipi_scan: "passed (0 leaks, 142 IPI docs quarantined)"
    staleness_rate: 0.018                                # 历史轨迹失效率 < 0.05
    license_compliance: "spdx_permissive_only + opt_out_applied_2026_10"
  stats:
    samples: 84200
    total_tokens: "1.42B"
    yield_rate: 0.24
```
