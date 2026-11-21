import { defineConfig } from 'vitepress'
import { katex } from '@mdit/plugin-katex'

const llmInferenceSidebar = [
  {
    text: '← 返回 Tdccccc\'s Atlas 书架',
    link: '/',
  },
  {
    text: '《LLM 推理工程：原理与方法》',
    items: [
      { text: '全书导览', link: '/books/llm-inference/' },
    ],
  },
  {
    text: '第一篇 · 性能直觉与度量方法',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-inference/part-1' },
      { text: '第 1 章 Roofline 与三区间直觉', link: '/books/llm-inference/chapters/chapter-01' },
      { text: '第 2 章 模型的显存与计算账本', link: '/books/llm-inference/chapters/chapter-02' },
      { text: '第 3 章 推理度量与压测方法', link: '/books/llm-inference/chapters/chapter-03' },
      { text: '第 4 章 Profiling 方法论', link: '/books/llm-inference/chapters/chapter-04' },
    ],
  },
  {
    text: '第二篇 · 推理引擎与部署优化',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-inference/part-2' },
      { text: '第 5 章 vLLM：一条请求的旅程', link: '/books/llm-inference/chapters/chapter-05' },
      { text: '第 6 章 SGLang 与 RadixAttention', link: '/books/llm-inference/chapters/chapter-06' },
      { text: '第 7 章 可观测性与容量评估', link: '/books/llm-inference/chapters/chapter-07' },
      { text: '第 8 章 量化原理与取舍', link: '/books/llm-inference/chapters/chapter-08' },
      { text: '第 9 章 投机解码与长上下文淘汰', link: '/books/llm-inference/chapters/chapter-09' },
      { text: '第 10 章 TensorRT-LLM 与三引擎横评', link: '/books/llm-inference/chapters/chapter-10' },
      { text: '第 11 章 PD 解耦、扩缩容与成本路由', link: '/books/llm-inference/chapters/chapter-11' },
    ],
  },
  {
    text: '第三篇 · GPU 算子与底层 Kernel',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-inference/part-3' },
      { text: '第 12 章 GPU 执行模型与 GEMM 阶梯', link: '/books/llm-inference/chapters/chapter-12' },
      { text: '第 13 章 Triton：从向量加到 2D GEMM', link: '/books/llm-inference/chapters/chapter-13' },
      { text: '第 14 章 Fused Attention 深讲', link: '/books/llm-inference/chapters/chapter-14' },
      { text: '第 15 章 量化 Matmul：W8A8 与 W8A16', link: '/books/llm-inference/chapters/chapter-15' },
      { text: '第 16 章 FlashAttention 2/3 与 CUTLASS', link: '/books/llm-inference/chapters/chapter-16' },
      { text: '第 17 章 自定义算子接入推理引擎', link: '/books/llm-inference/chapters/chapter-17' },
    ],
  },
  {
    text: '第四篇 · 国产芯片适配（昇腾主线）',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-inference/part-4' },
      { text: '第 18 章 国产芯片全景与软件栈', link: '/books/llm-inference/chapters/chapter-18' },
      { text: '第 19 章 昇腾部署与 vllm-ascend', link: '/books/llm-inference/chapters/chapter-19' },
      { text: '第 20 章 CANN 与 AscendC 流水线', link: '/books/llm-inference/chapters/chapter-20' },
      { text: '第 21 章 算子覆盖分析与回退定位', link: '/books/llm-inference/chapters/chapter-21' },
      { text: '第 22 章 跨芯片算子迁移与 FlagGems', link: '/books/llm-inference/chapters/chapter-22' },
    ],
  },
  {
    text: '第五篇 · 跨芯片综合方法论',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-inference/part-5' },
      { text: '第 23 章 精度回归、归因与报告范式', link: '/books/llm-inference/chapters/chapter-23' },
    ],
  },
  {
    text: '进阶专题库',
    collapsed: true,
    items: [
      { text: '专题 A：前沿长上下文与混合架构', link: '/books/llm-inference/topics/advanced-architectures' },
      { text: '专题 B：集群 PD 与 Mooncake KV 池', link: '/books/llm-inference/topics/cluster-pd-mooncake' },
      { text: '专题 C：端侧与浏览器推理运行时', link: '/books/llm-inference/topics/edge-runtimes' },
      { text: '专题 D：核心论文精读与口径档案', link: '/books/llm-inference/topics/paper-notes' },
      { text: '专题 E：主流国产芯片生态速查', link: '/books/llm-inference/topics/domestic-ecosystems' },
    ],
  },
  {
    text: '参考手册与工具箱',
    collapsed: true,
    items: [
      { text: '硬件规格与模型账本速查', link: '/books/llm-inference/toolkit/hardware-models' },
      { text: '测量口径与对比分析方法', link: '/books/llm-inference/toolkit/methodology' },
      { text: '工程脚本与配置参考', link: '/books/llm-inference/toolkit/tools-and-configs' },
      { text: '术语表', link: '/books/llm-inference/glossary' },
      { text: '来源、贡献与许可', link: '/books/llm-inference/colophon' },
    ],
  },
]

export default defineConfig({
  lang: 'zh-CN',
  title: "Tdccccc's Atlas",
  description: 'Never stop learning AI. — 面向工程师的技术读物与学习笔记，覆盖 AI Infra、强化学习、模型与 Agent 评测及更多方向',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#3730a3' }],
  ],

  markdown: {
    config: (md) => {
      md.use(katex, {
        output: 'html',
        strict: false,
        throwOnError: false,
      })
    },
  },

  themeConfig: {
    siteTitle: "Tdccccc's Atlas",
    logo: '/favicon.svg',

    nav: [
      { text: '书架', link: '/' },
      { text: '博客与笔记', link: '/posts/' },
    ],

    sidebar: {
      '/books/llm-inference/': llmInferenceSidebar,
    },

    outline: {
      level: [2, 3],
      label: '本页目录',
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
    },

    lastUpdated: {
      text: '最后更新',
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题切换',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索全站',
            buttonAriaLabel: '搜索全站内容',
          },
          modal: {
            noResultsText: '未找到相关内容',
            resetButtonTitle: '清除搜索条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/tdccccc' },
    ],

    footer: {
      message: "Tdccccc's Atlas · Never stop learning AI.",
      copyright: '基于 CC BY 4.0 协议共享内容',
    },
  },
})
