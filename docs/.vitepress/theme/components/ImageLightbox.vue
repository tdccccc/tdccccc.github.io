<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'

const MIN_SCALE = 0.5
const MAX_SCALE = 3.5
const STEP_SCALE = 0.25

const route = useRoute()

const open = ref(false)
const currentIndex = ref(0)
const images = ref<HTMLImageElement[]>([])
const imgSrc = ref('')
const imgAlt = ref('')
const captionHtml = ref('')
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
const boxWidth = ref(960)
const boxHeight = ref(540)
const aspect = ref(16 / 9)

let dragStartX = 0
let dragStartY = 0
let lastTrigger: HTMLElement | null = null
const cleanups: Array<() => void> = []

function fitBox() {
  if (typeof window === 'undefined') return
  const ar = aspect.value > 0 ? aspect.value : 16 / 9
  const availW = Math.min(window.innerWidth * 0.9, 1400)
  const availH = window.innerHeight * 0.72
  const w = Math.min(availW, availH * ar)
  boxWidth.value = Math.round(w)
  boxHeight.value = Math.round(w / ar)
}

function resetView() {
  scale.value = 1
  panX.value = 0
  panY.value = 0
}

function zoomBy(delta: number) {
  const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((scale.value + delta) * 100) / 100))
  if (next <= 1) {
    panX.value = 0
    panY.value = 0
  }
  scale.value = next
}

function showAt(idx: number) {
  if (!images.value.length) return
  currentIndex.value = (idx + images.value.length) % images.value.length
  const el = images.value[currentIndex.value]
  imgSrc.value = el.currentSrc || el.src
  imgAlt.value = el.alt || ''

  const rect = el.getBoundingClientRect()
  if (rect.width > 0 && rect.height > 0) {
    aspect.value = rect.width / rect.height
  } else if (el.naturalWidth > 0 && el.naturalHeight > 0) {
    aspect.value = el.naturalWidth / el.naturalHeight
  } else {
    aspect.value = 16 / 9
  }
  fitBox()

  const fig = el.closest('figure')
  const cap = fig?.querySelector('figcaption')
  captionHtml.value = cap ? cap.innerHTML : el.alt || ''
  resetView()
}

function openAt(idx: number, trigger: HTMLElement) {
  lastTrigger = trigger
  showAt(idx)
  open.value = true
  document.documentElement.classList.add('img-lightbox-open')
}

function close() {
  if (!open.value) return
  open.value = false
  document.documentElement.classList.remove('img-lightbox-open')
  if (lastTrigger && typeof lastTrigger.focus === 'function') {
    lastTrigger.focus()
  }
}

function onImgLoad(e: Event) {
  const target = e.target as HTMLImageElement | null
  if (target && target.naturalWidth > 0 && target.naturalHeight > 0) {
    aspect.value = target.naturalWidth / target.naturalHeight
    fitBox()
  }
}

function onDblClick() {
  if (scale.value > 1.05) {
    resetView()
  } else {
    scale.value = 1.8
    panX.value = 0
    panY.value = 0
  }
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  zoomBy(e.deltaY < 0 ? STEP_SCALE : -STEP_SCALE)
}

function onPointerDown(e: PointerEvent) {
  if (scale.value <= 1.01) return
  dragging.value = true
  dragStartX = e.clientX - panX.value
  dragStartY = e.clientY - panY.value
  ;(e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  panX.value = e.clientX - dragStartX
  panY.value = e.clientY - dragStartY
}

function onPointerUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  try {
    ;(e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId)
  } catch {
    // ignore
  }
}

function onStageClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (target?.classList.contains('img-lightbox__stage') || target?.classList.contains('img-lightbox__viewport')) {
    close()
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowLeft' && images.value.length > 1) {
    e.preventDefault()
    showAt(currentIndex.value - 1)
  } else if (e.key === 'ArrowRight' && images.value.length > 1) {
    e.preventDefault()
    showAt(currentIndex.value + 1)
  } else if (e.key === '+' || e.key === '=') {
    e.preventDefault()
    zoomBy(STEP_SCALE)
  } else if (e.key === '-' || e.key === '_') {
    e.preventDefault()
    zoomBy(-STEP_SCALE)
  } else if (e.key === '0') {
    e.preventDefault()
    resetView()
  }
}

function clearBindings() {
  while (cleanups.length) {
    const fn = cleanups.pop()
    fn?.()
  }
}

function bindPageImages() {
  clearBindings()
  if (typeof document === 'undefined') return
  const root = document.querySelector('.vp-doc')
  if (!root) {
    images.value = []
    return
  }

  const list = Array.from(root.querySelectorAll('img')).filter((img) => {
    if (img.hasAttribute('data-no-lightbox')) return false
    if (img.closest('a')) return false
    return true
  })
  images.value = list

  list.forEach((img, idx) => {
    img.classList.add('zoomable-img')
    img.setAttribute('tabindex', '0')
    img.setAttribute('role', 'button')
    img.setAttribute('aria-label', `${img.alt ? img.alt + ' — ' : ''}点击放大查看`)

    const fig = img.closest('.book-figure')
    if (fig && !fig.querySelector('.book-figure__zoom-hint')) {
      const hint = document.createElement('span')
      hint.className = 'book-figure__zoom-hint'
      hint.setAttribute('aria-hidden', 'true')
      hint.textContent = '点击放大'
      fig.appendChild(hint)
    }

    const handleClick = () => openAt(idx, img)
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openAt(idx, img)
      }
    }

    img.addEventListener('click', handleClick)
    img.addEventListener('keydown', handleKey)
    cleanups.push(() => {
      img.removeEventListener('click', handleClick)
      img.removeEventListener('keydown', handleKey)
    })
  })
}

onMounted(() => {
  bindPageImages()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', fitBox)
})

onUnmounted(() => {
  clearBindings()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', fitBox)
  document.documentElement.classList.remove('img-lightbox-open')
})

watch(
  () => route.path,
  async () => {
    close()
    await nextTick()
    bindPageImages()
  }
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="img-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片放大预览"
    >
      <div class="img-lightbox__toolbar">
        <span class="img-lightbox__counter">
          <template v-if="images.length > 1">
            {{ currentIndex + 1 }} / {{ images.length }} · 滚轮缩放，拖拽平移
          </template>
          <template v-else>
            滚轮或按钮缩放 · 双击切换放大
          </template>
        </span>

        <div class="img-lightbox__controls">
          <button type="button" class="img-lightbox__btn" aria-label="缩小" title="缩小 (-)" @click="zoomBy(-STEP_SCALE)">−</button>
          <button type="button" class="img-lightbox__btn img-lightbox__btn--pct" aria-label="重置缩放" title="重置缩放 (0)" @click="resetView">{{ Math.round(scale * 100) }}%</button>
          <button type="button" class="img-lightbox__btn" aria-label="放大" title="放大 (+)" @click="zoomBy(STEP_SCALE)">+</button>
          <a :href="imgSrc" target="_blank" rel="noopener noreferrer" class="img-lightbox__btn img-lightbox__btn--link" title="在新标签页打开原图">原图 ↗</a>
          <button type="button" class="img-lightbox__btn img-lightbox__btn--close" aria-label="关闭预览" title="关闭 (Esc)" @click="close">×</button>
        </div>
      </div>

      <div class="img-lightbox__stage" @click="onStageClick" @wheel.prevent="onWheel">
        <button
          v-if="images.length > 1"
          type="button"
          class="img-lightbox__nav img-lightbox__nav--prev"
          aria-label="上一张"
          title="上一张 (←)"
          @click="showAt(currentIndex - 1)"
        >
          ‹
        </button>

        <div class="img-lightbox__viewport" :class="{ 'is-zoomed': scale > 1.01 }">
          <img
            :src="imgSrc"
            :alt="imgAlt"
            class="img-lightbox__img"
            :class="{ 'is-dragging': dragging }"
            draggable="false"
            :style="{
              width: `${boxWidth}px`,
              height: `${boxHeight}px`,
              transform: `translate3d(${panX}px, ${panY}px, 0) scale(${scale})`,
            }"
            @load="onImgLoad"
            @dblclick.prevent="onDblClick"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          />
        </div>

        <button
          v-if="images.length > 1"
          type="button"
          class="img-lightbox__nav img-lightbox__nav--next"
          aria-label="下一张"
          title="下一张 (→)"
          @click="showAt(currentIndex + 1)"
        >
          ›
        </button>
      </div>

      <div v-if="captionHtml" class="img-lightbox__caption" v-html="captionHtml" />
    </div>
  </Teleport>
</template>
