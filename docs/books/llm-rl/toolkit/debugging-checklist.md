# 算法选型矩阵与排障速查表

<p class="chapter-summary">工位常备一页式速查手册：覆盖场景驱动的算法选型决策表、核心超参安全起手式、9 项训练监控告警排障矩阵与上线前烟雾体检清单。</p>

---

## 一、按任务与资源选型矩阵

| 你的当前场景 | 首选算法组合 | 推荐框架 | 关键配置提示 |
| --- | --- | --- | --- |
| **有成对人类/AI 偏好、算力紧张** | 离线 **DPO / SimPO**（进阶用迭代在线 DPO） | TRL / OpenRLHF | 监控正样本 logp 防似然位移，必要时加 $0.1\times$ NLL 锚定 |
| **仅有单条好/坏反馈、无成对数据** | **KTO** | TRL | 调整好/坏样本损失权重比例匹配数据分布 |
| **中小稠密模型（7B–32B）数学/代码 RLVR** | **DAPO** 或 **Dr.GRPO** 或 **CISPO** | veRL / OpenRLHF | $\beta=0$，Clip-Higher $(0.20, 0.28)$，动态采样过滤零方差组 |
| **高难推理且需保住 $\text{pass@}k$ 覆盖率** | **MaxRL**（优势除以 $\bar r$）+ 熵维持 | veRL | 增大组大小 $G$（如 $16\text{–}32$）提升截断阶数 $M$ |
| **同时优化多个异质奖励（正确+格式+长度）** | **GDPO**（或 GD²PO） | veRL | 严禁先求和再组标准化，先分项组标准化再 batch 归一 |
| **大型 MoE 模型（100B+）在线 RL** | **GSPO**，或 GRPO + **R3 / PR2 路由回放** | veRL / slime / NeMo-RL | GSPO 务必把 $\varepsilon$ 设为 $10^{-4}$ 量级；开启 TIS / IcePop |
| **环境提供详尽报错/评语、想提样本效率** | **SDPO**（可与 GRPO 混合） | TRL / veRL | 教师用 EMA 参数 + stop-gradient，Top-100 logits 算 JS 散度 |
| **多领域专家合并为统一旗舰模型** | 单域独立 RL + 多教师 **在线蒸馏（OPD）** | veRL / slime | 监控 $\text{pass@}k$ 多样性，高熵任务使用 Top-K 截断反向 KL |
| **多轮工具调用 / SWE 沙箱 Agent RL** | 异步分离 **GRPO / CISPO** + 观测掩码 $\mu_t$ | slime / AReaL / ROLL | 严格 Token-in-Token-out；按 Sweet Spot 动态调度课程 |

---

## 二、起手超参安全基线（首次开跑推荐）

- **优化器**：AdamW（$\beta_1=0.9, \beta_2=0.95/0.999$，weight decay `0.0` 或 `0.01`，grad clip `1.0`）
- **学习率**：$1 \times 10^{-6}$（常数调度 + 10–30 步线性预热）
- **采样温度**：`temperature = 1.0`，`top_p = 1.0`（若改变温度，训练前向必须按同一温度缩放 logits）
- **组大小与批次**：每批 128–512 道提示 × 每题 $G = 8\text{–}16$ 条回复；每轮 Rollout 后做 $1\text{–}2$ 次参数更新（`ppo_epochs = 1`，切分为 1–4 个 mini-batch）
- **KL 系数 $\beta$**：RLVR 起手 `0.0` 或 `0.001`；学习型 RM 起手 `0.02–0.05`
- **数值精度**：主体 BF16，**输出头 LM Head 强制 FP32 计算 logits 与 log-softmax**

---

## 三、9 大异常现象快速排障对照表

| 异常现象 | 最可能根因（按概率排序） | 立即核查与止血动作 |
| --- | --- | --- |
| **训练奖励骤升，验证集不动或下跌** | ① 奖励作弊 / 验证器漏洞 ② 格式奖励权重淹没主奖励 ③ 学习型 RM 过优化 | 抽检 20 条高分回复；收紧提取器与沙箱只读隔离；切 GDPO；提高 $\beta$ |
| **前 200 步策略熵直线归零、分数锁死** | ① 对称裁剪压死低概率探索词 ② 采样温度过低 ③ 学习率偏大 | 启用 DAPO Clip-Higher（0.28）或 CISPO；确认温度 $=1.0$；引入 Clip-Cov / 轻微熵奖 |
| **策略熵突然飙升、输出变乱码** | ① 训练-推理不一致累积爆炸 ② 温度未对齐 ③ MoE 路由剧烈翻转 ④ 学习率过大 | 检查 $\vert\log\pi_{\text{train}}-\log\pi_{\text{infer}}\vert$ 曲线；开启 TIS / IcePop；降 LR；MoE 换 GSPO 或 R3 |
| **答错回复平均长度持续暴涨** | ① 原始 GRPO 的 $1/\vert y_i\vert$ 长度偏差 ② 陷入重复复读 | 改为 Token 级聚合或 Dr.GRPO 常数分母；加入超长软惩罚与重复惩罚 |
| **截断比例（Truncated Ratio）持续 $>15\%$** | $L_{\max}$ 设置过紧，模型来不及给出最终答案即被截断判 $0$ | 启用 DAPO 超长缓冲带 $L_{\text{cache}}$ 或分阶段放宽上下文上限 |
| **零方差组比例超过 50%–70%** | 题库整体太简单（全对）或太难（全错），有效梯度样本枯竭 | 开启 DAPO 动态采样过滤；剔除已掌握题、按 $0.15\le p\le 0.85$ 刷新课程池 |
| **首步（未更新前）比率 $\rho_t$ 明显偏离 $1.0$** | ① 重新分词错位 ② 多轮观测掩码 $\mu_t$ 错位 ③ 推理/训练温度或对话模板不一致 | 落实 Token-in-Token-out 逐元素比对 `input_ids`；检查 logits 温度缩放与因果掩码对齐 |
| **裁剪比例（Clip Fraction）长期 $>15\%$** | 单批复用步数（inner epoch）过多、异步滞后 $d$ 过大或 LR 过高 | 减少每批更新步数至 1–2；收窄异步最大滞后 $d$；下调 LR 或引入 Mu-GRPO |
| **GPU 利用率低于 40%、单步耗时极慢** | 同步 Rollout 遭遇极端长尾回复或沙箱验证排队 | 开启 Prefix Caching；启用 Partial Rollout 或切换分离异步架构（slime / AReaL / PipelineRL） |

---

## 四、大算力开跑前 5 分钟烟雾体检清单

- [ ] **ID 零漂移检查**：`assert torch.equal(rollout_token_ids, trainer_input_ids)` 100% 通过
- [ ] **掩码零泄漏检查**：人工打印一条多轮轨迹中被 $\mu_t = 1$ 选中的解码文本，确认**绝对不含** Prompt 与工具返回观测
- [ ] **第 0 步一致性体检**：参数未更新前，记录 `mean(|logp_train - logp_infer|)` 与 `max(|logp_train - logp_infer|)`，确认无系统性偏移
- [ ] **验证器抗作弊审计**：向沙箱注入“试图读取测试文件 / 输出多个 `\boxed{}` / `sys.exit(0)`”对抗样例，确认全部判 0 分
- [ ] **独立验证集解耦**：确认验证集监控同时上报 `pass@1`、`pass@k`、平均长度与截断率，且独立于训练奖励代理
