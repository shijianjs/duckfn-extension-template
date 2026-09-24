<!--
AGENTS.md 模板（duckfn-extension-template 自带的那一份）：克隆模板后**只改这一节**。
把下面两个 {{...}} 填好，模板其余部分（约定与流程）不用动，它们对任何 duckfn 扩展都成立。
填完**保留**这两行的形状（不是一次性的）：以后 clone 路径或项目目标变了，还在这里改。
-->

# AGENTS.md

这是一个用 [duckfn](https://crates.io/crates/duckfn) 写的 DuckDB 扩展（loadable extension）。

## 项目事实（唯一需要人维护的一段）

- 这个扩展做什么：{{PROJECT_GOAL}}
- duckfn 仓库在本机的 clone：`{{DUCKFN_REPO}}`
- 本仓库来自 [duckfn-extension-template](https://github.com/shijianjs/duckfn-extension-template)：
  克隆后第一件事是 `just rename <新扩展名>`（见下面「扩展名与改名」）。

> 扩展名、crate 名、duckfn 版本**不要抄到这里**：
> 扩展名读 `src/extension/mod.rs` 里的 `duckfn_entrypoint!("...")`（也是 `Makefile` 的 `EXTENSION_NAME`），
> crate 名与 duckfn 版本读 `Cargo.toml`。它们本来就在代码里，复制一份只会变成第二份会过期的真相。

## 动手前先读

**`{{DUCKFN_REPO}}/templates/duckfn-conventions.md`** —— 知识源（先读哪、再读哪）、
硬约束、开发循环、新增函数的完整流程都在这份文件里。

它由 duckfn 仓库维护，本文件**只引用、不复制**，所以 duckfn 升级时不需要重做本文件，
只要 `git -C {{DUCKFN_REPO}} pull`（或 `checkout` 到对应 tag）。

本机还没有 clone 时先来一份（文档、示例扩展、sqllogictest 范例都在里面，
而且它们不会随依赖进入项目）：

```shell
git clone https://github.com/shijianjs/duckfn
```

## 升级 duckfn 时

1. 改 `Cargo.toml` 里的 duckfn 版本，`cargo update -p duckfn -p duckfn-macro`。
2. `git -C {{DUCKFN_REPO}} fetch --tags && git -C {{DUCKFN_REPO}} checkout v<新版本>`，
   让文档与示例跟依赖对齐；约定文件随这次切换一起更新。
3. 本文件不用改。

## 仓库约定

### 临时文件放到 target/

生成的临时文件（脚本、数据、日志、一次性验证代码等）一律放到 `target/` 下，
不要放在仓库根目录或其它已跟踪的目录里。`target/` 已被 git 忽略，不会污染工作区，
用完顺手删掉。

### 文本文件一律用 LF

所有新增或修改的文本文件使用 LF（`\n`）换行，不要 CRLF（`\r\n`）。

任务结束时，对本次新增的文本文件**机械地跑一遍替换命令即可，不需要先检测**
里面是否真的有 CRLF：

```powershell
# PowerShell：逐个文件把 CRLF 换成 LF（保持 UTF-8 无 BOM）
foreach ($f in @('path/to/new-file.md', 'path/to/new-script.sh')) {
    $p = Join-Path (Get-Location) $f
    $c = [IO.File]::ReadAllText($p)
    [IO.File]::WriteAllText($p, ($c -replace "`r`n", "`n"), [System.Text.UTF8Encoding]::new($false))
}
```

```bash
# Git Bash / Linux / macOS
sed -i 's/\r$//' path/to/new-file.md path/to/new-script.sh
```

> 仓库开启了 `core.autocrlf`，所以 `git diff` 偶尔会提示 "LF will be replaced by CRLF"，
> 那是检出到工作区时的行为，提交进仓库的内容始终是 LF。

### 尽量用成熟三方库实现，不要自己造轮子

写任何「通用」逻辑之前先问一句：这件事是不是已经有 crate（或 std API）在做？

- **平台差异、临时文件与随机名、文件名的合法性规则、编码、哈希、日期时间算术、序列化** ——
  这类通用问题一律先找库。已经这么做的先例见 duckfn_quantstats：`open_in_browser` 用 `open`
  （各平台的启动命令与参数引用）、临时文件用 `tempfile`（随机尾缀与撞名重试）、
  文件名的合法性用 `sanitize-filename`（非法字符、保留设备名、结尾的点与空格）。
- **能用 std 就用 std**，别自己拼底层积木：路径绝对化用 `std::path::absolute`，而不是
  `env::current_dir()?.join(path)`；日期换算不要手算 epoch，交给 duckfn 的 chrono 桥
  （`DuckDate::to_naive_date` 这类方法）。
- 手写只允许出现在**领域逻辑**上（这个扩展真正要解决的问题），或者已知的库都不合适 ——
  后者必须在这段代码的注释里写明「为什么不用库」，例如判断一个路径能不能交给浏览器，
  看的是字面上的 `://` 而不是引一个 URL 解析库（Windows 的 `C:\…` 在 URL 语法里同样是 scheme）。
- 依赖不是免费的：引入 crate 时在 `Cargo.toml` 里写一句它负责什么、为什么选它，让取舍一眼看得出来；
  只服务某个平台的依赖挂到 target 专属依赖表下
  （见 duckfn_quantstats 的 `[target.'cfg(not(target_arch = "wasm32"))'.dependencies]`），别让别的目标
  替它付编译成本 —— 有时这甚至是硬要求（`open` 没有 emscripten 的实现，编到 wasm 直接失败）。
- 自查标准：一个「通用」函数如果在 crates.io 上能查到现成实现，它就需要一个留下来的理由。

### 扩展名与改名

扩展名必须**全小写、只含下划线与数字**，并且处处一致 —— 它是入口点符号名，也是产物文件名，
DuckDB 按文件名找符号，对不上 `LOAD` 就直接失败。五个地方：`Cargo.toml`（`[package] name` 与
`[[example]] name`）、`Makefile` 的 `EXTENSION_NAME`、`src/extension/mod.rs` 的
`duckfn_entrypoint!`、`Justfile` 的 `extension_name`、CI 工作流的 `extension_name`。

**不要手改**：跑 `just rename <新扩展名>`（`scripts/rename.sh`），它一次改齐上面五处以及文档与
README 里出现的路径示例，并把 `Cargo.lock` 按新包名重写；脚本末尾会打印还需要人工过一遍的清单。

### 注册到 DuckDB 的函数名统一加短前缀

凡是出现在 SQL 里的名字都加同一个前缀：标量函数、聚合函数、表函数、COPY 格式、cast、SQL 宏、
replacement scan。模板里这个前缀是 `my_`。

社区扩展几乎都不把包名/扩展名写进函数名（见
<https://duckdb.org/community_extensions/list_of_extensions>）：`my_extension_greet` 这样的全名在每个
调用点上都是纯噪声，而 `my_` 短到可以忽略，又足以在 `duckdb_functions()` 里按前缀检索。
**前缀只是命名空间，不再是扩展名的缩写** —— 不要因为扩展名变了就跟着改。

前缀之后的部分要能读懂，不要拿缩写堆砌。示例里的名字各只有一个签名：

```text
my_greet(name)
my_sum(value)
```

`rename` 脚本不动函数名（那是你的域代码）：换完扩展名顺手把示例函数与 `test/sql/*.test` 一起改成
你的 API，前缀也在这里一并定下来。

duckfn 的属性宏默认拿 **Rust 函数名**当注册名，所以直接把函数定义成 `fn my_xxx(...)` 即可。
宏还会为每个签名生成 `SQL_NAME` 常量：同一个名字要在多处出现（错误信息前缀、日志）时读它，
不要再抄一份字面量。代价是这类函数得写成 `pub(super)`，因为生成的模块沿用函数的可见性。
`overloads_name` 能把「同一名字下按参数个数/类型分派」的多个签名并成一个函数集，需要时再用
（见 duckfn 的文档）。

### 文档站（docs/）

`docs/` 是一份 Docusaurus 站点（英文 + 简体中文），**不是必须的**：不用就整个目录删掉，仓库里只有两处
引用它 —— `.github/workflows/DeployDocs.yml` 与 Justfile 的 `docs_*` recipe —— 一起删掉即可。

维护约定（目录、命令、翻译流程、部署、版本占位符）见 [`docs/README.md`](docs/README.md)。两条容易踩的：

- 正文里**不要手写版本号**：写 `{{EXTENSION_VERSION}}`（放在围栏代码块或行内代码里），构建期从
  `docs/extension-version.ts` 替换。那个文件由 `just release_bump` 更新，是文档站版本号的唯一来源。
- 译文要在 `docs/i18n/zh-Hans/docusaurus-plugin-content-docs/current/` 下按**同样的相对路径**放一份全文，
  `id` / `slug` / `sidebar_position` 与英文页保持一致，页内链接用相对文件路径（写 `/docs/…` 会把中文页
  送到英文页）。

### 社区扩展注册

`community-extension/` 是向 [duckdb/community-extensions](https://github.com/duckdb/community-extensions)
提 PR 的暂存处，不参与扩展运行。字段依据与提交流程见
[`community-extension/AGENTS.md`](community-extension/AGENTS.md)。

## 发版流程

发版命令都在 `Justfile` 里（`just --list` 可查），实际逻辑在 `scripts/release.sh`。
放进脚本而不是直接写进 Justfile，是因为 just 的 shebang recipe 在 Windows 上需要 `cygpath`
翻译解释器路径，而 Git Bash 并不提供它。

版本号形如 `X.Y.Z`（例如 `0.1.0`）。一次完整的发版 =
提升版本号 → 提交并打 tag → 等 CI 产出 GitHub Release → 切回下一开发版本。

**本项目不发 crates.io。** 它是 DuckDB 的 loadable extension，分发靠 GitHub Release 上的
`.duckdb_extension` 文件（`LOAD` 一个文件即用），所以 duckfn 流程里的发布 crate 那一步
在这里不存在。

只有**正式版本**才打 tag；`0.1.1-dev.0` 这类预发布版本留在分支上，不打 tag、不发布。

### 命令速查

| 步骤 | 命令 |
| --- | --- |
| 0. 前置检查 | `just release_check`（需要时再 `just test`） |
| 1. 提升版本号 | `just release_bump 0.1.0` |
| 2. 提交并打 tag | `git commit …` 后 `just release_tag 0.1.0` |
| 3. 查看 CI | `just release_ci` |
| 4. 切开发版本 | `just release_dev 0.1.1-dev.0` |

### 0. 前置检查

```bash
just release_check   # lint（clippy --all-targets -- -D warnings）+ cargo build --all-targets
just test            # 需要时（等价 make configure debug test，make 部分要在 Git Bash 里跑）
```

有 warning 先修好再提交。确认 `git status` 干净、`main` 已与远程同步。

### 1. 提升版本号

```bash
just release_bump 0.1.0
```

脚本做三件事，并打印每个被改动的文件：

- **Cargo.toml**：`[package]` 段的 `version` 从项目当前版本改成新版本。**只改这一行**，不做整份文件的
  全局替换 —— 本文件里还写着依赖需求（`duckfn = "0.0.10"` 这类），全局替换会把它一起改掉。
- **文档 / README / CI 注释 / Justfile 示例**：取**最近一次 tag** 的版本改成新版本，文件由 `git grep`
  自动找出，不需要维护清单；排除 `Cargo.toml`、`Cargo.lock`、`AGENTS.md`、`scripts/`、`test/`。
  其中 `test/` 是必须排掉的：那里的版本号是断言的期望值，与本项目的版本号无关。
  `community-extension/description.yml` 里的 `version` **会**被一起改（它就该跟发布版本走），
  但 `repo.ref` 那个提交 SHA 仍然要人工更新（见 community-extension/AGENTS.md）。
- `cargo update -p <扩展名>` 同步 `Cargo.lock`；然后回读 `Cargo.toml` 的 `[package] version` 确认改写
  生效，并在**刚改过的那些文件**里核对旧版本号残留（应当为空）。

还没有任何版本 tag 时（首次发版），文档那一步整体跳过：没有「上一个版本」可以替换。

### 2. 提交并打 tag

```bash
git add -A
git commit -m "chore(release): 发布 v0.1.0" -m "- 版本号 0.1.1-dev.0 -> 0.1.0"
just release_tag 0.1.0     # 打 tag v0.1.0，推送 main 与 tag
```

`release_tag` 先检查工作区是否干净，再核对 `Cargo.toml` 的 `[package] version` 与 tag 一致 ——
扩展二进制里的版本号（`cargo duckdb-ext build` 打印的 `Packing Extension Version`）是构建时由 cargo
写进去的，对不上就会发出一个自称别的版本的 Release。

推送 tag 触发 `.github/workflows/MainDistributionPipeline.yml`：为各平台构建扩展并跑测试，然后为该 tag
创建（或更新）GitHub Release，把构建出的 `.duckdb_extension` 全部挂上去。推 main 本身不构建。

同一个 tag 还会触发 `.github/workflows/DeployDocs.yml`，把 `docs/` 里的文档站构建后发布到 GitHub Pages
（需要先在仓库 Settings → Pages → Build and deployment → Source 里选 **GitHub Actions**，一次性设置）。
不需要文档站就把那个工作流与 `docs/` 一起删掉。

### 3. 等 CI 全绿

```bash
just release_ci            # gh run list --limit 5
gh run watch <run-id>
```

失败就修到成功为止。若已推送的 tag 需要重发（修复后重新指向新的提交）：

```bash
git push origin --delete v0.1.0   # 删除远程 tag
git tag -f v0.1.0                 # 本地 tag 指向修复后的提交
git push origin v0.1.0            # 重新推送
```

> 删除 / 移动已发布的 tag 会影响已有的 GitHub Release，谨慎操作。

网络报错（`schannel: failed to receive handshake`、`SSL connect error` 之类）是**间歇性**的，原样重试
一两次即可，**不要擅自更改网络 / 代理设置**：本机 git 是全局配了代理的，`github.com` 不走代理基本用
不了，动了它反而让 `release_tag` 的推送直接失败。

### 4. 切到下一开发版本

```bash
just release_dev 0.1.1-dev.0
```

这一步只动 `Cargo.toml` 与 `Cargo.lock`：文档与 README 里的示例始终指向最新**已发布**版本，
不打 tag、不发布。

## 相关文档

- [`DEVELOPMENT.zh.md`](DEVELOPMENT.zh.md)（[英文](DEVELOPMENT.md)）：目录结构、骨架取舍、构建与测试。
- [`docs/README.md`](docs/README.md)：文档站的布局、命令、翻译流程与部署。
- [`README.zh.md`](README.zh.md)（[英文](README.md)）：SQL 接口与使用说明。
- [`scripts/release.sh`](scripts/release.sh) 与 [`scripts/rename.sh`](scripts/rename.sh)：
  `release_bump` / `release_dev` / `release_tag` 与改名的实际实现。
- [`.github/workflows/MainDistributionPipeline.yml`](.github/workflows/MainDistributionPipeline.yml)：
  构建矩阵、触发面与 Release 发布。
- [`community-extension/AGENTS.md`](community-extension/AGENTS.md)：社区扩展注册（上游 `description.yml` 的
  草稿、字段依据、提交 PR 的步骤）。
