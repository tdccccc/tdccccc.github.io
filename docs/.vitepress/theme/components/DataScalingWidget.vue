<script setup lang="ts">
import { computed, ref } from 'vue'

const dU = ref(4.0) // Unique tokens (T)
const epochs = ref(4) // Repeat epochs E (1..20)
const quality = ref(1.0) // Quality multiplier q (0.6..1.6)
const rStar = ref(15.0) // Decay half-life constant R_D* (8..20)

const W = 620
const H = 236
const m = { l: 56, r: 22, t: 22, b: 40 }
const MAX_E = 20
const BETA = 0.28 // Canonical data scaling exponent

function calcDeff(uniqueT: number, e: number, q: number, rdStar: number): number {
  const rd = Math.max(0, e - 1)
  return q * uniqueT * (1 + rdStar * (1 - Math.exp(-rd / rdStar)))
}

const metrics = computed(() => {
  const u = dU.value
  const e = epochs.value
  const q = quality.value
  const rs = rStar.value

  const rawTokens = u * e
  const dEff = calcDeff(u, e, q, rs)
  const dEffBase = calcDeff(u, e, 1.0, rs)
  const marginalEff = Math.exp(-(e - 1) / rs)
  const satLimit = q * u * (1 + rs)
  const utilRatio = dEffBase / rawTokens

  // Relative data-term loss change vs single-pass baseline (E=1, q=1 => D_eff = D_U)
  // L_data ~ D_eff^(-beta), so relative change = (D_eff / D_U)^(-beta) - 1 (negative = better)
  const relLossDelta = Math.pow(dEff / u, -BETA) - 1

  return {
    rawTokens,
    dEff,
    marginalEff,
    satLimit,
    utilRatio,
    relLossDelta,
  }
})

const yMax = computed(() => {
  const rawMax = dU.value * MAX_E
  const effMax = calcDeff(dU.value, MAX_E, quality.value, rStar.value)
  const sat = metrics.value.satLimit
  return Math.max(rawMax, effMax * 1.08, Math.min(sat * 1.06, rawMax * 1.45))
})

function X(e: number): number {
  return m.l + ((e - 1) / (MAX_E - 1)) * (W - m.l - m.r)
}

function Y(val: number): number {
  const clamped = Math.max(0, Math.min(yMax.value, val))
  return H - m.b - (clamped / yMax.value) * (H - m.t - m.b)
}

const rawPath = computed(() => {
  const pts: string[] = []
  for (let e = 1; e <= MAX_E; e += 0.5) {
    pts.push(`${e === 1 ? 'M' : 'L'} ${X(e).toFixed(1)} ${Y(dU.value * e).toFixed(1)}`)
  }
  return pts.join(' ')
})

const effPath = computed(() => {
  const pts: string[] = []
  for (let e = 1; e <= MAX_E; e += 0.25) {
    const val = calcDeff(dU.value, e, quality.value, rStar.value)
    pts.push(`${e === 1 ? 'M' : 'L'} ${X(e).toFixed(1)} ${Y(val).toFixed(1)}`)
  }
  return pts.join(' ')
})

const effAreaPath = computed(() => {
  const baselineY = Y(0).toFixed(1)
  return `${effPath.value} L ${X(MAX_E).toFixed(1)} ${baselineY} L ${X(1).toFixed(1)} ${baselineY} Z`
})

const xTicks = [1, 4, 8, 12, 16, 20]

const yTicks = computed(() => {
  const top = yMax.value
  const rawStep = top / 4
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / mag
  const step = (norm <= 1.2 ? 1 : norm <= 2.5 ? 2 : norm <= 6 ? 5 : 10) * mag
  const ticks: number[] = []
  for (let v = 0; v <= top + 1e-6; v += step) {
    ticks.push(Number(v.toFixed(2)))
  }
  return ticks
})

const showSatLine = computed(() => metrics.value.satLimit <= yMax.value * 0.99)

function fmtT(v: number): string {
  return v >= 100 ? `${v.toFixed(0)}T` : `${v.toFixed(1)}T`
}

function applyPreset(u: number, e: number, q: number, rs: number) {
  dU.value = u
  epochs.value = e
  quality.value = q
  rStar.value = rs
}

function isPreset(u: number, e: number, q: number, rs: number): boolean {
  return (
    Math.abs(dU.value - u) < 1e-4 &&
    epochs.value === e &&
    Math.abs(quality.value - q) < 1e-4 &&
    Math.abs(rStar.value - rs) < 1e-4
  )
}
</script>

<template>
  <div class="data-widget">
    <div class="data-widget__head">
      <span class="data-widget__tag">交互实验</span>
      <h4 class="data-widget__title">Data-Constrained Scaling：唯一语料 D_U、重复轮数 E 与质量系数 q 的有效数据曲线</h4>
    </div>
    <p class="data-widget__desc">
      拖动滑块观察有效 Token 量 D_eff(E) 如何随重复轮数偏离线性算力投入 E·D_U：前 4 轮处于近无损甜点区，超过半衰常数后算力迅速坠入边际递减与饱和平台。
    </p>

    <div class="data-widget__btns">
      <button type="button" class="data-btn" :class="{ 'is-on': isPreset(1.0, 12, 1.3, 15.0) }" @click="applyPreset(1.0, 12, 1.3, 15.0)">
        高质稀缺语料（D_U=1T, 12 Epoch）
      </button>
      <button type="button" class="data-btn" :class="{ 'is-on': isPreset(4.0, 4, 1.0, 15.0) }" @click="applyPreset(4.0, 4, 1.0, 15.0)">
        均衡预训练（D_U=4T, 4 Epoch）
      </button>
      <button type="button" class="data-btn" :class="{ 'is-on': isPreset(15.0, 1, 0.8, 15.0) }" @click="applyPreset(15.0, 1, 0.8, 15.0)">
        海量网页单过（D_U=15T, 1 Epoch）
      </button>
    </div>

    <div class="data-widget__sliders">
      <label class="data-slider">
        <span>唯一语料 D_U</span>
        <input v-model.number="dU" type="range" min="0.5" max="15" step="0.5" aria-label="唯一语料量 D_U（单位 T tokens）" />
        <span class="data-val">{{ dU.toFixed(1) }}T</span>
      </label>

      <label class="data-slider">
        <span>重复轮数 E</span>
        <input v-model.number="epochs" type="range" min="1" max="20" step="1" aria-label="重复训练轮数 E" />
        <span class="data-val">{{ epochs }} ep</span>
      </label>

      <label class="data-slider">
        <span>质量系数 q</span>
        <input v-model.number="quality" type="range" min="0.6" max="1.6" step="0.05" aria-label="数据质量折算系数 q" />
        <span class="data-val">{{ quality.toFixed(2) }}×</span>
      </label>

      <label class="data-slider">
        <span>半衰常数 R_D*</span>
        <input v-model.number="rStar" type="range" min="8" max="20" step="0.5" aria-label="重复衰减半衰常数 R_D*" />
        <span class="data-val">{{ rStar.toFixed(1) }}</span>
      </label>
    </div>

    <div class="data-svg-wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="有效 Token 量 D_eff 与原始算力投入 E*D_U 随重复轮数变化的对比曲线">
        <!-- Sweet zone (E: 1..4) and Saturation zone (E: 10..20) -->
        <rect
          :x="X(1)"
          :y="m.t"
          :width="X(4) - X(1)"
          :height="H - m.t - m.b"
          class="svg-zone-sweet"
        />
        <text :x="(X(1) + X(4)) / 2" :y="m.t + 14" text-anchor="middle" class="svg-zone-lbl-sweet">
          4-Epoch 甜点区
        </text>

        <rect
          :x="X(10)"
          :y="m.t"
          :width="X(20) - X(10)"
          :height="H - m.t - m.b"
          class="svg-zone-sat"
        />
        <text :x="(X(10) + X(20)) / 2" :y="m.t + 14" text-anchor="middle" class="svg-zone-lbl-sat">
          严重边际衰减 / 饱和区
        </text>

        <!-- Horizontal Y grid & labels -->
        <g v-for="v in yTicks" :key="`y-${v}`">
          <line :x1="m.l" :x2="W - m.r" :y1="Y(v)" :y2="Y(v)" class="svg-grid" />
          <text :x="m.l - 8" :y="Y(v) + 3.5" text-anchor="end" class="svg-mono svg-mu">
            {{ fmtT(v) }}
          </text>
        </g>

        <!-- Vertical X ticks -->
        <g v-for="e in xTicks" :key="`x-${e}`">
          <line :x1="X(e)" :x2="X(e)" :y1="m.t" :y2="H - m.b" class="svg-grid-v" />
          <text :x="X(e)" :y="H - m.b + 16" text-anchor="middle" class="svg-mono svg-mu">
            {{ e }}
          </text>
        </g>

        <!-- Saturation plateau asymptote -->
        <g v-if="showSatLine">
          <line :x1="m.l" :x2="W - m.r" :y1="Y(metrics.satLimit)" :y2="Y(metrics.satLimit)" class="svg-sat-line" />
          <text :x="W - m.r - 4" :y="Y(metrics.satLimit) - 5" text-anchor="end" class="svg-mono svg-sat-txt">
            饱和上限 {{ fmtT(metrics.satLimit) }}
          </text>
        </g>

        <!-- Effective tokens area & curves -->
        <path :d="effAreaPath" class="svg-eff-area" />
        <path :d="rawPath" class="svg-raw-curve" fill="none" />
        <path :d="effPath" class="svg-eff-curve" fill="none" />

        <!-- Current Epoch marker -->
        <line :x1="X(epochs)" :x2="X(epochs)" :y1="m.t" :y2="H - m.b" class="svg-cursor" />
        <circle :cx="X(epochs)" :cy="Y(metrics.rawTokens)" r="4.5" class="svg-dot-raw" />
        <circle :cx="X(epochs)" :cy="Y(metrics.dEff)" r="5.5" class="svg-dot-eff" />

        <!-- Legend -->
        <g :transform="`translate(${m.l + 10}, ${m.t + 26})`">
          <line x1="0" y1="0" x2="18" y2="0" class="svg-eff-curve" />
          <text x="24" y="3.5" class="svg-lbl">有效数据 D_eff(E)</text>
          <line x1="0" y1="16" x2="18" y2="16" class="svg-raw-curve" />
          <text x="24" y="19.5" class="svg-mu" font-size="10.5">原始算力投入 E·D_U</text>
        </g>

        <!-- Axis title -->
        <text :x="(m.l + W - m.r) / 2" :y="H - 5" text-anchor="middle" class="svg-mu" font-size="11">
          重复训练轮数 E（Epochs）
        </text>
      </svg>
    </div>

    <div class="data-metrics">
      <div class="data-metric">
        <span class="data-metric__k">原始训练总 Token</span>
        <span class="data-metric__v">{{ fmtT(metrics.rawTokens) }}</span>
        <span class="data-metric__s">{{ dU.toFixed(1) }}T × {{ epochs }} 轮</span>
      </div>
      <div class="data-metric">
        <span class="data-metric__k">有效数据量 D_eff</span>
        <span class="data-metric__v">{{ fmtT(metrics.dEff) }}</span>
        <span class="data-metric__s">无质量折算利用率 {{ (metrics.utilRatio * 100).toFixed(0) }}%</span>
      </div>
      <div class="data-metric">
        <span class="data-metric__k">当前轮边际效率</span>
        <span class="data-metric__v">{{ (metrics.marginalEff * 100).toFixed(1) }}%</span>
        <span class="data-metric__s">e^(-(E-1)/R_D*)</span>
      </div>
      <div class="data-metric">
        <span class="data-metric__k">相对单过基线数据项 Loss</span>
        <span class="data-metric__v">{{ metrics.relLossDelta <= 0 ? '' : '+' }}{{ (metrics.relLossDelta * 100).toFixed(1) }}%</span>
        <span class="data-metric__s">β=0.28（对比 E=1, q=1）</span>
      </div>
    </div>

    <div class="data-widget__note">
      <template v-if="epochs <= 4">
        <strong>高效甜点区：</strong>当前处于 {{ epochs }} 轮重复区间，边际效率仍高达 {{ (metrics.marginalEff * 100).toFixed(1) }}%。若高质量清洗能把质量系数 q 从 0.8 提升到 1.3，等效增益远胜盲目堆砌低质网页。
      </template>
      <template v-else-if="epochs <= 9">
        <strong>边际放缓警示：</strong>重复至第 {{ epochs }} 轮时，本轮新增算力仅能换回 {{ (metrics.marginalEff * 100).toFixed(1) }}% 的等效新数据价值。此时与其继续硬刷 Epoch，不如投入离线合成改写（Synthetic Rephrasing）扩充唯一语料 D_U。
      </template>
      <template v-else>
        <strong>深度饱和警告：</strong>第 {{ epochs }} 轮边际效率已跌至 {{ (metrics.marginalEff * 100).toFixed(1) }}%，原始算力消耗 {{ fmtT(metrics.rawTokens) }} 仅折合 {{ fmtT(metrics.dEff) }} 有效数据（趋近饱和上限 {{ fmtT(metrics.satLimit) }}）。继续加轮数不仅浪费 GPU 预算，还会显著抬升记忆过拟合风险。
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.6rem 1.1rem;
  margin-bottom: 0.9rem;
}

.data-slider {
  display: grid;
  grid-template-columns: 6.2rem 1fr 3.6rem;
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
  margin-bottom: 0.85rem;
}

.data-svg-wrap svg {
  display: block;
  width: 100%;
  height: auto;
}

.svg-zone-sweet {
  fill: rgba(16, 185, 129, 0.09);
}

.svg-zone-sat {
  fill: rgba(244, 63, 94, 0.07);
}

.svg-zone-lbl-sweet {
  fill: #059669;
  font-size: 10px;
  font-weight: 600;
}

.dark .svg-zone-lbl-sweet {
  fill: #34d399;
}

.svg-zone-lbl-sat {
  fill: #e11d48;
  font-size: 10px;
  font-weight: 600;
}

.dark .svg-zone-lbl-sat {
  fill: #fda4af;
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

.svg-sat-line {
  stroke: #d97706;
  stroke-width: 1.3;
  stroke-dasharray: 5 4;
}

.svg-sat-txt {
  fill: #b45309;
  font-size: 10px;
  font-weight: 600;
}

.dark .svg-sat-txt {
  fill: #fbbf24;
}

.svg-eff-area {
  fill: rgba(5, 150, 105, 0.11);
}

.svg-raw-curve {
  stroke: #94a3b8;
  stroke-width: 2;
  stroke-dasharray: 5 4;
}

.svg-eff-curve {
  stroke: #059669;
  stroke-width: 2.8;
}

.dark .svg-eff-curve {
  stroke: #34d399;
}

.svg-cursor {
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}

.svg-dot-raw {
  fill: #64748b;
}

.svg-dot-eff {
  fill: #059669;
  stroke: var(--vp-c-bg);
  stroke-width: 2;
}

.dark .svg-dot-eff {
  fill: #34d399;
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
  font-size: 11px;
  font-weight: 600;
}

.data-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}

.data-metric {
  display: flex;
  flex-direction: column;
  padding: 0.6rem 0.78rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}

.data-metric__k {
  font-size: 0.73rem;
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
</style>
