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
  {
    id: 'llm-rl',
    title: 'LLM 强化学习：原理与后训练实践',
    subtitle: '从策略梯度与 KL 正则第一性原理，到 RLHF、推理模型、Agentic RL 与规模化训练系统',
    category: '强化学习',
    status: '已完结 · 持续维护',
    description:
      '面向算法与系统工程师的大模型后训练强化学习精讲读物。全书以统一符号体系贯穿，系统讲透 MDP/Bandit 与 KL 闭式解、奖励工程与防作弊、PPO / DPO / GRPO / DAPO / GSPO / CISPO / MaxRL / SDPO 算法演进、长思维链推理与在线蒸馏、多轮 Agentic RL，以及分布式训练系统与训练-推理一致性排障。',
    cover: '/covers/llm-rl.svg',
    link: '/books/llm-rl/',
    stats: ['6 篇 20 章主线', '4 篇进阶专题', '26 张原创机制图', '3 个交互实验'],
    tags: ['强化学习', 'RLHF / RLVR', 'GRPO / DAPO', '推理与蒸馏', 'Agentic RL'],
    featured: true,
  },
  {
    id: 'llm-eval',
    title: 'LLM 与 Agent 评测：原理、基准与工程实践',
    subtitle: '从统计显著性与判分校准底座，到 Agent 专项、沙箱基建与企业业务迭代闭环',
    category: '模型与 Agent 评测',
    status: '已完结 · 持续维护',
    description:
      '面向算法、Agent 应用与评测基建工程师的系统专著，构成“推理底座 × RL 后训练 × 评测闭环”三部曲终章。全书严守统计口径与脚手架解耦原则，系统讲透配对检验与 MDE、pass@k 与 pass^k、LLM-as-a-Judge 的 Rogan-Gladen 统计校准、工具/MCP/SWE/Deep Research/GUI/多智能体专项评测、沙箱录制回放与质量-成本-延迟帕累托，以及 EDD 黄金集、线上 Tracing 与后训练反哺飞轮。',
    cover: '/covers/llm-eval.svg',
    link: '/books/llm-eval/',
    stats: ['5 篇 20 章主线', '4 篇进阶专题', '25 张原创机制图', '3 个交互实验'],
    tags: ['模型与 Agent 评测', '统计学与校准', 'SWE / MCP / τ²', '沙箱与帕累托', 'EDD 业务闭环'],
    featured: true,
  },
]
