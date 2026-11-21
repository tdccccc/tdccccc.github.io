<script setup lang="ts">
import { computed, ref } from 'vue'

const nItems = ref(300)
const baseScore = ref(0.70)
const delta = ref(0.05)
const corr = ref(0.63)

const W = 600
const H = 190
const m = { l: 108, r: 24, t: 24, b: 36 }

function erfcApprox(x: number): number {
  const z = Math.abs(x)
  const t = 1 / (1 + 0.5 * z)
  const ans =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087277))))))))
    )
  return x >= 0 ? ans : 2 - ans
}

function twoSidedP(z: number): number {
  return Math.min(1, Math.max(1e-9, erfcApprox(Math.abs(z) / Math.SQRT2)))
}

const pB = computed(() => Math.min(0.99, baseScore.value + delta.value))
const actualDelta = computed(() => pB.value - baseScore.value)

const stats = computed(() => {
  const N = nItems.value
  const pA = baseScore.value
  const pb = pB.value
  const d = actualDelta.value
  const vA = pA * (1 - pA)
  const vB = pb * (1 - pb)
  const sA = Math.sqrt(vA)
  const sB = Math.sqrt(vB)

  // Max mathematically feasible correlation for two Bernoullis
  const maxJoint = Math.min(pA, pb)
  const maxCorr = sA * sB > 1e-9 ? Math.min(0.95, (maxJoint - pA * pb) / (sA * sB)) : 0
  const effCorr = Math.min(corr.value, maxCorr)

  const varUnpaired = vA + vB
  const varPaired = Math.max(1e-6, vA + vB - 2 * effCorr * sA * sB)

  const seUnpaired = Math.sqrt(varUnpaired / N)
  const sePaired = Math.sqrt(varPaired / N)

  const zUnpaired = d / seUnpaired
  const zPaired = d / sePaired
  const pUnpaired = twoSidedP(zUnpaired)
  const pPaired = twoSidedP(zPaired)

  const ciUnpaired = 1.96 * seUnpaired
  const ciPaired = 1.96 * sePaired

  // MDE at 80% power, alpha=0.05 (z_0.975 + z_0.80 = 1.96 + 0.8416 = 2.8016), evaluated cleanly at baseline pA
  const mdeUnpaired = 2.8016 * Math.sqrt((2 * vA) / N)
  const mdePaired = 2.8016 * Math.sqrt((2 * vA * (1 - corr.value)) / N)

  const nReqPaired = d > 1e-6 ? Math.ceil((2.8016 * 2.8016 * varPaired) / (d * d)) : 99999
  const nReqUnpaired = d > 1e-6 ? Math.ceil((2.8016 * 2.8016 * varUnpaired) / (d * d)) : 99999

  return {
    effCorr,
    seUnpaired,
    sePaired,
    pUnpaired,
    pPaired,
    ciUnpaired,
    ciPaired,
    mdeUnpaired,
    mdePaired,
    nReqPaired,
    nReqUnpaired,
    sigUnpaired: pUnpaired < 0.05,
    sigPaired: pPaired < 0.05,
    varReductionPct: (1 - varPaired / varUnpaired) * 100,
  }
})

const axisRange = computed<[number, number]>(() => {
  const d = actualDelta.value
  const span = Math.max(0.12, d + stats.value.ciUnpaired * 1.15)
  const lo = Math.min(-0.04, d - stats.value.ciUnpaired * 1.15)
  return [lo, span]
})

function X(val: number): number {
  const [lo, hi] = axisRange.value
  return m.l + ((val - lo) / (hi - lo)) * (W - m.l - m.r)
}

const xTicks = computed(() => {
  const [lo, hi] = axisRange.value
  const step = hi - lo > 0.35 ? 0.1 : hi - lo > 0.18 ? 0.05 : 0.02
  const ticks: number[] = []
  const start = Math.ceil(lo / step) * step
  for (let v = start; v <= hi + 1e-6; v += step) {
    ticks.push(Number(v.toFixed(3)))
  }
  return ticks
})

function fmtPct(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`
}

function fmtP(p: number): string {
  if (p < 0.0001) return '< 0.0001'
  return p.toFixed(4)
}

function applyPreset(n: number, base: number, d: number, r: number) {
  nItems.value = n
  baseScore.value = base
  delta.value = d
  corr.value = r
}

function isPreset(n: number, base: number, d: number, r: number): boolean {
  return (
    nItems.value === n &&
    Math.abs(baseScore.value - base) < 1e-4 &&
    Math.abs(delta.value - d) < 1e-4 &&
    Math.abs(corr.value - r) < 1e-4
  )
}
</script>

<template>
  <div class="eval-widget">
    <div class="eval-widget__head">
      <span class="eval-widget__tag">交互实验</span>
      <h4 class="eval-widget__title">样本量 N、模型分差 Δ 与配对相关性 ρ 对显著性与 MDE 的实时影响</h4>
    </div>
    <p class="eval-widget__desc">
      在相同题目上对比模型 B 与基线模型 A（二值通过率）。拖动滑块，观察为何同一分差在独立检验下“不显著”，而在配对检验下即可清晰穿过 0 线。
    </p>

    <div class="eval-widget__btns">
      <button type="button" class="eval-btn" :class="{ 'is-on': isPreset(30, 0.70, 0.065, 0.65) }" @click="applyPreset(30, 0.70, 0.065, 0.65)">
        AIME 级小集（N=30, +6.5pp）
      </button>
      <button type="button" class="eval-btn" :class="{ 'is-on': isPreset(300, 0.70, 0.05, 0.63) }" @click="applyPreset(300, 0.70, 0.05, 0.63)">
        中型评测（N=300, +5.0pp）
      </button>
      <button type="button" class="eval-btn" :class="{ 'is-on': isPreset(1000, 0.72, 0.025, 0.70) }" @click="applyPreset(1000, 0.72, 0.025, 0.70)">
        大型回归集（N=1000, +2.5pp）
      </button>
    </div>

    <div class="eval-widget__sliders">
      <label class="eval-slider">
        <span>题数 N</span>
        <input v-model.number="nItems" type="range" min="30" max="2000" step="10" aria-label="评测集题数 N" />
        <span class="eval-val">{{ nItems }}</span>
      </label>

      <label class="eval-slider">
        <span>基线分 p_A</span>
        <input v-model.number="baseScore" type="range" min="0.20" max="0.88" step="0.01" aria-label="基线模型得分" />
        <span class="eval-val">{{ fmtPct(baseScore, 0) }}</span>
      </label>

      <label class="eval-slider">
        <span>分差 Δ</span>
        <input v-model.number="delta" type="range" min="0.005" max="0.15" step="0.005" aria-label="模型分差 Δ" />
        <span class="eval-val">+{{ (actualDelta * 100).toFixed(1) }}pp</span>
      </label>

      <label class="eval-slider">
        <span>同题相关 ρ</span>
        <input v-model.number="corr" type="range" min="0.0" max="0.88" step="0.01" aria-label="两模型同题得分相关系数" />
        <span class="eval-val" :title="stats.effCorr < corr - 1e-4 ? `受 Bernoulli 边界约束，有效 ρ = ${stats.effCorr.toFixed(2)}` : undefined">
          {{ stats.effCorr.toFixed(2) }}<sup v-if="stats.effCorr < corr - 1e-4">*</sup>
        </span>
      </label>
    </div>

    <div class="eval-svg-wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="非配对与配对检验的 95% 置信区间对比图">
        <!-- Vertical ticks & grid -->
        <g v-for="v in xTicks" :key="v">
          <line :x1="X(v)" :x2="X(v)" :y1="m.t" :y2="H - m.b" class="svg-grid" />
          <text :x="X(v)" :y="H - m.b + 16" text-anchor="middle" class="svg-mono svg-mu">
            {{ Math.abs(v) < 1e-6 ? '0%' : v > 0 ? `+${(v * 100).toFixed(0)}%` : `${(v * 100).toFixed(0)}%` }}
          </text>
        </g>

        <!-- Zero reference line -->
        <line :x1="X(0)" :x2="X(0)" :y1="m.t - 6" :y2="H - m.b" class="svg-zero" />
        <text :x="X(0)" :y="m.t - 10" text-anchor="middle" class="svg-mono svg-zero-txt">Δ = 0（无差异线）</text>

        <!-- Row 1: Unpaired CI -->
        <text :x="m.l - 10" y="68" text-anchor="end" class="svg-lbl">非配对 95% CI</text>
        <line
          :x1="X(actualDelta - stats.ciUnpaired)"
          :x2="X(actualDelta + stats.ciUnpaired)"
          y1="64"
          y2="64"
          :class="stats.sigUnpaired ? 'svg-bar-sig' : 'svg-bar-ns'"
        />
        <line :x1="X(actualDelta - stats.ciUnpaired)" :x2="X(actualDelta - stats.ciUnpaired)" y1="56" y2="72" :class="stats.sigUnpaired ? 'svg-cap-sig' : 'svg-cap-ns'" />
        <line :x1="X(actualDelta + stats.ciUnpaired)" :x2="X(actualDelta + stats.ciUnpaired)" y1="56" y2="72" :class="stats.sigUnpaired ? 'svg-cap-sig' : 'svg-cap-ns'" />
        <circle :cx="X(actualDelta)" cy="64" r="5" :class="stats.sigUnpaired ? 'svg-dot-sig' : 'svg-dot-ns'" />
        <text :x="W - m.r" y="48" text-anchor="end" class="svg-mono svg-mu">
          p={{ fmtP(stats.pUnpaired) }} · {{ stats.sigUnpaired ? '显著' : '不显著' }}
        </text>

        <!-- Row 2: Paired CI -->
        <text :x="m.l - 10" y="122" text-anchor="end" class="svg-lbl">配对 95% CI</text>
        <line
          :x1="X(actualDelta - stats.ciPaired)"
          :x2="X(actualDelta + stats.ciPaired)"
          y1="118"
          y2="118"
          :class="stats.sigPaired ? 'svg-bar-paired-sig' : 'svg-bar-ns'"
        />
        <line :x1="X(actualDelta - stats.ciPaired)" :x2="X(actualDelta - stats.ciPaired)" y1="110" y2="126" :class="stats.sigPaired ? 'svg-cap-paired-sig' : 'svg-cap-ns'" />
        <line :x1="X(actualDelta + stats.ciPaired)" :x2="X(actualDelta + stats.ciPaired)" y1="110" y2="126" :class="stats.sigPaired ? 'svg-cap-paired-sig' : 'svg-cap-ns'" />
        <circle :cx="X(actualDelta)" cy="118" r="5.5" :class="stats.sigPaired ? 'svg-dot-paired-sig' : 'svg-dot-ns'" />
        <text :x="W - m.r" y="102" text-anchor="end" class="svg-mono svg-mu">
          p={{ fmtP(stats.pPaired) }} · {{ stats.sigPaired ? '显著' : '不显著' }}
        </text>

        <!-- Axis title -->
        <text :x="(m.l + W - m.r) / 2" :y="H - 4" text-anchor="middle" class="svg-mu" font-size="11">
          模型 B 相对基线 A 的通过率提升 Δ（百分点）
        </text>
      </svg>
    </div>

    <div class="eval-metrics">
      <div class="eval-metric">
        <span class="eval-metric__k">配对 80% 功效 MDE</span>
        <span class="eval-metric__v">{{ fmtPct(stats.mdePaired, 2) }}</span>
        <span class="eval-metric__s">非配对需 {{ fmtPct(stats.mdeUnpaired, 2) }}</span>
      </div>
      <div class="eval-metric">
        <span class="eval-metric__k">配对方差压缩</span>
        <span class="eval-metric__v">-{{ stats.varReductionPct.toFixed(0) }}%</span>
        <span class="eval-metric__s">
          SE: {{ fmtPct(stats.sePaired, 2) }} vs {{ fmtPct(stats.seUnpaired, 2) }}
          <template v-if="stats.effCorr < corr - 1e-4"> · ρ={{ stats.effCorr.toFixed(2) }} (受边界约束)</template>
        </span>
      </div>
      <div class="eval-metric">
        <span class="eval-metric__k">稳定测出当前 Δ 需题量</span>
        <span class="eval-metric__v">{{ stats.nReqPaired }} 题</span>
        <span class="eval-metric__s">非配对需 {{ stats.nReqUnpaired }} 题</span>
      </div>
    </div>

    <div class="eval-widget__note">
      <template v-if="stats.sigPaired && !stats.sigUnpaired">
        <strong>关键发现：</strong>同题配对消除题目固有难度方差后，方差降低 {{ stats.varReductionPct.toFixed(0) }}%，原本被非配对误差棒掩盖的 +{{ (actualDelta * 100).toFixed(1) }}pp 真实提升立刻变得统计显著（p={{ fmtP(stats.pPaired) }}）。
      </template>
      <template v-else-if="!stats.sigPaired">
        <strong>功效不足警示：</strong>当前样本量 N={{ nItems }} 下，即使采用配对检验，95% 置信区间仍跨过 0（p={{ fmtP(stats.pPaired) }}）。若想以 80% 功效稳定检测 +{{ (actualDelta * 100).toFixed(1) }}pp 差异，至少需要约 {{ stats.nReqPaired }} 道独立题目（或对同一题多次采样降噪）。
      </template>
      <template v-else>
        <strong>清晰过闸：</strong>配对与非配对检验均达到 p &lt; 0.05，当前题量 N={{ nItems }} 的最小可检测效应 MDE 为 {{ fmtPct(stats.mdePaired, 2) }}，足以可靠支撑版本上线决策。
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
  margin-bottom: 0.9rem;
}

.eval-slider {
  display: grid;
  grid-template-columns: 5.2rem 1fr 3.8rem;
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

.eval-svg-wrap {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.4rem 0.5rem 0.25rem;
  margin-bottom: 0.85rem;
}

.eval-svg-wrap svg {
  display: block;
  width: 100%;
  height: auto;
}

.svg-grid {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.svg-zero {
  stroke: #e11d48;
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}

.svg-zero-txt {
  fill: #e11d48;
  font-size: 10px;
  font-weight: 600;
}

.dark .svg-zero-txt {
  fill: #fda4af;
}

.svg-mono {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
}

.svg-mu {
  fill: var(--vp-c-text-2);
}

.svg-lbl {
  fill: var(--vp-c-text-1);
  font-size: 11.5px;
  font-weight: 600;
}

.svg-bar-ns, .svg-cap-ns {
  stroke: #94a3b8;
  stroke-width: 2.4;
}

.svg-dot-ns {
  fill: #64748b;
}

.svg-bar-sig, .svg-cap-sig {
  stroke: #0284c7;
  stroke-width: 2.6;
}

.svg-dot-sig {
  fill: #0284c7;
}

.svg-bar-paired-sig, .svg-cap-paired-sig {
  stroke: #059669;
  stroke-width: 3;
}

.svg-dot-paired-sig {
  fill: #059669;
}

.eval-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
  font-size: 1.12rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin: 0.12rem 0;
}

.eval-metric__s {
  font-family: var(--vp-font-family-mono);
  font-size: 0.73rem;
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
</style>
