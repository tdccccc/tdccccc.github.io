# 第 14 章 沙箱隔离、录制回放与确定性治理

<p class="chapter-summary">攻克 Agent 评测最大的工程瓶颈：对比 Docker 容器池与 Firecracker MicroVM 快照隔离，落地只读测试挂载与默认断网策略，设计离线 100% 可复现的 HTTP/API 录制回放代理，并确立 infra_error 与 model_failure 严格分桶及熔断铁律。</p>

静态文本评测只需保证推理引擎稳定，重跑两次的分差通常控制在统计噪声以内。但一旦进入软件工程（SWE）、终端运维、浏览器操作或外部 API 编排等 Agent 场景，评测瞬间面临三重失控风险：一是**环境脏状态与安全越界**（Agent 误删宿主机文件、修改隐藏测试用例或发起内网探测）；二是**外部世界非平稳**（搜索引擎昨日和今日结果不同、第三方接口限流返错）；三是**基础设施抖动污染分数**（网关 502 或容器 OOM 被粗暴记成模型 0 分）。

本章系统搭建 Agent 评测的三根确定性支柱：高并发隔离沙箱池、HTTP/API 录制回放代理，以及异常分桶熔断机制。

<figure class="book-figure">
  <img src="/figures/llm-eval/sandbox-replay-infra.svg" alt="高并发沙箱隔离池、HTTP 录制回放代理与异常分桶熔断架构图" loading="lazy">
  <figcaption><span class="book-figure__label">图 14-1</span>工业级可复现 Agent 评测基础设施全景：左侧以容器/MicroVM 快照池锁死文件系统与网络边界，中间以 VCR 代理把外部 API 固化为只读磁带，右侧严格分桶基础设施故障与模型失败并触发熔断。</figcaption>
</figure>

---

## 14.1 高并发沙箱池：Docker 容器池 vs MicroVM 快照池

在 500 题 × 4 次采样的 SWE 或终端评测中，需要拉起 2,000 个独立环境。如果每题现场 `docker build` 或冷装依赖，整轮评测动辄耗时十余小时；而直接共用宿主机环境又会立刻引发并发写冲突与安全灾难。生产级沙箱基建通常在三类隔离方案间做权衡：

| 隔离方案 | 隔离原理 | 启动 / 回滚耗时 | 单机并发密度（64C/256G） | 核心优势 | 主要局限与风险 |
| --- | --- | --- | --- | --- | --- |
| <strong>Docker 容器池（OverlayFS CoW）</strong> | Linux Namespace + Cgroups + 写时复制分层文件系统 | 预热镜像约 0.3–1.2 s | 80–150 并发 | 镜像生态最成熟、OverlayFS 共享只读底层省磁盘，Inspect AI / SWE-bench 原生支持 | 共享宿主机内核，面对恶意逃逸或内核级操作隔离偏弱；高并发下 Docker Daemon 易成瓶颈 |
| <strong>gVisor（`runsc`）</strong> | 用户态内核拦截绝大多数系统调用（Syscall） | 约 0.5–1.8 s | 60–110 并发 | 直接作为 Docker/K8s Runtime 无缝接入，大幅压缩内核攻击面 | 高频文件 I/O（如大型 C++/Rust 编译或海量小文件遍历）性能损耗约 15%–40% |
| **Firecracker / Kata MicroVM** | KVM 硬件虚拟化 + 轻量独立内核 + 内存快照恢复 | **快照恢复 10–150 ms** | 120–250 并发 | 强硬件隔离 + 毫秒级状态快照回滚，适合高安全多租户与 RLVR 大规模并发采样 | 需要开启宿主机 KVM 嵌套/裸金属支持，镜像转换与运维门槛高于纯 Docker |

无论选用容器池还是 MicroVM，想要同时兼顾吞吐、防作弊与安全，必须落稳四条硬性配置：

1. **预热镜像池与 Digest 锁死**：提前把仓库代码、Python/Node 虚拟环境与系统依赖打进不可变镜像，按 `sha256` 摘要引用（禁用 `:latest`），后台常驻预热池按需分配并在任务结束后立刻销毁，依托 OverlayFS / MicroVM 快照实现秒级零残留回滚；
2. **强资源配额防炸机**：单个沙箱强制限制 CPU、内存、进程数与可写磁盘配额，防止 Agent 写出 `fork` 炸弹或死循环写日志打爆整台宿主机磁盘；
3. <strong>只读测试挂载与双阶段判分（防改测试作弊）</strong>：在 Agent 执行阶段，仅开放 `/workspace` 可写，**严禁将隐藏验证脚本挂载进 Agent 可见路径**；待 Agent 提交结束后，销毁或冻结其权限，再由外部调度器挂载只读 `/eval_tests` 并执行<a class="term-ref" href="/books/llm-eval/glossary#final_state_assertion" title="检查任务结束后文件系统、数据库哈希、测试退出码等环境终态的判分方式">终态断言</a>，从机制上根除[第 10 章](/books/llm-eval/chapters/chapter-10)剖析的“改测试文件作弊”；
4. **默认断网与白名单出口**：纯代码/终端任务强制 `--network=none`；确需访问文档或外部工具的任务，则仅允许流量经由受控代理端口出站，彻底阻断直连外网与对云厂商元数据服务（如 `169.254.169.254`）的 SSRF 探测。

以下给出生产级 SWE/终端评测的双阶段容器加固命令模板，将 Agent 执行期与验证期从文件系统层面物理隔绝：

```bash
# Phase 1: Agent 运行期（无外网、剥离内核特权、无隐藏测试挂载）
docker run --rm --runtime=runsc --network=none \
  --cpus=2 --memory=4g --pids-limit=256 --cap-drop=ALL \
  --mount type=bind,src=/runs/$RUN_ID/workspace,dst=/workspace \
  registry.internal/swe-env@sha256:9f4a81c2... /usr/local/bin/agent_runner

# Phase 2: 评分验证期（只读挂载隐藏测试集；SWE 场景仅将经 Diff/AST 审计的 model.patch 应用于洁净仓库快照）
docker run --rm --network=none --cpus=2 --memory=4g \
  --mount type=bind,src=/runs/$RUN_ID/workspace,dst=/workspace,readonly \
  --mount type=bind,src=/golden/tests/$TASK_ID,dst=/eval_tests,readonly \
  registry.internal/swe-env@sha256:9f4a81c2... pytest -q -p no:cacheprovider /eval_tests
```

---

## 14.2 HTTP / API 录制回放代理（Replay Proxy / VCR）设计

在 Deep Research、工单客服或动态 <a class="term-ref" href="/books/llm-eval/glossary#mcp" title="Model Context Protocol，标准化 Agent 与外部工具服务器及数据源通信的开放协议">MCP</a> 评测中，每次复测都打真实搜索引擎、天气或企业 ERP 接口会触发三重灾难：网页内容随时间漂移导致对比失效、高频并发打爆第三方 API 配额、以及每次夜间回归重复烧掉大笔外网接口账单。

工业标准解法是在沙箱出口部署<strong><a class="term-ref" href="/books/llm-eval/glossary#replay_proxy" title="截获并持久化所有外部 HTTP/API 响应、复测时按确定性键回放缓存的基础设施组件">录制回放代理（Replay Proxy / VCR）</a></strong>。其核心在于构造<strong>抗噪声的规范化请求指纹（Canonical Key）</strong>：

$$
\mathrm{Key}(r) = \mathrm{SHA256}\Big(\text{Method} \;\Vert\; \text{NormalizedURL} \;\Vert\; \text{SortedQueryParams} \;\Vert\; \text{CanonicalJSONBody}\Big)
$$

生成指纹前必须对请求头与易变参数执行确定性脱敏：剥离 `Authorization`、`Cookie`、`X-Request-Id`、`Date`、随机 `nonce` 与客户端 `User-Agent` 版本号，确保不同机器、不同时间戳发出的语义等价请求命中同一键：

```python
import hashlib, json
from urllib.parse import urlsplit, parse_qsl, urlencode

DROP_QUERY = {"timestamp", "api_key", "sig", "nonce"}

def canonical_request_key(method: str, url: str, body: bytes) -> str:
    parts = urlsplit(url)
    clean_q = sorted((k, v) for k, v in parse_qsl(parts.query) if k.lower() not in DROP_QUERY)
    norm_url = f"{parts.scheme}://{parts.netloc.lower()}{parts.path}?{urlencode(clean_q)}"
    try:
        norm_body = json.dumps(json.loads(body), sort_keys=True, separators=(",", ":"))
    except Exception:
        norm_body = body.decode("utf-8", errors="ignore").strip()
    payload = f"{method.upper()}|{norm_url}|{norm_body}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
```

配套的代理运行策略必须显式区分 <strong>Record（首次录制）</strong> 与 <strong>Strict Replay（离线复测）</strong> 两种模式：离线复测时强制锁定磁带文件 `cassette_v3.2.jsonl.zst` 的 SHA-256 哈希，且遇到未命中请求时设为 `fail_explicit`（返回确定性 404/Stub 或标记越界），严禁代理悄悄穿透到真实公网；同时磁带可按需配置 `inject_latency_ms`——纯功能回归设为 0 ms 极速跑完，做[第 15 章](/books/llm-eval/chapters/chapter-15)端到端延迟评测时再按录制期真实耗时回放。

::: tip 搜索类 Agent 遇到「新查询未命中磁带」怎么办？
对于工单查询、天气等封闭参数 API，严控 `strict_replay` 命中率通常超过 98%；但在开放式搜索（Deep Research）中，换一个新模型往往会发出录制期从未见过的新检索词。此时切忌悄悄回源公网破坏对照公平性，正确做法是双层组合：针对已知固定工具走精确 VCR 磁带，针对开放检索则将评测依赖的网页快照预索引至<strong>本地离线搜索引擎（如静态 BM25 + 向量库镜像）</strong>，既允许模型自由改写查询，又保证 100% 离线确定性。
:::

---

## 14.3 异常分桶治理铁律：`infra_error` vs `model_failure`

把 HTTP 429 限流、推理网关 502、容器 OOM 或镜像拉取超时直接当作“模型答错（0 分）”混入总分，是评测工程里最具破坏性的统计造假。某模型刚巧在云端限流高峰期跑评测，分数就会平白腰斩，且掩盖真正的能力差异。评测 Harness 必须强制落地<strong><a class="term-ref" href="/books/llm-eval/glossary#infra_vs_model_error" title="基础设施故障与模型能力失败严格分桶，严禁将系统异常按 0 分混入准确率分母">双桶隔离铁律</a></strong>：

| 归属桶 | 典型异常信号与状态码 | 是否计入模型准确率分母 | 自动化治理动作 |
| --- | --- | --- | --- |
| <strong>`infra_error`（基础设施故障）</strong> | 推理 API 429/500/502/504 重试耗尽；宿主机内存不足致容器被内核 OOMKilled；镜像拉取/调度超时；本地工具 Mock 服务崩溃；磁盘满 | <strong>严禁计入！</strong>绝不记 0 分 | 写入故障重试队列，待基础设施恢复后按幂等键自动补跑 |
| <strong>`model_failure`（模型能力失败）</strong> | 终态断言失败；答案错误；工具调用 JSON Schema 非法；连续无效重试触发步数上限；模型编写死循环脚本触发单步命令超时 | **必须计入分母**（记 0 分） | 固化完整轨迹进入[第 16 章](/books/llm-eval/chapters/chapter-16)误差分析与根因归类 |

定义整轮评测的基础设施故障率与有效通过率如下：

$$
r_{\text{infra}} = \frac{N_{\text{infra}}}{N_{\text{total}}}, \qquad
N_{\text{eff}} = N_{\text{total}} - N_{\text{infra}}, \qquad
\hat p_{\text{valid}} = \frac{N_{\text{pass}}}{N_{\text{eff}}}
$$

<strong>为什么即使踢出 `infra_error`，仍必须设立 2% 的熔断红线？</strong> 因为基础设施故障往往并非完全随机——最复杂、轮数最多、上下文最长的难题最容易撞上网关超时或内存抖动。如果 $r_{\text{infra}}$ 高达 8%，把它们简单从分母剔除就会制造严重的<strong>幸存者偏差（Survivorship Bias）</strong>，人为抬高通过率！因此生产门禁必须设定硬熔断：一旦整轮 `infra_error` 占比超过 <strong>2%</strong>（或在关键高难切片上超过 <strong>5%</strong>），整轮评测报告自动标记为 <strong>`INVALID`（作废）</strong>，禁止参与排行与上线评审。

配合**幂等断点续跑**设计，可让大规模评测既稳健又省钱：每条执行单元以复合主键 `(run_id, task_id, trial_k)` 持久化到只追加日志或 SQLite/Postgres 状态表（状态机 `PENDING → RUNNING → PASS | MODEL_FAILURE | INFRA_ERROR`）；进程中断或触发局部故障后重启，调度器只捞取 `PENDING` 与 `INFRA_ERROR` 单元补跑，已完成的轨迹绝不重复计费。所有对外发布的评测报告必须随附审计元数据块：

```json
{
  "image_digest": "sha256:9f4a81c2e7...",
  "cassette_sha256": "4e07408562be...",
  "n_total": 500, "n_eff": 497, "n_infra_error": 3,
  "infra_error_rate": 0.006, "gate_status": "VALID"
}
```

::: warning 警惕「模型诱发超时」与「基础设施超时」混淆
如果被测 Agent 在沙箱里写了一段 `while True: pass` 或跑出了内存泄漏导致单命令超时/沙箱内存打满，这属于**模型代码质量缺陷**，应通过细粒度退出码归入 `model_failure (agent_timeout / agent_oom)`，而非甩锅给 `infra_error`。唯有宿主机级故障、网络层 5xx/429、沙箱创建失败或判分基础设施异常，才允许进入 `infra_error` 桶。
:::

至此，我们已经把“尺子”（第 1–4 章）和“测试台”（第 13–14 章）都校准到了工业级精度。然而手握一张 100% 可复现的准确率榜单后，架构师仍面临最现实的商业拷问：为了 3 个百分点的准确率多付 8 倍 GPU 账单、让用户苦等一分钟，到底值不值？[第 15 章](/books/llm-eval/chapters/chapter-15)将正式把质量、成本与延迟拉上同一张帕累托谈判桌。
