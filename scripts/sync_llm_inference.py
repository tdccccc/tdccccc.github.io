#!/usr/bin/env python3
"""Losslessly migrate 《LLM 推理工程：原理与方法》 from MkDocs source to VitePress."""
from __future__ import annotations

import html
import importlib.util
import re
import shutil
import string
import sys
import unicodedata
from pathlib import Path

SRC_ROOT = Path("/home/tiandc/Documents/code/time-to-first-token")
DST_ROOT = Path(__file__).resolve().parent.parent
BOOK_DST = DST_ROOT / "docs/books/llm-inference"
FIG_DST = DST_ROOT / "docs/public/figures/llm-inference"
GH_BLOB = "https://github.com/tdccccc/time-to-first-token/blob/main/docs"

# Load canonical metadata & TermAnnotator from build_book.py
spec = importlib.util.spec_from_file_location("src_build_book", SRC_ROOT / "tools/build_book.py")
build_book = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = build_book
spec.loader.exec_module(build_book)


class VitePressTermAnnotator(build_book.TermAnnotator):
    """Emit standard HTML <a class="term-ref"> links compatible with VitePress."""

    def annotate_line(self, line: str) -> str:
        protected, store = build_book.protect_inline(line)
        defined_here: set[str] = set()
        for entry, patterns in self.entries:
            if entry["id"] in self.seen:
                continue
            for pattern in patterns:
                for match in pattern.finditer(protected):
                    if build_book.excluded_match(protected, match, entry):
                        continue
                    if build_book.looks_like_definition(protected, match.end()):
                        defined_here.add(entry["id"])
                        break
                if entry["id"] in defined_here:
                    break
        while True:
            best = None
            for entry, patterns in self.entries:
                if entry["id"] in self.seen:
                    continue
                for pattern in patterns:
                    for match in pattern.finditer(protected):
                        if build_book.excluded_match(protected, match, entry):
                            continue
                        candidate = (match.start(), -(match.end() - match.start()), entry, match)
                        if best is None or candidate[:2] < best[:2]:
                            best = candidate
                        break
            if best is None:
                break
            _, _, entry, match = best
            self.seen.add(entry["id"])
            if (
                entry["id"] in defined_here
                or build_book.inside_parentheses(protected, match.start())
                or build_book.looks_like_definition(protected, match.end())
            ):
                continue
            en, zh, desc = entry["en"], entry["zh"], entry["desc"]
            key = match.group(0).lower().replace("-", " ").strip()
            en_key = en.lower().replace("-", " ").strip()
            zh_key = zh.lower().strip()
            if en_key == key:
                inside = f"{zh}：{desc}" if zh_key != key else desc
            elif zh_key == key:
                inside = f"{en}：{desc}"
            else:
                inside = f"{en}，{zh}：{desc}"
            tooltip = html.escape(inside, quote=True)
            term_text = html.escape(match.group(0))
            replacement = (
                f'<a class="term-ref" href="/books/llm-inference/glossary#{entry["id"]}" '
                f'title="{tooltip}">{term_text}</a>'
            )
            store.append(replacement)
            end = match.end()
            if protected[end : end + 1] == " ":
                end += 1
            protected = protected[: match.start()] + f"\x00{len(store) - 1}\x00" + protected[end:]
        return build_book.restore_inline(protected, store)


ADMONITION_MAP = {
    "tip": "tip",
    "warning": "warning",
    "note": "info",
    "info": "info",
    "caution": "warning",
    "danger": "danger",
}

FIGCAPTION_MATH = {
    r"$\gamma=4$": "<em>γ</em> = 4",
    r"$d_1 \dots d_4$": "<em>d</em><sub>1</sub>…<em>d</em><sub>4</sub>",
    r"$T_0\text{–}T_3$": "<em>T</em><sub>0</sub>–<em>T</em><sub>3</sub>",
    r"$3n$": "3<em>n</em>",
    r"$n+2$": "<em>n</em> + 2",
    r"$C_{\text{time}}$": "<em>C</em><sub>time</sub>",
    r"$H_3$": "<em>H</em><sub>3</sub>",
}


def convert_admonitions(lines: list[str]) -> list[str]:
    """Convert MkDocs `!!! type "Title"` blocks into VitePress `::: type Title` blocks."""
    out: list[str] = []
    i = 0
    in_fence = False
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            in_fence = not in_fence
            out.append(line)
            i += 1
            continue
        if in_fence:
            out.append(line)
            i += 1
            continue

        m = re.match(r'^!!!\s+(\w+)(?:\s+"([^"]*)")?\s*$', line)
        if m:
            kind = ADMONITION_MAP.get(m.group(1).lower(), "info")
            title = (m.group(2) or "").strip()
            out.append(f"::: {kind} {title}".rstrip())
            i += 1
            body: list[str] = []
            while i < len(lines):
                nxt = lines[i]
                if nxt.startswith("    "):
                    body.append(nxt[4:])
                    i += 1
                elif nxt.strip() == "":
                    # Include blank line only if followed by another indented line
                    j = i + 1
                    while j < len(lines) and lines[j].strip() == "":
                        j += 1
                    if j < len(lines) and lines[j].startswith("    "):
                        body.append("")
                        i += 1
                    else:
                        break
                else:
                    break
            while body and body[-1].strip() == "":
                body.pop()
            out.extend(body)
            out.append(":::")
            continue

        out.append(line)
        i += 1
    return out



# --- CommonMark emphasis compatibility -------------------------------------
# MkDocs (Python-Markdown) 与 VitePress (markdown-it/CommonMark) 对强调分隔符
# 的配对规则不同：当 **…** 贴着中文标点时（如「**投机解码（Speculative
# Decoding）**把…」），CommonMark 的 left/right-flanking 规则会拒绝配对，
# 渲染出字面量星号而不是加粗。这里把这类段落里的 **…** 改写成语义等价的
# <strong>…</strong>，只改标记不改文字，渲染结果与 MkDocs 一致。
_ASCII_PUNCT = set(string.punctuation)
_BACKTICK = chr(96)


def _is_punct(ch: str) -> bool:
    return ch in _ASCII_PUNCT or (bool(ch) and unicodedata.category(ch)[0] == "P")


def _is_ws(ch: str) -> bool:
    return (not ch) or ch.isspace()


def _open_fails(prev: str, nxt: str) -> bool:
    """左分隔符不满足 left-flanking。"""
    return (not _is_ws(prev)) and (not _is_punct(prev)) and _is_punct(nxt)


def _close_fails(prev: str, nxt: str) -> bool:
    """右分隔符不满足 right-flanking。"""
    return (not _is_ws(nxt)) and (not _is_punct(nxt)) and _is_punct(prev)


def _protect_inline(line: str) -> list[tuple[int, int]]:
    """行内代码与 LaTeX 公式的区间，其内部的星号不参与强调解析。"""
    protected: list[tuple[int, int]] = []
    i, n = 0, len(line)
    while i < n:
        if line[i] == _BACKTICK:
            j = line.find(_BACKTICK, i + 1)
            if j != -1:
                protected.append((i, j + 1))
                i = j + 1
                continue
        if line[i] == "$":
            if line.startswith("$$", i):
                j = line.find("$$", i + 2)
                if j != -1:
                    protected.append((i, j + 2))
                    i = j + 2
                    continue
            else:
                j = line.find("$", i + 1)
                if j != -1:
                    protected.append((i, j + 1))
                    i = j + 1
                    continue
        i += 1
    return protected


def _fix_emphasis_line(line: str) -> str:
    protected = _protect_inline(line)

    def is_protected(pos: int) -> bool:
        return any(a <= pos < b for a, b in protected)

    n = len(line)
    stars = [
        k
        for k in range(n - 1)
        if line[k] == "*" and line[k + 1] == "*" and not is_protected(k)
    ]
    if not stars or len(stars) % 2:
        return line

    broken = any(
        _open_fails(line[a - 1] if a else "", line[a + 2] if a + 2 < n else "")
        or _close_fails(line[b - 1] if b else "", line[b + 2] if b + 2 < n else "")
        for a, b in zip(stars[0::2], stars[1::2])
    )
    if not broken:
        return line

    out: list[str] = []
    last = 0
    for index, pos in enumerate(stars):
        out.append(line[last:pos])
        out.append("<strong>" if index % 2 == 0 else "</strong>")
        last = pos + 2
    out.append(line[last:])
    return "".join(out)


def fix_emphasis(text: str) -> str:
    """把 CommonMark 无法配对的 **…** 改写为 <strong>…</strong>（文字不变）。"""
    out: list[str] = []
    in_fence = False
    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith(_BACKTICK * 3) or stripped.startswith("~~~"):
            in_fence = not in_fence
            out.append(line)
            continue
        out.append(line if in_fence else _fix_emphasis_line(line))
    return "\n".join(out)


def convert_markdown(text: str, *, is_book_index: bool = False, annotate: bool = True) -> str:
    # 1. Strip MkDocs heading class attributes
    text = re.sub(r"\s*\{\s*\.(?:chapter-title|home-title|part-title)\s*\}", "", text)

    # 2. Rewrite SVG figure src paths
    text = re.sub(
        r'src="(?:\.\./)*assets/figures/([^"]+)"',
        r'src="/figures/llm-inference/\1"',
        text,
    )

    # 3. Clean raw math inside <figcaption>
    def fix_figcaption(match: re.Match[str]) -> str:
        cap = match.group(0)
        for src_m, dst_m in FIGCAPTION_MATH.items():
            cap = cap.replace(src_m, dst_m)
        return cap

    text = re.sub(r"<figcaption>.*?</figcaption>", fix_figcaption, text, flags=re.S)

    # 4. Rewrite links to runnable code examples & original README in time-to-first-token repo
    text = re.sub(
        r"\]\((?:\.\./)+modules/([^)]+)\)",
        rf"]({GH_BLOB}/modules/\1)",
        text,
    )
    text = re.sub(
        r"\]\(docs/modules/([^)]+)\)",
        rf"]({GH_BLOB}/modules/\1)",
        text,
    )
    text = re.sub(
        r"\]\((?:\.\./)?(?:docs/)?original-README\.md\)",
        rf"]({GH_BLOB}/original-README.md)",
        text,
    )

    # 5. Rewrite book-internal links for VitePress clean URLs
    if is_book_index:
        text = text.replace("](docs/chapters/", "](/books/llm-inference/chapters/")
        text = text.replace("](docs/parts/", "](/books/llm-inference/")
        text = text.replace("](docs/topics/", "](/books/llm-inference/topics/")
        text = text.replace("](docs/toolkit/", "](/books/llm-inference/toolkit/")
        text = text.replace("](docs/glossary.md)", "](/books/llm-inference/glossary)")
        text = text.replace("](docs/colophon.md)", "](/books/llm-inference/colophon)")
        text = text.replace("](docs/progress.md)", "](/books/llm-inference/)")
        # Remove MkDocs grid-cards wrapper on index page if present
        text = text.replace('<div class="grid cards" markdown>', "")
        text = text.replace("</div>", "")
    else:
        text = text.replace("](../parts/", "](/books/llm-inference/")
        text = text.replace("](../glossary.md", "](/books/llm-inference/glossary")
        text = text.replace("](../colophon.md", "](/books/llm-inference/colophon")
        text = text.replace("](toolkit/", "](/books/llm-inference/toolkit/")

    # Strip .md suffix from internal /books/llm-inference/ links
    text = re.sub(r"\]\((/books/llm-inference/[^)#]+)\.md(#[^)]*)?\)", r"](\1\2)", text)

    # Normalize heading IDs { #foo } -> {#foo} for VitePress
    text = re.sub(r"\{\s*#([A-Za-z0-9_-]+)\s*\}", r"{#\1}", text)

    # Map unsupported Shiki language 'promql' -> 'txt'
    text = re.sub(r"^```promql\b", "```txt", text, flags=re.M)

    # 6. Convert MkDocs admonitions -> VitePress containers
    lines = convert_admonitions(text.splitlines())

    # 7. Run glossary term annotator on chapters and topics
    if annotate:
        lines = VitePressTermAnnotator().annotate_lines(lines)

    # 8. Escape raw Vue mustache {{ outside code fences/inline code (safety guard)
    out_lines: list[str] = []
    in_fence = False
    for line in lines:
        s = line.strip()
        if s.startswith("```") or s.startswith("~~~"):
            in_fence = not in_fence
            out_lines.append(line)
            continue
        if not in_fence and "{{" in line:
            parts = re.split(r"(`[^`]+`)", line)
            for idx in range(0, len(parts), 2):
                parts[idx] = parts[idx].replace("{{", "&#123;&#123;").replace("}}", "&#125;&#125;")
            line = "".join(parts)
        out_lines.append(line)

    # 9. 让 **…** 在 CommonMark 下也能正确加粗（贴中文标点时会失效）
    return fix_emphasis("\n".join(out_lines)).rstrip() + "\n"


def build_book_index() -> str:
    return """# LLM 推理工程：原理与方法

<p class="chapter-summary">从单条请求的延迟拆解，到推理引擎调度、GPU 算子优化与国产芯片适配——以直观图解、手算账本与可复用的工程方法，打通大语言模型推理全栈。</p>

大语言模型推理是一门贴近物理极限的系统工程：换一块算力翻倍的显卡为什么解码速度几乎不动？并发翻倍后为什么吞吐见顶而尾延迟骤增？PagedAttention、量化、投机解码、FlashAttention 和国产 NPU 适配各自到底在省什么？本书统一采用 **A100 80GB / H100 + Llama-3.1-8B / Qwen3-8B** 与 **昇腾 Ascend 910B** 教材口径，按「先算清账、再看机制、最后归因」的主线展开。

<div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin:1.1rem 0 1.4rem;">
  <a href="/books/llm-inference/chapters/chapter-01" style="display:inline-flex;align-items:center;padding:0.55rem 1.15rem;border-radius:8px;background:var(--vp-c-brand-1);color:#fff;font-weight:600;text-decoration:none;">从第 1 章开始 →</a>
  <a href="#reading-paths" style="display:inline-flex;align-items:center;padding:0.55rem 1.05rem;border-radius:8px;border:1px solid var(--vp-c-divider);color:var(--vp-c-text-1);font-weight:600;text-decoration:none;">按角色选路线</a>
  <a href="/books/llm-inference/toolkit/hardware-models" style="display:inline-flex;align-items:center;padding:0.55rem 1.05rem;border-radius:8px;border:1px solid var(--vp-c-divider);color:var(--vp-c-text-1);font-weight:600;text-decoration:none;">硬件与模型速查</a>
</div>

<figure class="book-figure">
  <img src="/figures/llm-inference/fullstack-map.svg" alt="LLM 推理工程四层全栈地图" loading="lazy">
  <figcaption><span class="book-figure__label">全景图</span>从上层服务接入到底层异构硬件，贯穿一条「性能度量与 Profiling」主轴，对应全书 5 篇 23 章。</figcaption>
</figure>

## 按角色选择阅读路线 {#reading-paths}

不必线性读完所有章节。结合你当前的工程目标选一条主线，遇到底层概念再随时按图索骥。

<div class="part-card-grid">
  <a class="part-card" href="/books/llm-inference/part-1">
    <div>
      <div class="part-card__num">ROUTE 01 · 第 1–11 章</div>
      <div class="part-card__title">推理框架与部署优化</div>
      <p class="part-card__desc">掌握 Roofline 与模型账本、延迟分布与 Profiling 读法，吃透 vLLM / SGLang / TensorRT-LLM 核心机制、量化、投机解码、PD 解耦与成本路由。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/part-3">
    <div>
      <div class="part-card__num">ROUTE 02 · 第 1–4 + 12–17 章</div>
      <div class="part-card__title">GPU 算子与底层 Kernel</div>
      <p class="part-card__desc">建立 GPU 执行模型与存储层级心智，走完 GEMM 四版优化阶梯、Triton Block 编程、FlashAttention 在线 Softmax、量化 Matmul、CUTLASS 与引擎注册分发。</p>
    </div>
  </a>
  <a class="part-card" href="/books/llm-inference/part-4">
    <div>
      <div class="part-card__num">ROUTE 03 · 第 1–6 + 18–23 章</div>
      <div class="part-card__title">国产芯片适配与跨芯片归因</div>
      <p class="part-card__desc">看懂国产芯片四面墙与五层软件栈，深入昇腾 CANN / AscendC、vllm-ascend 插件机制、算子覆盖与回退定位、跨芯片算子迁移与精度性能归因。</p>
    </div>
  </a>
</div>

## 全书结构总览

### 五篇 23 章主线

| 篇目 | 章节范围 | 核心问题 | 入口 |
|---|---|---|---|
| **第一篇 性能直觉与度量方法** | 第 1–4 章 | 为什么慢？显存与计算怎么算账？怎么正确量出延迟与切时间线？ | [进入第一篇](/books/llm-inference/part-1) |
| **第二篇 推理引擎与部署优化** | 第 5–11 章 | vLLM / SGLang / TRT-LLM 怎么调度？量化、投机解码、PD 与路由何时生效？ | [进入第二篇](/books/llm-inference/part-2) |
| **第三篇 GPU 算子优化与引擎接入** | 第 12–17 章 | CUDA 与 Triton 怎么压榨带宽和算力？Fused Attention 与量化核如何接进引擎？ | [进入第三篇](/books/llm-inference/part-3) |
| **第四篇 国产芯片适配原理与方法** | 第 18–22 章 | 国产芯片软件栈怎么分层？昇腾 CANN / AscendC、`vllm-ascend` 与跨芯片算子怎么迁？ | [进入第四篇](/books/llm-inference/part-4) |
| **第五篇 综合分析与方法收口** | 第 23 章 | 如何控制变量做跨芯片精度回归与性能归因，并写出经得起质疑的分析报告？ | [进入第五篇](/books/llm-inference/part-5) |

### 两个横切参考区

| 区域 | 页面 | 适用场景 |
|---|---|---|
| 进阶专题库 | [专题 A：前沿长上下文与混合架构深度拆账](/books/llm-inference/topics/advanced-architectures) | 拆解 Qwen3.5/3.6、DeepSeek V4、Gemma 4 的 MoE、MLA、线性注意力与 KV 稀疏压缩账本 |
| 进阶专题库 | [专题 B：大规模集群 PD 与分布式 KV 池](/books/llm-inference/topics/cluster-pd-mooncake) | 深入 Mooncake 架构、RDMA 跨机 KV 传输账、池配比与故障域设计 |
| 进阶专题库 | [专题 C：端侧与浏览器推理运行时](/books/llm-inference/topics/edge-runtimes) | 梳理 llama.cpp、ONNX Runtime、MLC/WebLLM 等本地与端侧部署边界 |
| 进阶专题库 | [专题 D：各章核心论文精读与数据口径](/books/llm-inference/topics/paper-notes) | 集中查阅 PagedAttention、FlashAttention、SmoothQuant、Speculative Decoding 等关键论文要点 |
| 进阶专题库 | [专题 E：主流国产芯片生态速查](/books/llm-inference/topics/domestic-ecosystems) | 对比昇腾、海光 DCU、寒武纪、壁仞、沐曦、摩尔线程等软件栈与 vLLM 适配路径 |
| 参考工具箱 | [硬件规格与模型账本速查](/books/llm-inference/toolkit/hardware-models) | 查阅 A100 / H100 / Ascend 910B 硬件参数与 Llama-3.1 / Qwen3 等模型手算表 |
| 参考工具箱 | [测量口径与对比分析方法](/books/llm-inference/toolkit/methodology) | 统一压测条件、分位数口径、精度检验与跨配置对比边界 |
| 参考工具箱 | [工程脚本与配置参考](/books/llm-inference/toolkit/tools-and-configs) | 获取 SSE 流式压测脚本、Prometheus 监控配置与常见引擎启动参数参考 |

## 阅读说明

为保证全书公式与数量级直觉前后一致，主线算例统一采用 **NVIDIA A100 80GB SXM**（FP16 312 TFLOPS，HBM 2 TB/s，脊点 156 FLOP/B）与 **NVIDIA H100 80GB SXM**（FP16 989.5 TFLOPS，HBM 3.35 TB/s，脊点 295 FLOP/B）作为 GPU 基准，以 **Llama-3.1-8B**（FP16 权重 16 GB，KV 128 KiB/token）与 **Qwen3-8B**（BF16 权重 16.38 GB，KV 144 KiB/token）作为主线模型，国产芯片主线采用 **昇腾 Ascend 910B（64 GB HBM）**。文中的手算数字旨在建立清晰的数量级直觉与优化方向感，换用其他卡型或模型时可按同一套公式直接代换；完整规格速查见 [硬件规格与模型账本速查](/books/llm-inference/toolkit/hardware-models)。

- **双栏目录导航**：左侧栏按篇目与章节切换，右侧常驻本页二级 / 三级节目录并随阅读位置高亮，页面底部提供上一页 / 下一页连续阅读入口。
- **配图放大预览**：点击任意机制矢量图即可全屏放大，支持滚轮缩放、拖拽平移、多图切换与新标签页打开原图。
- **术语悬停**：正文首次出现的专业术语带虚线下划线，悬停即可查看精简释义，点击跳转 [术语表](/books/llm-inference/glossary)。

[术语表](/books/llm-inference/glossary) · [来源、贡献与许可](/books/llm-inference/colophon) · [← 返回 Tdccccc's Atlas 首页](/)
"""


def build_part_pages() -> None:
    parts_chapters: dict[int, list[tuple[int, str]]] = {i: [] for i in range(1, 6)}
    for num, part_num, title in build_book.CHAPTERS:
        parts_chapters[part_num].append((num, title))

    for part_num, part_title in build_book.PART_TITLES.items():
        part_cn = build_book.PART_CN[part_num]
        lede = build_book.PART_LEDES[part_num]
        intro = build_book.PART_INTROS[part_num]
        intro = re.sub(
            r"\]\(\.\./(topics|toolkit|chapters)/([^)#]+)\.md(#[^)]*)?\)",
            r"](/books/llm-inference/\1/\2\3)",
            intro,
        )
        intro = re.sub(
            r"\]\(\.\./(glossary|colophon)\.md(#[^)]*)?\)",
            r"](/books/llm-inference/\1\2)",
            intro,
        )
        cards = ['<div class="part-card-grid">']
        for ch_num, ch_title in parts_chapters[part_num]:
            summary = html.escape(build_book.CHAPTER_SUMMARIES.get(ch_num, ""))
            cards.append(
                f'  <a class="part-card" href="/books/llm-inference/chapters/chapter-{ch_num:02d}">\n'
                f'    <div>\n'
                f'      <div class="part-card__num">CHAPTER {ch_num:02d}</div>\n'
                f'      <div class="part-card__title">第 {ch_num} 章 · {html.escape(ch_title)}</div>\n'
                f'      <p class="part-card__desc">{summary}</p>\n'
                f'    </div>\n'
                f'  </a>'
            )
        cards.append("</div>")

        md = (
            f"# {part_cn}：{part_title}\n\n"
            f'<p class="chapter-summary">{html.escape(lede)}</p>\n\n'
            f"## 本篇导览\n\n"
            f"{intro}\n\n"
            f"## 本篇章节\n\n"
            + "\n".join(cards)
            + "\n"
        )
        (BOOK_DST / f"part-{part_num}.md").write_text(md, encoding="utf-8")


def build_glossary() -> str:
    out = [
        "# 术语表",
        "",
        "正文首次出现的专业术语自动链接至本页；将鼠标悬停在带虚线下划线的术语上即可查看精简解释。",
        "",
        "[硬件规格与模型速查](/books/llm-inference/toolkit/hardware-models) · "
        "[测量口径与分析方法](/books/llm-inference/toolkit/methodology)",
        "",
    ]
    for entry in build_book.TERM_GLOSSARY:
        label = entry["zh"] if entry["zh"] == entry["en"] else f'{entry["zh"]}（{entry["en"]}）'
        aliases = "、".join(f"`{alias}`" for alias in dict.fromkeys(entry["aliases"]))
        out += [
            f'## {label} {{#{entry["id"]}}}',
            "",
            entry["desc"],
            "",
            f"常见写法：{aliases}。",
            "",
        ]
    return "\n".join(out)


def main() -> None:
    if BOOK_DST.exists():
        shutil.rmtree(BOOK_DST)
    (BOOK_DST / "chapters").mkdir(parents=True)
    (BOOK_DST / "topics").mkdir(parents=True)
    (BOOK_DST / "toolkit").mkdir(parents=True)

    # 1. Copy all 35 SVGs
    if FIG_DST.exists():
        shutil.rmtree(FIG_DST)
    FIG_DST.mkdir(parents=True)
    svg_count = 0
    for svg in sorted((SRC_ROOT / "assets/figures").glob("*.svg")):
        shutil.copy2(svg, FIG_DST / svg.name)
        svg_count += 1

    # 2. Book landing page, part pages, glossary, colophon
    (BOOK_DST / "index.md").write_text(build_book_index(), encoding="utf-8")
    build_part_pages()
    (BOOK_DST / "glossary.md").write_text(build_glossary(), encoding="utf-8")

    colophon_src = (SRC_ROOT / "docs/colophon.md").read_text(encoding="utf-8")
    (BOOK_DST / "colophon.md").write_text(
        convert_markdown(colophon_src, annotate=False), encoding="utf-8"
    )

    # 3. 23 chapters (with glossary annotations)
    ch_count = 0
    for ch in sorted((SRC_ROOT / "docs/chapters").glob("chapter-*.md")):
        raw = ch.read_text(encoding="utf-8")
        (BOOK_DST / "chapters" / ch.name).write_text(
            convert_markdown(raw, annotate=True), encoding="utf-8"
        )
        ch_count += 1

    # 4. 5 topics (with glossary annotations)
    topic_count = 0
    for tp in sorted((SRC_ROOT / "docs/topics").glob("*.md")):
        raw = tp.read_text(encoding="utf-8")
        (BOOK_DST / "topics" / tp.name).write_text(
            convert_markdown(raw, annotate=True), encoding="utf-8"
        )
        topic_count += 1

    # 5. 3 toolkit pages
    tk_count = 0
    for tk in sorted((SRC_ROOT / "docs/toolkit").glob("*.md")):
        raw = tk.read_text(encoding="utf-8")
        (BOOK_DST / "toolkit" / tk.name).write_text(
            convert_markdown(raw, annotate=False), encoding="utf-8"
        )
        tk_count += 1

    print(
        f"Migrated 《LLM 推理工程：原理与方法》: {ch_count} chapters, 5 parts, "
        f"{topic_count} topics, {tk_count} toolkit pages, glossary, colophon, {svg_count} SVGs."
    )


if __name__ == "__main__":
    main()
