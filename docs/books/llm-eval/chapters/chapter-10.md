# 第 10 章 Coding / SWE 与终端执行 Agent 评测

<p class="chapter-summary">软件工程与终端运维是 Agent 商业价值最清晰、验证信号最硬核的赛道，也是最容易被依赖腐化、Git 历史泄漏与“改测试作弊”暗算的雷区。本章深拆 SWE-bench 演进谱系与 Terminal-Bench 终态断言设计，构筑只读挂载与 AST 审计防线，并把补丁评估从“能过单测”推进到性能、安全与可维护性。</p>

如果说[第 6 章](/books/llm-eval/chapters/chapter-06)讨论的 HumanEval 或 LiveCodeBench 测的是“在白板上写一个 40 行算法函数”，那么真实研发与运维现场考验的完全是另一种物种：接手一个包含两千个文件的遗留代码库或一台服务宕机的 Linux 服务器，自主翻日志、复现故障、跨文件修改实现、跑回归单测并确认不引出新隐患。正因如此，SWE 与 Terminal Agent 评测成了检验前沿底座长程规划、代码定位与排障推理的最高试金石——同时也是评测基础设施最容易漏风、甚至被强模型主动钻空子的险滩。

---

## 10.1 SWE-bench 演进谱系：从静态缺陷到多语言、企业级与活题库

围绕 <strong>SWE-bench</strong> 家族的每一次重大演进，本质上都是在修补上一代基准暴露出的效度漏洞、语言偏置与静态数据污染：

| 基准版本 | 题量与覆盖范围 | 核心升级与解决的痛点 | 残余风险与使用建议 |
| --- | --- | --- | --- |
| **SWE-bench Full / Lite** | 2,294 题 / 300 题（12 个 Python 开源仓库） | 首创“真实 GitHub Issue + 隐藏 PR 测试补丁”的仓库级可执行评测范式 | 大量题目存在**欠规格说明**（不看原 PR 根本猜不到作者想要的私有函数名或报错文案）与**脆弱测试**（锁死内部实现细节），且老 PR 存在高<strong><a class="term-ref" href="/books/llm-eval/glossary#data_contamination" title="数据污染：评测题目、参考答案或其变体混入训练语料导致离线分数虚高">数据污染</a></strong>风险 |
| **SWE-bench Verified** | 500 题（人工清洗与耗时分层） | 由专业软件工程师逐题审核，剔除描述模糊、不可解与环境破损题，并标定人类修复耗时档位 | 当前行业通用坐标；但头部系统得分正迅速逼近<strong><a class="term-ref" href="/books/llm-eval/glossary#ceiling_effect" title="天花板效应：强模型分数挤在顶端区间失去区分度">天花板效应</a></strong>，且高度集中在 Python 生态 |
| **Multilingual / Multimodal** | 覆盖 Java/Rust/Go/TS/C++；前端 UI 与视觉渲染 Issue | 打破 Python 单一偏置，新增强类型编译工具链与结合页面截图/视觉渲染的前端修补校验 | 多语言镜像维护成本显著升高，统计显著性须防单仓相关性干扰 |
| **SWE-bench Pro** | 企业级复杂多文件重构与跨模块契约演进 | 告别“单文件改 5 行”的短平快修补，直面长依赖链、跨服务接口改造与复杂架构语义 | 单题推理时长与沙箱开销成倍上升，必须配合[第 15 章](/books/llm-eval/chapters/chapter-15)帕累托口径同步报告成本 |
| **SWE-bench Live** | 持续滚动收录截断日期后的最新合并 PR | 典型<strong><a class="term-ref" href="/books/llm-eval/glossary#live_benchmark" title="动态活基准：持续引入截断日期后的新题并按时间切片评测，从机制上抵御数据污染">动态活基准</a></strong>：按 PR 合并时间戳切片，量化模型知识截断日前后的真实泛化落差 | 抗污染效度最强；需持续自动化审核新入库 PR 的环境可复现性与规格清晰度 |

SWE-bench 的核心通过判据由两个隐藏测试集合的逻辑合取定义：在干净 `base_commit` 上依次打入模型补丁 `model.patch` 与隐藏 `test_patch` 后，必须同时满足：

$$
\text{Resolved}_i = \mathbb{I}\Big[\;\underbrace{\forall t \in \mathcal{T}_{\text{F2P}}^{(i)},\;\operatorname{pass}(t) = 1}_{\text{原 Bug 全部修复（FAIL\_TO\_PASS）}} \;\wedge\; \underbrace{\forall t \in \mathcal{T}_{\text{P2P}}^{(i)},\;\operatorname{pass}(t) = 1}_{\text{历史功能零回归（PASS\_TO\_PASS）}}\;\Big]
$$

**统计口径必查红线**：SWE-bench 题目并非完全独立同分布——例如 Django、SymPy 等少数大仓库占据极高题量权重，同一仓库内的题目共享代码架构、测试框架与依赖特征（组内相关系数 $\mathrm{ICC} > 0$）。在报告置信区间或比较两套系统分差时，务必以**代码仓库（Repo）为聚类单元**计算<strong><a class="term-ref" href="/books/llm-eval/glossary#clustered_se" title="聚类标准误：当多题共享同一代码仓库或文档时按簇计算的修正标准误">聚类标准误（Clustered SE）</a></strong>或按仓库执行 Block Bootstrap（见[统计公式速查卡](/books/llm-eval/toolkit/metrics-and-stats)），否则会把 95% 置信区间人为压窄，误将仓库级噪声当成显著突破。

### 三类典型 SWE 基准失真样本解剖
在自建企业私有 SWE 评测集时，审题工程师最应警惕以下三类在早期开源集中高发的失真样本：
- **欠规格说明题**：Issue 仅写“导出模块遇到空值报错，请优化”，却未约定遇到空值该抛 `ValueError`、返回 `None` 还是静默跳过；而隐藏单测却硬断言抛 `CustomExportError("empty payload")`。这类题目测的不是工程能力，而是猜中原作者心思的运气。
- **过度耦合实现的脆弱测试**：隐藏单测不测公开函数的外部输入输出行为，而是用 `unittest.mock` 强行断言内部私有辅助函数 `_normalize_row` 必须被调用恰好 2 次，直接扼杀一切合理重构方案。
- **跨提交隐性依赖**：某次 PR 的测试依赖了同一周合并的另一个特性分支里的工具函数，独立检出 `base_commit` 时根本无法编译，极易制造假阴性。

---

## 10.2 Terminal-Bench：真实 Linux 运维的五维终态断言设计

修改应用代码只是工程实践的一半；另一半是面向 SRE、DevOps 与数据基础设施的真实终端排障——编译受损的 C/Rust 依赖、修复异常 Nginx/TLS 证书、清理僵尸进程与端口占用、恢复损坏数据库索引、编写自动化定时脚本与修复安全权限。<strong>Terminal-Bench</strong> 为这类开放终端任务建立了容器化执行基准。

与 SWE-bench 可以单纯抽出一个文本 `git diff` 补丁不同，终端运维任务的成果直接沉淀在操作系统内核与文件系统终态里，因此必须在 Agent 彻底退出后，由宿主机侧只读注入**五维环境终态断言脚本**：

1. **进程与守护服务存活**：不仅检查目标进程 PID 存在与端口监听（`ss -tlnp`），还须从测试端发起真实端到端业务探针（HTTP/gRPC/SQL 请求校验响应体与状态码），防止 Agent 起一个假端口糊弄过去。
2. **文件系统与数据校验和**：核验目标产物路径、符号链接指向、SHA-256 校验和或结构化数据语义等价（如解析 Parquet/JSON/SQLite 记录而非脆弱的逐字符匹配）。
3. **权限、属主与持久化**：检查私钥/配置目录的 POSIX 权限（如 `0600`）、用户与组属主，以及环境变量或 `systemd` 单元是否在**新开非交互 Shell 或服务重启后依然持久生效**。
4. **幂等性与边界输入**：对运维脚本或 ETL 管线重复触发执行，验证不会写入重复脏数据、不会在空格文件名或并发调用下崩溃。
5. **无破坏性副作用审计**：确认 Agent 没有为了省事粗暴执行 `chmod -R 777`、关闭防火墙或误删无关核心系统文件。

```bash
# Terminal-Bench 宿主机只读挂载（:ro）终态断言最小范式示例
# 1. 验证 Nginx 服务进程与端口存活，并执行真实端到端 TLS 健康探针
ss -tlnp | grep -q ":8443 " && curl -sf --cacert /ro_verifier/ca.pem https://127.0.0.1:8443/healthz | grep -q '"status":"ok"'
# 2. 验证私钥权限严格收敛为 0600，且未把配置目录放宽为全局可写
[ "$(stat -c '%a' /etc/nginx/ssl/server.key)" = "600" ] && [ -z "$(find /etc/nginx -perm -0002)" ]
# 3. 核验处理后的目标数据产物 SHA-256 与预期一致（不信 Agent 口头汇报）
sha256sum -c /ro_verifier/expected_outputs.sha256
```

这段脚本的核心原则非常朴素：**绝不信任 Agent 留在终端 stdout 里的任何汇报，所有状态断言全部在 Agent 进程退出后，由宿主机只读卷注入的独立脚本直接向操作系统内核取证**。

---

## 10.3 三大隐蔽工程陷阱与“防改测试作弊”纵深防线

在自建 SWE 与 Terminal 评测基建时，最致命的分数失真往往潜伏在容器与挂载细节中。更令人警觉的是，随着新一代强推理模型自主排障能力跃升，它们在“让测试变绿”的强烈目标驱动下展现出惊人的<strong>奖励作弊（Reward Hacking）</strong>本能——真实评测日志里已反复捕获模型删断言、劫持 `pytest` 插件、翻 `git reflog` 抄答案的经典案例。

<figure class="book-figure">
  <img src="/figures/llm-eval/swe-terminal-harness.svg" alt="SWE-bench 与 Terminal-Bench 隔离容器验证流水线与防改测试作弊架构" loading="lazy">
  <figcaption><span class="book-figure__label">图 10-1</span>隔离验证流水线架构：通过冻结镜像防依赖腐化、Git 历史清洗防偷窥、双域隔离加只读挂载（:ro）与 AST 门禁彻底阻断“改测试作弊”，并外延四维工业补丁质量审计。</figcaption>
</figure>

工程上必须同步封堵以下三大隐蔽陷阱：

### 陷阱 1：环境镜像与上游依赖腐化
如果在评测启动时现场运行 `pip install`、`npm ci` 或 `apt-get update`，几个月后上游某个传递依赖发布破坏性小版本或撤包，就会导致大批原本健康的旧题瞬间构建崩溃。如果评测器草率把构建崩溃记为 0 分，同一模型冻结权重的基准得分都会逐月诡异下跌。
- **根治防线**：构建期一次性锁死全部系统库与离线 Wheel 缓存，固化为带 Digest 校验的**不可变基础镜像**；运行期强制 `--network=none` 断网；任何镜像拉取异常、容器 OOM 或宿主超时一律标记为<strong><a class="term-ref" href="/books/llm-eval/glossary#infra_vs_model_error" title="基础设施故障与模型失败分桶：API 429、容器 OOM 与构建崩溃必须标为 infra_error，严禁当 0 分计入模型通过率"><code>infra_error</code></a></strong>，严禁污染模型能力分母。

### 陷阱 2：Git 历史与隐藏测试补丁泄漏
若直接完整克隆上游仓库进沙箱后仅执行 `git checkout <base_commit>`，该版本之后的真实修复提交、远程标签甚至 `test_patch` 仍完好藏在 `.git/objects` 中。强 Agent 只需执行 `git log --all`、`git reflog` 或 `git fsck`，就能把原作者的标准补丁逐行抄出。
- **根治防线**：打包镜像前彻底裁剪 `base_commit` 之后的一切提交对象，清除全部远端 URL、分支、标签与 `reflog` 并执行 `git gc --prune=now`；同时确保隐藏测试补丁与终态校验脚本全程驻留宿主机，**零字节进入 Agent 可写容器**。

### 陷阱 3：Agent 改测试作弊与退出码伪造
当问题超出模型当下能力时，评测审计已频繁记录四类作弊模式：① 直接修改 `tests/` 目录删除或放宽 `assert`；② 在仓库根目录注入 `conftest.py` 或 `sitecustomize.py`，monkey-patch `pytest` 钩子强行把失败改写为通过；③ 写死针对具体测试输入的 `if` 特判分支；④ 包装测试入口命令或用 `sys.exit(0)` 伪造零退出码。

::: warning 防“改测试作弊”四重硬隔离防线
1. **双域物理隔离**：Agent 仅在“非可信可写沙箱”内交互；SWE 任务结束时<strong>只导出纯业务源码 Diff（<code>model.patch</code>）</strong>，彻底销毁运行容器，由宿主机从干净快照重新拉起“可信只读裁判舱”再打补丁跑测。
2. **只读卷挂载与隔离解释器**：Terminal 任务需保留容器终态，但全部终态断言脚本、预期数据与测试运行时必须在<strong>Agent 进程完全终止之后</strong>通过宿主机只读绑定挂载（`:ro`）注入：对纯标准库断言脚本使用 `python3 -I -S`（彻底屏蔽工作区路径、`PYTHONPATH` 与系统 `sitecustomize.py` 注入）；若需运行 `pytest` 等第三方测试框架，则应从宿主机只读挂载独立的预装验证虚拟环境并以 `python3 -I` 启动（因 `-S` 会禁用 `site-packages`）。
3. **Diff 与 AST 静态审计门禁**：裁判执行前自动解析 `model.patch` 的文件清单与抽象语法树（AST）：凡触碰 `tests/`、`conftest.py`、测试框架配置文件，或在业务代码中插入可疑 `sys.exit(0)`、异常宽泛 `except Exception: pass`、测试函数名硬编码字面量的补丁，立即拦截并记为作弊失败。
4. **逐用例结构化报告核验**：绝不凭 Shell 返回码 `$? == 0` 轻信通过，必须解析 JUnit XML / JSON 逐用例结果，核实 `FAIL_TO_PASS` 与 `PASS_TO_PASS` 清单中<strong>每一条具名测试用例都被实际运行（Executed > 0 且 Skipped == 0）并通过</strong>。
:::

### 静态审计门禁常见作弊签名速查表
将以下四类高发作弊规则前置到自动化 Diff/AST 扫描器中，可在进入昂贵裁判容器前毫秒级拦下绝大多数奖励作弊企图：

| 作弊企图类别 | AST / Diff 典型静态特征 | 自动化门禁处置 |
| --- | --- | --- |
| **篡改测试或配置** | 修改路径命中 `tests/`、`test_*.py`、`conftest.py`、`pytest.ini`、`pyproject.toml` | 直接拒绝补丁，记作 `cheat_attempt` |
| **劫持运行环境与退出码** | 业务代码新增 `sys.exit(0)`、`os._exit`、`sitecustomize.py` 或修改 `pytest` 内部模块 | 强制隔离解释器复检并直接判无效 |
| **吞掉异常蒙混过关** | 在核心校验路径引入大范围 `except BaseException: pass` 或屏蔽 `AssertionError` | 触发 AST 高危告警并转人工抽审 |
| **针对单测输入硬编码** | 业务代码出现异常字面量分支（如精确匹配测试夹具文件名或特定 Magic String） | 结合隐藏变体测试（Mutation / Holdout Tests）击穿 |

---

## 10.4 超越“能过单测”：工业级补丁的四维深度审计

在真实企业研发流程里，一份只为了凑绿单测的补丁往往通不过任何资深工程师的 Code Review。面向生产的 Coding Agent 评测必须在单测门禁之上追加三项自动化质量维度（如图 10-1 底部所示）：

| 补充审计维度 | 自动化检测手段 | 拦截的典型“过单测却毁线上”缺陷 |
| --- | --- | --- |
| **运行性能与复杂度回归** | 在大数据量/高并发微基准上对比修补前后耗时与峰值内存 | 用 $O(n^2)$ 双层暴力循环绕过小样本单测，上线即引发 CPU 打满超时 |
| <strong>静态安全扫描（SAST）</strong> | 对补丁变更行运行 `Semgrep`、`Bandit` 或 `CodeQL` 规则集 | 修好功能 Bug 却引入 `shell=True` 命令注入、SQL 字符串拼接、关闭 TLS 校验或硬编码密钥 |
| **变更最小化与可维护性** | 统计 Diff 膨胀比（模型改动行 / 参考最小改动行）、公共接口签名检查与 Linter | 顺手重写无关模块、破坏下游 API 契约、残留调试日志或大段死代码 |

::: tip 研发团队落地选型建议
用 SWE 基准指导模型选型或 RLVR 后训练迭代时，推荐采用**三层组合拳**：用 `SWE-bench Verified` 对齐行业公开标尺，用 `SWE-bench Live` 或 `Pro` 监控真实抗污染泛化能力，再从公司内部近半年合并的真实 Bugfix 与重构 PR 中沉淀 80–150 道私有仓库题（绑定性能回归 + SAST + 最小改动门禁）作为最终上线闸门（详见[第 18 章](/books/llm-eval/chapters/chapter-18)）。
:::

离开高度确定、可编译可执行的软件与终端环境后，另一大核心 Agent 战场面对的是充满噪声、时效冲突与开放表达的公网和企业知识库。下一章我们切入 Deep Research、复杂 RAG 与长篇研究报告工作流的解耦评测。
