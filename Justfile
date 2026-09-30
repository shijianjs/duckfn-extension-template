# 新扩展项目的 Justfile 模板 —— 与 AGENTS.md、DEVELOPMENT.md 是同一套流程的三种入口。
#
# 只改一处：把 extension_name 改成你的扩展名（或直接跑 `just rename <新名字>` 让别人替你改）。
# 它必须与下面四处一致，否则 LOAD 会失败：
#   - src/extension/mod.rs 里 duckfn_entrypoint!("...") 的名字
#   - Cargo.toml 的 [package] name 与 [[example]] name
#   - Makefile 里的 EXTENSION_NAME
#   - .github/workflows/MainDistributionPipeline.yml 的 extension_name
#
# 日常命令（build / sql / repl / lint / test / docs_* / ci-* / release_* …）都在
# scripts/common.just 里 —— 那是**共享源**（duckfn 仓库里那份的副本，各扩展项目一份、内容相同），
# 由本文件 import 进来。要改共享内容：改 duckfn 仓库那份，然后 `just sync-common`；
# 要在本项目里覆盖某条共享 recipe：加 `set allow-duplicate-recipes := true` 再重写它。
# 细节见 scripts/common.just 的头注释。`just check-common` 可以比对副本与共享源是否一致。
#
# 前置工具：
#   cargo install just cargo-duckdb-ext-tools
#
# 说明：
#   - 日常迭代走 Cargo（just build / just sql / just repl），不需要 make 流程先跑通。
#   - sqllogictest 与 CI 走官方 makefile（just ci-init 一次，之后 just test）。

# Windows 下 recipe 交给 Git Bash 执行；按自己的 Git 安装路径调整。
# 非 Windows 上这一行不生效。
#
# 这是机器相关的路径，所以留在本地文件里，不放进共享文件。
set windows-shell := ["C:\\Program Files\\Git\\bin\\bash.exe", "-c"]

import "scripts/common.just"

# 扩展名：全小写、只含下划线
extension_name := "my_extension"

# 克隆模板后第一件事：把扩展名改掉（Cargo.toml / Makefile / Justfile / extension/mod.rs / CI / 文档）
rename new_name:
    bash scripts/rename.sh "{{new_name}}"
