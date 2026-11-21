export interface BookItem {
  id: string
  title: string
  subtitle: string
  category: string
  status: string
  description: string
  cover: string
  link: string
  repo?: string
  stats: string[]
  tags: string[]
  external?: boolean
  featured?: boolean
}

export const books: BookItem[] = [
  {
    id: 'llm-inference',
    title: 'LLM 推理工程：原理与方法',
    subtitle: '从 Roofline 性能直觉到引擎调度、底层算子与国产芯片适配',
    category: 'AI Infra',
    status: '已完结 · 持续维护',
    description:
      '面向系统与算法工程师的图文精讲读物。全书以 A100 / H100 + Llama-3.1-8B / Qwen3-8B 及昇腾 Ascend 910B 为统一算例主线，讲透 Roofline 拆账、vLLM / SGLang / TensorRT-LLM、量化与投机解码、CUDA / Triton / FlashAttention 算子优化以及跨芯片归因方法论。',
    cover: '/covers/llm-inference.svg',
    link: '/books/llm-inference/',
    repo: 'https://github.com/tdccccc/time-to-first-token',
    stats: ['5 篇 23 章主线', '5 篇进阶专题', '35 张原创机制图'],
    tags: ['AI Infra', 'vLLM / SGLang', 'CUDA / Triton', '量化与 PD', '昇腾 Ascend'],
    featured: true,
  },
]
