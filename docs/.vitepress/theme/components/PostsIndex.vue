<script setup lang="ts">
import { computed, ref } from 'vue'
import { data as posts } from '../../data/posts.data'

const activeCategory = ref('全部')

const categories = computed(() => {
  const set = new Set<string>()
  for (const p of posts) set.add(p.category)
  return ['全部', ...Array.from(set)]
})

const filtered = computed(() =>
  activeCategory.value === '全部'
    ? posts
    : posts.filter((p) => p.category === activeCategory.value)
)
</script>

<template>
  <div class="posts-page">
    <header class="posts-header">
      <div class="posts-kicker">FIELD NOTES & BLOG</div>
      <h1 class="posts-title">技术博客与专题笔记</h1>
      <p class="posts-desc">
        除成册体系读物外的单篇深度文章、论文拆解与工程复盘，涵盖 AI Infra、强化学习、模型与 Agent 评测及更多方向。
      </p>
    </header>

    <nav v-if="categories.length > 2" class="posts-filter" aria-label="文章分类筛选">
      <button
        v-for="cat in categories"
        :key="cat"
        type="button"
        class="posts-pill"
        :class="{ 'is-active': activeCategory === cat }"
        @click="activeCategory = cat"
      >
        {{ cat }}
      </button>
    </nav>

    <div v-if="filtered.length" class="posts-archive">
      <a v-for="post in filtered" :key="post.url" :href="post.url" class="archive-card">
        <div class="archive-card__meta">
          <span class="archive-cat">{{ post.category }}</span>
          <time v-if="post.date" class="archive-date">{{ post.date }}</time>
          <span v-if="post.readingTime" class="archive-date">· {{ post.readingTime }}</span>
        </div>
        <h2 class="archive-card__title">{{ post.title }}</h2>
        <p v-if="post.summary" class="archive-card__summary">{{ post.summary }}</p>
        <div v-if="post.tags.length" class="archive-card__tags">
          <span v-for="t in post.tags" :key="t" class="archive-tag"># {{ t }}</span>
        </div>
      </a>
    </div>

    <div v-else class="posts-empty">
      <p class="posts-empty__title">专题笔记区已就绪，正在持续更新中</p>
      <p class="posts-empty__sub">
        你可以先阅读已上线的完整体系读物
        <a href="/books/llm-inference/">《LLM 推理工程：原理与方法》</a>，或回到
        <a href="/">Tdccccc's Atlas 首页书架</a>。
      </p>
    </div>
  </div>
</template>

<style scoped>
.posts-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
}

.posts-header {
  padding-bottom: 1.8rem;
  border-bottom: 1px solid var(--atlas-border);
  margin-bottom: 2rem;
}

.posts-kicker {
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--vp-c-brand-1);
  margin-bottom: 0.55rem;
}

.posts-title {
  margin: 0 0 0.75rem;
  font-size: clamp(1.8rem, 3.6vw, 2.35rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--vp-c-text-1);
}

.posts-desc {
  margin: 0;
  font-size: 0.96rem;
  line-height: 1.75;
  color: var(--atlas-text-muted);
}

.posts-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.posts-pill {
  padding: 0.32rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--atlas-border-strong);
  background: var(--atlas-surface);
  color: var(--atlas-text-muted);
  font-size: 0.84rem;
  cursor: pointer;
}

.posts-pill.is-active {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  color: #ffffff;
}

.posts-archive {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.archive-card {
  display: block;
  padding: 1.35rem 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--atlas-border);
  background: var(--atlas-surface);
  text-decoration: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.archive-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--atlas-shadow-sm);
}

.archive-card__meta {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.5rem;
}

.archive-cat {
  padding: 0.16rem 0.55rem;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 0.74rem;
  font-weight: 600;
}

.archive-date {
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  color: var(--atlas-text-muted);
}

.archive-card__title {
  margin: 0 0 0.45rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.archive-card__summary {
  margin: 0 0 0.65rem;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--atlas-text-muted);
}

.archive-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.archive-tag {
  font-size: 0.76rem;
  color: var(--atlas-text-muted);
}

.posts-empty {
  padding: 2.4rem 1.8rem;
  border-radius: 14px;
  border: 1px dashed var(--atlas-border-strong);
  background: var(--atlas-surface);
  text-align: center;
}

.posts-empty__title {
  margin: 0 0 0.55rem;
  font-size: 1.04rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.posts-empty__sub {
  margin: 0;
  font-size: 0.9rem;
  color: var(--atlas-text-muted);
  line-height: 1.7;
}

.posts-empty__sub a {
  color: var(--vp-c-brand-1);
  font-weight: 600;
  text-decoration: none;
}

.posts-empty__sub a:hover {
  text-decoration: underline;
}
</style>
