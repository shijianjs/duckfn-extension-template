# 新扩展项目的 Justfile 模板 —— 与 AGENTS.md、DEVELOPMENT.md 是同一套流程的三种入口。
#
# 只改一处：把 extension_name 改成你的扩展名（或直接跑 `just rename <新名字>` 让别人替你改）。
# 它必须与下面四处一致，否则 LOAD 会失败：
#   - src/extension/mod.rs 里 duckfn_entrypoint!("...") 的名字
#   - Cargo.toml 的 [package] name 与 [[example]] name
#   - Makefile 里的 EXTENSION_NAME
#   - .github/workflows/MainDistributionPipeline.yml 的 extension_name
#
# 前置工具：
#   cargo install just cargo-duckdb-ext-tools
#
# 说明：
#   - 日常迭代走 Cargo（just build / just sql / just repl），不需要 make 流程先跑通。
#   - sqllogictest 与 CI 走官方 makefile（just ci-init 一次，之后 just test）。

# Windows 下 recipe 交给 Git Bash 执行；按自己的 Git 安装路径调整。
# 非 Windows 上这一行不生效。
set windows-shell := ["C:\\Program Files\\Git\\bin\\bash.exe", "-c"]

# 扩展名：全小写、只含下划线
extension_name := "my_extension"

# duckdb 命令行。不在 PATH 里时用 `just DUCKDB=/path/to/duckdb repl` 覆盖。
duckdb := env_var_or_default("DUCKDB", "duckdb")

ext_path := "./target/debug/" + extension_name + ".duckdb_extension"

# 不带参数运行 just 时列出所有 recipe
default:
    @just --list

# 克隆模板后第一件事：把扩展名改掉（Cargo.toml / Makefile / Justfile / extension/mod.rs / CI / 文档）
rename new_name:
    bash scripts/rename.sh "{{new_name}}"

# 日常构建 -> target/debug/<extension_name>.duckdb_extension
build:
    cargo duckdb-ext build

# 构建后跑一条 SQL 就退出：just sql "SELECT my_greet('world')"
sql sql: build
    {{duckdb}} -unsigned -c "LOAD '{{ext_path}}'; {{sql}}"

# 构建后进入 REPL（扩展已 LOAD），手动试函数用：just repl
repl: build
    {{duckdb}} -unsigned -cmd "LOAD '{{ext_path}}';"

# 全量 release 构建（注意：与下面的 release_* 发版流程不是一回事）
release:
    cargo build --release

# 提交前检查，warning 视为错误
lint:
    cargo clippy --all-targets -- -D warnings

# ==== 函数描述 CSV ====
#
# 描述写在 #[duck_*] 属性的 description / comment / example 上，输出固定为 target/function_descriptions.csv；
# 要连没写描述的函数一起导出（文件名带 _all 后缀）：cargo run --bin duckfn -- function_descriptions --all
# 需要 src/bin/duckfn.rs 与 Cargo.toml 里的 duckfn feature "cli"。
#
# The text comes from the description / comment / example arguments of the #[duck_*] attributes and always
# lands in target/function_descriptions.csv. Add --all (file name gets an _all suffix) to include functions
# without any documentation. Needs src/bin/duckfn.rs and duckfn's "cli" feature in Cargo.toml.
#
# 生成社区扩展文档页用的 function_descriptions.csv（只做转发，逻辑在 duckfn 的 cargo CLI 里）
docs_csv:
    cargo run --bin duckfn -- function_descriptions

# ==== 文档站（docs/，Docusaurus，中英双语） ====
#
# 首次先 `just docs_install` 装依赖。CI 走 `npm ci`，本地装一次即可。
# 站点维护（目录、翻译、部署）见 docs/README.md。
#
# The documentation site (docs/, Docusaurus, English + Simplified Chinese). Run `just docs_install`
# once; CI uses `npm ci`. See docs/README.md for layout, translations and deployment.

# 装文档站依赖（只做一次）
docs_install:
    cd docs && npm install

# 构建静态站点 -> docs/build（改完文档想确认链接都还通时跑它）
docs_build:
    cd docs && npm run build

# 本地预览文档站（http://localhost:3000；中文用 npm start -- --locale zh-Hans）
docs_start:
    cd docs && npm start

# 补翻译占位：改了 config / src / _category_.json 之后再生一次，然后填新出现的条目
docs_translations:
    cd docs && npx docusaurus write-translations --locale zh-Hans

# 初始化 extension-ci-tools（生成 configure/ 与 python venv）；跑 make 流程前先来一次
ci-init:
    make configure

# 官方 debug 构建 —— sqllogictest 与 CI 走这条
ci-build: ci-init
    make debug

# 跑 test/sql/**/*.test
test: ci-build
    make test
    git clean -fdX -- test/sql

# 官方 release 构建 —— CI 打 tag 时走这条
ci-release: ci-init
    make release

# WebAssembly 构建；要求 Cargo.toml 的 [[example]] name 与 extension_name 一致
build_wasm:
    cargo build --release --target wasm32-unknown-emscripten --example {{extension_name}}

# 打出可加载的 wasm_eh 扩展 -> build/wasm_eh/extension/my_extension/my_extension.duckdb_extension.wasm
#
# 直接调官方 makefile 的 wasm_eh 目标（configure → release → move_wasm_extension）：
# cargo 出 libduckfn.a → emcc 出 side module → append_extension_metadata 出 .duckdb_extension.wasm。
#
# 前提：系统装好 emsdk 3.1.71 并把它的目录配进 PATH（`emcc` / `emcc.bat` 能直接执行）。版本必须与
# CI 一致（见 _extension_distribution.yml），否则产物能构建出来、LOAD 时报 Could not load dynamic lib。
# 不需要 source emsdk_env.sh —— emcc 已在 PATH 上就行。
#
# RUST_LIBNAME 覆盖是必须的：上游 rust.Makefile 按宿主 OS 取产物名，Windows 上会去找 duckfn.dll，
# 而 wasm 产物是 libduckfn.a。少了它 make 会在拷贝那步报文件不存在。
#
# 注意：跑完 configure/platform.txt 会停在 wasm_eh；之后要跑本地原生的 make test 之前先 `make configure`。
#
# Loadable wasm_eh build via the upstream makefile target; the emsdk/emscripten on PATH must match CI
# (3.1.71). `RUST_LIBNAME` is the override that makes it work on Windows, where the makefile expects
# the native `duckfn.dll` instead of the wasm target's `libduckfn.a`.
build_wasm_eh:
    make wasm_eh RUST_LIBNAME=lib{{extension_name}}.a

# 工具链（首次）：固定 Rust 版本 + 装 wasm target
config_env:
    rustup override set 1.86.0
    rustup target add wasm32-unknown-emscripten
    rustup target list --installed

# ==== 发版流程（完整步骤见根目录 AGENTS.md） ====
#
# Release flow (the full walkthrough lives in AGENTS.md). This project does **not** publish to
# crates.io: it is a DuckDB loadable extension distributed as the `.duckdb_extension` files attached to
# a GitHub Release.

# 发版前检查：clippy（warning 视为错误）与构建都必须干净
release_check: lint
    cargo build --all-targets

# 提升版本号（Cargo.toml + 文档 / README / CI 注释 / 本文件）：just release_bump 0.1.0
release_bump new_version:
    bash scripts/release.sh bump "{{new_version}}"

# 打 tag 并推送，触发 CI 构建与 Release 发布：just release_tag 0.1.0
release_tag version:
    bash scripts/release.sh tag "{{version}}"

# 查看最近的 CI 运行状态
release_ci:
    gh run list --limit 5

# 切到下一开发版本（不打 tag、不发布）：just release_dev 0.1.1-dev.0
release_dev new_version:
    bash scripts/release.sh dev "{{new_version}}"
