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
  <div
    v-if="showLeft || showRight"
    class="atlas-focus-nav"
    :class="{ 'has-left': showLeft, 'has-right': showRight }"
  >
    <div class="atlas-focus-group" role="group" aria-label="目录显示切换">
      <!-- Left sidebar toggle (desktop >= 960px) -->
      <button
        v-if="showLeft"
        type="button"
        class="atlas-focus-btn atlas-focus-btn--left"
        :class="{ 'is-active': !hideSidebar }"
        :aria-pressed="!hideSidebar"
        :aria-label="hideSidebar ? '显示左侧目录' : '隐藏左侧目录'"
        :title="hideSidebar ? '显示左侧目录 (快捷键 [)' : '隐藏左侧目录 (快捷键 [)'"
        @click="toggleSidebar"
      >
        <svg
          class="atlas-focus-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect
            v-if="!hideSidebar"
            x="3"
            y="4"
            width="6"
            height="16"
            rx="1"
            fill="currentColor"
            fill-opacity="0.28"
            stroke="none"
          />
          <rect x="3" y="4" width="18" height="16" rx="2.2" />
          <line x1="9" y1="4" x2="9" y2="20" />
        </svg>
      </button>

      <!-- Right outline toggle (desktop >= 1280px) -->
      <button
        v-if="showRight"
        type="button"
        class="atlas-focus-btn atlas-focus-btn--right"
        :class="{ 'is-active': !hideAside }"
        :aria-pressed="!hideAside"
        :aria-label="hideAside ? '显示本页目录' : '隐藏本页目录'"
        :title="hideAside ? '显示本页目录 (快捷键 ])' : '隐藏本页目录 (快捷键 ])'"
        @click="toggleAside"
      >
        <svg
          class="atlas-focus-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect
            v-if="!hideAside"
            x="15"
            y="4"
            width="6"
            height="16"
            rx="1"
            fill="currentColor"
            fill-opacity="0.28"
            stroke="none"
          />
          <rect x="3" y="4" width="18" height="16" rx="2.2" />
          <line x1="15" y1="4" x2="15" y2="20" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.atlas-focus-nav {
  display: none;
  align-items: center;
}

.atlas-focus-nav::before {
  content: '';
  display: block;
  width: 1px;
  height: 24px;
  margin-left: 16px;
  margin-right: 12px;
  background-color: var(--vp-c-divider);
}

.atlas-focus-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.atlas-focus-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition:
    color 0.16s ease,
    background-color 0.16s ease,
    border-color 0.16s ease;
}

.atlas-focus-btn.is-active {
  background: var(--vp-c-bg);
  border-color: var(--atlas-border);
  color: var(--vp-c-text-1);
}

.atlas-focus-btn:hover,
.atlas-focus-btn:focus-visible {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg);
  outline: none;
}

.atlas-focus-icon {
  width: 16px;
  height: 16px;
  display: block;
}

/* 960px..1279px: show only when page has left sidebar */
@media (min-width: 960px) {
  .atlas-focus-nav.has-left {
    display: inline-flex;
  }

  .atlas-focus-btn--left {
    display: inline-flex;
  }
}

/* >= 1280px: show right outline toggle as well (covers all books & blog posts) */
@media (min-width: 1280px) {
  .atlas-focus-nav.has-right {
    display: inline-flex;
  }

  .atlas-focus-btn--right {
    display: inline-flex;
  }
}
</style>
