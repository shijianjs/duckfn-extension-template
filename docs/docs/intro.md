---
title: Introduction
sidebar_position: 1
slug: /intro
description: A DuckDB extension written in Rust with duckfn — what the project contains, how it is built and released, and where to start reading.
---

# Introduction

`my_extension` is a DuckDB [loadable extension](https://duckdb.org/docs/stable/extensions/extension_development)
written in Rust on top of [duckfn](https://crates.io/crates/duckfn). Attribute macros turn ordinary Rust
functions into the SQL functions DuckDB registers when the extension is loaded; DuckDB's C API is used
headers-only, so nothing has to be built except the extension itself.

The project started from
[duckfn-extension-template](https://github.com/shijianjs/duckfn-extension-template), which is this
documentation site's other half: the repository already contains the build, test, documentation and
release tooling, and the pages here describe how to use it.

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

```sql
LOAD './target/debug/my_extension.duckdb_extension';
SELECT my_greet_checked('world');  -- Hello, world!
SELECT my_greet_checked('');       -- NULL
```

:::note[The pages themselves are part of the template]
Everything under `docs/` is a starting point written for the sample functions. Rewrite these pages (and
their Chinese translations) as your own API grows, or delete the whole directory — nothing else in the
repository depends on it. The maintenance conventions (layout, commands, translations, deployment) are
in `docs/README.md`.
:::

## What is in the box

| Path | What it is |
| --- | --- |
| `src/extension/mod.rs` | The entry point: `duckfn_entrypoint!("my_extension")` plus the module tree. |
| `src/extension/functions/` | The registered functions. Three samples live here: `my_greet`, `my_greet_checked`, `my_sum`. |
| `src/extension/types/` | Where SQL-facing types go (STRUCT/ENUM definitions, `list<struct>` row types). Empty for now. |
| `test/sql/` | SQLLogicTest files, one per sample function plus a smoke test. |
| `Justfile` | The everyday commands: build, run SQL, repl, test, lint, release. |
| `.github/workflows/` | The build matrix, the GitHub Release on a version tag, and this site's deployment. |
| `community-extension/` | The two files a [community extension](https://duckdb.org/community_extensions/list_of_extensions) registration needs. |
| `docs/` | This site: Docusaurus, English and Simplified Chinese. |

## Where to go next

- [Quick start](./getting-started/quick-start.md) — rename the template, build it, load it, call it.
- [Project structure](./getting-started/project-structure.md) — where the entry point, the functions and
  the types live, and the naming rules that hold them together.
- [Writing functions](./guide/functions.md) — the sample functions line by line.
- [Testing](./guide/testing.md) — the SQLLogicTest files and how to run them.
- [Build and release](./build-and-release.md) — the build paths and the release flow.
- [Community extensions](./community-extension.md) — publishing to DuckDB's community repository.
