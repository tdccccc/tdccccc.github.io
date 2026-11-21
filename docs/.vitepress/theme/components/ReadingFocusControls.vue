<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { useSidebar } from 'vitepress/theme'

const SIDEBAR_KEY = 'atlas:hide-sidebar'
const ASIDE_KEY = 'atlas:hide-aside'

const { page, frontmatter } = useData()
const { hasSidebar, hasAside } = useSidebar()

const hideSidebar = ref(false)
const hideAside = ref(false)
const mounted = ref(false)

const isDocLayout = computed(
  () =>
    !page.value.isNotFound &&
    frontmatter.value.layout !== 'home' &&
    frontmatter.value.layout !== 'page' &&
    frontmatter.value.layout !== false
)

const showLeft = computed(() => isDocLayout.value && hasSidebar.value)
const showRight = computed(() => isDocLayout.value && hasAside.value)

function syncHtmlClasses() {
  if (!mounted.value || typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('atlas-hide-sidebar', showLeft.value && hideSidebar.value)
  root.classList.toggle('atlas-hide-aside', showRight.value && hideAside.value)
}

function toggleSidebar() {
  hideSidebar.value = !hideSidebar.value
  try {
    localStorage.setItem(SIDEBAR_KEY, hideSidebar.value ? '1' : '0')
  } catch {
    // ignore storage errors in restricted environments
  }
  syncHtmlClasses()
}

function toggleAside() {
  hideAside.value = !hideAside.value
  try {
    localStorage.setItem(ASIDE_KEY, hideAside.value ? '1' : '0')
  } catch {
    // ignore storage errors in restricted environments
  }
  syncHtmlClasses()
}

function onKeydown(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const target = e.target as HTMLElement | null
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  ) {
    return
  }
  if (document.documentElement.classList.contains('img-lightbox-open')) return
  if (document.querySelector('.VPLocalSearchBox')) return

  if (e.key === '[' && showLeft.value && window.innerWidth >= 960) {
    e.preventDefault()
    toggleSidebar()
  } else if (e.key === ']' && showRight.value && window.innerWidth >= 1280) {
    e.preventDefault()
    toggleAside()
  }
}

watch([showLeft, showRight, hideSidebar, hideAside], syncHtmlClasses)

onMounted(() => {
  mounted.value = true
  try {
    hideSidebar.value = localStorage.getItem(SIDEBAR_KEY) === '1'
    hideAside.value = localStorage.getItem(ASIDE_KEY) === '1'
  } catch {
    // ignore storage errors
  }
  syncHtmlClasses()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('atlas-hide-sidebar', 'atlas-hide-aside')
  }
})
</script>

<template>
  <div v-if="showLeft || showRight" class="atlas-focus-controls">
    <!-- Left sidebar toggle (desktop >= 960px) -->
    <button
      v-if="showLeft"
      type="button"
      class="atlas-rail-btn atlas-rail-btn--left"
      :class="{ 'is-collapsed': hideSidebar }"
      :aria-pressed="hideSidebar"
      :aria-label="hideSidebar ? '显示左侧目录' : '隐藏左侧目录'"
      :title="hideSidebar ? '显示左侧目录 (快捷键 [)' : '隐藏左侧目录 (快捷键 [)'"
      @click="toggleSidebar"
    >
      <svg
        v-if="!hideSidebar"
        class="atlas-rail-btn__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <path d="m16 15-3-3 3-3" />
      </svg>
      <svg
        v-else
        class="atlas-rail-btn__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <path d="m14 9 3 3-3 3" />
      </svg>
      <span v-if="hideSidebar" class="atlas-rail-btn__label">目录</span>
    </button>

    <!-- Right outline toggle (desktop >= 1280px) -->
    <button
      v-if="showRight"
      type="button"
      class="atlas-rail-btn atlas-rail-btn--right"
      :class="{ 'is-collapsed': hideAside }"
      :aria-pressed="hideAside"
      :aria-label="hideAside ? '显示本页目录' : '隐藏本页目录'"
      :title="hideAside ? '显示本页目录 (快捷键 ])' : '隐藏本页目录 (快捷键 ])'"
      @click="toggleAside"
    >
      <svg
        v-if="!hideAside"
        class="atlas-rail-btn__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="15" y1="3" x2="15" y2="21" />
        <path d="m8 9 3 3-3 3" />
      </svg>
      <svg
        v-else
        class="atlas-rail-btn__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="15" y1="3" x2="15" y2="21" />
        <path d="m11 15-3-3 3-3" />
      </svg>
      <span class="atlas-rail-btn__label">{{ hideAside ? '本页目录' : '收起大纲' }}</span>
    </button>
  </div>
</template>

<style scoped>
.atlas-rail-btn {
  position: fixed;
  top: calc(var(--vp-nav-height) + 12px);
  z-index: 28;
  display: none;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  height: 30px;
  padding: 0 0.52rem;
  border: 1px solid var(--atlas-border-strong);
  border-radius: 8px;
  background: var(--atlas-surface);
  color: var(--atlas-text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  box-shadow: var(--atlas-shadow-sm);
  cursor: pointer;
  transition:
    left 0.22s ease,
    color 0.16s ease,
    border-color 0.16s ease,
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.atlas-rail-btn:hover,
.atlas-rail-btn:focus-visible {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
  box-shadow: var(--atlas-shadow-md);
  outline: none;
}

.atlas-rail-btn__icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.atlas-rail-btn__label {
  white-space: nowrap;
}

/* Left sidebar toggle: desktop >= 960px */
@media (min-width: 960px) {
  .atlas-rail-btn--left {
    display: inline-flex;
    width: 30px;
    padding: 0;
    left: calc(var(--vp-sidebar-width) - 15px);
  }

  .atlas-rail-btn--left.is-collapsed {
    width: auto;
    padding: 0 0.62rem;
    left: 16px;
  }
}

@media (min-width: 1440px) {
  .atlas-rail-btn--left {
    left: calc((100% - var(--vp-layout-max-width)) / 2 + var(--vp-sidebar-width) - 15px);
  }

  .atlas-rail-btn--left.is-collapsed {
    left: 16px;
  }
}

/* Right outline toggle: desktop >= 1280px (matches VitePress aside breakpoint) */
@media (min-width: 1280px) {
  .atlas-rail-btn--right {
    display: inline-flex;
    right: 16px;
    padding: 0 0.62rem;
  }
}
</style>
