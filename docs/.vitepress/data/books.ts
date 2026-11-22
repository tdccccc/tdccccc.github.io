export interface BookItem {
  id: string
  title: string
  subtitle?: string
  category: string
  status: string
  description: string
  cover: string
  link: string
  repo?: string
  stats: string[]
  tags?: string[]
  external?: boolean
  featured?: boolean
}

export const books: BookItem[] = [
  {
    id: 'llm-inference',
    title: 'LLM 推理工程：原理与方法',
    category: 'AI Infra',
    status: '已完结',
    description:
      '以 A100 / H100 与昇腾 910B 为统一算例，讲透 Roofline 拆账、vLLM / SGLang / TRT-LLM、量化与投机解码、CUDA / Triton 算子及跨芯片归因。',
    cover: '/covers/llm-inference.svg',
    link: '/books/llm-inference/',
    stats: ['5 篇 23 章', '5 专题', '35 机制图'],
    featured: true,
  },
  {
    id: 'llm-rl',
    title: 'LLM 强化学习：原理与后训练实践',
    category: '强化学习',
    status: '已完结',
    description:
      '以统一符号贯通 KL 闭式解、奖励工程、PPO / DPO / GRPO 到 DAPO / GSPO / MaxRL / SDPO、长思维链蒸馏、多轮 Agentic RL 与训练系统排障。',
    cover: '/covers/llm-rl.svg',
    link: '/books/llm-rl/',
    stats: ['6 篇 20 章', '4 专题', '26 机制图', '3 交互实验'],
    featured: true,
  },
  {
    id: 'llm-eval',
    title: 'LLM 与 Agent 评测：原理、基准与工程实践',
    category: '模型与 Agent 评测',
    status: '已完结',
    description:
      '严守统计显著性与脚手架解耦，讲透 pass@k / pass^k、Judge 统计校准、工具 / MCP / SWE / RAG / GUI 专项、沙箱回放帕累托与企业 EDD 闭环。',
    cover: '/covers/llm-eval.svg',
    link: '/books/llm-eval/',
    stats: ['5 篇 20 章', '4 专题', '25 机制图', '3 交互实验'],
    featured: true,
  },
  {
    id: 'llm-data',
    title: 'LLM 与 Agent 数据工程：原理、配方与迭代飞轮',
    category: '数据工程',
    status: '已完结',
    description:
      '从 Data-Constrained Scaling 与有效数据账本出发，打通万亿预训练退火、SFT / RLVR 燃料库、图文视频语音多模态全栈、Agent 轨迹合成工厂与企业数据飞轮。',
    cover: '/covers/llm-data.svg',
    link: '/books/llm-data/',
    stats: ['6 篇 25 章', '4 专题', '28 机制图', '3 交互实验'],
    featured: true,
  },
]
