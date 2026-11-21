<script setup lang="ts">
import { computed, ref } from 'vue'

const G = 8
const rewards = ref<number[]>([1, 0, 0, 0, 0, 0, 0, 0])

function toggle(idx: number) {
  rewards.value[idx] = 1 - rewards.value[idx]
}

function setPreset(k: number) {
  rewards.value = Array.from({ length: G }, (_, i) => (i < k ? 1 : 0))
}

function fmt(v: number, digits = 2) {
  const s = v.toFixed(digits)
  return s === '-0.00' || s === '-0.0' ? s.slice(1) : s
}

const stats = computed(() => {
  const K = rewards.value.reduce((a, b) => a + b, 0)
  const mean = K / G
  const sd = Math.sqrt(
    rewards.value.reduce((s, v) => s + (v - mean) * (v - mean), 0) / G
  )
  return { K, mean, sd }
})

const methods = computed(() => {
  const { mean, sd } = stats.value
  return [
    {
      name: 'GRPO',
      formula: '(r − r̄) / std',
      values: rewards.value.map((v) => (sd > 0 ? (v - mean) / sd : 0)),
    },
    {
      name: 'Dr.GRPO',
      formula: 'r − r̄',
      values: rewards.value.map((v) => v - mean),
    },
    {
      name: 'RLOO',
      formula: 'G/(G−1)·(r − r̄)',
      values: rewards.value.map((v) => (G / (G - 1)) * (v - mean)),
    },
    {
      name: 'MaxRL',
      formula: '(r − r̄) / r̄',
      values: rewards.value.map((v) => (mean > 0 ? (v - mean) / mean : 0)),
    },
  ]
})

const W = 640
const top = 12
const rowH = 68
const lw = 136
const cw = (W - lw) / G
const barMax = 20

function barScale(vals: number[]) {
  return Math.max(...vals.map((v) => Math.abs(v)))
}

function pickValue(vals: number[], targetReward: number) {
  const idx = rewards.value.indexOf(targetReward)
  if (idx < 0) return '—'
  const v = vals[idx]
  return `${v > 0 ? '+' : ''}${fmt(v)}`
}

const observation = computed(() => {
  const { K, mean, sd } = stats.value
  if (K === 0 || K === G) {
    return '全对或全错：四种方法的优势全为 0，这道题不产生任何梯度。DAPO 的动态采样会直接过滤此类零方差组。'
  }
  if (mean <= 0.25) {
    return `难题（p = ${K}/${G}）：MaxRL 给做对样本的优势是 Dr.GRPO 的 1/p = ${fmt(1 / mean, 1)} 倍，把梯度集中推向难解样本；GRPO 除以标准差也放大权重，但倍数为 1/√(p(1−p)) = ${fmt(1 / sd, 2)} 倍。`
  }
  if (mean >= 0.75) {
    return `简单题（p = ${K}/${G}）：GRPO 给少数做错样本很大的负优势 −√(p/(1−p)) = ${fmt(-Math.sqrt(mean / (1 - mean)))}；MaxRL 中做错样本优势恒为 −1，做对样本仅 (1−p)/p = ${fmt((1 - mean) / mean)}，已掌握题目的更新幅度自然收窄。`
  }
  return `中等难度（p = ${K}/${G}）：四种方法更新方向完全一致，只差尺度系数。GRPO 与 Dr.GRPO 仅差除以标准差一步，RLOO 恰好是 Dr.GRPO 的 G/(G−1) = ${fmt(G / (G - 1))} 倍。`
})
</script>

<template>
  <div class="rl-widget">
    <div class="rl-widget__head">
      <span class="rl-widget__tag">交互实验</span>
      <h4 class="rl-widget__title">同一组 8 个回复，四种组相对优势估计对比</h4>
    </div>
    <p class="rl-widget__desc">
      点击下方回复卡片切换对错（绿 = 奖励 1，红 = 奖励 0）。每行条形图独立归一化展示，柱旁数字为真实优势值。
    </p>

    <div class="rl-chips">
      <button
        v-for="(r, i) in rewards"
        :key="i"
        type="button"
        class="rl-chip"
        :class="{ 'is-pos': r === 1 }"
        :aria-pressed="r === 1"
        @click="toggle(i)"
      >
        <span>y{{ i + 1 }}</span>
        <small>r = {{ r }}</small>
      </button>
    </div>

    <div class="rl-widget__btns">
      <button type="button" class="rl-btn" @click="setPreset(1)">难题：1/8 正确</button>
      <button type="button" class="rl-btn" @click="setPreset(4)">中等：4/8 正确</button>
      <button type="button" class="rl-btn" @click="setPreset(7)">简单：7/8 正确</button>
      <button type="button" class="rl-btn" @click="setPreset(8)">全对（零方差）</button>
    </div>

    <div class="rl-svg-wrap">
      <svg :viewBox="`0 0 ${W} ${top + methods.length * rowH + 8}`" role="img" aria-label="GRPO、Dr.GRPO、RLOO 与 MaxRL 优势柱状图对比">
        <g v-for="(md, k) in methods" :key="md.name">
          <line
            v-if="k > 0"
            :x1="0"
            :x2="W"
            :y1="top + k * rowH"
            :y2="top + k * rowH"
            class="svg-grid"
          />
          <text :x="4" :y="top + k * rowH + rowH / 2 - 4" class="svg-b">{{ md.name }}</text>
          <text :x="4" :y="top + k * rowH + rowH / 2 + 13" class="svg-mono svg-mu">{{ md.formula }}</text>
          <line
            :x1="lw"
            :x2="W"
            :y1="top + k * rowH + rowH / 2"
            :y2="top + k * rowH + rowH / 2"
            class="svg-axis"
          />

          <g v-for="(v, i) in md.values" :key="`${md.name}-${i}`">
            <rect
              v-if="barScale(md.values) > 0 && Math.abs(v) > 0.001"
              :x="lw + i * cw + cw * 0.22"
              :width="cw * 0.56"
              :y="v > 0 ? top + k * rowH + rowH / 2 - (Math.abs(v) / barScale(md.values)) * barMax : top + k * rowH + rowH / 2"
              :height="(Math.abs(v) / barScale(md.values)) * barMax"
              rx="2"
              :class="v > 0 ? 'bar-pos' : 'bar-neg'"
            />
            <text
              :x="lw + i * cw + cw / 2"
              :y="
                v > 0
                  ? top + k * rowH + rowH / 2 - (barScale(md.values) > 0 ? (Math.abs(v) / barScale(md.values)) * barMax : 0) - 4
                  : v < 0
                    ? top + k * rowH + rowH / 2 + (barScale(md.values) > 0 ? (Math.abs(v) / barScale(md.values)) * barMax : 0) + 12
                    : top + k * rowH + rowH / 2 - 5
              "
              text-anchor="middle"
              class="svg-mono"
              :class="v === 0 ? 'svg-mu' : 'svg-ink'"
            >
              {{ v > 0 ? '+' : '' }}{{ fmt(v) }}
            </text>
          </g>
        </g>
      </svg>
    </div>

    <div class="rl-widget__readout">
      <div>
        正确率 <code>p = {{ stats.K }}/{{ G }}</code>，组均值 <code>r̄ = {{ fmt(stats.mean, 3) }}</code>，标准差
        <code>std = {{ fmt(stats.sd, 3) }}</code>。
      </div>
      <div class="rl-summary-line">
        <strong>做对样本：</strong>
        <span v-for="(md, idx) in methods" :key="`p-${md.name}`">
          {{ md.name }} <code>{{ pickValue(md.values, 1) }}</code><template v-if="idx < methods.length - 1"> · </template>
        </span>
      </div>
      <div class="rl-summary-line">
        <strong>做错样本：</strong>
        <span v-for="(md, idx) in methods" :key="`n-${md.name}`">
          {{ md.name }} <code>{{ pickValue(md.values, 0) }}</code><template v-if="idx < methods.length - 1"> · </template>
        </span>
      </div>
      <div class="rl-widget__note">{{ observation }}</div>
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
  margin-bottom: 0.4rem;
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

.rl-widget__desc {
  margin: 0 0 0.85rem !important;
  font-size: 0.86rem;
  color: var(--vp-c-text-2);
}

.rl-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.7rem;
}

.rl-chip {
  width: 3.6rem;
  padding: 0.36rem 0;
  border-radius: 6px;
  border: 1px solid rgba(220, 38, 38, 0.45);
  background: rgba(220, 38, 38, 0.1);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  line-height: 1.25;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.14s ease;
}

.rl-chip.is-pos {
  border-color: rgba(5, 150, 105, 0.5);
  background: rgba(5, 150, 105, 0.14);
}

.rl-chip small {
  font-size: 0.68rem;
  color: var(--vp-c-text-2);
}

.rl-widget__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.9rem;
}

.rl-btn {
  padding: 0.28rem 0.65rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  cursor: pointer;
}

.rl-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.rl-svg-wrap {
  overflow-x: auto;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
  margin-bottom: 0.85rem;
}

.rl-svg-wrap svg {
  display: block;
  width: 100%;
  min-width: 500px;
  height: auto;
}

.svg-grid {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.svg-axis {
  stroke: var(--vp-c-text-3);
  stroke-width: 1;
}

.svg-b {
  font-size: 13px;
  font-weight: 700;
  fill: var(--vp-c-text-1);
}

.svg-mono {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}

.svg-mu {
  fill: var(--vp-c-text-2);
}

.svg-ink {
  fill: var(--vp-c-text-1);
}

.bar-pos {
  fill: #059669;
}

.dark .bar-pos {
  fill: #34d399;
}

.bar-neg {
  fill: #dc2626;
}

.dark .bar-neg {
  fill: #f87171;
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

.rl-summary-line {
  margin-top: 0.2rem;
}

.rl-widget__note {
  margin-top: 0.35rem;
  color: var(--vp-c-text-2);
}
</style>
