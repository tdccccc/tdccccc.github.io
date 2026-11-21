<script setup lang="ts">
import { computed, ref } from 'vue'

interface Candidate {
  name: string
  r: number
  p: number
}

const candidates: Candidate[] = [
  { name: '完整严谨的反证法', r: 1.0, p: 0.15 },
  { name: '正确但冗长', r: 0.8, p: 0.25 },
  { name: '跳过关键步骤', r: 0.4, p: 0.30 },
  { name: '看似合理的错误证明', r: 0.1, p: 0.20 },
  { name: '答非所问', r: 0.0, p: 0.10 },
]

const logBeta = ref(-0.52) // 10^-0.52 ≈ 0.30

const beta = computed(() => Math.pow(10, logBeta.value))
const betaLabel = computed(() =>
  beta.value < 0.1 ? beta.value.toFixed(3) : beta.value.toFixed(2)
)

const refExpectedReward = candidates.reduce((acc, c) => acc + c.p * c.r, 0)

const computedRows = computed(() => {
  const b = beta.value
  const rMax = Math.max(...candidates.map((c) => c.r))
  const weights = candidates.map((c) => c.p * Math.exp((c.r - rMax) / b))
  const Z = weights.reduce((a, w) => a + w, 0)
  return candidates.map((c, idx) => ({
    ...c,
    opt: weights[idx] / Z,
  }))
})

const metrics = computed(() => {
  let er = 0
  let kl = 0
  for (const row of computedRows.value) {
    er += row.opt * row.r
    if (row.opt > 0) kl += row.opt * Math.log(row.opt / row.p)
  }
  return { er, kl }
})

const commentary = computed(() => {
  if (beta.value < 0.1) {
    return 'β 很小：概率几乎全部集中到奖励最高的回复上，KL 接近上限 −log 0.15 ≈ 1.90 nats。若奖励来自有缺陷的奖励模型，这正是最容易触发奖励作弊的区间。'
  }
  if (beta.value > 3) {
    return 'β 很大：π* 几乎贴合 π_ref，奖励信号几乎不起作用，模型策略基本未被改变。'
  }
  return '每高出 β 的奖励，概率就相对参考策略乘以 e 倍；高奖励回复被放大，同时仍保留参考分布的整体形状。'
})

function setPreset(val: number) {
  logBeta.value = val
}
</script>

<template>
  <div class="rl-widget">
    <div class="rl-widget__head">
      <span class="rl-widget__tag">交互实验</span>
      <h4 class="rl-widget__title">调节 β，观察最优策略 π* 如何相对 π_ref 倾斜</h4>
    </div>
    <p class="rl-widget__desc">
      提示：“证明 √2 是无理数”。五类候选回复各有参考概率 π_ref 与奖励 r（教学设定数值）。
    </p>

    <div class="rl-widget__controls">
      <label class="rl-widget__slider">
        <span>β</span>
        <input
          v-model.number="logBeta"
          type="range"
          min="-1.6"
          max="1"
          step="0.01"
          aria-label="KL 系数 β（对数刻度）"
        />
        <span class="rl-widget__val">{{ betaLabel }}</span>
      </label>
      <div class="rl-widget__btns">
        <button type="button" class="rl-btn" :class="{ 'is-on': Math.abs(logBeta + 1.6) < 0.02 }" @click="setPreset(-1.6)">
          β = 0.025（强优化）
        </button>
        <button type="button" class="rl-btn" :class="{ 'is-on': Math.abs(logBeta + 0.52) < 0.02 }" @click="setPreset(-0.52)">
          β = 0.30（均衡）
        </button>
        <button type="button" class="rl-btn" :class="{ 'is-on': Math.abs(logBeta - 1) < 0.02 }" @click="setPreset(1)">
          β = 10（强约束）
        </button>
      </div>
    </div>

    <div class="rl-tilt">
      <div v-for="row in computedRows" :key="row.name" class="rl-tilt__row">
        <span class="rl-tilt__name">{{ row.name }}</span>
        <span class="rl-tilt__r">r={{ row.r.toFixed(1) }}</span>
        <div class="rl-tilt__bars">
          <div class="rl-tilt__bar-ref" :style="{ width: `${row.p * 100}%` }" />
          <div class="rl-tilt__bar-opt" :style="{ width: `${row.opt * 100}%` }" />
          <span class="rl-tilt__pct">{{ (row.opt * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </div>

    <div class="rl-widget__legend">
      <span><i class="swatch swatch--ref" />参考策略 π_ref（上方空心框）</span>
      <span><i class="swatch swatch--opt" />最优策略 π*（下方实心条）</span>
    </div>

    <div class="rl-widget__readout">
      <div>
        β = <code>{{ betaLabel }}</code>：期望奖励
        <code>E_π*[r] = {{ metrics.er.toFixed(3) }}</code>（参考策略为
        <code>{{ refExpectedReward.toFixed(3) }}</code>），
        <code>KL(π* ‖ π_ref) = {{ metrics.kl.toFixed(3) }} nats</code>。
      </div>
      <div class="rl-widget__note">{{ commentary }}</div>
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

.rl-widget__title {
  margin: 0 !important;
  font-size: 1rem !important;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.rl-widget__desc {
  margin: 0 0 0.9rem !important;
  font-size: 0.86rem;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.rl-widget__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.7rem 1.2rem;
  margin-bottom: 1rem;
}

.rl-widget__slider {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.rl-widget__slider input[type='range'] {
  width: 150px;
  accent-color: #059669;
  cursor: pointer;
}

.rl-widget__val {
  font-family: var(--vp-font-family-mono);
  font-size: 0.84rem;
  min-width: 3.4rem;
  color: var(--vp-c-brand-1);
}

.rl-widget__btns {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
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

.rl-tilt {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-bottom: 0.85rem;
}

.rl-tilt__row {
  display: grid;
  grid-template-columns: minmax(0, 10.5em) 3.4em minmax(0, 1fr);
  gap: 0.65rem;
  align-items: center;
  font-size: 0.84rem;
}

.rl-tilt__name {
  color: var(--vp-c-text-1);
  font-weight: 500;
}

.rl-tilt__r {
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  color: var(--vp-c-text-2);
  text-align: right;
}

.rl-tilt__bars {
  position: relative;
  height: 26px;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
}

.rl-tilt__bar-ref {
  position: absolute;
  left: 0;
  top: 2px;
  height: 8px;
  border: 1.5px solid var(--vp-c-text-3);
  border-radius: 2px;
  box-sizing: border-box;
}

.rl-tilt__bar-opt {
  position: absolute;
  left: 0;
  bottom: 2px;
  height: 11px;
  background: #059669;
  border-radius: 2px;
  transition: width 0.2s ease;
}

.dark .rl-tilt__bar-opt {
  background: #34d399;
}

.rl-tilt__pct {
  position: absolute;
  right: 0.45rem;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  padding: 0 0.2rem;
  border-radius: 3px;
}

.rl-widget__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.8rem;
}

.swatch {
  display: inline-block;
  width: 16px;
  height: 8px;
  margin-right: 0.35rem;
  vertical-align: middle;
  border-radius: 2px;
}

.swatch--ref {
  border: 1.5px solid var(--vp-c-text-3);
}

.swatch--opt {
  background: #059669;
}

.dark .swatch--opt {
  background: #34d399;
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

.rl-widget__note {
  margin-top: 0.3rem;
  color: var(--vp-c-text-2);
}

@media (max-width: 600px) {
  .rl-tilt__row {
    grid-template-columns: 1fr auto;
  }
  .rl-tilt__bars {
    grid-column: 1 / -1;
  }
}
</style>
