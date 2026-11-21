<script setup lang="ts">
import { computed, ref } from 'vue'

const trueTheta = ref(0.55)
const q1 = ref(0.9) // TPR / sensitivity
const q0 = ref(0.72) // TNR / specificity
const calSize = ref(160) // human gold calibration sample size (split half pos / half neg)
const evalSize = 500

const stats = computed(() => {
  const th = trueTheta.value
  const tpr = q1.value
  const tnr = q0.value
  const J = tpr + tnr - 1 // Youden's J

  // Expected raw Judge pass rate: E[p_raw] = theta * q1 + (1 - theta) * (1 - q0)
  const pRaw = th * tpr + (1 - th) * (1 - tnr)
  const bias = pRaw - th

  // Rogan-Gladen point estimate (given exact q1, q0 it recovers theta; we also compute its CI due to finite N_eval & calibration m)
  const rgRaw = J > 0.02 ? (pRaw + tnr - 1) / J : NaN
  const rgClamped = Number.isFinite(rgRaw) ? Math.min(1, Math.max(0, rgRaw)) : NaN

  // Delta-method SE for Rogan-Gladen estimator with finite calibration set m1 = m0 = calSize / 2 and unlabeled evalSize
  const m1 = calSize.value / 2
  const m0 = calSize.value / 2
  const varP = (pRaw * (1 - pRaw)) / evalSize
  const varQ1 = (tpr * (1 - tpr)) / m1
  const varQ0 = (tnr * (1 - tnr)) / m0

  const varRG =
    J > 0.02
      ? (varP + th * th * varQ1 + (1 - th) * (1 - th) * varQ0) / (J * J)
      : NaN
  const seRG = Number.isFinite(varRG) ? Math.sqrt(varRG) : NaN
  const ciHalf = Number.isFinite(seRG) ? 1.96 * seRG : NaN
  const ciLo = Number.isFinite(ciHalf) ? Math.max(0, rgClamped - ciHalf) : 0
  const ciHi = Number.isFinite(ciHalf) ? Math.min(1, rgClamped + ciHalf) : 1

  const inflation = J > 0.02 ? 1 / (J * J) : Infinity

  return {
    J,
    pRaw,
    bias,
    rgClamped,
    seRG,
    ciHalf,
    ciLo,
    ciHi,
    inflation,
  }
})

function applyPreset(th: number, tpr: number, tnr: number, m: number) {
  trueTheta.value = th
  q1.value = tpr
  q0.value = tnr
  calSize.value = m
}

function fmtPct(v: number, d = 1): string {
  return Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : '无解'
}
</script>

<template>
  <div class="eval-widget">
    <div class="eval-widget__head">
      <span class="eval-widget__tag">交互实验</span>
      <h4 class="eval-widget__title">LLM-as-a-Judge 原始分失真与 Rogan-Gladen 统计矫正模拟器</h4>
    </div>
    <p class="eval-widget__desc">
      即使评委准确率高达 85%，只要灵敏度 q₁ (TPR) 与特异度 q₀ (TNR) 不对称，原始通过率 p_raw 就会系统性虚高或虚低。调节评委质量与人类校准样本量 m，观察 Rogan-Gladen 期望无偏还原 ± 95% CI 与不确定性区间。
    </p>

    <div class="eval-widget__btns">
      <button type="button" class="eval-btn" :class="{ 'is-on': Math.abs(q1 - 0.94) < 0.01 && Math.abs(q0 - 0.62) < 0.01 }" @click="applyPreset(0.45, 0.94, 0.62, 160)">
        宽松“老好人”评委 (TPR 94% / TNR 62%)
      </button>
      <button type="button" class="eval-btn" :class="{ 'is-on': Math.abs(q1 - 0.92) < 0.01 && Math.abs(q0 - 0.90) < 0.01 }" @click="applyPreset(0.55, 0.92, 0.90, 200)">
        高一致强评委 (TPR 92% / TNR 90%)
      </button>
      <button type="button" class="eval-btn" :class="{ 'is-on': Math.abs(q1 - 0.72) < 0.01 && Math.abs(q0 - 0.95) < 0.01 }" @click="applyPreset(0.70, 0.72, 0.95, 160)">
        严苛漏判评委 (TPR 72% / TNR 95%)
      </button>
    </div>

    <div class="eval-widget__sliders">
      <label class="eval-slider">
        <span>真实率 θ</span>
        <input v-model.number="trueTheta" type="range" min="0.05" max="0.95" step="0.01" aria-label="真实通过率 θ" />
        <span class="eval-val">{{ fmtPct(trueTheta, 0) }}</span>
      </label>

      <label class="eval-slider">
        <span>TPR (q₁)</span>
        <input v-model.number="q1" type="range" min="0.52" max="0.99" step="0.01" aria-label="评委灵敏度 TPR" />
        <span class="eval-val">{{ fmtPct(q1, 0) }}</span>
      </label>

      <label class="eval-slider">
        <span>TNR (q₀)</span>
        <input v-model.number="q0" type="range" min="0.52" max="0.99" step="0.01" aria-label="评委特异度 TNR" />
        <span class="eval-val">{{ fmtPct(q0, 0) }}</span>
      </label>

      <label class="eval-slider">
        <span>校准集 m</span>
        <input v-model.number="calSize" type="range" min="40" max="500" step="20" aria-label="人类金标校准集规模 m" />
        <span class="eval-val">{{ calSize }} 题</span>
      </label>
    </div>

    <!-- Horizontal Bar Comparison -->
    <div class="rg-bars">
      <div class="rg-row">
        <span class="rg-label">真实通过率 θ</span>
        <div class="rg-track">
          <div class="rg-fill rg-fill--true" :style="{ width: `${trueTheta * 100}%` }" />
        </div>
        <span class="rg-pct">{{ fmtPct(trueTheta) }}</span>
      </div>

      <div class="rg-row">
        <span class="rg-label">Judge 原始分 p_raw</span>
        <div class="rg-track">
          <div class="rg-fill rg-fill--raw" :style="{ width: `${stats.pRaw * 100}%` }" />
        </div>
        <span class="rg-pct">
          {{ fmtPct(stats.pRaw) }} ({{ stats.bias >= 0 ? '+' : '' }}{{ (stats.bias * 100).toFixed(1) }}pp)
        </span>
      </div>

      <div class="rg-row">
        <span class="rg-label">期望无偏还原 ± 95% CI</span>
        <div class="rg-track">
          <div
            v-if="Number.isFinite(stats.ciLo)"
            class="rg-ci-band"
            :style="{ left: `${stats.ciLo * 100}%`, width: `${Math.max(0.5, (stats.ciHi - stats.ciLo) * 100)}%` }"
          />
          <div
            v-if="Number.isFinite(stats.rgClamped)"
            class="rg-point"
            :style="{ left: `${stats.rgClamped * 100}%` }"
          />
        </div>
        <span class="rg-pct">
          {{ fmtPct(stats.rgClamped) }} ± {{ Number.isFinite(stats.ciHalf) ? (stats.ciHalf * 100).toFixed(1) : '∞' }}pp
        </span>
      </div>
    </div>

    <div class="eval-metrics">
      <div class="eval-metric">
        <span class="eval-metric__k">原始分系统偏差</span>
        <span class="eval-metric__v" :class="{ 'is-rose': Math.abs(stats.bias) > 0.05 }">
          {{ stats.bias >= 0 ? '+' : '' }}{{ (stats.bias * 100).toFixed(1) }}pp
        </span>
        <span class="eval-metric__s">FP占比={{ ((1 - trueTheta) * (1 - q0) * 100).toFixed(1) }}% · FN占比={{ (trueTheta * (1 - q1) * 100).toFixed(1) }}%</span>
      </div>
      <div class="eval-metric">
        <span class="eval-metric__k">Youden 区分度 J = q₁+q₀−1</span>
        <span class="eval-metric__v">{{ stats.J.toFixed(2) }}</span>
        <span class="eval-metric__s">方差放大倍率 1/J² = {{ Number.isFinite(stats.inflation) ? stats.inflation.toFixed(1) : '∞' }}×</span>
      </div>
      <div class="eval-metric">
        <span class="eval-metric__k">矫正后 95% 置信区间</span>
        <span class="eval-metric__v">[{{ fmtPct(stats.ciLo) }}, {{ fmtPct(stats.ciHi) }}]</span>
        <span class="eval-metric__s">测试集 N={{ evalSize }} · 校准集 m₁=m₀={{ calSize / 2 }}</span>
      </div>
    </div>

    <div class="eval-widget__note">
      <template v-if="stats.J < 0.40">
        <strong>高危警报（J = {{ stats.J.toFixed(2) }} &lt; 0.40 过低）：</strong>当 q₁ + q₀ 接近 1 时，评委几乎等同抛硬币，Rogan-Gladen 分母趋近于 0，方差被放大 {{ Number.isFinite(stats.inflation) ? stats.inflation.toFixed(1) : '∞' }} 倍，置信区间宽到无法做决策！此时应先改 Prompt / 拆细 Rubrics 或换强评委，而非强行矫正。
      </template>
      <template v-else-if="stats.J < 0.70">
        <strong>注意区分度偏低（J = {{ stats.J.toFixed(2) }}）：</strong>处于黄灯区，建议扩充人类校准集 m ≥ 300 或拆细 Rubric 降低误差放大倍率（当前 1/J² = {{ stats.inflation.toFixed(1) }}×，95% CI 半宽 ±{{ (stats.ciHalf * 100).toFixed(1) }}pp，原始偏差 {{ stats.bias >= 0 ? '+' : '' }}{{ (stats.bias * 100).toFixed(1) }}pp）。
      </template>
      <template v-else-if="Math.abs(stats.bias) > 0.04">
        <strong>失真显著：</strong>原始 Judge 分数偏离真实水平达 <strong>{{ stats.bias >= 0 ? '+' : '' }}{{ (stats.bias * 100).toFixed(1) }}pp</strong>（{{ stats.bias > 0 ? '假阳性过多导致虚高' : '假阴性过多导致低估' }}）。经 Rogan-Gladen 矫正后消除期望偏差，95% 区间半宽为 ±{{ (stats.ciHalf * 100).toFixed(1) }}pp；增大人类校准集 m 可进一步收窄区间。
      </template>
      <template v-else>
        <strong>校准健康：</strong>当前评委区分度 J={{ stats.J.toFixed(2) }} 良好，且假阳性与假阴性大致抵消；仍建议随版本冻结上报 (q₁, q₀) 与矫正后区间，以防模型升级后真实率 θ 漂移导致原本抵消的偏差重新暴露。
      </template>
    </div>
  </div>
</template>

<style scoped>
.eval-widget {
  margin: 1.5rem 0 1.8rem;
  padding: 1.15rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.eval-widget__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.7rem;
  margin-bottom: 0.4rem;
}

.eval-widget__tag {
  display: inline-flex;
  align-items: center;
  padding: 0.12rem 0.52rem;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-weight: 600;
}

.eval-widget__title {
  margin: 0 !important;
  font-size: 1rem !important;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.eval-widget__desc {
  margin: 0 0 0.85rem !important;
  font-size: 0.86rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.eval-widget__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.85rem;
}

.eval-btn {
  padding: 0.28rem 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.eval-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.eval-btn.is-on {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #ffffff;
}

.dark .eval-btn.is-on {
  background: #4f46e5;
  border-color: #6366f1;
}

.eval-widget__sliders {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.6rem 1.1rem;
  margin-bottom: 0.95rem;
}

.eval-slider {
  display: grid;
  grid-template-columns: 4.8rem 1fr 3.6rem;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.eval-slider input[type='range'] {
  width: 100%;
  accent-color: #d97706;
  cursor: pointer;
}

.eval-val {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  text-align: right;
  color: var(--vp-c-brand-1);
}

.rg-bars {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-bottom: 0.9rem;
}

.rg-row {
  display: grid;
  grid-template-columns: 9.6rem minmax(0, 1fr) 9.4rem;
  gap: 0.65rem;
  align-items: center;
}

.rg-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.rg-track {
  position: relative;
  height: 26px;
  border-radius: 5px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
}

.rg-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  transition: width 0.18s ease;
}

.rg-fill--true {
  background: rgba(79, 70, 229, 0.72);
}

.rg-fill--raw {
  background: rgba(225, 29, 72, 0.65);
}

.rg-ci-band {
  position: absolute;
  top: 4px;
  bottom: 4px;
  border-radius: 4px;
  background: rgba(5, 150, 105, 0.28);
  border: 1.5px solid #059669;
  transition: left 0.18s ease, width 0.18s ease;
}

.rg-point {
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 3px;
  margin-left: -1.5px;
  background: #047857;
  transition: left 0.18s ease;
}

.dark .rg-point {
  background: #34d399;
}

.rg-pct {
  position: static;
  transform: none;
  text-align: right;
  white-space: nowrap;
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  padding: 0.14rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
}

.eval-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}

.eval-metric {
  display: flex;
  flex-direction: column;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}

.eval-metric__k {
  font-size: 0.74rem;
  color: var(--vp-c-text-2);
}

.eval-metric__v {
  font-family: var(--vp-font-family-mono);
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin: 0.12rem 0;
}

.eval-metric__v.is-rose {
  color: #e11d48;
}

.dark .eval-metric__v.is-rose {
  color: #fda4af;
}

.eval-metric__s {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
}

.eval-widget__note {
  padding: 0.7rem 0.88rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  font-size: 0.84rem;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.eval-widget__note strong {
  color: var(--vp-c-text-1);
}

@media (max-width: 640px) {
  .rg-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.25rem 0.5rem;
  }

  .rg-label {
    grid-column: 1;
    grid-row: 1;
  }

  .rg-pct {
    grid-column: 2;
    grid-row: 1;
  }

  .rg-track {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
