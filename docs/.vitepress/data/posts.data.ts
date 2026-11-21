import { createContentLoader } from 'vitepress'

export interface PostItem {
  title: string
  url: string
  date: string
  timestamp: number
  category: string
  tags: string[]
  summary: string
  readingTime?: string
}

declare const data: PostItem[]
export { data }

export default createContentLoader('posts/*.md', {
  excerpt: true,
  transform(raw): PostItem[] {
    return raw
      .filter((page) => page.url !== '/posts/' && page.url !== '/posts/index.html')
      .map((page) => {
        const fm = page.frontmatter || {}
        const dateStr = fm.date ? String(fm.date).slice(0, 10) : ''
        const ts = dateStr ? new Date(dateStr).getTime() : 0
        return {
          title: fm.title || page.url.replace(/^\/posts\/|\/$/g, ''),
          url: page.url,
          date: dateStr,
          timestamp: Number.isFinite(ts) ? ts : 0,
          category: fm.category || '技术笔记',
          tags: Array.isArray(fm.tags) ? fm.tags : [],
          summary: fm.summary || fm.description || '',
          readingTime: fm.readingTime || '',
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  },
})
