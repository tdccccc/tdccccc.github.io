# 全局符号约定与核心公式速查卡

<p class="chapter-summary">全书唯一数学口径事实源：彻底消除跨论文符号撞车（如 PPO 的概率比、SimPO 的间隔、GSPO 的序列比率与 MaxRL 的截断阶数），并提供全书关键推导索引与核心公式速查。</p>

大模型后训练强化学习的论文横跨经典 RL、NLP 对齐、推理扩展与系统工程四个社区，符号撞车极为普遍：PPO 原文用 $r_t(\theta)$ 表示重要性比，和奖励 $r$ 冲突；SimPO 用 $\gamma$ 表示间隔，和折扣因子冲突；GSPO 用 $s_i$ 表示序列比率，和状态 $s_t$ 冲突；MaxRL 用 $T$ 表示截断阶数，和序列长度 $T$ 冲突；ScaleRL 用 $A$ 表示渐近上限，和优势函数冲突。

本书在全书 20 章与 4 篇专题中**强制统一**使用下面两张符号表；引用论文公式时均已改写为本套记号，并在对应章节注明原文记号。

---

## 一、全局符号表

| 符号 | 含义 | 说明 / 原文冲突备注 |
| --- | --- | --- |
| $x \sim \mathcal{D}$ | 提示（prompt） | 从提示分布 $\mathcal{D}$ 中采样 |
| $y = (y_1, \dots, y_T)$ | 模型回复 | $T = \lvert y \rvert$ 为回复 token 总数；MaxRL 截断阶数另记作 $M$ |
| $y_{<t},\; s_t$ | 前缀与状态 | $y_{<t} = (y_1,\dots,y_{t-1})$，第 $t$ 步状态 $s_t = (x, y_{<t})$ |
| $\pi_\theta$ | 当前策略 | 正在优化的大语言模型，参数为 $\theta$ |
| $\pi_{\theta_{\text{old}}}$ | 旧策略（行为策略） | 采样本批 rollout 轨迹时的冻结策略 |
| $\pi_{\text{ref}}$ | 参考策略 | 通常为 SFT 检查点，用于 KL 正则，训练期间冻结 |
| $\pi_{\text{train}},\; \pi_{\text{infer}}$ | 训练 / 推理侧策略概率 | 同一组参数在训练框架与推理引擎中算出的实际概率（第 18 章） |
| $\pi_{\mathrm{T}}$ | 教师策略 | 在线蒸馏（OPD）中的教师模型（第 13 章） |
| $\pi^\star$ | KL 正则目标闭式最优解 | $\pi^\star \propto \pi_{\text{ref}}\exp(r/\beta)$（第 2 章、第 7 章） |
| $r(x, y),\; r_\phi$ | 序列级奖励与奖励模型 | 规则验证器输出或参数为 $\phi$ 的奖励模型打分 |
| $\tilde r_t$ | 含 KL 惩罚的 token 级奖励 | $\tilde r_t = -\beta\log\frac{\pi_\theta(y_t\mid s_t)}{\pi_{\text{ref}}(y_t\mid s_t)} + \mathbf{1}[t=T]\,r(x,y)$ |
| $\beta$ | KL 正则系数 | 控制奖励优化与贴近 $\pi_{\text{ref}}$ 的权衡，亦称“奖励温度” |
| $\rho_t(\theta),\; \rho_{i,t}(\theta)$ | token 级重要性比 | $\pi_\theta(y_t\mid s_t) / \pi_{\theta_{\text{old}}}(y_t\mid s_t)$（PPO 原文记作 $r_t$） |
| $A_t,\; \hat A_t,\; \hat A_{i,t}$ | 优势函数及其估计值 | 某动作相对当前状态平均水平的超额回报 |
| $V_\psi(s_t)$ | 价值函数（Critic） | 参数为 $\psi$，估计从状态 $s_t$ 出发的期望未来回报 |
| $\gamma,\; \lambda$ | 折扣因子与 GAE 参数 | LLM 场景常取 $\gamma = 1$，$\lambda \in [0.95, 1]$ |
| $\varepsilon,\; \varepsilon_{\text{low}}, \varepsilon_{\text{high}}$ | 裁剪超参 | 对称 PPO 裁剪区间或 DAPO 非对称下界/上界 |
| $G,\; y_i,\; r_i$ | 组大小、组内第 $i$ 条回复与奖励 | GRPO 类算法对每个提示采样 $G$ 条回复，$y_{i,t}$ 为第 $i$ 条的第 $t$ 个 token |
| $N,\; K,\; p$ | 采样数、成功数与组内通过率 | $K = \sum_i r_i$，$p = K/G$ 或 $K/N$ |
| $\bar r$ | 组内平均奖励 | $\bar r = \frac{1}{G}\sum_{i=1}^G r_i$ |
| $M$ | MaxRL 截断阶数 | 原文记作 $T$；$M=1$ 退化为标准 RL，$M\to\infty$ 恢复最大似然（第 10 章） |
| $L_{\max},\; L_{\text{cache}}$ | 最大生成长度与超长缓冲长度 | 用于截断与 DAPO 超长奖励塑形（第 9 章） |
| $\mu_t \in \{0, 1\}$ | 损失掩码 | 工具返回等环境观测 token 取 0（原文记作 $m_t$，避免与 SimPO 间隔混淆） |
| $C_{\text{TIS}}$ | TIS 截断阈值 | 原文记作 $C$，加下标以区别于 ScaleRL 计算量 $C$（第 18 章） |
| $y_w,\; y_l$ | 偏好对中的胜出 / 落败回复 | $y_w \succ y_l$（win / lose） |
| $\sigma(\cdot)$ | Sigmoid 函数 | $\sigma(z) = 1 / (1 + e^{-z})$ |
| $\mathbb{D}_{\mathrm{KL}}[p \,\|\, q]$ | KL 散度（相对熵） | $\mathbb{E}_{z\sim p}[\log(p(z)/q(z))] \ge 0$，不对称 |
| $\operatorname{sg}(\cdot),\; \mathbf{1}[\cdot]$ | 停止梯度与示性函数 | 前向按值参与、反向不传梯度；条件真取 1 否则取 0 |

---

## 二、局部专用符号表

| 符号 | 含义 | 所在章节 |
| --- | --- | --- |
| $n$ | 一次排序比较的回复数（InstructGPT 原记作 $K$） | 第 4 章 |
| $y^\star$ | 示范回复或标准参考答案 | 第 1 章、第 5 章 |
| $Z(x)$ | KL 闭式解的配分函数 $\sum_y \pi_{\text{ref}}(y\mid x)\exp(r(x,y)/\beta)$ | 第 2 章、第 7 章 |
| $h_\theta$ | DPO 隐式对数概率差 $\log\frac{\pi_\theta(y_w\mid x)}{\pi_{\text{ref}}(y_w\mid x)} - \log\frac{\pi_\theta(y_l\mid x)}{\pi_{\text{ref}}(y_l\mid x)}$ | 第 7 章 |
| $z_0$ | KTO 参考点（KL 的批内估计） | 第 7 章 |
| $\tau,\; m$ | IPO 温度参数；SimPO 间隔（原文记作 $\gamma$） | 第 7 章 |
| $g_i(\theta)$ | GSPO 序列级几何平均重要性比（原文记作 $s_i$） | 第 9 章 |
| $\hat\rho_{i,t},\; \varepsilon^{\text{IS}}_{\text{low}}, \varepsilon^{\text{IS}}_{\text{high}}$ | CISPO 裁剪后重要性权重与上下界 | 第 9 章 |
| $\hat R_t$ | 价值函数回归目标 $\hat A_t + V_{\psi_{\text{old}}}(s_t)$ | 第 3 章、第 7 章 |
| $\eta$ | GDPO 批归一化分母稳定常数 | 第 10 章 |
| $w_k,\; c_k$ | 评分细则（Rubric）第 $k$ 项权重与检查项 | 第 5 章 |
| $\mathcal{H},\; a,\; b$ | 策略熵与熵-性能经验律 $R = -a e^{\mathcal{H}} + b$ 拟合常数 | 第 12 章 |
| $R_C, R_0, R_\infty, B, C_{\text{mid}}$ | ScaleRL S 形扩展曲线参数（原文将渐近上限记作 $A$） | 第 20 章 |

---

## 三、全书核心公式速查卡

所有序列概率均满足自回归分解，这是全书推导反复使用的第一条恒等式：

$$
\pi_\theta(y \mid x) = \prod_{t=1}^{T} \pi_\theta(y_t \mid s_t), \qquad \log \pi_\theta(y \mid x) = \sum_{t=1}^{T} \log \pi_\theta(y_t \mid s_t)
$$

1. **统一 KL 正则目标与闭式最优解**（第 2 章）：

$$
J_\beta(\theta) = \mathbb{E}_{x\sim\mathcal{D}}\Big[\mathbb{E}_{y\sim\pi_\theta}[r(x,y)] - \beta\,\mathbb{D}_{\mathrm{KL}}[\pi_\theta \|\pi_{\text{ref}}]\Big], \quad \pi^\star(y\mid x) = \frac{1}{Z(x)}\pi_{\text{ref}}(y\mid x)\exp\!\left(\frac{r(x,y)}{\beta}\right)
$$

2. **策略梯度定理与基线方差缩减**（第 3 章）：

$$
\nabla_\theta J(\theta) = \mathbb{E}_{y\sim\pi_\theta}\Big[\big(r(x,y) - b(x)\big)\sum_{t=1}^{T}\nabla_\theta\log\pi_\theta(y_t\mid s_t)\Big]
$$

3. **GAE 广义优势估计与 PPO 裁剪目标**（第 3 章）：

$$
\hat A_t^{\text{GAE}} = \sum_{l=0}^{T-t}(\gamma\lambda)^l\big(\tilde r_{t+l} + \gamma V_\psi(s_{t+l+1}) - V_\psi(s_{t+l})\big), \quad L^{\text{CLIP}} = \mathbb{E}_t\Big[\min\big(\rho_t\hat A_t,\;\operatorname{clip}(\rho_t, 1-\varepsilon, 1+\varepsilon)\hat A_t\big)\Big]
$$

4. **DPO 偏好损失**（第 7 章）：

$$
\mathcal{L}_{\text{DPO}}(\theta) = -\mathbb{E}_{(x,y_w,y_l)}\Big[\log\sigma\big(\beta\, h_\theta(x,y_w,y_l)\big)\Big]
$$

5. **组相对优势谱系**（第 8–10 章，二值奖励通过率 $p = K/G = \bar r$）：

| 方法 | 优势形式 $\hat A_i$ | 核心特征 |
| --- | --- | --- |
| **GRPO** | $(r_i - \bar r) / \operatorname{std}(\{r_j\})$ | 组内标准化，易受难度与长度偏差影响 |
| **Dr.GRPO** | $r_i - \bar r$ | 去掉标准差并改用常数 $L_{\max}$ 归一化 |
| **RLOO** | $\frac{G}{G-1}(r_i - \bar r)$ | 严格留一法无偏基线，与去标准差 GRPO 同向 |
| **MaxRL** | $(r_i - \bar r) / \bar r$（$K\ge 1$） | 逼近最大似然 $\log p$，按 $1/p$ 放大难题梯度 |

6. **GSPO 与 CISPO 替代目标**（第 9 章）：

$$
g_i(\theta) = \exp\!\left(\frac{1}{|y_i|}\sum_{t=1}^{|y_i|}\log\rho_{i,t}(\theta)\right), \qquad J_{\text{CISPO}} = \mathbb{E}\Bigg[\frac{1}{\sum_i|y_i|}\sum_{i,t}\operatorname{sg}(\hat\rho_{i,t})\,\hat A_{i,t}\log\pi_\theta(y_{i,t}\mid s_{i,t})\Bigg]
$$

7. **SDPO / OPD 反向 KL 等价逐 token 策略梯度**（第 10 章、第 13 章）：

$$
A_t^{\text{distill}}(\hat y) = \log \pi_{\mathrm{T}}(\hat y \mid s_t) - \log \pi_\theta(\hat y \mid s_t)
$$

8. **截断重要性采样（TIS）与 ScaleRL 扩展律**（第 18 章、第 20 章）：

$$
w_t^{\text{TIS}} = \min\!\left(\frac{\pi_{\text{train}}(y_t\mid s_t)}{\pi_{\text{infer}}(y_t\mid s_t)},\; C_{\text{TIS}}\right), \qquad R_C = R_0 + \frac{R_\infty - R_0}{1 + (C_{\text{mid}}/C)^B}
$$

---

## 四、全书完整推导索引

| 推导主题 | 对应位置 |
| --- | --- |
| SFT 负梯度与策略梯度的等价对照 | [第 1 章](../chapters/chapter-01.md) |
| KL 正则目标闭式最优解 $\pi^\star$ | [第 2 章](../chapters/chapter-02.md) |
| $k_3$ KL 估计量的无偏性与非负性证明 | [第 2 章](../chapters/chapter-02.md) |
| 对数导数技巧与基线无偏降方差证明 | [第 3 章](../chapters/chapter-03.md) |
| GAE 望远镜求和（$\lambda=1$ 退化为蒙特卡洛回报减基线） | [第 3 章](../chapters/chapter-03.md) |
| PPO 裁剪目标按优势符号拆解的分段形式 | [第 3 章](../chapters/chapter-03.md) |
| Bradley-Terry 损失平移不变性与梯度聚焦 | [第 4 章](../chapters/chapter-04.md) |
| DPO 三步推导与梯度权重剖析 | [第 7 章](../chapters/chapter-07.md) |
| RLOO 留一法基线的代数变形与二值奖励 GRPO 闭式优势 | [第 8 章](../chapters/chapter-08.md) |
| MaxRL $\log p$ 调和展开为 $\sum \frac{1}{k}\text{pass@}k$ | [第 10 章](../chapters/chapter-10.md) |
| SDPO 与 OPD 反向 KL 梯度等价于逐 token 策略梯度 | [第 10 章](../chapters/chapter-10.md) · [第 13 章](../chapters/chapter-13.md) |
