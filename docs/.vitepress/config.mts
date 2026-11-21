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

const llmRlSidebar = [
  {
    text: '← 返回 Tdccccc\'s Atlas 书架',
    link: '/',
  },
  {
    text: '《LLM 强化学习：原理与后训练实践》',
    items: [
      { text: '全书导览', link: '/books/llm-rl/' },
    ],
  },
  {
    text: '第一篇 · 理论底座与问题建模',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-rl/part-1' },
      { text: '第 1 章 为什么需要后训练 RL', link: '/books/llm-rl/chapters/chapter-01' },
      { text: '第 2 章 MDP、Bandit 与 KL 闭式解', link: '/books/llm-rl/chapters/chapter-02' },
      { text: '第 3 章 策略梯度、GAE 与 PPO 裁剪', link: '/books/llm-rl/chapters/chapter-03' },
    ],
  },
  {
    text: '第二篇 · 奖励工程与防作弊',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-rl/part-2' },
      { text: '第 4 章 人类偏好、奖励模型与 RLAIF', link: '/books/llm-rl/chapters/chapter-04' },
      { text: '第 5 章 可验证奖励、评分细则与 PRM', link: '/books/llm-rl/chapters/chapter-05' },
      { text: '第 6 章 奖励过优化与奖励作弊', link: '/books/llm-rl/chapters/chapter-06' },
    ],
  },
  {
    text: '第三篇 · 对齐与策略优化算法演进',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-rl/part-3' },
      { text: '第 7 章 PPO-RLHF 与 DPO 偏好优化族', link: '/books/llm-rl/chapters/chapter-07' },
      { text: '第 8 章 无 Critic 时代：RLOO 与 GRPO', link: '/books/llm-rl/chapters/chapter-08' },
      { text: '第 9 章 GRPO 修正：Dr.GRPO/DAPO/GSPO/CISPO', link: '/books/llm-rl/chapters/chapter-09' },
      { text: '第 10 章 新一代目标：MaxRL、GDPO 与 SDPO', link: '/books/llm-rl/chapters/chapter-10' },
    ],
  },
  {
    text: '第四篇 · 推理涌现、探索动态与蒸馏融合',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-rl/part-4' },
      { text: '第 11 章 长思维链推理模型与工业配方', link: '/books/llm-rl/chapters/chapter-11' },
      { text: '第 12 章 熵坍缩、长度控制与能力边界', link: '/books/llm-rl/chapters/chapter-12' },
      { text: '第 13 章 在线蒸馏与专家整合范式', link: '/books/llm-rl/chapters/chapter-13' },
    ],
  },
  {
    text: '第五篇 · Agentic RL 与多轮环境',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-rl/part-5' },
      { text: '第 14 章 多轮工具交互与 Agentic 建模', link: '/books/llm-rl/chapters/chapter-14' },
      { text: '第 15 章 长程信用分配与并行多智能体', link: '/books/llm-rl/chapters/chapter-15' },
      { text: '第 16 章 规模化环境、课程与异步 Agent RL', link: '/books/llm-rl/chapters/chapter-16' },
    ],
  },
  {
    text: '第六篇 · 规模化训练系统与工程归因',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-rl/part-6' },
      { text: '第 17 章 RL 系统架构与显存/时间账本', link: '/books/llm-rl/chapters/chapter-17' },
      { text: '第 18 章 训练-推理不一致与 MoE 稳定性', link: '/books/llm-rl/chapters/chapter-18' },
      { text: '第 19 章 主流开源 RL 框架横评与选型', link: '/books/llm-rl/chapters/chapter-19' },
      { text: '第 20 章 ScaleRL 扩展规律与排障归因手册', link: '/books/llm-rl/chapters/chapter-20' },
    ],
  },
  {
    text: '进阶专题库',
    collapsed: true,
    items: [
      { text: '专题 A：核心论文精读与推导档案', link: '/books/llm-rl/topics/paper-notes' },
      { text: '专题 B：多模态与生成式模型后训练 RL', link: '/books/llm-rl/topics/multimodal-rl' },
      { text: '专题 C：测试时计算与在线自适应', link: '/books/llm-rl/topics/test-time-compute' },
      { text: '专题 D：经典深度 RL 脉络速览', link: '/books/llm-rl/topics/classical-rl-map' },
    ],
  },
  {
    text: '参考手册与工具箱',
    collapsed: true,
    items: [
      { text: '全局符号约定与核心公式速查卡', link: '/books/llm-rl/toolkit/notation-and-formulas' },
      { text: '算法选型矩阵与排障速查表', link: '/books/llm-rl/toolkit/debugging-checklist' },
      { text: '核心算法最小 PyTorch 参考实现', link: '/books/llm-rl/toolkit/reference-code' },
      { text: '术语表', link: '/books/llm-rl/glossary' },
      { text: '来源、口径与许可', link: '/books/llm-rl/colophon' },
    ],
  },
]

const llmEvalSidebar = [
  {
    text: '← 返回 Tdccccc\'s Atlas 书架',
    link: '/',
  },
  {
    text: '《LLM 与 Agent 评测：原理、基准与工程实践》',
    items: [
      { text: '全书导览', link: '/books/llm-eval/' },
    ],
  },
  {
    text: '第一篇 · 统计口径与判分校准底座',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-eval/part-1' },
      { text: '第 1 章 评测测量学与统计显著性', link: '/books/llm-eval/chapters/chapter-01' },
      { text: '第 2 章 pass@k、pass^k 与 Arena 排名', link: '/books/llm-eval/chapters/chapter-02' },
      { text: '第 3 章 判分器工程与 Judge 统计校准', link: '/books/llm-eval/chapters/chapter-03' },
      { text: '第 4 章 人类校准协议与数据污染防治', link: '/books/llm-eval/chapters/chapter-04' },
    ],
  },
  {
    text: '第二篇 · 基础模型选型速评',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-eval/part-2' },
      { text: '第 5 章 知识、指令遵循、长上下文与校准', link: '/books/llm-eval/chapters/chapter-05' },
      { text: '第 6 章 推理、代码与多模态底座评测', link: '/books/llm-eval/chapters/chapter-06' },
      { text: '第 7 章 安全、提示注入与边界风险', link: '/books/llm-eval/chapters/chapter-07' },
    ],
  },
  {
    text: '第三篇 · Agent 评测专项',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-eval/part-3' },
      { text: '第 8 章 Agent 评测第一性框架与脚手架解耦', link: '/books/llm-eval/chapters/chapter-08' },
      { text: '第 9 章 工具调用、MCP 与多轮用户交互', link: '/books/llm-eval/chapters/chapter-09' },
      { text: '第 10 章 Coding / SWE 与终端执行 Agent', link: '/books/llm-eval/chapters/chapter-10' },
      { text: '第 11 章 Deep Research、RAG 与长报告工作流', link: '/books/llm-eval/chapters/chapter-11' },
      { text: '第 12 章 GUI 操控、长期记忆与多智能体协同', link: '/books/llm-eval/chapters/chapter-12' },
    ],
  },
  {
    text: '第四篇 · 评测基建、帕累托与误差归因',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-eval/part-4' },
      { text: '第 13 章 评测 Harness 架构与开源框架选型', link: '/books/llm-eval/chapters/chapter-13' },
      { text: '第 14 章 沙箱隔离、录制回放与确定性治理', link: '/books/llm-eval/chapters/chapter-14' },
      { text: '第 15 章 质量 × 成本 × 延迟联合帕累托评测', link: '/books/llm-eval/chapters/chapter-15' },
      { text: '第 16 章 系统化误差分析、失败谱系与报告规范', link: '/books/llm-eval/chapters/chapter-16' },
    ],
  },
  {
    text: '第五篇 · 企业业务落地与迭代闭环',
    collapsed: false,
    items: [
      { text: '本篇导览', link: '/books/llm-eval/part-5' },
      { text: '第 17 章 评测驱动开发：构建业务黄金评测集', link: '/books/llm-eval/chapters/chapter-17' },
      { text: '第 18 章 三大高频企业业务实战拆解', link: '/books/llm-eval/chapters/chapter-18' },
      { text: '第 19 章 离线 CI 闸门、线上 Tracing 与灰度飞轮', link: '/books/llm-eval/chapters/chapter-19' },
      { text: '第 20 章 从评测到演进：脚手架、SFT 与 RLVR 闭环', link: '/books/llm-eval/chapters/chapter-20' },
    ],
  },
  {
    text: '进阶专题库',
    collapsed: true,
    items: [
      { text: '专题 A：核心评测基准与论文口径档案', link: '/books/llm-eval/topics/benchmark-archive' },
      { text: '专题 B：心理测量学与 IRT / CAT 自适应评测', link: '/books/llm-eval/topics/irt-and-cat' },
      { text: '专题 C：量化、推理加速与国产芯片精度回归', link: '/books/llm-eval/topics/quant-and-chip-regression' },
      { text: '专题 D：多模态生成（图 / 视频 / 语音）评测速览', link: '/books/llm-eval/topics/generative-multimodal-eval' },
    ],
  },
  {
    text: '参考手册与工具箱',
    collapsed: true,
    items: [
      { text: '统计公式、检验方法与指标口径速查卡', link: '/books/llm-eval/toolkit/metrics-and-stats' },
      { text: '基准选型与评测上线避坑清单', link: '/books/llm-eval/toolkit/eval-checklist' },
      { text: '最小可运行 Python 评测工具箱', link: '/books/llm-eval/toolkit/reference-code' },
      { text: '术语表', link: '/books/llm-eval/glossary' },
      { text: '来源、口径与许可', link: '/books/llm-eval/colophon' },
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
      '/books/llm-rl/': llmRlSidebar,
      '/books/llm-eval/': llmEvalSidebar,
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
