[English](DEVELOPMENT.md) | [简体中文](DEVELOPMENT.zh.md)

# my_extension — development notes

The user-facing docs live in [README.md](README.md): the SQL interface, installing and loading, and the
quick start. This file keeps what a user does not need — how the code is layered, why it looks the way
it does, which crate owns which part, and how to build and test.

duckfn's own conventions (the entry-point chain, the process for adding a function, which source to
read first) are **not** repeated here: they are in [AGENTS.md](AGENTS.md), which also says where duckfn's
documentation and example extension sit in the local cargo registry (they ship with the crate since
0.0.11, so no duckfn clone is needed).

This repository is [duckfn-extension-template](https://github.com/shijianjs/duckfn-extension-template):
it started from DuckDB's official
[extension-template-rs](https://github.com/duckdb/extension-template-rs) and was reworked along duckfn's
skeleton conventions (entry module, `EXTENSION_NAME`, dependency list), plus a complete release chain.

## Directory layout

```text
src/lib.rs            native crate root ->  mod extension;
src/wasm_lib.rs       wasm crate root   ->  mod extension;   (same mods, mirrored)
src/extension/mod.rs  ->  duckfn_entrypoint!("my_extension");
src/bin/duckfn.rs     duckfn CLI entry  ->  #[path] mod extension; + duckfn::cli::run(...)
                      (only serves `just docs_csv`; takes no part in running the extension)

src/extension/functions/mod.rs  ->  mod aggregate_sum; mod scalar_greet;
src/extension/functions/
    scalar_greet.rs     my_greet / my_greet_checked (two scalar return shapes)
    aggregate_sum.rs    my_sum                      (aggregate state + output semantics)
src/extension/types/mod.rs
                        an empty slot for now: custom types (STRUCT / ENUM, the row type of a
                        list<struct> result, the options type of a DuckLazy argument) go in this
                        layer — attach a `mod` here once you have one

test/sql/               one .test per sample function, plus a my_extension.test smoke test
scripts/release.sh      releasing (bump / tag / dev)
scripts/rename.sh       renaming the extension after cloning
Justfile                shortcuts for the daily loop and for releasing
AGENTS.md               conventions + release flow + the duckfn knowledge map
docs/                   the documentation site (Docusaurus, English + Simplified Chinese)
community-extension/    the two files a community-extension registration needs, plus the process
```

The extension name `my_extension` has to match `EXTENSION_NAME` in the Makefile, `[package] name` and
`[[example]] name` in Cargo.toml, `extension_name` in the Justfile, and `extension_name` in the CI
workflow; rename it with `scripts/rename.sh` instead of by hand (see the "extension name and renaming"
section of AGENTS.md).

## Skeleton trade-offs

### Two crate roots declaring the same set of mods

The official template writes `mod lib;` in `src/lib.rs` and forwards it again from `src/wasm_lib.rs`. As
soon as modules nest, the two paths stop lining up and you get
`error[E0583]: file not found for module ...`.

Here both crate roots only declare `mod extension;`, and `extension/mod.rs` attaches the submodules:
there is exactly one copy of the paths, nesting depth makes no difference, and adding a module means
touching `extension/mod.rs` (and the `mod.rs` of the layer below) only.

### `src/bin/duckfn.rs`: why `#[path]` compiles the extension a second time

The documentation metadata behind `#[duck_*]` is collected by `inventory`'s static constructors, which
**only fire for object files that are really linked into the final binary**. With `use my_extension::...`
in the bin, the linker may drop those modules entirely (nobody references them) and the exported CSV
comes out empty — silently, with no error.

So the bin does `#[path = "../extension/mod.rs"] mod extension;` and compiles the same sources itself,
which keeps the registrations in this crate. This is also how the duckfn skeleton's `src/bin/duckfn.rs`
is written. The whole bin serves `just docs_csv` and nothing else.

### One function per file, the prefix as a namespace

Files under `functions/` are named "kind + what it does" (`scalar_greet.rs`, `aggregate_sum.rs`). When a
feature outgrows a single file, split it into a subdirectory the way the duckfn example does
(`functions/<feature>/mod.rs` plus one file per concern).

Every registered name carries a short prefix (`my_` here); the reasoning is in AGENTS.md: community
extensions almost never put the package name into function names, and a short prefix is enough to
search `duckdb_functions()` by.

### The three scalar return shapes

The macro generates different tail code per return type. The template writes the first two:

| Signature | Meaning |
| --- | --- |
| `-> T` | a plain value, never NULL |
| `-> DuckOptionResult<T>` | nullable and fallible: `Ok(None)` is SQL NULL, `Err` fails the query |
| `-> Option<T>` | nullable but unable to fail (not in the template; follow the same pattern) |

Argument nullability is the other axis: with a `T` parameter the reader short-circuits NULL rows (the
body never runs), while `Option<T>` lets NULL reach the body as `None` with the meaning up to you. The
same rule holds for scalars and aggregates.

### Aggregate state

An aggregate signature is "per-row inputs plus one `&mut state`" (the state may sit anywhere). The state
needs `Default + Clone + Debug` (derived on the wrapper struct the macro generates) and an
implementation of `DuckAggregateState`:

- `combine` / `simple_combine`: merge two states (this is what threads and group merging go through);
- `result` / `simple_result`: turn a state into a value. Returning a value from `simple_result` means the
  result can never be NULL; a group that has to come back as NULL overrides `result` and returns
  `Ok(None)` — which is exactly what `SumState` in `aggregate_sum.rs` does, counting the rows it saw so
  "no input at all" is told apart from "input seen, the total is 0".

`Output` decides the SQL return type: `i64` / `f64` / `String` / `Vec<...>` (that is, `list<...>`) and so
on.

### `types/` is a slot waiting for you

The two sample functions need no custom type, so `types/mod.rs` holds comments only. What goes in there
are three kinds of thing:

- named types defined with `#[duck_struct]` / `#[duck_enum]` and registered into DuckDB at load time;
- the row type of a `list<struct<...>>` result (a plain Rust struct deriving `DuckStruct`);
- the options STRUCT a `DuckLazy` argument takes (parsed once inside the function).

Delete the whole directory if you never need it (and the `mod types;` line in `extension/mod.rs`).

### What the template deliberately leaves out

The template demonstrates the **registration paths** and the **engineering loop**; none of the following
is in it. Write them from duckfn's docs and example extension rather than from memory:

- table functions / COPY / casts / replacement scans / SQL macros (one attribute macro each; see duckfn's
  `docs/docs/guide/` and its example extension under `src/extension/`);
- `DuckLazy<T>` arguments ("parse the options once"), named types, `list<struct>` results;
- `overloads_name` (several signatures merged into one function set under one name);
- DuckDB's host file system (`duckfn::duck_vfs`, reading and writing files) and the chrono / uuid /
  rust_decimal bridges;
- platform-specific dependencies (the `[target.'cfg(...)'.dependencies]` pattern is described in the
  trade-off section of AGENTS.md).

## Dependencies

- [duckfn](https://crates.io/crates/duckfn): the attribute macros that register ordinary Rust functions
  with DuckDB. Two features are on: `duckdb-1-5` (what only reached the C API in DuckDB 1.5; the host
  file system lives there) and `cli` (the command-line tool behind `src/bin/duckfn.rs`, which pulls clap
  and csv into duckfn). The macros also generate a `SQL_NAME` constant per signature, and the
  `description` / `comment` / `example` attributes are the one source of the function-description CSV
  (see below).
- [quack-rs](https://crates.io/crates/quack-rs): the DuckDB C API bindings — the code expanded by
  `duckfn_entrypoint!` refers to them directly.
- [libduckdb-sys](https://crates.io/crates/libduckdb-sys): headers only, with `loadable-extension`, which
  is what keeps a local DuckDB build unnecessary. The lower bound is `>=1.10500` (= DuckDB 1.5.0: the
  crate encodes a DuckDB version as `1.<major*10000 + minor*100 + patch>.0`, so 1.5.5 is `1.10505.0`).

The sample functions need nothing else. For anything date/time related, enable duckfn's `chrono` feature
and add `chrono` as a dependency (duckfn re-exports none of those crates); the two ready-made lines are
at the bottom of Cargo.toml.

## Build

The daily loop uses `cargo-duckdb-ext-tools` (a global cargo subcommand; it adds no project dependency):

```shell
cargo install cargo-duckdb-ext-tools   # once
cargo duckdb-ext build                 # -> target/debug/my_extension.duckdb_extension
```

The official template's `make` flow is still there (CI and the sqllogictest run go through it); the first
run needs `make configure` to build the Python venv:

```shell
make configure   # once
make debug       # -> build/debug/extension/my_extension/my_extension.duckdb_extension
```

`make release` is the optimized version of the same flow. On Windows `make` has to run inside Git Bash.

The `Justfile` at the repository root wraps both: `just build`, `just sql "SELECT …"`, `just repl`,
`just test`, `just lint`, `just build_wasm`, `just docs_csv`, `just docs_build`.

One easy trap: **the artifact file name must be `<extension name>.duckdb_extension`**. DuckDB looks the
entry-point symbol up by that name, so a rename (from `my_extension.duckdb_extension` to
`win.duckdb_extension`, say) fails with `did not contain function "my_extension_init_c_api"` — the
artifact is not broken, it is misnamed.

## Function descriptions (the community-extension doc page)

DuckDB's C extension API has **no** way to set a function's description or examples:
`duckdb_scalar_function_set_name`, `_set_return_type`, `_set_varargs`, `_set_volatile` … and that is it —
no `_set_description`, no `_add_example`. Without help, the `Added Functions` table on the community
extension pages would be a bare list of names.

The text therefore lives next to the function it describes, on the `#[duck_*]` attributes (see
`functions/scalar_greet.rs` and `aggregate_sum.rs`):

```rust
#[duck_scalar_function(
    description = "Greets someone by name, the simplest possible scalar function",
    comment = "…",
    example = "SELECT my_greet('world')"
)]
```

All three keys are optional (`example` for one, `examples` for several; the two are mutually exclusive)
and **take no part in registration**: the macro only collects them, together with the registered name,
into an inventory entry. Export:

```shell
just docs_csv                                           # -> target/function_descriptions.csv
cargo run --bin duckfn -- function_descriptions --all    # -> target/function_descriptions_all.csv
                                                         #    (includes undocumented ones, as a list)
```

This loads no extension, queries no catalog and needs no DuckDB around: it reads what was recorded at
compile time, into the project's `target/`. The text itself has three rules: several examples are joined
with `"; "` and lose their trailing semicolons on export; newlines collapse into single spaces (the
target is a Markdown table); commas, quotes and non-ASCII pass through unchanged. Write one complete
statement per entry. The text is **English** — it is pasted into that page as it is.

To publish as a community extension, copy this CSV to
`community-extension/docs/function_descriptions.csv` (fields and process in
[community-extension/AGENTS.md](community-extension/AGENTS.md)).

## Documentation site (`docs/`)

`docs/` is a Docusaurus site in English and Simplified Chinese. Nothing else depends on it: delete the
directory (together with `.github/workflows/DeployDocs.yml` and the Justfile's `docs_*` recipes) if you
do not want a site.

```shell
just docs_install    # once (that is `cd docs && npm install`)
just docs_start      # dev server at http://localhost:3000
just docs_build      # the build, and the "are any links broken?" check (onBrokenLinks is `throw`)
```

Maintaining the site itself — layout, translation workflow, deployment, what to change after cloning —
is in `docs/README.md`. The reusable pieces — the home-page `<dfk-*>` components, the TOC collapse
control, the version-placeholder remark plugin and the runnable SQL blocks — come from
[`duckfn-docs-kit`](https://www.npmjs.com/package/duckfn-docs-kit) as an npm dependency, so the site
keeps no copies of them. The pages' `sql {"type":"duckfn",…}` blocks run in the reader's browser
against DuckDB-Wasm and call the extension, which the site preloads from the repository's latest GitHub
Release; `cd docs && npm test` re-runs every block. Both need a release to exist — see `docs/README.md`.

Only two things here touch the release flow:

- Version numbers in the pages are written as the `{{EXTENSION_VERSION}}` placeholder (inside a code
  block or inline code) and substituted at build time from `docs/extension-version.ts`; `scripts/release.sh
  bump` updates that file, so a release never has to touch markdown.
- The bulk replacement in `scripts/release.sh` skips `docs/package-lock.json`, `docs/docs` and
  `docs/i18n` (the lock file's versions belong to the dependencies; the pages only hold placeholders) and
  replaces `docs/extension-version.ts` separately.

## Tests

Tests are SQLLogicTest files under `test/sql/`:

```shell
just test                  # make configure + make debug + make test
make debug && make test    # make test does not rebuild; rerun make debug after Rust changes
```

The three files and what each covers:

| File | Coverage |
| --- | --- |
| `test/sql/my_extension.test` | smoke: the function is missing before `LOAD`, both sample functions exist after `require` (also the smallest proof that the extension loads at all) |
| `test/sql/scalar_greet.test` | scalar: plain values (non-ASCII included), a constant NULL folded to NULL, runtime NULL rows short-circuited, both `DuckOptionResult` paths (NULL and error), binder errors for wrong arity and type, inputs spanning several DataChunks (`STANDARD_VECTOR_SIZE = 2048`) |
| `test/sql/aggregate_sum.test` | aggregate: the return type, NULL rows skipped, an empty group yielding NULL, per-group results under `GROUP BY`, `combine` across DataChunks |

You do not have to go through `make` on every iteration (and on Windows that needs Git Bash anyway). The
repository's own venv can drive the artifact directly:

```bash
# Linux / macOS (--test-dir is also the value of __TEST_DIR__, so it is required)
./configure/venv/bin/python -m duckdb_sqllogictest \
    --test-dir test/sql \
    --external-extension target/debug/my_extension.duckdb_extension
# one file only: add --file-path test/sql/scalar_greet.test
```

```powershell
# Windows
.\configure\venv\Scripts\python.exe -m duckdb_sqllogictest `
    --test-dir test/sql `
    --external-extension target/debug/my_extension.duckdb_extension
```

A new function should cover at least: ordinary values, `NULL`, boundary values, and the error path
(`statement error`). The expected text under `statement error` is matched as a **substring**, so a
distinctive fragment is enough — there is no need to reproduce the whole message.

Before committing: `cargo clippy --all-targets -- -D warnings` (`just lint`).

## Next steps after cloning

1. `just rename <new-extension-name>` — rewrites the extension name in the five places plus the docs, and
   regenerates the `Cargo.lock` entry; the script ends by printing what still needs a human pass.
2. `AGENTS.md`: fill in `{{PROJECT_GOAL}}`, and change the `my_` prefix in the naming convention to your
   own.
3. Replace the sample functions (`my_greet` / `my_greet_checked` / `my_sum`) and `test/sql/*.test` with
   your API.
4. `community-extension/description.yml`: `extension.name` / `description` / `maintainers` / `repo` are
   yours to fill in (the field-by-field reasoning is in that directory).
5. The copyright holder in `LICENSE`, and the duckfn version in `Cargo.toml`.
6. Before the first release, make sure the repository has a `main` branch and an `origin` remote:
   `release_tag` pushes both `main` and the tag.
