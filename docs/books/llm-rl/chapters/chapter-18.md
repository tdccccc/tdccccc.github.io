# 第 18 章 训练-推理不一致、Off-Policy 稳定性与 MoE 难题

<p class="chapter-summary">解剖同一组权重下 π_train ≠ π_infer 的底层算子与数值根因，系统梳理截断重要性采样（TIS）、双侧掩码（MIS / IcePop）与 Mu-GRPO 陈旧过滤，攻克 MoE 路由抖动（R3 / PR2 / GSPO），并以 Qwen 统一近似视角收束精度与稳定性工程。</p>

很多团队在百卡规模上跑长思维链或 MoE 模型的 RL 时，都经历过令人窒息的一幕：前 800 步一切岁月静好，奖励稳步攀升、验证分屡创新高；突然在第 820 步，毫无征兆地出现一次梯度尖峰，紧接着策略熵瞬间爆炸，模型开始疯狂吐出乱码，整次价值数十万元的训练彻底报废。

2025 年下半年至 2026 年，学术界与工业界（Yao 等、蚂蚁 Ring、Qwen、NVIDIA、DeepSeek 等）终于揪出了隐藏在无数“玄学崩溃”背后的真正元凶：**训练框架与推理引擎之间的概率不一致（Rollout-Training Mismatch）**。

---

## 18.1 同一组权重，为什么 $\pi_{\text{train}} \ne \pi_{\text{infer}}$？

理论上，只要把训练器当前参数 $\theta$ 原封不动同步到 vLLM / SGLang，在 $d = 0$ 的同步 RL 第一次更新前，重要性比 $\frac{\pi_{\text{train}}(y_t\mid s_t)}{\pi_{\text{infer}}(y_t\mid s_t)}$ 应当恒等于 $1.0000$。但你把真实日志打出来一看，总会惊讶地发现存在不可忽视的对数概率差 $|\log\pi_{\text{train}} - \log\pi_{\text{infer}}|$，个别尾部 token 的比率甚至偏离至 $0.5$ 或 $2.0$ 以上！

<figure class="book-figure">
  <img src="/figures/llm-rl/train-infer-mismatch.svg" alt="训练-推理概率不一致根因与修正工具箱" loading="lazy">
  <figcaption><span class="book-figure__label">图 18-1</span>同一组 BF16 权重经过推理与训练两条不同算子栈产生概率漂移的机理，以及 TIS、MIS/IcePop 与精度工程四类修复手段。</figcaption>
</figure>

差异来自五个叠加的工程底层原因：
1. **底层算子实现不同**：推理引擎跑的是 PagedAttention / FlashInfer、定制化 fused RMSNorm / RoPE 与解码 GEMV 核；训练框架跑的是 FlashAttention 训练核、序列打包（Sequence Packing）与 FSDP/Megatron 通信切分 GEMM；
2. **BF16 尾数精度与非结合律**：BF16 虽然动态范围宽，但尾数只有 **7 位**（相对精度约 $0.8\%$）。浮点加法不满足结合律，批大小变化、张量并行切分方式不同都会改变归约求和顺序，误差经 32–80 层 Transformer 逐层放大；
3. **采样温度未对齐（经典低级但高频的坑）**：Rollout 若以温度 $T \ne 1.0$ 采样，而训练端计算 $\log\pi_{\text{train}}$ 时忘记同样将 logits 除以 $T$，会导致比率从第一步起就系统性偏离 $1$；
4. **分词往返错位**：若未严格遵守第 14 章的 Token-in-Token-out，重新分词错开 1 个 token 就会引发灾难性漂移；
5. **MoE 路由器的离散放大效应**：在 MoE 模型中，连续层里 $10^{-4}$ 级别的数值微小扰动，一旦跨过 Top-$K$ 专家排序的临界点，就会触发**离散路由翻转**（见 18.3 节），把微小误差瞬间放大百倍！

**核心后果**：由于样本实际上是由 $\pi_{\text{infer}}$ 采样、梯度却按 $\pi_{\text{train}}$ 计算，**名义上的 on-policy 训练在底层其实是隐蔽的 off-policy 训练**。当某条低概率长尾 token 在 $\pi_{\text{infer}}$ 下被抽中、但在 $\pi_{\text{train}}$ 下概率极低时，反向梯度 $\nabla_\theta \log\pi_{\text{train}}$ 叠加长序列累积，就会在某一步瞬间引爆梯度范数。

---

## 18.2 数学修正工具箱：TIS、MIS / IcePop 与 Mu-GRPO

既然样本的真实采样分布是 $\pi_{\text{infer}}$（而非 $\pi_{\text{train}}$），最直接的第一性修复就是在策略梯度上显式补回**训练-推理重要性修正项**。

### 1. 截断重要性采样（<a class="term-ref" href="/books/llm-rl/glossary#tis" title="TIS，截断重要性采样：乘以截断后的训练-推理概率比以修正两套引擎的数值不一致">TIS</a>，Yao 等，OPT 2025）
在每个 token 的梯度前乘上经过上界截断的跨引擎比率，阈值记作 $C_{\text{TIS}}$（原文记作 $C$，本书加下标以区别于 ScaleRL 的计算量 $C$）：

$$
\nabla_\theta J \approx \mathbb{E}_{y\sim\pi_{\text{infer}}}\Bigg[\sum_{t}\min\!\left(\frac{\pi_{\text{train}}(y_t\mid s_t)}{\pi_{\text{infer}}(y_t\mid s_t)},\; C_{\text{TIS}}\right)\,\hat A_t\,\nabla_\theta\log\pi_{\text{train}}(y_t\mid s_t)\Bigg]
$$

- **不要混淆两个比率**：PPO 的 $\rho_t = \frac{\pi_\theta}{\pi_{\theta_{\text{old}}}}$ 修正的是**参数迭代更新**带来的策略变化；TIS 的 $\frac{\pi_{\text{train}}}{\pi_{\text{infer}}}$ 修正的是**同一参数在两套框架实现**上的数值差异。在多步更新或异步 RL 中，两者可以优雅地**直接相乘叠加**；
- 截断阈值 $C_{\text{TIS}}$（常见如 $2.0\text{–}5.0$）用于封顶极端噪声 token 的权重，防止方差爆炸。

### 2. 双侧掩码：MIS 与 IcePop（蚂蚁 Ring 团队，2025）
截断（TIS）在比率极端偏离时仍保留一个封顶权重；更保守的做法是**掩码重要性采样（MIS, Masked Importance Sampling）** 与蚂蚁 Ring 团队提出的 **IcePop**：
- 设定上下双侧安全区间 $[\alpha_{\text{low}}, \alpha_{\text{high}}]$（如 $[0.5, 2.0]$）；
- 只要某个 token（或整条序列）的跨引擎比率 $\frac{\pi_{\text{train}}}{\pi_{\text{infer}}}$ 跌出区间，直接令其掩码为 **0（彻底屏蔽该 token 梯度）**，宁可舍弃少量异常数据，绝不让一颗老鼠屎炸毁整次百卡训练。

### 3. 异步陈旧度极限：Mu-GRPO（2026-05，arXiv `2605.17570`）
在异步分离训练（第 17 章）里，除了跨引擎误差，还叠加了来自滞后权重 $\theta_{k-d}$ 的**策略陈旧度（Off-policy Staleness）**。**Mu-GRPO** 系统研究了 GRPO 究竟能容忍多大程度的 off-policy：
- 论文发现，陈旧样本在**正优势**回复上通常相对温和，但在**负优势**回复上极易把已经压低的概率继续猛砸引发数值崩溃；
- Mu-GRPO 在保留陈旧样本中仍有价值梯度的同时，精准过滤负优势轨迹上诱发不稳定的陈旧更新，作者报告在五个模型的数学基准上追平或超越同步 GRPO，同时把墙钟训练时间缩短约 **2 倍**（作者自报）。

---

## 18.3 MoE 专属稳定性难题：路由翻转、R3、PR2 与 GSPO

在稠密模型上，训练-推理不一致有时还能靠调小学习率勉强混过去；但在大型 **MoE（混合专家）模型**（如 DeepSeek-V3 / Qwen3-MoE）上，这个问题直接上升为生死线。

<figure class="book-figure">
  <img src="/figures/llm-rl/moe-routing-replay.svg" alt="MoE 模型路由翻转根因与 R3、PR2、GSPO 三类稳态方案对比" loading="lazy">
  <figcaption><span class="book-figure__label">图 18-2</span>MoE 路由器将微小的 BF16 浮点差异放大为离散的“换专家”突变。工业界已沉淀出系统侧（R3 / PR2）与算法侧（GSPO）两大类根治路线。</figcaption>
</figure>

目前社区围绕 MoE RL 稳定性收敛出了三套主力方案：

1. **<a class="term-ref" href="/books/llm-rl/glossary#routing_replay" title="Routing Replay，路由回放：记录推理阶段 MoE 选中的专家并在训练前向强制复用">路由回放（R3, Rollout Routing Replay）</a>**（2025-10，arXiv `2510.11370`）：
   - **机制**：在推理引擎做 Rollout 时，顺手记录每个 token 在每一层 MoE 路由器实际选中的 Top-$K$ 专家索引；送回训练器算前向与反向时，强制关闭训练侧路由器重算、直接**原样回放**推理时记录的专家路由；
   - **效果**：从物理源头把路由差异压成严格零，NVIDIA NeMo-RL 等框架已将其纳入原生特性。
2. **预测式路由回放（PR2, Predictive Routing Replay）**（2026-06，arXiv `2606.00395`）：
   - **洞察**：静态回放 R3 在纯同步场景近乎完美，但在异步或多步 off-policy 更新下，路由器本身的参数已经更新漂移了，死板沿用旧路由反而会引入偏差；
   - **改进**：PR2 在回放前显式预测路由器在短期参数更新后的路由变化趋势，进一步收窄了异步 MoE 训练的分布失配。
3. **算法侧免疫：序列级 GSPO**（第 9 章，Qwen 2025-07）：
   - 无需侵入推理引擎内核保存海量的逐层专家索引，而是把重要性比提升到整条序列的几何平均 $g_i(\theta)$，天然将个别 token 路由切换产生的尖峰摊平在整个序列里，以极低的工程侵入性稳住大型 MoE 训练。

---

## 18.4 精度工程与 Qwen 统一稳定性视角

除了重要性修正与路由回放，**浮点精度配置**也是决定训练上限与稳定性的隐藏开关：
- **BF16 vs FP16**：有研究尝试用尾数达 10 位（精度高于 BF16 的 7 位）的 **FP16** 替代 BF16，实测确实能大幅缩小 $\pi_{\text{train}}$ 与 $\pi_{\text{infer}}$ 的数值差异；但在超大规模与长轨迹下，FP16 窄动态范围容易发生梯度下溢/上溢，需要极其小心的动态 Loss Scaling；
- **输出头（LM Head）FP32 Logits**：Meta 的 **ScaleRL**（第 20 章）在大规模消融中证实，保持主体网络 BF16 高效计算，仅在最后词表投影输出头强制用 **FP32** 计算 logits 与 softmax 对数概率，不仅大幅改善数值一致性，还实实在在抬高了最终渐近性能上限 $R_\infty$！

### Qwen 的统一理论视角
Qwen 团队在 *Stabilizing RL with LLMs: Formulation and Practices*（2025-12，arXiv `2512.01374`）中给出了一个极其通透的收束框架：

> 所有主流 token 级目标函数（PPO / GRPO / DAPO）在数学上都只是精确**序列级策略目标的一阶泰勒近似**。这个一阶近似成立的充要前提，是**跨引擎误差（$\pi_{\text{train}}$ vs $\pi_{\text{infer}}$）与策略陈旧度（$\pi_\theta$ vs $\pi_{\theta_{\text{old}}}$）同时保持足够小**。
>
> 回头看整章技术栈——**TIS / IcePop / Mu-GRPO、R3 / PR2 路由回放、FP32 Logits、乃至 GSPO 回归序列级目标**——本质上全部是在从不同侧面守护这一近似条件不被击穿。

看透了系统架构与数值稳定性的底层逻辑，下一章我们落到具体选型：当前开源生态里 **veRL、slime、AReaL、OpenRLHF、ROLL、NeMo-RL、TRL** 七大框架各自长什么样，不同规模团队该怎么选？
