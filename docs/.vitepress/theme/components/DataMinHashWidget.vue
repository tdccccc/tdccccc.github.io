<script setup lang="ts">
import { computed, ref } from 'vue'

const bands = ref(14) // b (4..40)
const rows = ref(8) // r_lsh (2..14)
const sTarget = ref(0.75) // Target Jaccard threshold (0.30..0.95)

const W = 620
const H = 236
const m = { l: 52, r: 24, t: 24, b: 40 }

function probCandidate(s: number, b: number, r: number): number {
  return 1 - Math.pow(1 - Math.pow(s, r), b)
}

const stats = computed(() => {
  const b = bands.value
  const r = rows.value
  const t = sTarget.value

  const tStar = Math.pow(1 / b, 1 / r)
  const kSig = b * r
  const relMem = kSig / 112 // Relative to FineWeb (14 * 8 = 112)
  const pAtTarget = probCandidate(t, b, r)

  // Numerical integration (trapezoidal, 200 steps) for FP and FN areas
  const steps = 200
  let fpArea = 0
  let fnArea = 0
  const ds = 1 / steps
  for (let i = 0; i < steps; i++) {
    const s0 = i * ds
    const s1 = (i + 1) * ds
    const mid = (s0 + s1) / 2
    const pMid = probCandidate(mid, b, r)
    if (mid < t) {
      fpArea += pMid * ds
    } else {
      fnArea += (1 - pMid) * ds
    }
  }

  return {
    tStar,
    kSig,
    relMem,
    pAtTarget,
    fpArea,
    fnArea,
    p50: probCandidate(0.5, b, r),
    p70: probCandidate(0.7, b, r),
    p80: probCandidate(0.8, b, r),
    p90: probCandidate(0.9, b, r),
  }
})

function X(s: number): number {
  return m.l + s * (W - m.l - m.r)
}

function Y(p: number): number {
  return H - m.b - p * (H - m.t - m.b)
}

const sCurvePath = computed(() => {
  const b = bands.value
  const r = rows.value
  const pts: string[] = []
  for (let i = 0; i <= 100; i++) {
    const s = i / 100
    pts.push(`${i === 0 ? 'M' : 'L'} ${X(s).toFixed(1)} ${Y(probCandidate(s, b, r)).toFixed(1)}`)
  }
  return pts.join(' ')
})

// False Positive shaded region: s in [0, sTarget], between y=0 and curve P(s)
const fpPath = computed(() => {
  const b = bands.value
  const r = rows.value
  const t = sTarget.value
  const steps = 60
  const pts: string[] = [`M ${X(0).toFixed(1)} ${Y(0).toFixed(1)}`]
  for (let i = 0; i <= steps; i++) {
    const s = (t * i) / steps
    pts.push(`L ${X(s).toFixed(1)} ${Y(probCandidate(s, b, r)).toFixed(1)}`)
  }
  pts.push(`L ${X(t).toFixed(1)} ${Y(0).toFixed(1)} Z`)
  return pts.join(' ')
})

// False Negative shaded region: s in [sTarget, 1], between curve P(s) and y=1
const fnPath = computed(() => {
  const b = bands.value
  const r = rows.value
  const t = sTarget.value
  const steps = 60
  const pts: string[] = [`M ${X(t).toFixed(1)} ${Y(1).toFixed(1)}`]
  for (let i = 0; i <= steps; i++) {
    const s = t + ((1 - t) * i) / steps
    pts.push(`L ${X(s).toFixed(1)} ${Y(probCandidate(s, b, r)).toFixed(1)}`)
  }
  pts.push(`L ${X(1).toFixed(1)} ${Y(1).toFixed(1)} Z`)
  return pts.join(' ')
})

const probePoints = computed(() => [
  { s: 0.5, p: stats.value.p50 },
  { s: 0.7, p: stats.value.p70 },
  { s: 0.8, p: stats.value.p80 },
  { s: 0.9, p: stats.value.p90 },
])

const xTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
const yTicks = [0, 0.25, 0.5, 0.75, 1.0]

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function applyPreset(b: number, r: number, t: number) {
  bands.value = b
  rows.value = r
  sTarget.value = t
}

function isPreset(b: number, r: number): boolean {
  return bands.value === b && rows.value === r
}
</script>

<template>
  <div class="data-widget">
    <div class="data-widget__head">
      <span class="data-widget__tag">交互实验</span>
      <h4 class="data-widget__title">MinHash + LSH 频带参数 (b, r_lsh) 与候选命中 S 曲线</h4>
    </div>
    <p class="data-widget__desc">
      调节频带数 b 与每带行数 r_lsh，观察候选碰撞概率 P(candidate | s) = 1 - (1 - s^r)^b 的拐点阈值 t* 漂移、S 曲线陡峭度以及相对目标阈值 s_target 的误报（FP）与漏召（FN）面积。
    </p>

    <div class="data-widget__btns">
      <button type="button" class="data-btn" :class="{ 'is-on': isPreset(14, 8) }" @click="applyPreset(14, 8, 0.75)">
        FineWeb 严格口径 (b=14, r=8)
      </button>
      <button type="button" class="data-btn" :class="{ 'is-on': isPreset(20, 5) }" @click="applyPreset(20, 5, 0.60)">
        宽松去重 (b=20, r=5)
      </button>
      <button type="button" class="data-btn" :class="{ 'is-on': isPreset(16, 10) }" @click="applyPreset(16, 10, 0.80)">
        代码高精去重 (b=16, r=10)
      </button>
      <button type="button" class="data-btn" :class="{ 'is-on': isPreset(32, 8) }" @click="applyPreset(32, 8, 0.70)">
        陡峭高召回 (b=32, r=8)
      </button>
    </div>

    <div class="data-widget__sliders">
      <label class="data-slider">
        <span>频带数 b</span>
        <input v-model.number="bands" type="range" min="4" max="40" step="1" aria-label="MinHash LSH 频带数 b" />
        <span class="data-val">{{ bands }}</span>
      </label>

      <label class="data-slider">
        <span>每带行数 r</span>
        <input v-model.number="rows" type="range" min="2" max="14" step="1" aria-label="每频带行数 r_lsh" />
        <span class="data-val">{{ rows }}</span>
      </label>

      <label class="data-slider">
        <span>目标阈值 s*</span>
        <input v-model.number="sTarget" type="range" min="0.30" max="0.95" step="0.01" aria-label="目标 Jaccard 相似度阈值" />
        <span class="data-val">{{ sTarget.toFixed(2) }}</span>
      </label>
    </div>

    <div class="data-svg-wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="MinHash LSH 候选命中概率 S 曲线与误报漏召区域图">
        <!-- Grid lines -->
        <g v-for="v in yTicks" :key="`y-${v}`">
          <line :x1="m.l" :x2="W - m.r" :y1="Y(v)" :y2="Y(v)" class="svg-grid" />
          <text :x="m.l - 8" :y="Y(v) + 3.5" text-anchor="end" class="svg-mono svg-mu">
            {{ Math.round(v * 100) }}%
          </text>
        </g>

        <g v-for="v in xTicks" :key="`x-${v}`">
          <line :x1="X(v)" :x2="X(v)" :y1="m.t" :y2="H - m.b" class="svg-grid-v" />
          <text :x="X(v)" :y="H - m.b + 16" text-anchor="middle" class="svg-mono svg-mu">
            {{ v.toFixed(1) }}
          </text>
        </g>

        <!-- FP & FN shaded areas -->
        <path :d="fpPath" class="svg-fp-area" />
        <path :d="fnPath" class="svg-fn-area" />

        <!-- Target threshold line -->
        <line :x1="X(sTarget)" :x2="X(sTarget)" :y1="m.t" :y2="H - m.b" class="svg-target-line" />
        <text
          :x="X(sTarget) + (sTarget > 0.82 ? -6 : 6)"
          :y="m.t + 12"
          :text-anchor="sTarget > 0.82 ? 'end' : 'start'"
          class="svg-mono svg-target-txt"
        >
          目标 s={{ sTarget.toFixed(2) }}
        </text>

        <!-- Inflection threshold t* dashed line -->
        <line :x1="X(stats.tStar)" :x2="X(stats.tStar)" :y1="m.t" :y2="H - m.b" class="svg-tstar-line" />
        <text
          :x="X(stats.tStar)"
          :y="m.t - 6"
          text-anchor="middle"
          class="svg-mono svg-tstar-txt"
        >
          拐点 t*={{ stats.tStar.toFixed(3) }}
        </text>

        <!-- S-curve -->
        <path :d="sCurvePath" class="svg-scurve" fill="none" />

        <!-- Reference probe dots at s = 0.5, 0.7, 0.8, 0.9 -->
        <g v-for="pt in probePoints" :key="pt.s">
          <circle :cx="X(pt.s)" :cy="Y(pt.p)" r="4" class="svg-probe-dot" />
        </g>

        <!-- Legend -->
        <g :transform="`translate(${m.l + 10}, ${m.t + 16})`">
          <rect x="0" y="-8" width="12" height="10" rx="2" class="svg-fp-swatch" />
          <text x="16" y="0" class="svg-mu" font-size="10">假阳性区 FP（误进候选桶）</text>
          <rect x="0" y="7" width="12" height="10" rx="2" class="svg-fn-swatch" />
          <text x="16" y="15" class="svg-mu" font-size="10">假阴性区 FN（高相似漏召）</text>
        </g>

        <!-- Axis title -->
        <text :x="(m.l + W - m.r) / 2" :y="H - 5" text-anchor="middle" class="svg-mu" font-size="11">
          两文档 k-shingle 真实 Jaccard 相似度 s
        </text>
      </svg>
    </div>

    <div class="data-probes">
      <div class="data-probe">
        <span class="data-probe__k">P(命中 | s=0.5)</span>
        <span class="data-probe__v">{{ fmtPct(stats.p50) }}</span>
      </div>
      <div class="data-probe">
        <span class="data-probe__k">P(命中 | s=0.7)</span>
        <span class="data-probe__v">{{ fmtPct(stats.p70) }}</span>
      </div>
      <div class="data-probe">
        <span class="data-probe__k">P(命中 | s=0.8)</span>
        <span class="data-probe__v">{{ fmtPct(stats.p80) }}</span>
      </div>
      <div class="data-probe">
        <span class="data-probe__k">P(命中 | s=0.9)</span>
        <span class="data-probe__v">{{ fmtPct(stats.p90) }}</span>
      </div>
    </div>

    <div class="data-metrics">
      <div class="data-metric">
        <span class="data-metric__k">S 曲线拐点 t*</span>
        <span class="data-metric__v">{{ stats.tStar.toFixed(3) }}</span>
        <span class="data-metric__s">目标 s={{ sTarget.toFixed(2) }} 处命中 {{ fmtPct(stats.pAtTarget) }}</span>
      </div>
      <div class="data-metric">
        <span class="data-metric__k">签名长度 k_sig = b·r</span>
        <span class="data-metric__v">{{ stats.kSig }} 维</span>
        <span class="data-metric__s">相对 FineWeb 内存 {{ stats.relMem.toFixed(2) }}×</span>
      </div>
      <div class="data-metric">
        <span class="data-metric__k">误报 FP / 漏召 FN 面积</span>
        <span class="data-metric__v">{{ stats.fpArea.toFixed(3) }} / {{ stats.fnArea.toFixed(3) }}</span>
        <span class="data-metric__s">面积越小，边界越接近理想阶跃</span>
      </div>
    </div>

    <div class="data-widget__note">
      <template v-if="stats.tStar < 0.60">
        <strong>宽松边界提醒：</strong>当前拐点 t*={{ stats.tStar.toFixed(3) }} 偏低，s=0.50 的中等相似文档仍有 {{ fmtPct(stats.p50) }} 概率落入候选桶。用于代码仓、财报或法律模板语料时极易触发误杀，建议增大每带行数 r_lsh 或在后置阶段加精确 Jaccard 复核。
      </template>
      <template v-else-if="stats.kSig >= 200">
        <strong>高精度高成本配置：</strong>签名长度达 {{ stats.kSig }} 维（为 FineWeb 默认口径的 {{ stats.relMem.toFixed(2) }}×），S 曲线非常陡峭（FP={{ stats.fpArea.toFixed(3) }} / FN={{ stats.fnArea.toFixed(3) }}），适合学术论文或高价值代码仓精洗，但百 TB 级洗数须评估集群内存与 Shuffle 带宽。
      </template>
      <template v-else>
        <strong>均衡工业配置：</strong>拐点 t*={{ stats.tStar.toFixed(3) }}、签名 {{ stats.kSig }} 维，s=0.80 近似重复召回率达 {{ fmtPct(stats.p80) }} 而 s=0.50 误报仅 {{ fmtPct(stats.p50) }}。若想把门槛向右平移而不牺牲陡峭度，可同比例提高 r_lsh 并适当增加 b。
      </template>
    </div>
  </div>
</template>

<style scoped>
.data-widget {
  margin: 1.5rem 0 1.8rem;
  padding: 1.15rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.data-widget__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.7rem;
  margin-bottom: 0.4rem;
}

.data-widget__tag {
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

.data-widget__title {
  margin: 0 !important;
  font-size: 1rem !important;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.data-widget__desc {
  margin: 0 0 0.85rem !important;
  font-size: 0.86rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.data-widget__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.85rem;
}

.data-btn {
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

.data-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.data-btn.is-on {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #ffffff;
}

.dark .data-btn.is-on {
  background: #4f46e5;
  border-color: #6366f1;
}

.data-widget__sliders {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(195px, 1fr));
  gap: 0.6rem 1.1rem;
  margin-bottom: 0.9rem;
}

.data-slider {
  display: grid;
  grid-template-columns: 5.4rem 1fr 3.2rem;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.data-slider input[type='range'] {
  width: 100%;
  accent-color: #d97706;
  cursor: pointer;
}

.data-val {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  text-align: right;
  color: var(--vp-c-brand-1);
}

.data-svg-wrap {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.45rem 0.55rem 0.25rem;
  margin-bottom: 0.75rem;
}

.data-svg-wrap svg {
  display: block;
  width: 100%;
  height: auto;
}

.svg-grid {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.svg-grid-v {
  stroke: var(--vp-c-divider);
  stroke-width: 0.8;
  stroke-dasharray: 2 3;
}

.svg-fp-area, .svg-fp-swatch {
  fill: rgba(244, 63, 94, 0.22);
}

.svg-fn-area, .svg-fn-swatch {
  fill: rgba(2, 132, 199, 0.20);
}

.svg-tstar-line {
  stroke: #e11d48;
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}

.svg-tstar-txt {
  fill: #e11d48;
  font-size: 10px;
  font-weight: 600;
}

.dark .svg-tstar-txt {
  fill: #fda4af;
}

.svg-target-line {
  stroke: #0284c7;
  stroke-width: 1.4;
  stroke-dasharray: 3 3;
}

.svg-target-txt {
  fill: #0284c7;
  font-size: 10px;
  font-weight: 600;
}

.dark .svg-target-txt {
  fill: #38bdf8;
}

.svg-scurve {
  stroke: #059669;
  stroke-width: 2.8;
}

.dark .svg-scurve {
  stroke: #34d399;
}

.svg-probe-dot {
  fill: #d97706;
  stroke: var(--vp-c-bg);
  stroke-width: 1.8;
}

.svg-mono {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
}

.svg-mu {
  fill: var(--vp-c-text-2);
}

.data-probes {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.7rem;
}

.data-probe {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.42rem 0.5rem;
  border-radius: 7px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}

.data-probe__k {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  color: var(--vp-c-text-2);
}

.data-probe__v {
  font-family: var(--vp-font-family-mono);
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.data-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}

.data-metric {
  display: flex;
  flex-direction: column;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}

.data-metric__k {
  font-size: 0.74rem;
  color: var(--vp-c-text-2);
}

.data-metric__v {
  font-family: var(--vp-font-family-mono);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin: 0.12rem 0;
}

.data-metric__s {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
}

.data-widget__note {
  padding: 0.7rem 0.88rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  font-size: 0.84rem;
  line-height: 1.65;
  color: var(--vp-c-text-2);
}

.data-widget__note strong {
  color: var(--vp-c-text-1);
}

@media (max-width: 560px) {
  .data-probes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
