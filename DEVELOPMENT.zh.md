[English](DEVELOPMENT.md) | [简体中文](DEVELOPMENT.zh.md)

# my_extension —— 开发笔记

用户文档在 [README.zh.md](README.zh.md)：SQL 接口、安装加载与快速上手都在那边。
本文件收的是使用方不需要的内容 —— 代码怎么分层、为什么长成现在这样、哪个 crate 负责哪一段、
以及怎么构建与测试。

duckfn 自身的通用约定（入口链路、新增函数的流程、动手前该查哪份源码）在这里**不重复**：
它们在 [AGENTS.md](AGENTS.md) 里，由它指向 duckfn clone 里的 `templates/duckfn-conventions.md`。

本仓库是 [duckfn-extension-template](https://github.com/shijianjs/duckfn-extension-template)，
从 DuckDB 官方 [extension-template-rs](https://github.com/duckdb/extension-template-rs) 起步，
并已按 duckfn 的骨架约定改造（入口模块、`EXTENSION_NAME`、依赖列表），外加一套完整的发版链路。

## 目录结构

```text
src/lib.rs            原生 crate root  ->  mod extension;
src/wasm_lib.rs       wasm crate root  ->  mod extension;   （同一组 mod，镜像）
src/extension/mod.rs  ->  duckfn_entrypoint!("my_extension");
src/bin/duckfn.rs     duckfn CLI 入口  ->  #[path] mod extension; + duckfn::cli::run(...)
                      （只服务 `just docs_csv` 导出函数描述 CSV，不参与插件运行）

src/extension/functions/mod.rs  ->  mod aggregate_sum; mod scalar_greet;
src/extension/functions/
    scalar_greet.rs     my_greet / my_greet_checked （两种标量返回形状）
    aggregate_sum.rs    my_sum                      （聚合状态 + 输出语义）
src/extension/types/mod.rs
                        目前是空的占位：自定义类型（STRUCT / ENUM / list<struct> 行类型 /
                        DuckLazy 参数的配置类型）都放这一层，用到了再往里挂 `mod`

test/sql/               每一个示例函数一份 .test，外加一份 my_extension.test 冒烟
scripts/release.sh      发版（bump / tag / dev）
scripts/rename.sh       克隆后改扩展名
Justfile                日常迭代与发版的快捷入口
AGENTS.md               约定 + 发版流程 + duckfn 知识地图
docs/                   文档站（Docusaurus，中英双语）—— 不需要可整个删掉
community-extension/    社区扩展注册的两份文件与流程说明
```

扩展名 `my_extension` 必须与 `Makefile` 的 `EXTENSION_NAME`、`Cargo.toml` 的 `[package] name` 与
`[[example]] name`、`Justfile` 的 `extension_name`、CI 的 `extension_name` 一致；改名字跑
`scripts/rename.sh`，别手改（见 AGENTS.md 的「扩展名与改名」）。

## 骨架取舍

### 两个 crate root 声明同一组 mod

官方模板的写法是 `src/lib.rs` 里 `mod lib;`、`src/wasm_lib.rs` 里再 `mod lib;` 地转发。模块一嵌套，
两条路径对不上，直接 `error[E0583]: file not found for module ...`。

这里让两个 crate root 都只写 `mod extension;`，由 `extension/mod.rs` 往下挂子模块：路径只有一份，
嵌套多少层都一样，新增模块时也只需要动 `extension/mod.rs`（以及各层的 `mod.rs`）。

### `src/bin/duckfn.rs`：为什么用 `#[path]` 把插件再编一遍

`#[duck_*]` 的文档元数据靠 `inventory` 的静态构造器收集，**只有真正被链接进最终二进制的目标文件
才会生效**。bin 里写 `use my_extension::...` 时，链接器可能因为没人引用那些模块而把它们整块丢掉，
导出的 CSV 会静默变空（不报错，只是没内容）。

所以 bin 用 `#[path = "../extension/mod.rs"] mod extension;` 自己把同一份源码编一遍，注册项就落在
本 crate 里。这也是 duckfn 骨架里 `src/bin/duckfn.rs` 的标准写法。整个 bin 只服务
`just docs_csv`，不参与插件运行。

### 一个函数一个文件，前缀是命名空间

`functions/` 下按「类别 + 做什么」命名文件（`scalar_greet.rs`、`aggregate_sum.rs`）。功能长大之后
再像 duckfn 示例那样拆成子目录（`functions/<功能>/mod.rs` + 各司其职的文件）。

注册名统一加短前缀（模板里是 `my_`），理由见 AGENTS.md：社区扩展几乎都不把包名写进函数名，
而前缀足够短、又能在 `duckdb_functions()` 里按前缀检索。

### 三种标量返回形状

宏按返回类型生成不同的收尾代码，模板里写了前两种：

| 签名 | 语义 |
| --- | --- |
| `-> T` | 朴素值，永不为 NULL |
| `-> DuckOptionResult<T>` | 可空 + 可报错：`Ok(None)` 是 SQL NULL，`Err` 让查询失败 |
| `-> Option<T>` | 可空、但报不了错（模板里没写，照着改即可） |

入参的可空性是另一条轴：参数写 `T` 时 NULL 行被读取层短路（函数体不执行），写 `Option<T>` 时 NULL 以
`None` 进函数体、语义由你决定。标量与聚合都是这条规则。

### 聚合状态

聚合函数的签名 = 逐行输入 + 一个 `&mut 状态`（位置随意）。状态要 `Default + Clone + Debug`
（宏生成的包装结构体 derive 了它们），并实现 `DuckAggregateState`：

- `combine` / `simple_combine`：合并两个状态（多线程与 group 归并都走它）；
- `result` / `simple_result`：状态出结果。只在 `simple_result` 里返回一个值时，结果永不为 NULL；
  空组要回 NULL 就得覆盖 `result` 返回 `Ok(None)` —— `sum.rs` 里的 `SumState` 正是这么做的，
  它多记一个「读到过几行」来区分「空输入」与「和为 0」。

`Output` 决定 SQL 返回类型，可以是 `i64` / `f64` / `String` / `Vec<...>`（即 `list<...>`）等。

### `types/` 是留给你的槽

模板的两个示例函数不需要自定义类型，所以 `types/mod.rs` 目前只有注释。真正要放进去的东西是三类：

- `#[duck_struct]` / `#[duck_enum]` 定义、并在加载时注册进 DuckDB 的命名类型；
- 用 `list<struct<...>>` 当返回值时的行类型（`#[derive(DuckStruct)]` 的普通 Rust 结构体）；
- 给 `DuckLazy` 参数用的配置 STRUCT（函数内部只解析一次的那种）。

不需要就整个目录删掉（同时删掉 `extension/mod.rs` 里的 `mod types;`）。

### 模板有意没写的东西

模板只演示**注册链路**与**工程闭环**，下面这些都不在里面 —— 用到了照 duckfn 文档与示例扩展写，
不要凭印象：

- 表函数 / COPY / cast / replacement scan / SQL 宏（属性宏各有一个，见 duckfn 的
  `docs/docs/guide/` 与示例扩展 `src/extension/`）；
- `DuckLazy<T>` 参数（「配置只解析一次」）、命名类型、`list<struct>` 返回值；
- `overloads_name`（同名多签名并成一个函数集）；
- DuckDB 的宿主文件系统（`duckfn::duck_vfs`，落盘读写）、与 chrono / uuid / rust_decimal 的互转；
- 平台相关的依赖（`[target.'cfg(...)'.dependencies]` 的写法见 AGENTS.md 的取舍一节）。

## 依赖

- [duckfn](https://crates.io/crates/duckfn)：属性宏，把普通 Rust 函数注册成 DuckDB 函数。开了两个
  feature：`duckdb-1-5`（DuckDB 1.5 才进 C API 的能力，宿主文件系统在它下面）与 `cli`
  （`src/bin/duckfn.rs` 用的命令行工具，给 duckfn 带上 clap 与 csv）。属性宏还会为每个签名生成
  `SQL_NAME` 常量；属性上的 `description` / `comment` / `example` 则是函数描述 CSV 的唯一来源（见下）。
- [quack-rs](https://crates.io/crates/quack-rs)：DuckDB C API 绑定，`duckfn_entrypoint!` 展开出的代码
  直接引用它。
- [libduckdb-sys](https://crates.io/crates/libduckdb-sys)：只取头文件，开启 `loadable-extension`，
  因此**不需要在本地编译 DuckDB**。版本下限 `>=1.10500`（= DuckDB 1.5.0：这个 crate 把 DuckDB 版本
  编码成 `1.<major*10000 + minor*100 + patch>.0`，1.5.5 就是 `1.10505.0`）。

示例函数没有用到别的依赖。要做时间/日期相关的功能，再打开 duckfn 的 `chrono` feature 并把 `chrono`
加成依赖（duckfn 不 re-export 它）；Cargo.toml 末尾有写好的两行例子。

## 构建

日常迭代用 `cargo-duckdb-ext-tools`（全局 cargo 子命令，不给项目加依赖）：

```shell
cargo install cargo-duckdb-ext-tools   # 只需安装一次
cargo duckdb-ext build                 # -> target/debug/my_extension.duckdb_extension
```

官方模板那条 `make` 流程仍然保留（CI 与 sqllogictest 走它），首次需要 `make configure` 建 Python venv：

```shell
make configure   # 只做一次
make debug       # -> build/debug/extension/my_extension/my_extension.duckdb_extension
```

`make release` 是带优化的同一套流程。Windows 上 `make` 需要在 Git Bash 里跑。

仓库根目录的 `Justfile` 把两者都包了一层：`just build`、`just sql "SELECT …"`、`just repl`、
`just test`、`just lint`、`just build_wasm`、`just docs_csv`、`just docs_build`。

有一条容易踩的坑：**产物文件名必须是 `<扩展名>.duckdb_extension`**。DuckDB 是按文件名去找入口点符号
的，改个名字（比如从 `my_extension.duckdb_extension` 改成 `win.duckdb_extension`）就会报
`did not contain function "my_extension_init_c_api"` —— 那不是产物坏了。

## 函数描述（社区扩展文档页）

DuckDB 的 C 扩展 API **没有**设置函数描述与示例的接口：`duckdb_scalar_function_set_name`、
`_set_return_type`、`_set_varargs`、`_set_volatile`…… 就到这儿，没有 `_set_description`，
也没有 `_add_example`。所以社区扩展页上那张 `Added Functions` 表要是没人帮忙，就只是一列光秃秃的
函数名。

这份文本紧挨着被描述的函数，写在 `#[duck_*]` 属性上（示例见 `functions/scalar_greet.rs` 与
`aggregate_sum.rs`）：

```rust
#[duck_scalar_function(
    description = "Greets someone by name, the simplest possible scalar function",
    comment = "…",
    example = "SELECT my_greet('world')"
)]
```

三个键都可选（`example` 单条、`examples` 多条，二者互斥），**不参与注册**：宏只把它们连同注册名收进
inventory。导出：

```shell
just docs_csv                                           # -> target/function_descriptions.csv
cargo run --bin duckfn -- function_descriptions --all    # -> target/function_descriptions_all.csv
                                                         #    （含还没写描述的函数，当清单用）
```

这一步不加载扩展、不查 catalog、也不需要 DuckDB 在场：纯粹读编译期记下来的东西，输出固定在项目的
`target/` 下。文本本身还有三条规矩：多条示例导出时用 `"; "` 拼接、每条去掉结尾分号；换行会压成一个
空格（生成页是 Markdown 表格）；逗号、引号与非 ASCII 原样通过。所以照「一句一条完整 SQL」写即可。
文案一律英文 —— 它会被原样贴到文档页上。

要发社区扩展时，把这份 CSV 复制成 `community-extension/docs/function_descriptions.csv`
（字段与流程见 [community-extension/AGENTS.md](community-extension/AGENTS.md)）。

## 文档站（`docs/`）

`docs/` 是一份 Docusaurus 站点，中英双语，与扩展本体互不依赖：不用就整个目录删掉，连带
`.github/workflows/DeployDocs.yml` 与 Justfile 里的 `docs_*` recipe。

```shell
just docs_install    # 只做一次（等价 cd docs && npm install）
just docs_start      # 本地预览 http://localhost:3000
just docs_build      # 构建；也是「链接有没有断」的检查（onBrokenLinks 设为 throw）
```

站点自身的维护（目录、翻译流程、部署、克隆后要改哪几处）见 `docs/README.md`。这里只说与发版相关的两条：

- 正文里的版本号一律写占位符 `{{EXTENSION_VERSION}}`（放进代码块或行内代码），构建期从
  `docs/extension-version.ts` 替换；`scripts/release.sh bump` 会连带更新那个文件，所以发版不用动 markdown。
- `scripts/release.sh` 的批量替换把 `docs/package-lock.json`、`docs/docs`、`docs/i18n` 排除在外（前者的
  版本号是依赖自己的，后两者只写占位符），并在替换阶段单独改 `docs/extension-version.ts`。

## 测试

测试用 SQLLogicTest 格式写在 `test/sql/` 下：

```shell
just test              # make configure + make debug + make test
make debug && make test    # make test 不会自动重新构建，改完 Rust 必须先 make debug
```

三份文件的分工：

| 文件 | 覆盖什么 |
| --- | --- |
| `test/sql/my_extension.test` | 冒烟：LOAD 之前函数不存在、`require` 之后两个示例函数都在（这一份也是「扩展能被加载」的最小证明） |
| `test/sql/scalar_greet.test` | 标量函数：正常值（含非 ASCII）、常量 NULL 被折叠、运行期 NULL 行被短路、`DuckOptionResult` 的 NULL 与报错两条路、参数个数/类型的 binder 报错、跨 DataChunk（`STANDARD_VECTOR_SIZE = 2048`） |
| `test/sql/aggregate_sum.test` | 聚合函数：返回类型、NULL 行跳过、空组回 NULL、`GROUP BY` 逐组计算、跨 DataChunk 的 `combine` |

迭代时不必每次都走 `make`（Windows 上还要在 Git Bash 里跑）。仓库自己的 venv 可以直连产物：

```powershell
# Windows（--test-dir 同时是 __TEST_DIR__ 的取值，必须给）
.\configure\venv\Scripts\python.exe -m duckdb_sqllogictest `
    --test-dir test/sql `
    --external-extension target/debug/my_extension.duckdb_extension
# 只跑一份：再加 --file-path test/sql/scalar_greet.test
```

```bash
# Linux / macOS
./configure/venv/bin/python -m duckdb_sqllogictest \
    --test-dir test/sql \
    --external-extension target/debug/my_extension.duckdb_extension
```

新增函数时至少覆盖：正常值、`NULL`、边界值、错误路径（`statement error`）。
`statement error` 下面的期望文本是**子串匹配**，写有辨识度的那一段即可（不必抄整个错误消息）。

提交前：`cargo clippy --all-targets -- -D warnings`（`just lint`）。

## 克隆模板后的下一步

1. `just rename <新扩展名>` —— 改齐五处扩展名 + 文档，并把 `Cargo.lock` 重写；脚本末尾会打印其余
   需要人工过一遍的东西。
2. `AGENTS.md`：填 `{{PROJECT_GOAL}}` 与 `{{DUCKFN_REPO}}` 两个占位符，顺手把函数名前缀那条约定里的
   `my_` 改成你的前缀。
3. 示例函数（`my_greet` / `my_greet_checked` / `my_sum`）与 `test/sql/*.test` 换成你自己的 API。
4. `community-extension/description.yml`：`extension.name` / `description` / `maintainers` / `repo`
   都要改成你的（字段依据见那一节）。
5. `LICENSE` 的版权人、`Cargo.toml` 里 duckfn 的版本。
6. 首次发版前确认仓库有 `main` 分支与 `origin` 远程：`release_tag` 会推 `main` 与 tag。
