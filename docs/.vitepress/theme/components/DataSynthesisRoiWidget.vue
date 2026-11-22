<script setup lang="ts">
import { computed, ref } from 'vue'

const samplesK = ref(20) // Target valid samples M (1K..200K)
const passPct = ref(22) // End-to-end pass rate η_pass (5..85%)
const genCost = ref(0.045) // Avg Input+Output inference cost per attempt ($0.002..$0.25)
const envVerifyCost = ref(0.025) // Sandbox/Verify cost per attempt ($0..$0.08)
const auditPct = ref(8) // Human audit ratio γ_audit (0..25%)
const humanPrice = ref(45) // Pure human annotation price C_human ($5..$80)

const W = 620
const H = 228
const m = { l: 148, r: 92, t: 22, b: 16 }

const calc = computed(() => {
  const M = samplesK.value * 1000
  const eta = passPct.value / 100
  const gamma = auditPct.value / 100
  const cAttempt = genCost.value + envVerifyCost.value

  // Strategy 3 (Optimized): Cascade Routing + Deterministic Verifier + Human Audit
  const cValidPart = cAttempt // Cost of the winning attempt itself
  const cWastePart = cAttempt * ((1 - eta) / eta) // Cost of failed attempts per valid sample
  const cAuditPart = gamma * humanPrice.value
  const cEff = cValidPart + cWastePart + cAuditPart
  const totalOpt = cEff * M

  // Strategy 2 (Brute-force single frontier model): 2.0x inference cost, no early-stop routing (~0.75x pass rate), plus same audit
  const bruteEta = Math.max(0.03, eta * 0.75)
  const bruteAttempt = genCost.value * 2.0 + envVerifyCost.value * 1.15
  const cBrute = bruteAttempt / bruteEta + cAuditPart
  const totalBrute = cBrute * M

  // Strategy 1 (Pure human annotation)
  const totalHuman = humanPrice.value * M

  const maxTotal = Math.max(totalHuman, totalBrute, totalOpt, 1)
  const savingsMult = cEff > 0 ? humanPrice.value / cEff : 0
  const savingsVsBrutePct = totalBrute > 0 ? (1 - totalOpt / totalBrute) * 100 : 0

  const validShare = cEff > 0 ? cValidPart / cEff : 0
  const wasteShare = cEff > 0 ? cWastePart / cEff : 0
  const auditShare = cEff > 0 ? cAuditPart / cEff : 0

  return {
    M,
    eta,
    gamma,
    cValidPart,
    cWastePart,
    cAuditPart,
    cEff,
    cBrute,
    totalHuman,
    totalBrute,
    totalOpt,
    maxTotal,
    savingsMult,
    savingsVsBrutePct,
    wastedAttemptPct: (1 - eta) * 100,
    attemptsPerValid: 1 / eta,
    validShare,
    wasteShare,
    auditShare,
  }
})

const plotW = W - m.l - m.r

function barW(val: number): number {
  return Math.max(4, (val / calc.value.maxTotal) * plotW)
}

function fmtMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

function fmtUnit(v: number): string {
  if (v >= 10) return `$${v.toFixed(2)}`
  if (v >= 0.1) return `$${v.toFixed(3)}`
  return `$${v.toFixed(4)}`
}

function applyPreset(mK: number, pass: number, gen: number, envV: number, audit: number, human: number) {
  samplesK.value = mK
  passPct.value = pass
  genCost.value = gen
  envVerifyCost.value = envV
  auditPct.value = audit
  humanPrice.value = human
}

function isPreset(mK: number, pass: number, gen: number, envV: number, audit: number, human: number): boolean {
  return (
    samplesK.value === mK &&
    passPct.value === pass &&
    Math.abs(genCost.value - gen) < 1e-4 &&
    Math.abs(envVerifyCost.value - envV) < 1e-4 &&
    auditPct.value === audit &&
    humanPrice.value === human
  )
}
</script>

<template>
  <div class="data-widget">
    <div class="data-widget__head">
      <span class="data-widget__tag">交互实验</span>
      <h4 class="data-widget__title">离线批合成 Yield 漏斗与单位有效成本 ROI 模拟器</h4>
    </div>
    <p class="data-widget__desc">
      对照 C_eff = (C_gen + C_env + C_verify) / η_pass + γ_audit · C_human，实时测算“纯人工标注”、“单前沿模型暴力合成”与“级联路由 + 确定性验证器 + 人工抽检”的总预算与隐性损耗构成。
    </p>

    <div class="data-widget__btns">
      <button type="button" class="data-btn" :class="{ 'is-on': isPreset(50, 45, 0.012, 0.003, 5, 18) }" @click="applyPreset(50, 45, 0.012, 0.003, 5, 18)">
        SFT 推理合成
      </button>
      <button type="button" class="data-btn" :class="{ 'is-on': isPreset(120, 68, 0.004, 0.001, 3, 8) }" @click="applyPreset(120, 68, 0.004, 0.001, 3, 8)">
        VLM 密集重打标
      </button>
      <button type="button" class="data-btn" :class="{ 'is-on': isPreset(20, 22, 0.045, 0.025, 8, 45) }" @click="applyPreset(20, 22, 0.045, 0.025, 8, 45)">
        多轮 Agent 沙箱轨迹（10 轮）
      </button>
    </div>

    <div class="data-widget__sliders">
      <label class="data-slider">
        <span>有效总量 M</span>
        <input v-model.number="samplesK" type="range" min="1" max="200" step="1" aria-label="目标有效样本量 M（单位千条）" />
        <span class="data-val">{{ samplesK }}K</span>
      </label>

      <label class="data-slider">
        <span>通过率 η_pass</span>
        <input v-model.number="passPct" type="range" min="5" max="85" step="1" aria-label="端到端有效通过率" />
        <span class="data-val">{{ passPct }}%</span>
      </label>

      <label class="data-slider">
        <span>单次推理费</span>
        <input v-model.number="genCost" type="range" min="0.002" max="0.25" step="0.002" aria-label="单次输入加输出推理成本（美元）" />
        <span class="data-val">${{ genCost.toFixed(3) }}</span>
      </label>

      <label class="data-slider">
        <span>沙箱验证费</span>
        <input v-model.number="envVerifyCost" type="range" min="0" max="0.08" step="0.001" aria-label="单次沙箱与验证成本（美元）" />
        <span class="data-val">${{ envVerifyCost.toFixed(3) }}</span>
      </label>

      <label class="data-slider">
        <span>人工抽检率</span>
        <input v-model.number="auditPct" type="range" min="0" max="25" step="1" aria-label="人工抽检复核比例" />
        <span class="data-val">{{ auditPct }}%</span>
      </label>

      <label class="data-slider">
        <span>纯人工单价</span>
        <input v-model.number="humanPrice" type="range" min="5" max="80" step="1" aria-label="纯人工精标单价（美元）" />
        <span class="data-val">${{ humanPrice }}</span>
      </label>
    </div>

    <div class="data-svg-wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="三种数据生产方案总成本对比与单位成本构成分解图">
        <!-- Section 1: 3-way total budget horizontal bars -->
        <text :x="m.l" y="14" class="svg-sec-lbl">总预算横向对比（目标 {{ samplesK }}K 条有效样本）</text>

        <!-- Row 1: Pure human -->
        <text :x="m.l - 10" y="45" text-anchor="end" class="svg-lbl">纯人工标注总成本</text>
        <rect :x="m.l" y="30" :width="barW(calc.totalHuman)" height="22" rx="4" class="svg-bar-human" />
        <text :x="m.l + barW(calc.totalHuman) + 8" y="45" class="svg-mono svg-val-txt">
          {{ fmtMoney(calc.totalHuman) }}
        </text>

        <!-- Row 2: Single model brute force -->
        <text :x="m.l - 10" y="81" text-anchor="end" class="svg-lbl">单模型暴力合成</text>
        <rect :x="m.l" y="66" :width="barW(calc.totalBrute)" height="22" rx="4" class="svg-bar-brute" />
        <text :x="m.l + barW(calc.totalBrute) + 8" y="81" class="svg-mono svg-val-txt">
          {{ fmtMoney(calc.totalBrute) }}
        </text>

        <!-- Row 3: Cascade + Verifier + Audit (stacked inside scaled bar) -->
        <text :x="m.l - 10" y="117" text-anchor="end" class="svg-lbl-hi">级联路由+验证器+抽检</text>
        <rect :x="m.l" y="102" :width="barW(calc.totalOpt)" height="22" rx="4" class="svg-bar-opt" />
        <text :x="m.l + barW(calc.totalOpt) + 8" y="117" class="svg-mono svg-val-hi">
          {{ fmtMoney(calc.totalOpt) }}
        </text>

        <!-- Divider -->
        <line x1="16" :x2="W - 16" y1="142" y2="142" class="svg-divider" />

        <!-- Section 2: 100% stacked breakdown of Optimized C_eff -->
        <text :x="m.l" y="160" class="svg-sec-lbl">
          级联方案单位成本构成（C_eff = {{ fmtUnit(calc.cEff) }} / 有效样本）
        </text>
        <text :x="m.l - 10" y="185" text-anchor="end" class="svg-lbl">成本占比拆解</text>

        <rect
          :x="m.l"
          y="170"
          :width="Math.max(0, calc.validShare * plotW)"
          height="20"
          rx="3"
          class="svg-seg-valid"
        />
        <rect
          :x="m.l + calc.validShare * plotW"
          y="170"
          :width="Math.max(0, calc.wasteShare * plotW)"
          height="20"
          class="svg-seg-waste"
        />
        <rect
          :x="m.l + (calc.validShare + calc.wasteShare) * plotW"
          y="170"
          :width="Math.max(0, calc.auditShare * plotW)"
          height="20"
          rx="3"
          class="svg-seg-audit"
        />

        <!-- Legend for stacked breakdown -->
        <g :transform="`translate(${m.l}, 207)`">
          <rect x="0" y="-8" width="10" height="10" rx="2" class="svg-seg-valid" />
          <text x="14" y="0" class="svg-mono svg-mu">
            有效尝试 {{ (calc.validShare * 100).toFixed(0) }}%
          </text>

          <rect x="116" y="-8" width="10" height="10" rx="2" class="svg-seg-waste" />
          <text x="130" y="0" class="svg-mono svg-mu">
            失败废弃 {{ (calc.wasteShare * 100).toFixed(0) }}%
          </text>

          <rect x="234" y="-8" width="10" height="10" rx="2" class="svg-seg-audit" />
          <text x="248" y="0" class="svg-mono svg-mu">
            人工抽检 {{ (calc.auditShare * 100).toFixed(0) }}%
          </text>
        </g>
      </svg>
    </div>

    <div class="data-metrics">
      <div class="data-metric">
        <span class="data-metric__k">单位有效成本 C_eff</span>
        <span class="data-metric__v">{{ fmtUnit(calc.cEff) }}</span>
        <span class="data-metric__s">纯合成 {{ fmtUnit(calc.cValidPart + calc.cWastePart) }} + 抽检 {{ fmtUnit(calc.cAuditPart) }}</span>
      </div>
      <div class="data-metric">
        <span class="data-metric__k">项目合成总预算</span>
        <span class="data-metric__v">{{ fmtMoney(calc.totalOpt) }}</span>
        <span class="data-metric__s">纯人工需 {{ fmtMoney(calc.totalHuman) }}</span>
      </div>
      <div class="data-metric">
        <span class="data-metric__k">失败尝试废弃率</span>
        <span class="data-metric__v">{{ calc.wastedAttemptPct.toFixed(0) }}%</span>
        <span class="data-metric__s">均需 {{ calc.attemptsPerValid.toFixed(1) }} 次尝试/条</span>
      </div>
      <div class="data-metric">
        <span class="data-metric__k">相对纯人工节省倍数</span>
        <span class="data-metric__v">{{ calc.savingsMult.toFixed(1) }}×</span>
        <span class="data-metric__s">较单模型暴力合成再省 {{ calc.savingsVsBrutePct.toFixed(0) }}%</span>
      </div>
    </div>

    <div class="data-widget__note">
      <template v-if="calc.auditShare >= 0.70">
        <strong>成本瓶颈在人工抽检：</strong>当前人工复核占了单位有效成本的 {{ (calc.auditShare * 100).toFixed(0) }}%（{{ fmtUnit(calc.cAuditPart) }}/条），而推理与沙箱算力反而只占 {{ ((1 - calc.auditShare) * 100).toFixed(0) }}%。若确定性验证器已校准稳定，可改用分层置信度抽检压低 γ_audit。
      </template>
      <template v-else-if="calc.eta < 0.18">
        <strong>低通过率放大损耗：</strong>端到端通过率仅 {{ passPct }}%，平均要丢弃 {{ (calc.attemptsPerValid - 1).toFixed(1) }} 条失败尝试才能换来 1 条有效样本（废弃占比 {{ (calc.wasteShare * 100).toFixed(0) }}%）。优先在沙箱与长轨迹中引入早停、反事实修复与甜点区难度预筛，收益远高于单砍推理单价。
      </template>
      <template v-else>
        <strong>健康杠杆区间：</strong>相比纯人工标注实现 {{ calc.savingsMult.toFixed(1) }}× 降本、相比单模型暴力合成再省 {{ calc.savingsVsBrutePct.toFixed(0) }}%。保持确定性验证器零作弊与 {{ auditPct }}% 人工质检兜底，即可在百 K 级规模下兼顾质量与现金流。
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
  grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));
  gap: 0.6rem 1.05rem;
  margin-bottom: 0.9rem;
}

.data-slider {
  display: grid;
  grid-template-columns: 5.8rem 1fr 3.6rem;
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
  padding: 0.45rem 0.55rem 0.3rem;
  margin-bottom: 0.85rem;
}

.data-svg-wrap svg {
  display: block;
  width: 100%;
  height: auto;
}

.svg-sec-lbl {
  fill: var(--vp-c-text-2);
  font-size: 10.5px;
  font-weight: 600;
}

.svg-lbl {
  fill: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 600;
}

.svg-lbl-hi {
  fill: var(--vp-c-text-1);
  font-size: 11px;
  font-weight: 700;
}

.svg-bar-human {
  fill: #94a3b8;
}

.svg-bar-brute {
  fill: #d97706;
}

.svg-bar-opt {
  fill: #059669;
}

.dark .svg-bar-opt {
  fill: #34d399;
}

.svg-divider {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.svg-seg-valid {
  fill: #059669;
}

.dark .svg-seg-valid {
  fill: #34d399;
}

.svg-seg-waste {
  fill: #f43f5e;
}

.svg-seg-audit {
  fill: #0284c7;
}

.dark .svg-seg-audit {
  fill: #38bdf8;
}

.svg-mono {
  font-family: var(--vp-font-family-mono);
  font-size: 10.5px;
}

.svg-val-txt {
  fill: var(--vp-c-text-2);
  font-weight: 600;
}

.svg-val-hi {
  fill: #059669;
  font-weight: 700;
}

.dark .svg-val-hi {
  fill: #34d399;
}

.svg-mu {
  fill: var(--vp-c-text-2);
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
