# 第 15 章 质量 × 成本 × 延迟联合帕累托评测

<p class="chapter-summary">联动姐妹篇《LLM 推理工程》，打破“只追单轴准确率榜首”的架构误区，构建包含多轮上下文膨胀、缓存折扣与思考计费的双二维联合帕累托前沿（Accuracy vs USD/Task 与 E2E P95 Latency），并落地 SLA 约束下的模型路由与降级评测。</p>

技术选型会上最常见也最昂贵的决策失误，莫过于拿出一张只有一列数字的表格：“模型 A 通过率 85.2%，比方案 B 高 4.7 个百分点，全量切 A！”结果上线不到一周，业务方和财务同时找上门——模型 A 每次回答暗自生成两万个思考 Token，P95 响应耗时飙到 56 秒击穿用户忍耐极限，月度 API 账单暴涨近 8 倍，却只换来了不足 5% 的任务成功率增量。

离线评测一旦脱离推理系统的物理账本，结论就会在生产环境瞬间反噬。本章深度联动姐妹篇[《LLM 推理工程》](/books/llm-inference/)的[第 3 章推理度量](/books/llm-inference/chapters/chapter-03)、[第 8 章量化原理与取舍](/books/llm-inference/chapters/chapter-08)与[第 12 章生产成本路由](/books/llm-inference/chapters/chapter-12)，建立工程可复算的<strong><a class="term-ref" href="/books/llm-eval/glossary#pareto_frontier" title="质量、单任务成本与端到端 P95 延迟多维空间中不被其他方案同时碾压的最优折中集合">质量 × 成本 × 延迟联合帕累托前沿</a></strong>。

---

## 15.1 双二维联合帕累托：算清真实 `$/Task` 与多轮 E2E P95

选型评测必须同时绘制两张强耦合的二维平面图：<strong>面板 A（任务通过率 vs 单任务综合成本，对数轴）</strong>与<strong>面板 B（任务通过率 vs 端到端 P95 墙钟延迟）</strong>，并在图上清晰标出业务预算上限与 SLA 红线：

<figure class="book-figure">
  <img src="/figures/llm-eval/quality-cost-latency-pareto.svg" alt="质量乘成本乘延迟双面板联合帕累托前沿图" loading="lazy">
  <figcaption><span class="book-figure__label">图 15-1</span>多轮 Agent 选型教学算例的双二维联合帕累托前沿。蓝色折线为非支配前沿，灰三角为应直接淘汰的劣解；盲目追求榜首 M5 会双双落入超预算与超 SLA 红色禁区，而级联路由 M3 落于双面板联合甜点。</figcaption>
</figure>

### 一、单任务综合成本（`USD/Task`）的四个隐形放大器

比较模型开销绝不能只看官网标价“每百万 Token 多少美元”。在多轮 Agent 与推理模型场景中，单任务真实成本 $C_{\text{task}}$ 必须核算四个决定性放大项：

$$
C_{\text{task}} = K_{\text{eff}} \cdot \sum_{h=1}^{H}\Big[\underbrace{\big((1 - \gamma_h) + \alpha_{\text{cache}}\gamma_h\big)\,L_{\text{in}, h}\,p_{\text{in}}}_{\text{多轮输入膨胀与前缀缓存折扣}} \;+\; \underbrace{(L_{\text{think}, h} + L_{\text{ans}, h})\,p_{\text{out}}}_{\text{思考链与终答合并按输出高价计费}}\Big] + C_{\text{tool}}
$$

1. **多轮上下文二次膨胀**：设初始提示词与工具 Schema 占 $L_0 = 4{,}000$ Token，每轮工具返回与动作平均新增 $\Delta L = 1{,}500$ Token，交互 $H = 8$ 轮后总输入 Token 高达 $\sum_{h=1}^{8}(L_0 + (h-1)\Delta L) = 74{,}000$ Token，呈二次增长；
2. **Prompt Cache 命中折扣**（$\gamma_h, \alpha_{\text{cache}}$）：若前缀严格稳定（切忌在系统提示词里塞动态秒级时间戳破坏前缀！），第 2–8 轮历史 KV 缓存命中率 $\gamma_h$ 可达 75%–90%，配合厂商或自建引擎的缓存折扣系数 $\alpha_{\text{cache}} \in [0.1, 0.25]$，能将输入账单砍掉一半以上；
3. **思考 Token 溢价**：推理模型的隐式思维链通常占总输出 Token 的 70%–90%，且全部按通常为输入单价 3–5 倍的 $p_{\text{out}}$ 计费；
4. **重试与多采样分摊**（$K_{\text{eff}}$）：脚手架内嵌的失败重跑、多数投票（<a class="term-ref" href="/books/llm-eval/glossary#maj_at_k" title="对同一题目采样 k 条路径取最高频答案的测试时扩展指标">maj@k</a>）或级联升级均会按实际平均调用倍数 $K_{\text{eff}} \ge 1$ 线性放大成本。

**手算一笔直观账**：以上述 8 轮任务（总输入 74k Token、每轮思考 1,000 + 终答 250 = 总输出 10k Token）为例，按典型旗舰 API 定价（输入 3.0 USD/M、输出 15.0 USD/M、缓存折扣 $\alpha_{\text{cache}} = 0.15$）核算：
- 若系统提示词塞了动态时间戳导致前缀缓存全失效（$\gamma = 0$）：输入费 $0.074 \times 3.0 = 0.222$ USD，输出费 $0.010 \times 15.0 = 0.150$ USD，合计 **0.372 USD/Task**；
- 若锁死静态前缀使全 8 轮加权平均缓存命中率 $\bar\gamma = 0.85$（首轮命中跨请求静态 System Prompt 与 Tool Schema 缓存，第 2–8 轮复用对话历史前缀）：输入费骤降至 $0.074 \times (0.15 + 0.85 \times 0.15) \times 3.0 = 0.062$ USD，总成本近乎腰斩至 **0.212 USD/Task**——仅靠工程缓存习惯就白省 43% 账单，且输出思考费正式成为成本第一大头（占 71%）。

### 二、端到端多轮延迟拆解与 P95 尾部口径

对接[《LLM 推理工程》第 3 章](/books/llm-inference/chapters/chapter-03)的流式时间线口径，一条 $H$ 轮 Agent 任务的端到端墙钟耗时（Wall-Clock Latency）由每轮的首字延迟 $\mathrm{TTFT}_h$、生成解码段与外部工具等待串联累加：

$$
T_{\text{E2E}} = \sum_{h=1}^{H}\Big(\mathrm{TTFT}_h + (L_{\text{think}, h} + L_{\text{ans}, h})\cdot \mathrm{TPOT}_h + T_{\text{tool}, h}\Big)
$$

评测报告绝不能只报平均耗时——长思考尖峰与慢工具调用往往呈重尾分布，**P50 决定日常体感，P95 决定超时客诉与 SLA 合约违约率**。若为流式对话场景，还应把“首轮首字可见延迟”（含首轮隐式思考等待）与“整任务完成延迟”分开汇报。

---

## 15.2 底座、量化、思考预算与脚手架联合横评账本

以下给出一组完全可复算的教学对照账本（场景设定：500 道企业多轮工单/工具 Agent 任务，平均 6 轮交互，业务单任务预算红线 **0.15 USD/Task**，交互端到端 **P95 ≤ 30 s**），横向拆解底座尺寸、量化档位、思考预算与<a class="term-ref" href="/books/llm-eval/glossary#scaffold" title="包裹在底层 LLM 之外的系统提示词、工具封装、循环规划与重试编排逻辑">脚手架</a>策略在联合前沿上的真实落点：

| 代号与配置方案 | 通过率（Pass@1） | 单任务成本（USD/Task） | E2E P95 延迟（s） | 联合帕累托与上线门禁判定 |
| --- | --- | --- | --- | --- |
| <strong>M1：8B-W4A16（低思考直出）</strong> | 54.0% | 0.006 | 4.2 | 前沿点 · 极速低价，但质量低于常规业务底线（适合作前置分类/路由） |
| <strong>M2：32B-FP8（中思考单跑）</strong> | 71.0% | 0.024 | 11.5 | 前沿点 · 相对 BF16 带宽减半提速显著，高性价比主力单模型 |
| <strong>D1：70B-BF16（无路由单跑）</strong> | 68.0% | 0.095 | 24.0 | <strong>严格被支配（淘汰）</strong> · 比 M2 贵 4×、慢 2.1× 且通过率反低 3.0 pp |
| <strong>D2：32B-BF16（ReAct 重试×4）</strong> | 75.0% | 0.180 | 41.0 | <strong>被支配且双越界（淘汰）</strong> · 暴涨成本与尾延迟，仍弱于 M3 |
| <strong>M3：级联路由（M2 68% → M4 32%）</strong> | <strong>80.5%</strong> | **0.062** | **18.4** | <strong>联合帕累托甜点（推荐上线）</strong> · 满足双绿灯，相对 M5 省 87% 账单 |
| <strong>M4：旗舰模型（Medium Thinking）</strong> | 83.0% | 0.140 | 27.8 | 前沿点 · 高质量但贴近预算（0.15）与 SLA（30 s）双红线 |
| <strong>M5：旗舰模型（High Thinking）</strong> | 85.2% | 0.480 | 56.0 | 单轴榜首 · **击穿预算与 SLA 禁区**（仅限离线批处理或极高价值工单） |

账本清晰揭示了三条常被忽视的工程规律：

- **FP8 / W4A16 量化是重塑前沿的首要杠杆**：联动[《LLM 推理工程》第 8 章](/books/llm-inference/chapters/chapter-08)的 Roofline 带宽账，把 32B 模型从 BF16 压到 FP8 可让 Decode 显存搬运量减半、单卡显存腾出翻倍 KV 空间；只要通过[专题 C](/books/llm-eval/topics/quant-and-chip-regression)的量化精度回归门禁，中等尺寸 FP8 模型往往能在前沿上彻底碾压未量化的老一代 70B-BF16 模型；
- **思考预算存在陡峭的边际递减墙**：从 M4（中思考）拉到 M5（高思考），通过率仅增 $+2.2\text{ pp}$，成本却飙升 $3.4\times$、P95 延迟翻倍突破 56 秒；实操中应将思考预算（`reasoning_effort` / `thinking_budget`）作为独立超参在联合前沿上扫描，而非无脑拉满；
- **级联路由是最具杠杆的架构创新**：在 M3 中，先由轻量网关将 68% 常规任务分发给 M2（0.024 USD/Task），仅将 32% 复杂多跳任务路由至 M4（0.140 USD/Task），综合成本精确落在 $0.68 \times 0.024 + 0.32 \times 0.140 + 0.001 \approx 0.062\text{ USD/Task}$。注意 **P95 分位数不能像成本一样按比例线性加权**：表内 M3 的 P95 从 M4 的 27.8 s 降至 18.4 s，是因为在固定集群算力与目标 QPS 下，M2 分流了 68% 的请求，大幅削减了 M4 节点的队列排队延迟；若不计排队缓解效应，最慢 5% 的复杂长尾仍落在 M4 上，整体 P95 会保持接近 M4 水平。即便如此，若盲目追逐榜首 M5，仍需付出 **$7.7\times$ 成本与破 SLA 的代价** 换区区 $+4.7\text{ pp}$ 增量。

::: warning 警惕离线单并发测出的「伪低延迟」
离线评测集群往往在低并发下串行测速，几乎没有队列排队与 KV 显存争抢。根据[《LLM 推理工程》第 3 章](/books/llm-inference/chapters/chapter-03)的并发拐点规律，高并发下 TTFT 与 ITL 可能恶化 2–5 倍。进入最终 SLA 拍板前，必须在目标线上 QPS 压力下复测 P95，并将真实推理并发延迟代入面板 B，而非拿单请求冷测耗时充数。
:::

---

## 15.3 SLA 约束下的效用函数与路由降级评测

当多个前沿方案（如 M2、M3、M4）同时满足硬性红线时，团队应与业务方共同对齐显式的**净效用目标函数**，把拍脑袋争论变成定量权衡：

$$
\max_{m \in \mathcal{M}} \; U(m) = V_{\text{pass}} \cdot \hat p_m - C_{\text{task}}(m) - \lambda_{\text{fail}} \cdot (1 - \hat p_m)
\quad \text{s.t.} \quad
\mathrm{P95}_m \le T_{\text{SLA}},\;\; C_{\text{task}}(m) \le C_{\max}
$$

其中 $V_{\text{pass}}$ 为单次任务成功创造的业务价值（例如自动解决一张工单节省的人工客服成本 2.50 美元），$\lambda_{\text{fail}}$ 为答错或误操作带来的客诉/返工罚金。代入 $V_{\text{pass}} = 2.50$、$\lambda_{\text{fail}} = 0.50$ 可立得：M3 的单任务净效用为 $2.50 \times 0.805 - 0.062 - 0.50 \times 0.195 = 1.853$ 美元，而 M5 仅为 $2.50 \times 0.852 - 0.480 - 0.50 \times 0.148 = 1.576$ 美元——**哪怕不计 SLA 违约，榜首模型 M5 在商业账本上也是净亏 15% 的劣解**。

下面的极简 Python 函数可直接嵌入评测报表管线，自动剔除三轴被支配劣解、校验预算与 SLA 硬约束，并按业务净效用排序选出上线候选：

```python
from dataclasses import dataclass

@dataclass
class EvalPoint:
    name: str
    acc: float         # 任务通过率 [0, 1]
    cost_usd: float    # 单任务综合美元成本
    p95_s: float       # 目标 QPS 下端到端 P95 延迟（秒）

def select_pareto_winner(
    points: list[EvalPoint], budget_cap: float, sla_s: float,
    v_pass: float = 2.50, fail_penalty: float = 0.50,
) -> list[tuple[str, float, bool]]:
    def is_dominated(p: EvalPoint) -> bool:
        return any(
            q.name != p.name and q.acc >= p.acc and q.cost_usd <= p.cost_usd and q.p95_s <= p.p95_s
            and (q.acc > p.acc or q.cost_usd < p.cost_usd or q.p95_s < p.p95_s)
            for q in points
        )
    frontier = [p for p in points if not is_dominated(p)]
    feasible = [p for p in frontier if p.cost_usd <= budget_cap and p.p95_s <= sla_s]
    scored = [
        (p.name, round(v_pass * p.acc - p.cost_usd - fail_penalty * (1 - p.acc), 3), True)
        for p in feasible
    ]
    return sorted(scored, key=lambda x: x[1], reverse=True)
```

对于自建开源模型集群（如 H100/A100 跑 vLLM FP8），需严格按[《LLM 推理工程》第 12 章](/books/llm-inference/chapters/chapter-12)的折旧公式把 GPU 租金折算为等效单价，确保自建与外部 API 站在同一条成本轴上公平比价：

$$
p_{\text{eff}} \;(\text{USD / 1M tok}) \;=\; \frac{\text{节点每小时折旧与电费租金（USD/h）}}{3{,}600 \times \text{目标 SLA 下的有效吞吐（tok/s）} \times u_{\text{avg}}} \times 10^6
$$

其中 $u_{\text{avg}} \in [0.35, 0.65]$ 为考虑峰谷潮汐后的全天平均算力利用率——**千万不要用满载峰值吞吐除以硬件成本来算账**，那会把真实单任务成本低估 2–3 倍。

对于引入了多后端成本路由与原子预算账本的系统，评测不能只测“风平浪静时的静态平均分”，还必须补齐三项**动态路由验收测试**：

1. <strong>覆盖率-准确率曲线（Coverage-Accuracy Curve）</strong>：扫描路由置信度阈值 $\tau$，绘制轻量模型承接比例从 0% 到 100% 变化时的整体通过率与成本轨迹，验证路由器相对“随机按比例抽签分流”具有显著正增益（经 <a class="term-ref" href="/books/llm-eval/glossary#paired_bootstrap" title="以题目为单位成对重采样计算两模型差值置信区间的显著性检验">Paired Bootstrap</a> 检验超过 <a class="term-ref" href="/books/llm-eval/glossary#mde" title="给定样本量与功效下能稳定测出的最小真实分差">MDE</a>）；
2. **故障与预算降级韧性测试**：人为注入主后端限流（429）、高队列深度或租户单日预算耗尽信号，验证路由器触发降级至轻量模型后的兜底通过率与连续可靠性 <a class="term-ref" href="/books/llm-eval/glossary#pass_hat_k" title="同一任务连续独立执行 k 次全部成功的生产可靠性指标">pass^k</a>，确保降级期间不发生越权或工具误删；
3. **前缀缓存稳定性审计**：统计多轮请求的真实 `cached_tokens / prompt_tokens` 命中率，确保缓存命中率不低于设定基线（通常要求多轮任务 $\ge 60\%$）。

::: tip 当整条帕累托前沿都不满足业务门槛时
如果最优前沿上的最高性价比点仍离上线质量底线差 10 个百分点，继续往右上角堆算力只会把账单烧穿。此时唯一的高 ROI 路径，是立刻停下盲目调参，进入[第 16 章](/books/llm-eval/chapters/chapter-16)开展系统化误差分析——把前沿整体向上“抬升”一截，而不是沿着旧曲线硬买更贵的模型。
:::
