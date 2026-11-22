# 最小可运行 Python 数据工具箱

<p class="chapter-summary">零外部重依赖纯 Python 3.10+ 标准库实现，与全书公式与账本速查卡严格对齐：覆盖 Data-Constrained Scaling 有效数据量折算、可真实执行的 k-shingle MinHash + LSH 模糊去重引擎、快速 N-gram 训测去污扫描、RLVR 零梯度浪费与甜点区课程分桶、Agent Trajectory IR 校验与逐 Token Loss Mask 生成，以及合成数据单位有效成本 ROI 核算，附完整可运行单元测试。</p>

很多数据工程流水线在原型验证与审计阶段并不需要立刻拉起百节点集群，反倒最怕“脚手架脚本里的去重公式算错、Loss Mask 漏掩环境观测、或者去污脚本慢到跑不动”。下面整套模块**仅依赖 Python 3.10+ 标准库**，所有符号与 [核心公式、数据账本与成本速查卡](/books/llm-data/toolkit/formulas-and-ledgers) 一一对应，可直接整份保存为 `data_eng_toolkit.py` 运行单元测试并嵌入数据入库 CI 门禁。

```python
"""LLM 与 Agent 数据工程核心工具箱（纯 Python 3.10+ 标准库，零外部依赖）。"""
from __future__ import annotations

import hashlib
import json
import math
import random
import re
from collections import defaultdict
from typing import Any, Mapping, Sequence

# 英文单词/数字整词切分、中文按单字切分，兼顾中英双语去污与去重
_TOKEN_RE = re.compile(r"[\u4e00-\u9fff]|[a-z0-9]+")
_MERSENNE_PRIME = (1 << 61) - 1  # 2^61 - 1，通用线性哈希族素数模


def _normalize_tokens(text: str) -> list[str]:
    """统一小写并切分为规整词元序列。"""
    return _TOKEN_RE.findall(text.lower())


# === 1. Data-Constrained Scaling 有效数据量折算（第 1 章） ===

def effective_tokens_data_constrained(
    d_u: float, epochs: float, r_d_star: float = 15.0, quality_mult: float = 1.0
) -> dict[str, float]:
    """Muennighoff 等（2023）数据受限 Scaling 有效 Token 量与当前轮边际效率核算。"""
    if d_u <= 0.0 or epochs < 1.0 or r_d_star <= 0.0 or quality_mult <= 0.0:
        raise ValueError("需满足 d_u > 0, epochs >= 1.0, r_d_star > 0, quality_mult > 0")
    raw_tokens = d_u * epochs
    r_d = epochs - 1.0
    d_eff_base = d_u * (1.0 + r_d_star * (1.0 - math.exp(-r_d / r_d_star)))
    return {
        "raw_tokens": raw_tokens,
        "effective_tokens": d_eff_base * quality_mult,
        "marginal_efficiency": math.exp(-r_d / r_d_star),
        "utilization_ratio": d_eff_base / raw_tokens,
        "saturation_limit": d_u * (1.0 + r_d_star) * quality_mult,
    }


# === 2. MinHash + LSH 理论命中概率与真实可运行模糊去重索引（第 5 章） ===

def minhash_lsh_collision_prob(jaccard: float, bands: int, rows: int) -> dict[str, float | int]:
    """计算给定 Jaccard 相似度 s 与 (b, r_lsh) 下的 LSH 候选命中概率及拐点阈值 t*。"""
    if not (0.0 <= jaccard <= 1.0) or bands < 1 or rows < 1:
        raise ValueError("需满足 0 <= jaccard <= 1 且 bands, rows 为正整数")
    return {
        "collision_prob": 1.0 - (1.0 - (jaccard ** rows)) ** bands,
        "threshold": (1.0 / bands) ** (1.0 / rows),
        "signature_len": bands * rows,
    }


class MinHashLSHIndex:
    """确定性 k-shingle MinHash + LSH 近似去重索引（跨进程哈希一致，支持精确 Jaccard 复核）。"""

    def __init__(
        self, bands: int = 14, rows: int = 8, shingle_size: int = 5, char_level: bool = False, seed: int = 42
    ) -> None:
        if bands < 1 or rows < 1 or shingle_size < 1:
            raise ValueError("bands, rows, shingle_size 均须为正整数")
        self.bands, self.rows, self.shingle_size, self.char_level = bands, rows, shingle_size, char_level
        self.num_hashes = bands * rows
        rng = random.Random(seed)
        self._coeffs = [
            (rng.randrange(1, _MERSENNE_PRIME), rng.randrange(0, _MERSENNE_PRIME))
            for _ in range(self.num_hashes)
        ]
        self._buckets: list[dict[tuple[int, ...], list[str]]] = [defaultdict(list) for _ in range(bands)]
        self._shingles: dict[str, set[str]] = {}
        self._signatures: dict[str, tuple[int, ...]] = {}

    def extract_shingles(self, text: str) -> set[str]:
        """抽取规范化 k-shingle 集合（默认词元级，可选字符级）。"""
        if self.char_level:
            compact = re.sub(r"\s+", " ", text.strip().lower())
            if not compact:
                return set()
            if len(compact) <= self.shingle_size:
                return {compact}
            return {compact[i : i + self.shingle_size] for i in range(len(compact) - self.shingle_size + 1)}
        toks = _normalize_tokens(text)
        if not toks:
            return set()
        if len(toks) <= self.shingle_size:
            return {" ".join(toks)}
        return {" ".join(toks[i : i + self.shingle_size]) for i in range(len(toks) - self.shingle_size + 1)}

    @staticmethod
    def _hash61(item: str) -> int:
        digest = hashlib.blake2b(item.encode("utf-8"), digest_size=8).digest()
        return int.from_bytes(digest, "big") & _MERSENNE_PRIME

    def compute_signature(self, shingles: set[str]) -> tuple[int, ...]:
        """计算 k_sig = b * r_lsh 维 MinHash 指纹。"""
        if not shingles:
            return (_MERSENNE_PRIME,) * self.num_hashes
        base_hashes = [self._hash61(s) for s in shingles]
        return tuple(min((a * h + b) % _MERSENNE_PRIME for h in base_hashes) for a, b in self._coeffs)

    def add(self, doc_id: str, text: str) -> None:
        """向 LSH 索引注册文档并写入各频带桶。"""
        if doc_id in self._signatures:
            raise ValueError(f"重复注册 doc_id: {doc_id}")
        sh = self.extract_shingles(text)
        sig = self.compute_signature(sh)
        self._shingles[doc_id], self._signatures[doc_id] = sh, sig
        for band_idx in range(self.bands):
            start = band_idx * self.rows
            self._buckets[band_idx][sig[start : start + self.rows]].append(doc_id)

    def exact_jaccard(self, doc_a: str, doc_b: str) -> float:
        """计算两篇已入库文档的精确 shingle Jaccard 相似度。"""
        sa, sb = self._shingles[doc_a], self._shingles[doc_b]
        union = len(sa | sb)
        return (len(sa & sb) / union) if union > 0 else 0.0

    def find_duplicate_pairs(self, min_jaccard: float | None = None) -> list[tuple[str, str, float]]:
        """召回所有 LSH 碰撞候选对并附精确 Jaccard（可选按阈值精筛）。"""
        candidates: set[tuple[str, str]] = set()
        for bucket_map in self._buckets:
            for doc_ids in bucket_map.values():
                for i in range(len(doc_ids)):
                    for j in range(i + 1, len(doc_ids)):
                        a, b = (doc_ids[i], doc_ids[j]) if doc_ids[i] < doc_ids[j] else (doc_ids[j], doc_ids[i])
                        candidates.add((a, b))
        results: list[tuple[str, str, float]] = []
        for a, b in sorted(candidates):
            sim = self.exact_jaccard(a, b)
            if min_jaccard is None or sim >= min_jaccard:
                results.append((a, b, sim))
        return results


# === 3. 训测侧快速 N-gram 精确去污扫描（第 3 章） ===

def ngram_decontamination_scan(
    train_docs: Mapping[str, str], eval_prompts: Mapping[str, str], n: int = 13, min_matches: int = 1
) -> dict[str, Any]:
    """基于评测集 N-gram 倒排索引的线性复杂度训练侧去污检测器。"""
    if n < 1 or min_matches < 1:
        raise ValueError("n 与 min_matches 必须为正整数")
    eval_index: dict[tuple[str, ...], set[str]] = defaultdict(set)
    skipped_short_evals: list[str] = []
    for eval_id, text in eval_prompts.items():
        toks = _normalize_tokens(text)
        if len(toks) < n:
            skipped_short_evals.append(eval_id)
            continue
        for i in range(len(toks) - n + 1):
            eval_index[tuple(toks[i : i + n])].add(eval_id)

    contaminated: dict[str, list[dict[str, Any]]] = {}
    clean_doc_ids: list[str] = []
    for doc_id, text in train_docs.items():
        toks = _normalize_tokens(text)
        hit_counts: dict[str, int] = defaultdict(int)
        seen_ngrams: set[tuple[str, ...]] = set()
        for i in range(max(0, len(toks) - n + 1)):
            ng = tuple(toks[i : i + n])
            if ng in seen_ngrams or ng not in eval_index:
                continue
            seen_ngrams.add(ng)
            for eval_id in eval_index[ng]:
                hit_counts[eval_id] += 1
        matches = [{"eval_id": eid, "matched_ngrams": cnt} for eid, cnt in sorted(hit_counts.items()) if cnt >= min_matches]
        if matches:
            contaminated[doc_id] = matches
        else:
            clean_doc_ids.append(doc_id)

    total = len(train_docs)
    return {
        "contaminated_docs": contaminated,
        "clean_doc_ids": clean_doc_ids,
        "skipped_short_evals": skipped_short_evals,
        "summary": {
            "total_train": total,
            "contaminated_count": len(contaminated),
            "contamination_rate": (len(contaminated) / total) if total > 0 else 0.0,
            "indexed_eval_ngrams": len(eval_index),
        },
    }


# === 4. RLVR 零梯度死题概率与甜点区课程分桶（第 10 章） ===

def rlvr_zero_grad_prob(p: float, group_size: int = 8) -> float:
    """组采样（GRPO/RLOO）单轮 Rollout 出现全对或全错（零梯度）的概率 p^G + (1-p)^G。"""
    if not (0.0 <= p <= 1.0) or group_size < 2:
        raise ValueError("需满足 0 <= p <= 1 且 group_size >= 2")
    return (p ** group_size) + ((1.0 - p) ** group_size)


def bucket_rlvr_prompts(
    prompt_stats: Mapping[str, float | tuple[int, int]],
    p_min: float = 0.1,
    p_max: float = 0.8,
    group_size: int = 8,
) -> dict[str, Any]:
    """按基座通过率将 RLVR 题池分桶为 too_hard / sweet_spot / too_easy 并核算梯度利用率提升。"""
    if not (0.0 <= p_min < p_max <= 1.0) or group_size < 2:
        raise ValueError("需满足 0 <= p_min < p_max <= 1 且 group_size >= 2")
    buckets: dict[str, list[str]] = {"too_hard": [], "sweet_spot": [], "too_easy": []}
    rates: dict[str, float] = {}
    for pid, stat in prompt_stats.items():
        if isinstance(stat, tuple):
            n_trials, n_passed = stat
            if n_trials <= 0 or not (0 <= n_passed <= n_trials):
                raise ValueError(f"题目 {pid} 采样统计非法: {stat}")
            p = n_passed / n_trials
        else:
            p = float(stat)
            if not (0.0 <= p <= 1.0):
                raise ValueError(f"题目 {pid} 通过率越界: {p}")
        rates[pid] = p
        buckets["too_hard" if p < p_min else "too_easy" if p > p_max else "sweet_spot"].append(pid)

    raw_zero = sum(rlvr_zero_grad_prob(p, group_size) for p in rates.values()) / len(rates) if rates else 0.0
    sweet_ids = buckets["sweet_spot"]
    sweet_zero = sum(rlvr_zero_grad_prob(rates[pid], group_size) for pid in sweet_ids) / len(sweet_ids) if sweet_ids else 0.0
    return {
        "buckets": buckets,
        "pass_rates": rates,
        "raw_zero_grad_rate": raw_zero,
        "sweet_spot_zero_grad_rate": sweet_zero,
        "sweet_spot_retention": (len(sweet_ids) / len(rates)) if rates else 0.0,
    }


# === 5. Agent Trajectory IR 校验与逐 Token Loss Mask 生成（第 15 章） ===

_MASKED_ROLES = frozenset({"system", "user", "tool_observation", "env_error"})
_SUPERVISED_ROLES = frozenset({"think", "tool_call", "assistant"})
_ALLOWED_ROLES = _MASKED_ROLES | _SUPERVISED_ROLES


def build_agent_trajectory_loss_mask(turns: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """校验多轮 Agent 轨迹 IR 合法性并生成逐 Token Loss Mask（观测严格置 0，动作与思考置 1）。"""
    if not turns:
        raise ValueError("轨迹 turns 不能为空")
    flat_tokens: list[int | str] = []
    loss_mask: list[int] = []
    role_counts: dict[str, int] = defaultdict(int)
    has_pending_tool_call = False

    for idx, turn in enumerate(turns):
        role = turn.get("role")
        if role not in _ALLOWED_ROLES:
            raise ValueError(f"第 {idx} 轮角色非法: {role!r}")
        if role == "tool_call":
            if "tool_args" in turn:
                json.dumps(turn["tool_args"])  # 校验参数可 JSON 序列化
            has_pending_tool_call = True
        elif role in ("tool_observation", "env_error"):
            if not has_pending_tool_call:
                raise ValueError(f"第 {idx} 轮出现孤立 {role}（缺少前置 tool_call）")
            has_pending_tool_call = False

        if turn.get("tokens") is not None:
            toks = list(turn["tokens"])
        elif isinstance(turn.get("content"), str) and turn["content"].strip():
            toks = turn["content"].split()
        else:
            raise ValueError(f"第 {idx} 轮必须提供非空 tokens 或 content")
        if not toks:
            raise ValueError(f"第 {idx} 轮 tokens 不能为空")

        mask_val = 1 if role in _SUPERVISED_ROLES else 0
        flat_tokens.extend(toks)
        loss_mask.extend([mask_val] * len(toks))
        role_counts[role] += len(toks)

    sup_tokens = sum(loss_mask)
    if sup_tokens == 0:
        raise ValueError("整条轨迹有效监督 Token 数为 0，不可进入监督训练")
    total = len(flat_tokens)
    return {
        "tokens": flat_tokens,
        "loss_mask": loss_mask,
        "total_tokens": total,
        "supervised_tokens": sup_tokens,
        "masked_tokens": total - sup_tokens,
        "supervised_ratio": sup_tokens / total,
        "role_token_counts": dict(role_counts),
    }


# === 6. 合成数据单位有效样本成本账本（第 21 章） ===

def synthetic_unit_cost(
    in_tok: float, out_tok: float, c_in: float, c_out: float,
    env_cost: float, verify_cost: float, pass_rate: float, audit_ratio: float, human_cost: float,
) -> dict[str, float]:
    """核算含失败废弃、沙箱/验证与人工抽检后的单位有效合成成本 C_eff 与节省倍数。"""
    if (
        min(in_tok, out_tok, c_in, c_out, env_cost, verify_cost, human_cost) < 0.0
        or not (0.0 < pass_rate <= 1.0)
        or not (0.0 <= audit_ratio <= 1.0)
    ):
        raise ValueError("参数越界：各项 Token/单价须非负，pass_rate ∈ (0, 1]，audit_ratio ∈ [0, 1]")
    c_gen = (in_tok * c_in + out_tok * c_out) / 1_000_000.0
    c_attempt = c_gen + env_cost + verify_cost
    c_wasted = c_attempt * (1.0 - pass_rate) / pass_rate
    c_audit = audit_ratio * human_cost
    c_eff = (c_attempt / pass_rate) + c_audit
    return {
        "gen_cost_per_attempt": c_gen,
        "attempt_cost": c_attempt,
        "wasted_cost_per_valid": c_wasted,
        "audit_cost_per_valid": c_audit,
        "effective_unit_cost": c_eff,
        "savings_multiple_vs_human": (human_cost / c_eff) if (c_eff > 0.0 and human_cost > 0.0) else 0.0,
    }


# === 7. 自检单元测试：保存为 data_eng_toolkit.py 后直接 python3 运行 ===

if __name__ == "__main__":
    # 1) Data-Constrained Scaling（E=1 无衰减，E=4 仍高效，E=20 边际衰减显著）
    s1 = effective_tokens_data_constrained(d_u=1.0, epochs=1.0, r_d_star=15.0)
    s4 = effective_tokens_data_constrained(d_u=1.0, epochs=4.0, r_d_star=15.0)
    s20 = effective_tokens_data_constrained(d_u=1.0, epochs=20.0, r_d_star=15.0)
    assert math.isclose(s1["effective_tokens"], 1.0, abs_tol=1e-9)
    assert s4["effective_tokens"] > 3.7 and s4["marginal_efficiency"] > 0.80
    assert s20["effective_tokens"] < s20["saturation_limit"] and s20["marginal_efficiency"] < 0.30

    # 2) MinHash + LSH 理论曲线（(14, 8): t*=0.719, P(0.5)=5.33%, P(0.8)=92.35%）+ 真实索引召回
    mh_50 = minhash_lsh_collision_prob(0.5, bands=14, rows=8)
    mh_80 = minhash_lsh_collision_prob(0.8, bands=14, rows=8)
    assert abs(mh_50["threshold"] - 0.719) < 0.001
    assert math.isclose(mh_50["collision_prob"], 1.0 - (1.0 - 0.5 ** 8) ** 14, abs_tol=1e-9)
    assert math.isclose(mh_80["collision_prob"], 1.0 - (1.0 - 0.8 ** 8) ** 14, abs_tol=1e-9)

    idx = MinHashLSHIndex(bands=14, rows=8, shingle_size=3, seed=7)
    idx.add("doc_a", "large language model data engineering pipelines require deduplication quality scoring and strict decontamination")
    idx.add("doc_b", "large language model data engineering pipelines require deduplication quality scoring and strict filtering")
    idx.add("doc_c", "quantum chromodynamics lattice simulations explore nonperturbative quark confinement regimes")
    pairs = idx.find_duplicate_pairs(min_jaccard=0.70)
    assert len(pairs) == 1 and pairs[0][0] == "doc_a" and pairs[0][1] == "doc_b" and pairs[0][2] > 0.75

    # 3) N-gram 训测去污（覆盖英文 + 中文混合泄漏检测）
    eval_set = {
        "eval_en": "Find all prime numbers p such that p squared plus two is also prime",
        "eval_zh": "计算复数平面上满足模长等于一且辐角为六十度的所有三次单位根之和",
    }
    train_set = {
        "tr_clean": "The weather in Beijing is sunny with mild breeze across the northern mountains.",
        "tr_leak_en": "In today homework: Find all prime numbers p such that p squared plus two is also prime. Show proof.",
        "tr_leak_zh": "竞赛例题讲解：计算复数平面上满足模长等于一且辐角为六十度的所有三次单位根之和，解题步骤如下。",
    }
    decontam = ngram_decontamination_scan(train_set, eval_set, n=10)
    assert set(decontam["contaminated_docs"].keys()) == {"tr_leak_en", "tr_leak_zh"}
    assert decontam["clean_doc_ids"] == ["tr_clean"]
    assert math.isclose(decontam["summary"]["contamination_rate"], 2.0 / 3.0, abs_tol=1e-9)

    # 4) RLVR 零梯度概率与甜点区课程分桶（G=8, p=0.02 => 85.1% 浪费）
    assert abs(rlvr_zero_grad_prob(0.02, group_size=8) - 0.851) < 0.002
    assert rlvr_zero_grad_prob(0.5, group_size=8) < 0.01
    bucketed = bucket_rlvr_prompts({"q1": (16, 0), "q2": (16, 4), "q3": (16, 10), "q4": (16, 16)}, 0.1, 0.8, 8)
    assert bucketed["buckets"] == {"too_hard": ["q1"], "sweet_spot": ["q2", "q3"], "too_easy": ["q4"]}
    assert bucketed["sweet_spot_zero_grad_rate"] < 0.10 < bucketed["raw_zero_grad_rate"]

    # 5) Agent Trajectory IR 校验与严格 Loss Mask
    traj = [
        {"role": "system", "content": "You are a helpful coding agent."},
        {"role": "user", "content": "Fix bug in parser.py"},
        {"role": "think", "content": "Inspect failing unit test first."},
        {"role": "tool_call", "content": "run_pytest tests/test_parser.py", "tool_args": {"path": "tests/test_parser.py"}},
        {"role": "tool_observation", "content": "AssertionError at line 42"},
        {"role": "assistant", "content": "Patched edge case and verified tests pass."},
    ]
    masked = build_agent_trajectory_loss_mask(traj)
    assert masked["masked_tokens"] == 14 and masked["supervised_tokens"] == 14
    assert masked["loss_mask"] == [0] * 10 + [1] * 7 + [0] * 4 + [1] * 7
    try:
        build_agent_trajectory_loss_mask([{"role": "tool_observation", "content": "orphan"}])
        raise AssertionError("应拒绝孤立 tool_observation")
    except ValueError:
        pass

    # 6) 合成数据单位有效成本账（Agent 多轮轨迹合成 ROI）
    roi = synthetic_unit_cost(12_000, 2_500, 0.50, 2.00, 0.015, 0.005, pass_rate=0.25, audit_ratio=0.05, human_cost=30.0)
    assert math.isclose(roi["gen_cost_per_attempt"], 0.011, abs_tol=1e-9)
    assert math.isclose(roi["effective_unit_cost"], 1.624, abs_tol=1e-9)
    assert roi["savings_multiple_vs_human"] > 18.0

    print("All LLM & Agent data engineering self-tests passed!")
```

> **工程集成建议**：在数据入库 CI 或 Airflow / Ray Data 质检算子中，可将 `ngram_decontamination_scan`、`build_agent_trajectory_loss_mask` 与 `bucket_rlvr_prompts` 直接挂接为强制门禁步骤，输出结构化 JSON 指标写入快照目录的 `dataset_manifest.yaml`（参见 [数据入库与上线红线清单](/books/llm-data/toolkit/data-checklist)）。
