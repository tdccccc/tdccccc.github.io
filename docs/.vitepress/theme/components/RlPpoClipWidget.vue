<script setup lang="ts">
import { computed, ref } from 'vue'

const sign = ref<1 | -1>(1)
const epsLow = ref(0.2)
const epsHigh = ref(0.2)

const W = 600
const H = 285
const m = { l: 48, r: 18, t: 18, b: 40 }

const yd = computed(() => (sign.value > 0 ? [-0.25, 2.1] : [-2.1, 0.25]))
const yTicks = computed(() =>
  sign.value > 0 ? [0, 0.5, 1, 1.5, 2] : [-2, -1.5, -1, -0.5, 0]
)
const xTicks = [0, 0.5, 1, 1.5, 2]

function X(x: number) {
  return m.l + (x / 2) * (W - m.l - m.r)
}

function Y(y: number) {
  const [yMin, yMax] = yd.value
  return m.t + ((yMax - y) / (yMax - yMin)) * (H - m.t - m.b)
}

function L(r: number) {
  const c = Math.min(Math.max(r, 1 - epsLow.value), 1 + epsHigh.value)
  return Math.min(r * sign.value, c * sign.value)
}

const flatRange = computed<[number, number]>(() =>
  sign.value > 0 ? [1 + epsHigh.value, 2] : [0, 1 - epsLow.value]
)

const clipPolyline = computed(() =>
  [0, 1 - epsLow.value, 1 + epsHigh.value, 2]
    .map((r) => `${X(r).toFixed(1)},${Y(L(r)).toFixed(1)}`)
    .join(' ')
)

const lowGainSample = computed(() => (0.01 * (1 + epsHigh.value)).toFixed(4))
const lowDelta = computed(() => (0.01 * epsHigh.value).toFixed(4))
const highGainSample = computed(() =>
  Math.min(1, 0.9 * (1 + epsHigh.value)).toFixed(3)
)
const highDelta = computed(() =>
  (Math.min(1, 0.9 * (1 + epsHigh.value)) - 0.9).toFixed(3)
)

function applyPreset(lo: number, hi: number) {
  epsLow.value = lo
  epsHigh.value = hi
}
</script>

<template>
  <div class="rl-widget">
    <div class="rl-widget__head">
      <span class="rl-widget__tag">交互实验</span>
      <h4 class="rl-widget__title">PPO 裁剪目标 L^CLIP 与 DAPO 的 Clip-Higher</h4>
    </div>

    <div class="rl-widget__controls">
      <div class="rl-widget__btns" role="group" aria-label="优势符号">
        <button type="button" class="rl-btn" :class="{ 'is-on': sign > 0 }" @click="sign = 1">
          Â &gt; 0（好 token）
        </button>
        <button type="button" class="rl-btn" :class="{ 'is-on': sign < 0 }" @click="sign = -1">
          Â &lt; 0（坏 token）
        </button>
      </div>

      <label class="rl-widget__slider">
        <span>ε_low</span>
        <input v-model.number="epsLow" type="range" min="0.05" max="0.4" step="0.01" />
        <span class="rl-widget__val">{{ epsLow.toFixed(2) }}</span>
      </label>

      <label class="rl-widget__slider">
        <span>ε_high</span>
        <input v-model.number="epsHigh" type="range" min="0.05" max="0.5" step="0.01" />
        <span class="rl-widget__val">{{ epsHigh.toFixed(2) }}</span>
      </label>

      <div class="rl-widget__btns">
        <button type="button" class="rl-btn" @click="applyPreset(0.2, 0.2)">PPO：0.20 / 0.20</button>
        <button type="button" class="rl-btn" @click="applyPreset(0.2, 0.28)">DAPO：0.20 / 0.28</button>
      </div>
    </div>

    <div class="rl-svg-wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="PPO 裁剪目标随重要性比 ρ 变化的曲线">
        <!-- Zero-gradient shaded band -->
        <rect
          :x="X(flatRange[0])"
          :y="m.t"
          :width="Math.max(0, X(flatRange[1]) - X(flatRange[0]))"
          :height="H - m.t - m.b"
          class="svg-flat"
        />

        <!-- Horizontal grid lines & Y ticks -->
        <g v-for="v in yTicks" :key="`y-${v}`">
          <line :x1="m.l" :x2="W - m.r" :y1="Y(v)" :y2="Y(v)" class="svg-grid" />
          <text :x="m.l - 8" :y="Y(v) + 4" text-anchor="end" class="svg-mono svg-mu">
            {{ v.toFixed(1) }}
          </text>
        </g>

        <!-- X ticks -->
        <text
          v-for="v in xTicks"
          :key="`x-${v}`"
          :x="X(v)"
          :y="H - m.b + 16"
          text-anchor="middle"
          class="svg-mono svg-mu"
        >
          {{ v.toFixed(1) }}
        </text>
        <text :x="W - m.r" :y="H - 6" text-anchor="end" class="svg-sm svg-mu">
          ρ = π_θ / π_old
        </text>

        <!-- Vertical threshold lines -->
        <line :x1="X(1 - epsLow)" :x2="X(1 - epsLow)" :y1="m.t" :y2="H - m.b" class="svg-dash" />
        <line :x1="X(1)" :x2="X(1)" :y1="m.t" :y2="H - m.b" class="svg-dash" />
        <line :x1="X(1 + epsHigh)" :x2="X(1 + epsHigh)" :y1="m.t" :y2="H - m.b" class="svg-dash" />

        <text
          :x="X(1 - epsLow) - 4"
          :y="sign > 0 ? m.t + 14 : H - m.b - 8"
          text-anchor="end"
          class="svg-mono svg-ink"
        >
          1−ε_low={{ (1 - epsLow).toFixed(2) }}
        </text>
        <text
          :x="X(1 + epsHigh) + 4"
          :y="sign > 0 ? m.t + 14 : H - m.b - 8"
          text-anchor="start"
          class="svg-mono svg-ink"
        >
          1+ε_high={{ (1 + epsHigh).toFixed(2) }}
        </text>

        <!-- Unclipped line -->
        <line
          :x1="X(0)"
          :y1="Y(0)"
          :x2="X(2)"
          :y2="Y(2 * sign)"
          class="svg-unclipped"
        />

        <!-- Clipped polyline -->
        <polyline
          :points="clipPolyline"
          fill="none"
          :class="sign > 0 ? 'svg-pos' : 'svg-neg'"
          stroke-width="2.6"
        />

        <!-- Zero-gradient label -->
        <text
          v-if="flatRange[1] - flatRange[0] > 0.35"
          :x="X((flatRange[0] + flatRange[1]) / 2)"
          :y="sign > 0 ? Y(L(1 + epsHigh)) + 20 : Y(L(0.1)) - 10"
          text-anchor="middle"
          class="svg-sm svg-mu"
        >
          梯度为 0（停止激励）
        </text>
      </svg>
    </div>

    <div class="rl-widget__legend">
      <span><i class="swatch-line swatch-line--dash" />未裁剪 ρ·Â</span>
      <span><i class="swatch-line" :class="sign > 0 ? 'swatch-line--pos' : 'swatch-line--neg'" />L^CLIP</span>
      <span><i class="swatch-box" />梯度为 0 的区间</span>
    </div>

    <div class="rl-widget__readout">
      <template v-if="sign > 0">
        <strong class="txt-pos">Â &gt; 0</strong>：ρ 超过 <code>{{ (1 + epsHigh).toFixed(2) }}</code>
        后梯度归零，裁剪目标不再奖励继续放大。按目标允许的增幅看，低概率探索 token（π_old = 0.01）最多涨至
        <code>{{ lowGainSample }}</code>（+{{ lowDelta }}），而高概率 token（π_old = 0.90）可涨至
        <code>{{ highGainSample }}</code>（+{{ highDelta }}）。低概率 token 的绝对涨幅受限严重，这正是 DAPO 提高
        ε_high 以防熵坍缩的直觉来源；ρ &lt; 1 一侧不裁剪，确保概率被意外压低时能被拉回。
      </template>
      <template v-else>
        <strong class="txt-neg">Â &lt; 0</strong>：ρ 低于 <code>{{ (1 - epsLow).toFixed(2) }}</code>
        后梯度归零，避免把概率一次压到接近 0 而丧失恢复机会；ρ &gt; 1 一侧不裁剪——若坏 token 概率反升，min
        会选中未裁剪项，持续把它压回去。
      </template>
    </div>
  </div>
</template>

<style scoped>
.rl-widget {
  margin: 1.5rem 0 1.8rem;
  padding: 1.15rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.rl-widget__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.7rem;
  margin-bottom: 0.75rem;
}

.rl-widget__tag {
  padding: 0.12rem 0.52rem;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-weight: 600;
}

.rl-widget__title {
  margin: 0 !important;
  font-size: 1rem !important;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rl-widget__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1.1rem;
  margin-bottom: 0.95rem;
}

.rl-widget__slider {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.84rem;
  font-weight: 600;
}

.rl-widget__slider input[type='range'] {
  width: 115px;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}

.rl-widget__val {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  min-width: 2.6rem;
  color: var(--vp-c-brand-1);
}

.rl-widget__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.rl-btn {
  padding: 0.28rem 0.62rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.rl-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.rl-btn.is-on {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #ffffff;
}

.rl-svg-wrap {
  overflow-x: auto;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.4rem;
  margin-bottom: 0.75rem;
}

.rl-svg-wrap svg {
  display: block;
  width: 100%;
  min-width: 480px;
  height: auto;
}

.svg-flat {
  fill: var(--vp-c-bg-soft);
}

.svg-grid {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.svg-dash {
  stroke: var(--vp-c-text-3);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.svg-unclipped {
  stroke: var(--vp-c-text-3);
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
}

.svg-pos {
  stroke: #059669;
}

.dark .svg-pos {
  stroke: #34d399;
}

.svg-neg {
  stroke: #dc2626;
}

.dark .svg-neg {
  stroke: #f87171;
}

.svg-mono {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.svg-sm {
  font-size: 11.5px;
}

.svg-mu {
  fill: var(--vp-c-text-2);
}

.svg-ink {
  fill: var(--vp-c-text-1);
}

.rl-widget__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.75rem;
}

.swatch-line {
  display: inline-block;
  width: 18px;
  height: 3px;
  margin-right: 0.35rem;
  vertical-align: middle;
}

.swatch-line--dash {
  height: 0;
  border-top: 2px dashed var(--vp-c-text-3);
}

.swatch-line--pos {
  background: #059669;
}

.dark .swatch-line--pos {
  background: #34d399;
}

.swatch-line--neg {
  background: #dc2626;
}

.dark .swatch-line--neg {
  background: #f87171;
}

.swatch-box {
  display: inline-block;
  width: 14px;
  height: 10px;
  margin-right: 0.35rem;
  vertical-align: middle;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.rl-widget__readout {
  padding: 0.75rem 0.9rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  font-size: 0.85rem;
  line-height: 1.65;
  color: var(--vp-c-text-1);
}

.txt-pos {
  color: #059669;
}

.dark .txt-pos {
  color: #34d399;
}

.txt-neg {
  color: #dc2626;
}

.dark .txt-neg {
  color: #f87171;
}
</style>
