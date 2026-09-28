---
title: 简介
sidebar_position: 1
slug: /intro
description: 用 Rust 与 duckfn 写的 DuckDB 扩展：这个项目里有什么、怎么构建与发版、从哪里开始读。
---

# 简介

`my_extension` 是一个用 Rust 写的 DuckDB [loadable extension](https://duckdb.org/docs/stable/extensions/extension_development)，
建立在 [duckfn](https://crates.io/crates/duckfn) 之上：属性宏把普通的 Rust 函数变成扩展加载时注册进
DuckDB 的 SQL 函数；DuckDB 的 C API 只用到头文件，所以除了扩展本身，没有任何东西需要编译。

项目从 [duckfn-extension-template](https://github.com/shijianjs/duckfn-extension-template) 起步，
这份文档站就是它另一半：仓库里已经装好了构建、测试、文档与发版链路，下面几页讲怎么用。

```rust
use duckfn::{DuckOptionResult, duck_scalar_function};

/// ```sql
/// SELECT my_greet_checked('world');  -- Hello, world!
/// ```
#[duck_scalar_function]
fn my_greet_checked(name: String) -> DuckOptionResult<String> {
    if name.is_empty() {
        return Ok(None);          // SQL NULL
    }
    Ok(Some(format!("Hello, {name}!")))
}
```

同一个函数的 SQL 一面。这个块会在你的浏览器里真跑：站点从仓库的最新 Release 预加载了这个扩展，
所以这里不用写 `LOAD`。

```sql {"type":"duckfn","show":"table"}
SELECT name AS input, my_greet_checked(name) AS greeting
FROM (VALUES ('world'), ('')) t(name);
```

:::note[这些页面本身也是模板的一部分]
`docs/` 下的一切都是围绕示例函数写的起点。你的 API 长出自己的样子之后，把这些页面（以及它们的中文
译文）改成对应的内容；也可以整个目录删掉 —— 仓库里没有别的东西依赖它。维护约定（目录、命令、翻译、
部署）写在 `docs/README.md` 里。
:::

## 仓库里有什么

| 路径 | 是什么 |
| --- | --- |
| `src/extension/mod.rs` | 入口：`duckfn_entrypoint!("my_extension")` 与模块树。 |
| `src/extension/functions/` | 注册进 DuckDB 的函数。这里有三个示例：`my_greet`、`my_greet_checked`、`my_sum`。 |
| `src/extension/types/` | 面向 SQL 的类型放这里（STRUCT / ENUM 定义、`list<struct>` 行类型）。目前是空的。 |
| `test/sql/` | SQLLogicTest 用例，每个示例函数一份，外加一份冒烟测试。 |
| `Justfile` | 日常命令：构建、跑一条 SQL、REPL、测试、lint、发版。 |
| `.github/workflows/` | 构建矩阵、版本 tag 上的 GitHub Release、以及这份站点的部署。 |
| `community-extension/` | 注册 [社区扩展](https://duckdb.org/community_extensions/list_of_extensions) 需要的那两份文件。 |
| `docs/` | 这份站点：Docusaurus，中英双语。 |

## 接下来去哪

- [快速开始](./getting-started/quick-start.md) —— 改扩展名、构建、加载、调用。
- [目录结构](./getting-started/project-structure.md) —— 入口点、函数与类型各自放在哪，以及把它们绑在
  一起的命名规则。
- [编写函数](./guide/functions.md) —— 示例函数逐行拆解。
- [测试](./guide/testing.md) —— SQLLogicTest 用例与怎么跑。
- [构建与发版](./build-and-release.md) —— 两条构建路径与发版流程。
- [社区扩展](./community-extension.md) —— 发布到 DuckDB 的社区仓。
