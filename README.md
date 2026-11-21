# Tdccccc's Atlas

[![Deploy](https://github.com/tdccccc/tdccccc.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/tdccccc/tdccccc.github.io/actions/workflows/deploy.yml) · [在线访问：tdccccc.github.io](https://tdccccc.github.io/)

面向工程师的个人体系化技术读物与学习笔记总站，采用 **VitePress** 单仓统一管理多本成册读物与单篇技术博客，自动部署至 GitHub Pages。

## 目录结构

```text
docs/
├── index.md                      # 首页书架门户（AtlasHome.vue）
├── about.md                      # 关于本站
├── books/
│   └── llm-inference/            # 《LLM 推理工程：原理与方法》（23 章 + 5 专题 + 工具箱）
├── posts/
│   └── index.md                  # 技术博客与专题笔记归档（直接新增 posts/*.md 即可发布）
├── public/
│   ├── covers/                   # 书架矢量封面 SVG
│   └── figures/                  # 各书配图 SVG
└── .vitepress/
    ├── config.mts                # 导航、多书隔离侧边栏、KaTeX 与全站本地搜索
    ├── data/books.ts             # 书架目录数据
    ├── data/posts.data.ts        # 博客文章自动索引器
    └── theme/                    # 现代极简出版风主题 + 全局图片 Lightbox
```

## 日常更新指南

### 1. 发布一篇新博客 / 专题笔记

在 `docs/posts/` 下新建一个 `.md` 文件（例如 `docs/posts/grpo-notes.md`），顶部写上 Frontmatter 即可自动登上首页与 `/posts/` 归档页：

```markdown
---
title: GRPO 原理与优势估计拆解
date: 2026-11-22
category: 强化学习
tags: [RL, Post-Training, GRPO]
summary: 从 PPO 到 GRPO，拆清组内相对优势估计如何省掉 Critic 网络并影响训练稳定性。
---

正文支持 KaTeX 公式、代码高亮与图片点击放大……
```

### 2. 上架一本新体系读物

1. 在 `docs/books/<book-slug>/` 下存放章节 Markdown，封面图放进 `docs/public/covers/<book-slug>.svg`；
2. 在 `docs/.vitepress/data/books.ts` 追加一条书籍卡片信息；
3. 在 `docs/.vitepress/config.mts` 的 `nav` 与 `sidebar` 中注册 `/books/<book-slug>/` 专属侧边栏。

## 本地开发与构建

```bash
pnpm install
pnpm docs:dev      # 本地热更新预览
pnpm docs:build    # 静态生产构建（含死链检查）
```
