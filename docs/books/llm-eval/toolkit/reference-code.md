# 最小可运行 Python 评测工具箱

<p class="chapter-summary">零外部重依赖纯 Python 标准库实现，与全书统计公式速查卡严格对齐：覆盖 Paired Bootstrap、McNemar 精确/卡方检验、MDE 与样本量估算、Liang-Zeger 聚类标准误、数值稳定无偏 pass@k 与 pass^k、Rogan-Gladen 矫正与 Delta 法置信区间、Cohen's κ、ECE / Brier 及 RAG 检索指标，附可直接运行的单元测试。</p>

很多团队在落地评测统计时容易被重型依赖库或不一致的开源实现绊住脚步：有的脚本直接套独立样本 $t$ 检验白白损失一半统计功效，有的对组合数硬算阶乘在大样本下溢出，还有的忘了把人类校准集规模 $(m_1, m_0)$ 算进 Rogan-Gladen 置信区间。下面所有函数均**仅使用 Python 3.10+ 标准库**，符号与 [统计公式与指标口径速查卡](/books/llm-eval/toolkit/metrics-and-stats) 完全一一对应，可直接整份复制保存为 `eval_stats.py` 运行单元测试并嵌入 CI 管道。

```python
"""LLM 与 Agent 评测核心统计工具箱（纯 Python 3.10+ 标准库，零外部依赖）。"""
from __future__ import annotations

import math
import random
from collections import Counter, defaultdict
from statistics import NormalDist
from typing import Mapping, Sequence


# === 1. 配对显著性检验：Paired Bootstrap 与 McNemar 检验（第 1 章） ===

def paired_bootstrap_ci(
    scores_a: Sequence[float],
    scores_b: Sequence[float],
    n_boot: int = 5000,
    alpha: float = 0.05,
    seed: int = 42,
) -> dict[str, float]:
    """同题库配对差值 (B - A) 的非参数 Bootstrap 置信区间与双侧检验 p 值。"""
    if len(scores_a) != len(scores_b) or not scores_a:
        raise ValueError("scores_a 与 scores_b 必须等长且非空")
    if n_boot < 1 or not (0.0 < alpha < 1.0):
        raise ValueError("需满足 n_boot >= 1 且 0 < alpha < 1")
    n = len(scores_a)
    diffs = [b - a for a, b in zip(scores_a, scores_b)]
    obs_diff = sum(diffs) / n
    centered = [d - obs_diff for d in diffs]  # 零假设 H0: E[d] = 0 的中心化残差
    rng = random.Random(seed)
    boot_means, extreme, abs_obs = [], 0, abs(obs_diff)
    for _ in range(n_boot):
        idxs = [rng.randrange(n) for _ in range(n)]
        boot_means.append(sum(diffs[i] for i in idxs) / n)
        if abs(sum(centered[i] for i in idxs) / n) >= abs_obs - 1e-15:
            extreme += 1
    boot_means.sort()
    lo = max(0, int(math.floor((alpha / 2.0) * n_boot)))
    hi = min(n_boot - 1, int(math.ceil((1.0 - alpha / 2.0) * n_boot)) - 1)
    return {"mean_diff": obs_diff, "ci_low": boot_means[lo], "ci_high": boot_means[hi], "p_value": (extreme + 1) / (n_boot + 1)}


def mcnemar_test(scores_a: Sequence[int], scores_b: Sequence[int]) -> dict[str, float | int | str]:
    """二值同题配对 McNemar 检验：分歧数 < 25 用精确二项检验，否则用连续性修正卡方。"""
    if len(scores_a) != len(scores_b) or not scores_a:
        raise ValueError("scores_a 与 scores_b 必须等长且非空")
    if any(isinstance(v, bool) or v not in (0, 1) for v in scores_a) or any(
        isinstance(v, bool) or v not in (0, 1) for v in scores_b
    ):
        raise ValueError("scores_a 与 scores_b 只能包含二值元素 {0, 1}")
    n10 = sum(1 for a, b in zip(scores_a, scores_b) if a == 1 and b == 0)
    n01 = sum(1 for a, b in zip(scores_a, scores_b) if a == 0 and b == 1)
    m = n10 + n01
    if m == 0:
        return {"n10": 0, "n01": 0, "statistic": 0.0, "p_value": 1.0, "method": "exact_binomial"}
    if m < 25:
        k = min(n10, n01)
        tail = sum(math.comb(m, i) for i in range(k + 1)) * (0.5 ** m)
        return {"n10": n10, "n01": n01, "statistic": float(k), "p_value": min(1.0, 2.0 * tail), "method": "exact_binomial"}
    chi2 = (max(0.0, abs(n10 - n01) - 1.0) ** 2) / m
    return {"n10": n10, "n01": n01, "statistic": chi2, "p_value": math.erfc(math.sqrt(chi2 / 2.0)), "method": "chi2_continuity_corrected"}


# === 2. MDE 样本量估算与 Liang-Zeger 聚类标准误（第 1 章） ===

def mde_and_required_n(
    baseline_p: float,
    delta: float,
    rho: float = 0.5,
    n: int | None = None,
    alpha: float = 0.05,
    power: float = 0.80,
) -> dict[str, float | int | None]:
    """二值配对评测解析样本量 N_req 与给定题量 n 对应的最小可检测效应 MDE。"""
    if (
        not (0.0 < baseline_p < 1.0)
        or delta == 0.0
        or not (0.0 < baseline_p + delta < 1.0)
        or not (-1.0 <= rho < 1.0)
        or not (0.0 < alpha < 1.0)
        or not (0.5 <= power < 1.0)
    ):
        raise ValueError(
            "参数越界：需满足 0 < baseline_p < 1, 0 < baseline_p + delta < 1, delta != 0, -1 <= rho < 1, 0 < alpha < 1, 0.5 <= power < 1"
        )
    norm = NormalDist()
    z_sum = norm.inv_cdf(1.0 - alpha / 2.0) + norm.inv_cdf(power)
    p_b = baseline_p + delta
    sd_a, sd_b = math.sqrt(baseline_p * (1.0 - baseline_p)), math.sqrt(p_b * (1.0 - p_b))
    # 遵循两 Bernoulli 联合分布的 Fréchet–Hoeffding 相关性边界，防止方差失真
    max_rho = (min(baseline_p, p_b) - baseline_p * p_b) / (sd_a * sd_b)
    min_rho = (max(0.0, baseline_p + p_b - 1.0) - baseline_p * p_b) / (sd_a * sd_b)
    eff_rho = min(max(rho, min_rho), max_rho)
    sigma_d = math.sqrt(max(1e-12, sd_a ** 2 + sd_b ** 2 - 2.0 * eff_rho * sd_a * sd_b))
    req_n = math.ceil((z_sum * sigma_d / abs(delta)) ** 2)
    mde_val: float | None = None
    if n is not None:
        if n <= 0:
            raise ValueError("题量 n 必须为正整数")
        mde_val = z_sum * math.sqrt(2.0 * baseline_p * (1.0 - baseline_p) * (1.0 - rho)) / math.sqrt(n)
    return {"required_n": req_n, "mde": mde_val, "sigma_d": sigma_d, "effective_rho": eff_rho}


def clustered_se(scores: Sequence[float], cluster_ids: Sequence[str | int], alpha: float = 0.05) -> dict[str, float | int]:
    """Liang-Zeger 按簇汇总残差标准误（Clustered SE）与设计效应 DEFF。

    注：当独立聚类簇数较少（G_c < 30）时，正态近似分位数可能偏窄，建议改用自由度 G_c - 1 的 t 分位数
    或按簇执行 Cluster Block Bootstrap 构造置信区间。
    """
    if len(scores) != len(cluster_ids) or len(scores) < 2:
        raise ValueError("scores 与 cluster_ids 必须等长且至少含 2 个样本")
    if not (0.0 < alpha < 1.0):
        raise ValueError("需满足 0 < alpha < 1")
    n = len(scores)
    mean = sum(scores) / n
    se_iid = math.sqrt(sum((s - mean) ** 2 for s in scores) / ((n - 1) * n))
    cluster_sums: dict[str | int, float] = defaultdict(float)
    for s, cid in zip(scores, cluster_ids):
        cluster_sums[cid] += (s - mean)
    g_c = len(cluster_sums)
    if g_c < 2:
        raise ValueError("独立聚类簇数 G_c 必须至少为 2")
    se_cl = math.sqrt((g_c / (g_c - 1.0)) * sum(y ** 2 for y in cluster_sums.values()) / (n ** 2))
    deff = (se_cl / se_iid) ** 2 if se_iid > 0.0 else 1.0
    z = NormalDist().inv_cdf(1.0 - alpha / 2.0)
    return {"mean": mean, "num_clusters": g_c, "se_iid": se_iid, "se_cluster": se_cl, "deff": deff, "ci_low": mean - z * se_cl, "ci_high": mean + z * se_cl}


# === 3. 数值稳定无偏 pass@k 与 pass^k（第 2 章） ===

def pass_at_k_unbiased(n: int, c: int, k: int) -> float:
    """无偏 pass@k（Chen 等，2021）：连乘形式避免大阶乘溢出。"""
    if not (0 <= c <= n and 1 <= k <= n):
        raise ValueError("需满足 0 <= c <= n 且 1 <= k <= n")
    if n - c < k:
        return 1.0
    fail_prob = 1.0
    for j in range(k):
        fail_prob *= (n - c - j) / (n - j)
    return 1.0 - fail_prob


def pass_hat_k_unbiased(n: int, c: int, k: int) -> float:
    """无偏 pass^k（Yao 等，2024）：连续 k 次独立执行全部成功的可靠性估计。"""
    if not (0 <= c <= n and 1 <= k <= n):
        raise ValueError("需满足 0 <= c <= n 且 1 <= k <= n")
    if c < k:
        return 0.0
    all_pass = 1.0
    for j in range(k):
        all_pass *= (c - j) / (n - j)
    return all_pass


# === 4. Rogan-Gladen 矫正（含 Delta 法 95% CI）与 Cohen's κ（第 3–4 章） ===

def rogan_gladen_correct(
    p_raw: float, q1: float, q0: float, n_eval: int, m1: int, m0: int, alpha: float = 0.05
) -> dict[str, float | bool]:
    """基于灵敏度 q1 (TPR) 与特异度 q0 (TNR) 的 Rogan-Gladen 矫正及有限样本 Delta 法区间。

    注：小样本下若观测到 q1 == 1.0 或 q0 == 1.0，Wald 方差项 q*(1-q)/m 会塌缩为 0 导致区间偏窄；
    工程上建议先对校准计数施加 Jeffreys/Laplace 平滑 (k + 0.5) / (m + 1) 或改用分层 Bootstrap。
    """
    if not (0.0 <= p_raw <= 1.0 and 0.0 <= q1 <= 1.0 and 0.0 <= q0 <= 1.0 and 0.0 < alpha < 1.0):
        raise ValueError("参数越界：需满足 p_raw, q1, q0 ∈ [0, 1] 且 0 < alpha < 1")
    youden_j = q1 + q0 - 1.0
    if youden_j <= 0.0 or min(n_eval, m1, m0) <= 0:
        raise ValueError("需满足 q1 + q0 > 1 且 n_eval, m1, m0 均为正整数")
    theta_rg = min(1.0, max(0.0, (p_raw + q0 - 1.0) / youden_j))
    var_rg = (
        p_raw * (1.0 - p_raw) / n_eval
        + (theta_rg ** 2) * q1 * (1.0 - q1) / m1
        + ((1.0 - theta_rg) ** 2) * q0 * (1.0 - q0) / m0
    ) / (youden_j ** 2)
    se = math.sqrt(max(0.0, var_rg))
    z = NormalDist().inv_cdf(1.0 - alpha / 2.0)
    return {
        "theta_rg": theta_rg,
        "youden_j": youden_j,
        "se": se,
        "ci_low": max(0.0, theta_rg - z * se),
        "ci_high": min(1.0, theta_rg + z * se),
        "low_discriminability_warning": youden_j < 0.4,
    }


def cohens_kappa(labels_a: Sequence[object], labels_b: Sequence[object]) -> float:
    """双标注者剔除随机一致后的 Cohen's κ（支持二分类与多分类离散标签）。"""
    if len(labels_a) != len(labels_b) or not labels_a:
        raise ValueError("labels_a 与 labels_b 必须等长且非空")
    n = len(labels_a)
    p_o = sum(1 for a, b in zip(labels_a, labels_b) if a == b) / n
    cnt_a, cnt_b = Counter(labels_a), Counter(labels_b)
    p_e = sum((cnt_a[c] / n) * (cnt_b[c] / n) for c in set(cnt_a) | set(cnt_b))
    if math.isclose(1.0 - p_e, 0.0, abs_tol=1e-12):
        return 1.0 if math.isclose(p_o, 1.0) else 0.0
    return (p_o - p_e) / (1.0 - p_e)


# === 5. 置信度校准（ECE / Brier）与 RAG 检索指标（第 5、11 章） ===

def expected_calibration_error(probs: Sequence[float], labels: Sequence[int], n_bins: int = 10) -> dict[str, float]:
    """等宽分箱期望校准误差（ECE）与 Brier 分数。"""
    if len(probs) != len(labels) or not probs or n_bins < 1:
        raise ValueError("probs 与 labels 必须等长非空，且 n_bins >= 1")
    n = len(probs)
    bins: list[list[tuple[float, int]]] = [[] for _ in range(n_bins)]
    brier = 0.0
    for p, y in zip(probs, labels):
        if not (0.0 <= p <= 1.0) or isinstance(y, bool) or y not in (0, 1):
            raise ValueError("需满足每个置信度 0 <= p <= 1 且标签 y ∈ {0, 1}")
        brier += (p - y) ** 2
        bins[min(n_bins - 1, max(0, int(p * n_bins)))].append((p, y))
    ece = sum((len(b) / n) * abs(sum(y for _, y in b) / len(b) - sum(p for p, _ in b) / len(b)) for b in bins if b)
    return {"ece": ece, "brier_score": brier / n}


def retrieval_metrics(retrieved_ids: Sequence[str], relevant_gains: Mapping[str, float], k: int) -> dict[str, float]:
    """单条查询在 Top-k 上的 Recall@k、MRR@k 与分级相关性 NDCG@k。"""
    if k <= 0:
        raise ValueError("k 必须为正整数")
    top_k = list(retrieved_ids[:k])
    pos = {doc_id: g for doc_id, g in relevant_gains.items() if g > 0.0}
    if not pos:
        return {"recall_at_k": 0.0, "mrr_at_k": 0.0, "ndcg_at_k": 0.0}
    recall_k = sum(1 for d in dict.fromkeys(top_k) if d in pos) / len(pos)
    mrr_k = next((1.0 / r for r, d in enumerate(top_k, start=1) if d in pos), 0.0)
    dcg, seen = 0.0, set()
    for r, d in enumerate(top_k, start=1):
        if d not in seen:
            seen.add(d)
            if d in pos:
                dcg += (2.0 ** pos[d] - 1.0) / math.log2(r + 1)
    idcg = sum((2.0 ** g - 1.0) / math.log2(r + 1) for r, g in enumerate(sorted(pos.values(), reverse=True)[:k], start=1))
    return {"recall_at_k": recall_k, "mrr_at_k": mrr_k, "ndcg_at_k": dcg / idcg if idcg > 0 else 0.0}


# === 6. 自检单元测试：直接 python3 eval_stats.py 运行验证 ===

if __name__ == "__main__":
    # 1) 配对 Bootstrap & McNemar（大样本卡方 + 零分歧平局边界 + 小样本精确二项）
    a_bin = [1] * 60 + [1] * 4 + [0] * 24 + [0] * 12
    b_bin = [1] * 60 + [0] * 4 + [1] * 24 + [0] * 12
    boot = paired_bootstrap_ci(a_bin, b_bin, n_boot=3000, seed=7)
    mcn = mcnemar_test(a_bin, b_bin)
    assert math.isclose(boot["mean_diff"], 0.20, abs_tol=1e-9) and boot["ci_low"] > 0.0 and boot["p_value"] < 0.005
    assert mcn["method"] == "chi2_continuity_corrected" and mcn["p_value"] < 0.001
    assert mcnemar_test([1] * 15 + [0] * 15, [0] * 15 + [1] * 15)["p_value"] == 1.0
    assert mcnemar_test([1, 1, 0, 0, 0, 0], [1, 0, 1, 1, 1, 1])["method"] == "exact_binomial"

    # 2) MDE 规划与聚类标准误（同簇完全相关时 DEFF 显著 > 1）
    plan = mde_and_required_n(baseline_p=0.5, delta=0.05, rho=0.5, n=800)
    assert 750 <= plan["required_n"] <= 820 and plan["mde"] is not None and abs(plan["mde"] - 0.05) < 0.005
    cse = clustered_se([1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0], ["d1"] * 4 + ["d2"] * 4 + ["d3"] * 4 + ["d4"] * 4)
    assert cse["se_cluster"] > cse["se_iid"] * 1.8 and cse["deff"] > 3.0

    # 3) 无偏 pass@k 与 pass^k 对照解析组合值
    assert math.isclose(pass_at_k_unbiased(10, 3, 2), 1.0 - math.comb(7, 2) / math.comb(10, 2))
    assert math.isclose(pass_hat_k_unbiased(10, 8, 5), math.comb(8, 5) / math.comb(10, 5))
    assert pass_at_k_unbiased(10, 8, 3) == 1.0 and pass_hat_k_unbiased(10, 2, 3) == 0.0

    # 4) Rogan-Gladen 矫正（真值 θ=0.70, q1=0.90, q0=0.80 => p_raw=0.69）与 Cohen's κ
    rg = rogan_gladen_correct(p_raw=0.69, q1=0.90, q0=0.80, n_eval=500, m1=100, m0=100)
    assert math.isclose(rg["theta_rg"], 0.70, abs_tol=1e-9) and rg["ci_low"] < 0.70 < rg["ci_high"]
    assert not rg["low_discriminability_warning"] and math.isclose(cohens_kappa([1, 1, 0, 0], [1, 1, 0, 0]), 1.0)
    assert cohens_kappa([1, 1, 0, 0, 1, 0], [1, 0, 0, 0, 1, 0]) > 0.6

    # 5) ECE / Brier 与 RAG 检索指标（含重复 doc_id 防重复计分测试）
    cal = expected_calibration_error([0.9, 0.9, 0.1, 0.1], [1, 1, 0, 0], n_bins=10)
    assert math.isclose(cal["ece"], 0.10, abs_tol=1e-9) and math.isclose(cal["brier_score"], 0.01, abs_tol=1e-9)
    ret = retrieval_metrics(["d2", "d1", "d4", "d3"], {"d1": 2.0, "d3": 1.0}, k=3)
    assert math.isclose(ret["recall_at_k"], 0.5) and math.isclose(ret["mrr_at_k"], 0.5) and 0.4 < ret["ndcg_at_k"] < 0.7
    dup_ret = retrieval_metrics(["d1", "d1", "d1"], {"d1": 2.0}, k=3)
    assert dup_ret["ndcg_at_k"] <= 1.0 + 1e-12 and math.isclose(dup_ret["ndcg_at_k"], 1.0)

    print("All evaluation statistics self-tests passed!")
```

> **工程集成建议**：在 L2 夜间全量回归或发版报告脚本中，建议将 `paired_bootstrap_ci`（或二值任务 `mcnemar_test`）、`clustered_se` 与 `rogan_gladen_correct` 封装为统一的后处理步骤，输出带 `ci_low / ci_high` 与 `youden_j` 的结构化 JSON 供 CI 自动判定闸门。
