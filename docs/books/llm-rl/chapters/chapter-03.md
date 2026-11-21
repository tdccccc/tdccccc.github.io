# 第 3 章 策略梯度、价值估计与信赖域裁剪

<p class="chapter-summary">系统推导策略梯度定理、基线降方差证明、TD 误差与 GAE 望远镜求和，以及从重要性采样、TRPO 信赖域到 PPO 裁剪替代目标的分段几何结构（内嵌 PPO / DAPO 裁剪交互实验）。</p>

上一章已经把 LLM 后训练写成了一个清晰的优化目标。但奖励函数 $r(x,y)$ 往往完全不可微——它可能是代码单元测试的通过状态、数学答案的符号等价比对，或是人类标注员点下的“点赞”。梯度如何穿过不可微的奖励函数与离散的 token 采样，反传回大模型的百亿参数？本章用四步把经典策略优化的核心工具一次推透。

<figure class="book-figure">
  <img src="/figures/llm-rl/pg-gae-flow.svg" alt="策略梯度从 REINFORCE 到基线、GAE 与 PPO-Clip 的四步演进" loading="lazy">
  <figcaption><span class="book-figure__label">图 3-1</span>策略优化的骨架演进。后续章节中所有现代 LLM RL 算法（PPO、RLOO、GRPO、DAPO、CISPO），本质上都在微调这四步里的某一个零件。</figcaption>
</figure>

---

## 3.1 策略梯度定理与 REINFORCE

先固定单个提示 $x$，求期望奖励 $J(\theta) = \mathbb{E}_{y\sim\pi_\theta(\cdot\mid x)}[r(x,y)]$ 对参数 $\theta$ 的梯度。

### 推导：对数导数技巧（Log-Derivative Trick）

$$
\begin{aligned}
\nabla_\theta J(\theta)
&= \nabla_\theta \sum_{y} \pi_\theta(y \mid x)\, r(x, y)
= \sum_{y} r(x, y)\, \nabla_\theta \pi_\theta(y \mid x) \\
&= \sum_{y} r(x, y)\, \pi_\theta(y \mid x)\, \nabla_\theta \log \pi_\theta(y \mid x) \\
&= \mathbb{E}_{y\sim\pi_\theta(\cdot\mid x)}\big[\, r(x, y)\, \nabla_\theta \log \pi_\theta(y \mid x) \,\big]
\end{aligned}
$$

第二步用到了微积分恒等式 $\nabla_\theta \pi_\theta = \pi_\theta \nabla_\theta \log \pi_\theta$。这一步看似平凡，却完成了两个决定性的魔法：
1. **把无法遍历的求和变成可采样估计的期望**：原本要对 $|\mathcal{V}|^T$ 条回复求和，现在只需从当前策略采样 $N$ 条回复做蒙特卡洛平均；
2. **全程不对 $r(x,y)$ 求导**：奖励只作为标量权重站在梯度外面，可以是任何黑箱程序、沙箱输出或人工打分。

代入自回归分解 $\log\pi_\theta(y\mid x) = \sum_{t=1}^T \log\pi_\theta(y_t\mid s_t)$，用 $N$ 条采样轨迹估计梯度，即得 **REINFORCE**（Williams, 1992）：

$$
\hat g = \frac{1}{N}\sum_{i=1}^{N} r(x, y_i) \sum_{t=1}^{|y_i|} \nabla_\theta \log \pi_\theta(y_{i,t} \mid s_{i,t}), \qquad y_i \sim \pi_\theta(\cdot\mid x)
$$

直观上，这就是**以奖励 $r$ 为权重的加权 SFT**：高分回复被更用力地模仿，低分回复权重更小。

---

## 3.2 基线（Baseline）为什么无偏且大幅降方差

朴素 REINFORCE 在实践中方差高得惊人。设想所有回复的奖励都落在 $[0.6, 0.9]$ 之间：不减基线时，连最差的 $0.6$ 分回复都会获得正权重、概率被推高，它之所以相对下降，完全只能指望其他 $0.9$ 分回复涨得更快后由 softmax 间接挤下去，梯度噪声极大。

解决方法是从奖励中减去一个**不依赖于当前采样回复 $y$** 的基线 $b(x)$。下面证明这一步**完全不改变梯度的数学期望**：

$$
\begin{aligned}
\mathbb{E}_{y\sim\pi_\theta}\big[\,b(x)\,\nabla_\theta\log\pi_\theta(y\mid x)\,\big]
&= b(x)\sum_{y}\pi_\theta(y\mid x)\,\nabla_\theta\log\pi_\theta(y\mid x) \\
&= b(x)\sum_{y}\nabla_\theta\pi_\theta(y\mid x)
= b(x)\,\nabla_\theta\underbrace{\sum_{y}\pi_\theta(y\mid x)}_{=\,1} = 0
\end{aligned}
$$

因此对任意仅依赖 $x$ 的基线 $b(x)$，恒有：

$$
\nabla_\theta J(\theta) = \mathbb{E}_{y\sim\pi_\theta}\Big[\big(r(x,y) - b(x)\big)\,\nabla_\theta\log\pi_\theta(y\mid x)\Big]
$$

当取 $b(x) \approx \mathbb{E}[r(x,y)]$ 时，$r - b$ 成为可正可负的<a class="term-ref" href="/books/llm-rl/glossary#advantage" title="Advantage，优势函数：衡量动作相对平均水平的超额收益">优势（Advantage）</a>：高于平均水平的回复被显式推高，低于平均水平的被显式压低，方差骤降。

::: tip 视角统一：几乎所有策略梯度算法都在争“怎么选 $b$”
- **PPO**：专门训练一个参数化的价值网络 $V_\psi(s_t)$ 作为逐 token 状态基线；
- **ReMax**（Li 等，2023）：用同一提示下贪心解码得到的回复奖励作为基线；
- **RLOO**：用同组其余 $G-1$ 条回复的均值作基线，严格满足“$b$ 不依赖当前样本 $y_i$”；
- **GRPO**：用同组全部 $G$ 条回复的均值 $\bar r$ 作基线（虽包含 $r_i$ 本身，但第 8 章会证明它与 RLOO 仅差常数因子 $\frac{G}{G-1}$，方向依然无偏）。
:::

---

## 3.3 价值函数、TD 误差与 GAE 望远镜求和

若要在 **token 级**做更细粒度的信用分配，我们需要估计“站在前缀 $s_t$ 处，从这里继续生成到结束，期望还能拿多少回报”——这就是<a class="term-ref" href="/books/llm-rl/glossary#critic" title="Critic / Value Function，评论家/价值函数：估计某状态未来期望回报的辅助模型">价值函数（Critic）</a> $V_\psi(s_t)$。

以第 2 章带逐 token KL 惩罚的奖励 $\tilde r_t$ 为例，定义第 $t$ 步的**时序差分（TD, Temporal Difference）误差**：

$$
\delta_t = \tilde r_t + \gamma\,V_\psi(s_{t+1}) - V_\psi(s_t), \qquad V_\psi(s_{T+1}) \equiv 0
$$

$\delta_t$ 直观衡量“选出 $y_t$ 走到下一状态 $s_{t+1}$ 后，局面比先前预期 $V_\psi(s_t)$ 好了多少”。如果在第 1,200 步抄错符号导致后续预期胜率从 $0.8$ 暴跌到 $0.05$，则 $\delta_{1200} \approx -0.75$，错误精准落在肇事 token 上。

<strong>广义优势估计（<a class="term-ref" href="/books/llm-rl/glossary#gae" title="Generalized Advantage Estimation，广义优势估计：多步 TD 误差的指数加权和">GAE</a>，Schulman 等，2015）</strong>把未来所有步的 TD 误差按 $(\gamma\lambda)^l$ 指数衰减求和：

$$
\hat A_t^{\text{GAE}(\gamma,\lambda)} = \sum_{l=0}^{T-t}(\gamma\lambda)^l\,\delta_{t+l}
$$

### 推导：GAE 的两个极端与望远镜求和

- **极端一：$\lambda = 0$（单步 TD）**：$\hat A_t = \delta_t = \tilde r_t + \gamma V_\psi(s_{t+1}) - V_\psi(s_t)$。只看一步，方差最低，但完全依赖 $V_\psi$ 自身准确度——训练初期 $V_\psi$ 不准时会引入严重偏差。
- **极端二：$\lambda = 1, \gamma = 1$（蒙特卡洛回报减基线）**：展开求和时，所有中间状态价值 $V_\psi(s_{t+1}), \dots, V_\psi(s_T)$ 一正一负两两抵消（**望远镜求和，Telescoping Sum**）：

$$
\begin{aligned}
\sum_{l=0}^{T-t} \delta_{t+l}
&= \big(\tilde r_t + \cancel{V_\psi(s_{t+1})} - V_\psi(s_t)\big)
 + \big(\tilde r_{t+1} + \cancel{V_\psi(s_{t+2})} - \cancel{V_\psi(s_{t+1})}\big)
 + \dots
 + \big(\tilde r_T + \underbrace{V_\psi(s_{T+1})}_{=0} - \cancel{V_\psi(s_T)}\big) \\
&= \sum_{l=0}^{T-t}\tilde r_{t+l} - V_\psi(s_t)
\end{aligned}
$$

完全不依赖未来步 $V_\psi$ 的预测误差，故对 $V_\psi$ 偏差免疫（仅用 $V_\psi(s_t)$ 作基线），但方差最大。LLM 后训练几乎不折扣未来奖励（通常取 $\gamma = 1$），通过 $\lambda \in [0.95, 1.0]$ 在低方差与低偏差之间微调。价值函数本身则通过均方误差向回归目标 $\hat R_t = \hat A_t + V_{\psi_{\text{old}}}(s_t)$ 拟合：

$$
\mathcal{L}_V(\psi) = \mathbb{E}_t\Big[\big(V_\psi(s_t) - \hat R_t\big)^2\Big]
$$

---

## 3.4 重要性采样、信赖域与 PPO 裁剪目标

自回归采样极为昂贵（占整个 RL 训练墙钟时间的 70%–85%，见第 17 章）。纯 on-policy 策略梯度每采样一大批回复只能做**一次**梯度更新就得全部丢弃，算力浪费极大。

为了在同一批轨迹上复用多个 mini-batch / epoch，第一步更新之后，轨迹的采样分布仍是旧策略 $\pi_{\theta_{\text{old}}}$，不再等于当前策略 $\pi_\theta$。统计上可以用<a class="term-ref" href="/books/llm-rl/glossary#importance_sampling" title="Importance Sampling，重要性采样：用目标分布与采样分布的概率比修正期望偏差">重要性采样（Importance Sampling）</a>修正期望：

$$
\mathbb{E}_{y\sim\pi_\theta}\big[f(y)\big] = \mathbb{E}_{y\sim\pi_{\theta_{\text{old}}}}\!\left[\frac{\pi_\theta(y\mid x)}{\pi_{\theta_{\text{old}}}(y\mid x)}\,f(y)\right]
$$

但整条序列的概率比是 $T$ 个 token 概率比的连乘 $\prod_{t=1}^T \frac{\pi_\theta(y_t\mid s_t)}{\pi_{\theta_{\text{old}}}(y_t\mid s_t)}$，回复稍长便会发生指数级爆炸或消失。**TRPO / PPO** 在 token 级采用局部一阶替代目标（Surrogate Objective），定义 token 级重要性比 $\rho_t(\theta) = \frac{\pi_\theta(y_t\mid s_t)}{\pi_{\theta_{\text{old}}}(y_t\mid s_t)}$：

$$
L^{\text{PG}}(\theta) = \mathbb{E}_t\big[\,\rho_t(\theta)\,\hat A_t\,\big]
$$

在 $\theta = \theta_{\text{old}}$ 处，$\rho_t = 1$ 且 $\nabla_\theta \rho_t = \nabla_\theta\log\pi_\theta(y_t\mid s_t)$，梯度与精确策略梯度严丝合缝；但一旦 $\pi_\theta$ 偏离 $\pi_{\theta_{\text{old}}}$ 太远，该替代目标忽略了前缀分布漂移对后续状态分布 $s_t$ 的影响，若无约束地最大化它会导致策略瞬间崩坏。

TRPO（Schulman 等，2015）通过二阶共轭梯度与硬 KL 信赖域求解，在大模型百亿参数上无法计算 Fisher 矩阵。<strong><a class="term-ref" href="/books/llm-rl/glossary#ppo" title="Proximal Policy Optimization，近端策略优化：以一阶裁剪限制策略步幅的信赖域近似算法">PPO</a>（Schulman 等，2017）</strong>将其简化为一个纯粹的一阶裁剪目标：

$$
L^{\text{CLIP}}(\theta) = \mathbb{E}_t\Big[\min\Big(\rho_t(\theta)\,\hat A_t,\;\operatorname{clip}\big(\rho_t(\theta),\, 1-\varepsilon,\, 1+\varepsilon\big)\,\hat A_t\Big)\Big]
$$

### 推导：按优势符号拆解分段形式

记 $c_t = \operatorname{clip}(\rho_t, 1-\varepsilon, 1+\varepsilon)$。因为 $\hat A_t$ 既可为正也可为负，取 $\min$ 后产生极具巧思的不对称行为：

1. **当 $\hat A_t > 0$（好 token，应当提高概率）**：
   目标化简为 $\hat A_t \min(\rho_t, c_t)$：
   - 若 $\rho_t > 1 + \varepsilon$：$\min(\rho_t, c_t) = 1+\varepsilon$，曲线变平、**梯度归零**——裁剪目标不再奖励继续把概率推得更高；
   - 若 $\rho_t \le 1 + \varepsilon$（哪怕 $\rho_t < 1 - \varepsilon$）：$\min(\rho_t, c_t) = \rho_t$，梯度完整保留——若该好 token 的概率因共享参数更新被意外压低，梯度依然会把它拉回来！
2. **当 $\hat A_t < 0$（坏 token，应当降低概率）**：
   因乘以负数反转不等号，目标化简为 $\hat A_t \max(\rho_t, c_t)$：
   - 若 $\rho_t < 1 - \varepsilon$：$\max(\rho_t, c_t) = 1-\varepsilon$，曲线变平、**梯度归零**——防止把概率一口气压死到零；
   - 若 $\rho_t \ge 1 - \varepsilon$（哪怕 $\rho_t > 1 + \varepsilon$）：$\max(\rho_t, c_t) = \rho_t$，梯度完整保留——若坏 token 概率反常升高，梯度会继续用力把它压下去！

一句话总结：**$\min$ 构造了未裁剪目标的一个悲观下界（Pessimistic Lower Bound）——只取消“已经改够了”的激励，绝不阻止“走错方向时”的纠错。**

::: warning 常见误解：PPO 裁剪并非硬约束
裁剪作用在**目标函数梯度**上，而不是对参数更新做硬投影。$\rho_t > 1 + \varepsilon$ 只是取消了该 token 在当前 mini-batch 的正梯度；受学习率、Adam 动量与同一 batch 其他共享特征的 token 影响，实际 $\rho_t$ 依然可能冲出 $[1-\varepsilon, 1+\varepsilon]$ 区间。这也是为什么第 20 章必须持续监控裁剪比例（Clip Fraction）。
:::

### 交互实验：直观体验 PPO 对称裁剪与 DAPO 的 Clip-Higher

在下方组件中切换优势符号 $\hat A_t$，并点击切换 PPO 对称设置（$0.20 / 0.20$）与 DAPO 非对称设置（$0.20 / 0.28$，第 9 章详述），重点观察为什么对称裁剪会不成比例地压制低概率探索 token 的成长空间：

<RlPpoClipWidget />

至此，第一篇的理论底座已经全部立稳：我们清楚了为什么 SFT 不够，建立了统一目标 $J_\beta$ 与闭式解 $\pi^\star$，也推透了策略梯度、GAE 与 PPO 裁剪。下一篇，我们将把镜头对准决定 RL 能力天花板的根源——**奖励从哪来，以及奖励作弊如何发生**。
