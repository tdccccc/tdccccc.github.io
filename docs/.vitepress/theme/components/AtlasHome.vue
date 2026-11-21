<script setup lang="ts">
import { computed, ref } from 'vue'
import { books } from '../../data/books'
import { data as posts } from '../../data/posts.data'

const activeCategory = ref('全部')

const categories = computed(() => {
  const set = new Set<string>()
  for (const b of books) set.add(b.category)
  for (const p of posts) set.add(p.category)
  return ['全部', ...Array.from(set)]
})

const showCategoryTabs = computed(() => categories.value.length > 2)

const filteredBooks = computed(() =>
  activeCategory.value === '全部'
    ? books
    : books.filter((b) => b.category === activeCategory.value)
)

const filteredPosts = computed(() => {
  const list =
    activeCategory.value === '全部'
      ? posts
      : posts.filter((p) => p.category === activeCategory.value)
  return list.slice(0, 8)
})
</script>

<template>
  <div class="atlas-page">
    <!-- Hero -->
    <header class="atlas-hero">
      <div class="atlas-kicker">NEVER STOP LEARNING AI.</div>
      <h1 class="atlas-title">Tdccccc's Atlas</h1>
      <p class="atlas-subtitle">
        面向工程师的体系化技术读物与学习笔记——以「原理、公式与图解」为核心，持续沉淀
        <strong>AI Infra</strong>、<strong>强化学习</strong>、<strong>模型与 Agent 评测</strong>
        及更多工程方向的系统知识图谱。
      </p>

      <div class="atlas-hero-meta">
        <span class="atlas-metric"><strong>{{ books.length }}</strong> 本体系读物</span>
        <span class="atlas-sep">·</span>
        <span class="atlas-metric"><strong>23</strong> 章主线 + <strong>35</strong> 张原创机制图</span>
        <template v-if="posts.length">
          <span class="atlas-sep">·</span>
          <span class="atlas-metric"><strong>{{ posts.length }}</strong> 篇专题笔记</span>
        </template>
      </div>
    </header>

    <!-- Dynamic Topic Filter (auto-appears when 2+ categories exist) -->
    <nav v-if="showCategoryTabs" class="atlas-filter" aria-label="方向筛选">
      <button
        v-for="cat in categories"
        :key="cat"
        type="button"
        class="atlas-pill"
        :class="{ 'is-active': activeCategory === cat }"
        @click="activeCategory = cat"
      >
        {{ cat }}
      </button>
    </nav>

    <!-- Section 1: Systematic Books -->
    <section class="atlas-section" aria-labelledby="section-books">
      <div class="atlas-section-head">
        <div>
          <h2 id="section-books" class="atlas-section-title">体系化读物</h2>
          <p class="atlas-section-desc">完整成书的系统教程，每本配有独立章节导航、数学推导与原创架构图。</p>
        </div>
      </div>

      <div
        class="atlas-books-grid"
        :class="{ 'is-single': filteredBooks.length === 1 }"
      >
        <article
          v-for="book in filteredBooks"
          :key="book.id"
          class="book-card"
        >
          <a
            :href="book.link"
            :target="book.external ? '_blank' : undefined"
            :rel="book.external ? 'noopener noreferrer' : undefined"
            class="book-card__cover-wrap"
            :aria-label="`阅读 ${book.title}`"
          >
            <img
              :src="book.cover"
              :alt="`${book.title} 封面`"
              class="book-card__cover"
              data-no-lightbox
            />
          </a>

          <div class="book-card__body">
            <div class="book-card__badges">
              <span class="badge badge--cat">{{ book.category }}</span>
              <span class="badge badge--status">{{ book.status }}</span>
            </div>

            <h3 class="book-card__title">
              <a
                :href="book.link"
                :target="book.external ? '_blank' : undefined"
                :rel="book.external ? 'noopener noreferrer' : undefined"
              >
                {{ book.title }}
              </a>
            </h3>
            <p class="book-card__subtitle">{{ book.subtitle }}</p>
            <p class="book-card__desc">{{ book.description }}</p>

            <div class="book-card__stats">
              <span v-for="st in book.stats" :key="st" class="book-stat">{{ st }}</span>
            </div>

            <div class="book-card__tags">
              <span v-for="tag in book.tags" :key="tag" class="book-tag"># {{ tag }}</span>
            </div>

            <div class="book-card__actions">
              <a
                :href="book.link"
                :target="book.external ? '_blank' : undefined"
                :rel="book.external ? 'noopener noreferrer' : undefined"
                class="atlas-btn atlas-btn--primary"
              >
                开始阅读 <span aria-hidden="true">→</span>
              </a>
              <a
                v-if="book.repo"
                :href="book.repo"
                target="_blank"
                rel="noopener noreferrer"
                class="atlas-btn atlas-btn--ghost"
              >
                配套源码 <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Section 2: Tech Blog & Field Notes -->
    <section class="atlas-section" aria-labelledby="section-posts">
      <div class="atlas-section-head">
        <div>
          <h2 id="section-posts" class="atlas-section-title">技术博客与专题笔记</h2>
          <p class="atlas-section-desc">单篇深度拆解、论文精读与工程实践记录。</p>
        </div>
        <a v-if="posts.length" href="/posts/" class="atlas-more-link">全部文章 →</a>
      </div>

      <div v-if="filteredPosts.length" class="posts-list">
        <a
          v-for="post in filteredPosts"
          :key="post.url"
          :href="post.url"
          class="post-row"
        >
          <div class="post-row__main">
            <div class="post-row__meta">
              <span class="badge badge--cat">{{ post.category }}</span>
              <time v-if="post.date" class="post-row__date">{{ post.date }}</time>
            </div>
            <h3 class="post-row__title">{{ post.title }}</h3>
            <p v-if="post.summary" class="post-row__summary">{{ post.summary }}</p>
          </div>
          <span class="post-row__arrow" aria-hidden="true">→</span>
        </a>
      </div>

      <div v-else class="atlas-empty-note">
        <span class="atlas-empty-dot" aria-hidden="true"></span>
        <span>
          <strong>持续更新中</strong> — 更多涵盖 AI Infra、强化学习、模型与 Agent 评测及通用系统工程的读物与单篇笔记正在沉淀中。
        </span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.atlas-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 3.2rem 1.5rem 5rem;
}

.atlas-hero {
  padding: 1rem 0 2.6rem;
  border-bottom: 1px solid var(--atlas-border);
}

.atlas-kicker {
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--vp-c-brand-1);
  margin-bottom: 0.75rem;
}

.atlas-title {
  margin: 0 0 1rem;
  font-size: clamp(2.1rem, 4.4vw, 3.1rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--vp-c-text-1);
}

.atlas-subtitle {
  max-width: 44rem;
  margin: 0 0 1.4rem;
  font-size: 1.04rem;
  line-height: 1.8;
  color: var(--atlas-text-muted);
}

.atlas-subtitle strong {
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.atlas-hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.86rem;
  color: var(--atlas-text-muted);
}

.atlas-metric strong {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-1);
}

.atlas-sep {
  opacity: 0.45;
}

.atlas-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.75rem;
}

.atlas-pill {
  padding: 0.36rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--atlas-border-strong);
  background: var(--atlas-surface);
  color: var(--atlas-text-muted);
  font-size: 0.84rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.16s ease;
}

.atlas-pill:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.atlas-pill.is-active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #ffffff;
}

.atlas-section {
  margin-top: 2.8rem;
}

.atlas-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.35rem;
}

.atlas-section-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--vp-c-text-1);
}

.atlas-section-desc {
  margin: 0.25rem 0 0;
  font-size: 0.88rem;
  color: var(--atlas-text-muted);
}

.atlas-more-link {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  white-space: nowrap;
}

.atlas-more-link:hover {
  text-decoration: underline;
}

/* Book grid & flagship single-book layout */
.atlas-books-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
}

.atlas-books-grid.is-single {
  grid-template-columns: 1fr;
}

.book-card {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 1.8rem;
  padding: 1.65rem;
  border-radius: 16px;
  border: 1px solid var(--atlas-border);
  background: var(--atlas-surface);
  box-shadow: var(--atlas-shadow-sm);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.atlas-books-grid.is-single .book-card {
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 2.2rem;
  padding: 2rem;
}

.book-card:hover {
  border-color: var(--atlas-border-strong);
  box-shadow: var(--atlas-shadow-md);
  transform: translateY(-2px);
}

.book-card__cover-wrap {
  display: block;
  align-self: start;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 12px 26px -10px rgba(15, 23, 42, 0.35);
  transition: transform 0.22s ease;
}

.book-card:hover .book-card__cover-wrap {
  transform: translateY(-3px) scale(1.01);
}

.book-card__cover {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 4;
  object-fit: cover;
}

.book-card__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.book-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.7rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.18rem 0.62rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.4;
}

.badge--cat {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.badge--status {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.dark .badge--status {
  background: rgba(52, 211, 153, 0.14);
  color: #6ee7b7;
}

.book-card__title {
  margin: 0 0 0.35rem;
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.book-card__title a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.book-card__title a:hover {
  color: var(--vp-c-brand-1);
}

.book-card__subtitle {
  margin: 0 0 0.85rem;
  font-size: 0.94rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  line-height: 1.5;
}

.book-card__desc {
  margin: 0 0 1.15rem;
  font-size: 0.92rem;
  line-height: 1.78;
  color: var(--atlas-text-muted);
}

.book-card__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
}

.book-stat {
  padding: 0.24rem 0.62rem;
  border-radius: 6px;
  background: var(--atlas-surface-subtle);
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  color: var(--vp-c-text-1);
}

.book-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-bottom: 1.35rem;
}

.book-tag {
  font-size: 0.78rem;
  color: var(--atlas-text-muted);
}

.book-card__actions {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.atlas-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.58rem 1.2rem;
  border-radius: 9px;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.16s ease;
}

.atlas-btn--primary {
  background: var(--vp-c-brand-1);
  color: #ffffff !important;
}

.atlas-btn--primary:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-1px);
}

.atlas-btn--ghost {
  border: 1px solid var(--atlas-border-strong);
  background: transparent;
  color: var(--vp-c-text-1) !important;
}

.atlas-btn--ghost:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1) !important;
}

/* Posts list */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.post-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 1.15rem 1.35rem;
  border-radius: 12px;
  border: 1px solid var(--atlas-border);
  background: var(--atlas-surface);
  text-decoration: none;
  transition: border-color 0.16s ease, transform 0.16s ease;
}

.post-row:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateX(2px);
}

.post-row__meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
}

.post-row__date {
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  color: var(--atlas-text-muted);
}

.post-row__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.post-row__summary {
  margin: 0.35rem 0 0;
  font-size: 0.88rem;
  line-height: 1.65;
  color: var(--atlas-text-muted);
}

.post-row__arrow {
  font-size: 1.1rem;
  color: var(--atlas-text-muted);
  flex-shrink: 0;
}

.post-row:hover .post-row__arrow {
  color: var(--vp-c-brand-1);
}

.atlas-empty-note {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.15rem 1.35rem;
  border-radius: 12px;
  border: 1px dashed var(--atlas-border-strong);
  background: var(--atlas-surface);
  color: var(--atlas-text-muted);
  font-size: 0.9rem;
  line-height: 1.65;
}

.atlas-empty-note strong {
  color: var(--vp-c-text-1);
}

.atlas-empty-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  flex-shrink: 0;
  box-shadow: 0 0 0 4px var(--vp-c-brand-soft);
}

@media (max-width: 860px) {
  .atlas-books-grid,
  .atlas-books-grid.is-single {
    grid-template-columns: 1fr;
  }

  .book-card,
  .atlas-books-grid.is-single .book-card {
    grid-template-columns: 1fr;
    gap: 1.35rem;
    padding: 1.35rem;
  }

  .book-card__cover-wrap {
    max-width: 220px;
  }
}
</style>
