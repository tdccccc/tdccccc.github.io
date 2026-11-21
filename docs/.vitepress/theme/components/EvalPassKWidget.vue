<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const probP = ref(0.6)
const targetK = ref(5)
const sampleN = ref(10)
const sampleC = ref(6)

watch(sampleN, (n) => {
  if (sampleC.value > n) sampleC.value = n
})

const W = 600
const H = 250
const m = { l: 48, r: 22, t: 36, b: 38 }
const maxK = 10
const kList = Array.from({ length: maxK }, (_, i) => i + 1)

function X(k: number): number {
  return m.l + ((k - 1) / (maxK - 1)) * (W - m.l - m.r)
}

function Y(val: number): number {
  return m.t + (1 - val) * (H - m.t - m.b)
}

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  const r = Math.min(k, n - k)
  let res = 1
  for (let i = 1; i <= r; i++) {
    res = (res * (n - r + i)) / i
  }
  return res
}

function passAtK(p: number, k: number): number {
  return 1 - Math.pow(1 - p, k)
}

function passHatK(p: number, k: number): number {
  return Math.pow(p, k)
}

const passAtPoints = computed(() =>
  kList.map((k) => `${X(k).toFixed(1)},${Y(passAtK(probP.value, k)).toFixed(1)}`).join(' ')
)

const passHatPoints = computed(() =>
  kList.map((k) => `${X(k).toFixed(1)},${Y(passHatK(probP.value, k)).toFixed(1)}`).join(' ')
)

const curPassAt = computed(() => passAtK(probP.value, targetK.value))
const curPassHat = computed(() => passHatK(probP.value, targetK.value))

const finiteSample = computed(() => {
  const n = sampleN.value
  const c = sampleC.value
  const k = Math.min(targetK.value, n)
  const pHat = c / n

  const naivePassAt = 1 - Math.pow(1 - pHat, k)
  const unbiasedPassAt = n - c < k ? 1 : 1 - comb(n - c, k) / comb(n, k)

  const naivePassHat = Math.pow(pHat, k)
  const unbiasedPassHat = c < k ? 0 : comb(c, k) / comb(n, k)

  return {
    kUsed: k,
    pHat,
    naivePassAt,
    unbiasedPassAt,
    naivePassHat,
    unbiasedPassHat,
    clamped: targetK.value > n,
  }
})

function applyPreset(p: number, k: number, n: number, c: number) {
  probP.value = p
  targetK.value = k
  sampleN.value = n
  sampleC.value = c
}
</script>

<template>
  <div class="eval-widget">
    <div class="eval-widget__head">
      <span class="eval-widget__tag">交互实验</span>
      <h4 class="eval-widget__title">pass@k（探索上限）与 pass^k（连续生产可靠性）曲线及无偏组合估计</h4>
    </div>
    <p class="eval-widget__desc">
      同样是单次成功率 p，重跑 k 次“至少成功一次”的 pass@k 与“连续 k 次全对”的 pass^k 走向截然相反；下方同时对比有限样本 (n, c) 下的朴素代入估计与无偏组合估计。
    </p>

    <div class="eval-widget__btns">
      <button type="button" class="eval-btn" :class="{ 'is-on': Math.abs(probP - 0.5) < 0.01 }" @click="applyPreset(0.5, 5, 10, 5)">
        脆弱 Agent (p=0.50)
      </button>
      <button type="button" class="eval-btn" :class="{ 'is-on': Math.abs(probP - 0.8) < 0.01 }" @click="applyPreset(0.8, 5, 10, 8)">
        准上线 Agent (p=0.80)
      </button>
      <button type="button" class="eval-btn" :class="{ 'is-on': Math.abs(probP - 0.95) < 0.01 }" @click="applyPreset(0.95, 8, 10, 9)">
        高可靠生产 (p=0.95)
      </button>
    </div>

    <div class="eval-widget__sliders">
      <label class="eval-slider">
        <span>单次率 p</span>
        <input v-model.number="probP" type="range" min="0.05" max="0.98" step="0.01" aria-label="单次成功率 p" />
        <span class="eval-val">{{ (probP * 100).toFixed(0) }}%</span>
      </label>

      <label class="eval-slider">
        <span>尝试数 k</span>
        <input v-model.number="targetK" type="range" min="1" max="10" step="1" aria-label="目标尝试次数 k" />
        <span class="eval-val">k = {{ targetK }}</span>
      </label>

      <label class="eval-slider">
        <span>采样数 n</span>
        <input v-model.number="sampleN" type="range" min="5" max="32" step="1" aria-label="有限样本采样数 n" />
        <span class="eval-val">n = {{ sampleN }}</span>
      </label>

      <label class="eval-slider">
        <span>成功数 c</span>
        <input v-model.number="sampleC" type="range" min="0" :max="sampleN" step="1" aria-label="观测成功数 c" />
        <span class="eval-val">c = {{ sampleC }}</span>
      </label>
    </div>

    <div class="eval-svg-wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="pass@k 与 pass^k 随 k 变化曲线">
        <!-- Fixed horizontal legend above plot area -->
        <g class="svg-legend">
          <line :x1="m.l" :x2="m.l + 20" y1="12.5" y2="12.5" class="svg-pass-at" />
          <text :x="m.l + 26" y="16" class="svg-mono svg-lbl-at">pass@k = 1 − (1−p)^k</text>
          <line :x1="m.l + 186" :x2="m.l + 206" y1="12.5" y2="12.5" class="svg-pass-hat" />
          <text :x="m.l + 212" y="16" class="svg-mono svg-lbl-hat">pass^k = p^k</text>
        </g>

        <!-- Horizontal grid -->
        <g v-for="v in [0, 0.25, 0.5, 0.75, 1]" :key="v">
          <line :x1="m.l" :x2="W - m.r" :y1="Y(v)" :y2="Y(v)" class="svg-grid" />
          <text :x="m.l - 8" :y="Y(v) + 4" text-anchor="end" class="svg-mono svg-mu">{{ (v * 100).toFixed(0) }}%</text>
        </g>

        <!-- X ticks -->
        <text v-for="k in kList" :key="k" :x="X(k)" :y="H - m.b + 16" text-anchor="middle" class="svg-mono svg-mu">
          {{ k }}
        </text>
        <text :x="(m.l + W - m.r) / 2" :y="H - 5" text-anchor="middle" class="svg-mu" font-size="11">
          尝试次数 k（同一任务重复执行轮数）
        </text>

        <!-- Vertical marker for selected k -->
        <line :x1="X(targetK)" :x2="X(targetK)" :y1="m.t" :y2="H - m.b" class="svg-guide" />

        <!-- Curves -->
        <polyline :points="passAtPoints" fill="none" class="svg-pass-at" />
        <polyline :points="passHatPoints" fill="none" class="svg-pass-hat" />

        <!-- Dots at selected k -->
        <circle :cx="X(targetK)" :cy="Y(curPassAt)" r="5.5" class="svg-dot-at" />
        <circle :cx="X(targetK)" :cy="Y(curPassHat)" r="5.5" class="svg-dot-hat" />
      </svg>
    </div>

    <div class="eval-metrics">
      <div class="eval-metric">
        <span class="eval-metric__k">理论 pass@{{ targetK }}（至少一次对）</span>
        <span class="eval-metric__v is-amber">{{ (curPassAt * 100).toFixed(1) }}%</span>
        <span class="eval-metric__s">探索潜力 / 带验证器重试上限</span>
      </div>
      <div class="eval-metric">
        <span class="eval-metric__k">理论 pass^{{ targetK }}（连续全对）</span>
        <span class="eval-metric__v is-rose">{{ (curPassHat * 100).toFixed(1) }}%</span>
        <span class="eval-metric__s">无人兜底场景生产可靠性</span>
      </div>
      <div class="eval-metric">
        <span class="eval-metric__k">有限样本 (n={{ sampleN }}, c={{ sampleC }}, k={{ finiteSample.kUsed }})</span>
        <span class="eval-metric__v">{{ (finiteSample.unbiasedPassAt * 100).toFixed(1) }}% / {{ (finiteSample.unbiasedPassHat * 100).toFixed(1) }}%</span>
        <span class="eval-metric__s">无偏 pass@k（朴素 {{ (finiteSample.naivePassAt * 100).toFixed(1) }}%）· 无偏 pass^k（朴素 {{ (finiteSample.naivePassHat * 100).toFixed(1) }}%）</span>
      </div>
    </div>

    <div class="eval-widget__note">
      <template v-if="finiteSample.clamped">
        <strong>注意：</strong>当前 k={{ targetK }} 大于有限采样数 n={{ sampleN }}，无偏组合估计仅在 k ≤ n 时定义，上表有限样本列已自动按 k={{ finiteSample.kUsed }} 计算。
      </template>
      <template v-else>
        <strong>可靠性剪刀差：</strong>当单次成功率 p={{ (probP * 100).toFixed(0) }}% 时，重复 {{ targetK }} 次至少成功一次的概率为 pass@{{ targetK }}={{ (curPassAt * 100).toFixed(1) }}%，而连续 {{ targetK }} 次稳定不翻车的概率仅剩 <strong>{{ (curPassHat * 100).toFixed(1) }}%</strong>。<template v-if="Math.abs(finiteSample.unbiasedPassAt - finiteSample.naivePassAt) < 1e-4">当前处于边界情形（k=1 或 c ∈ {0, n}），朴素代入 c/n={{ finiteSample.pHat.toFixed(2) }} 与无偏估计值恰好重合；在一般情形（k &gt; 1 且 0 &lt; c &lt; n）下，朴素代入会因 Jensen 不等式产生系统性偏差。</template><template v-else>有限样本下直接把 c/n={{ finiteSample.pHat.toFixed(2) }} 代入幂次公式会产生系统性 Jensen 偏差（例如朴素 pass@k 低估了无偏估计值 {{ ((finiteSample.unbiasedPassAt - finiteSample.naivePassAt) * 100).toFixed(1) }}pp）。</template>
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

.svg-guide {
  stroke: var(--vp-c-brand-1);
  stroke-width: 1.4;
  stroke-dasharray: 4 3;
  opacity: 0.65;
}

.svg-pass-at {
  stroke: #d97706;
  stroke-width: 2.8;
  stroke-linejoin: round;
}

.svg-pass-hat {
  stroke: #e11d48;
  stroke-width: 2.8;
  stroke-linejoin: round;
}

.svg-dot-at {
  fill: #d97706;
  stroke: var(--vp-c-bg);
  stroke-width: 2;
}

.svg-dot-hat {
  fill: #e11d48;
  stroke: var(--vp-c-bg);
  stroke-width: 2;
}

.svg-lbl-at {
  fill: #b45309;
  font-weight: 700;
}

.dark .svg-lbl-at {
  fill: #fbbf24;
}

.svg-lbl-hat {
  fill: #be123c;
  font-weight: 700;
}

.dark .svg-lbl-hat {
  fill: #fda4af;
}

.svg-mono {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
}

.svg-mu {
  fill: var(--vp-c-text-2);
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

.eval-metric__v.is-amber {
  color: #d97706;
}

.dark .eval-metric__v.is-amber {
  color: #fbbf24;
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
</style>
