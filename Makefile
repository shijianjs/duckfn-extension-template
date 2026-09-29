.PHONY: clean clean_all

PROJ_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

EXTENSION_NAME=my_extension

# 置 1 开启 Unstable API（产物只能在 TARGET_DUCKDB_VERSION 上工作，会失去向前兼容）。
# 注：当前扩展模板要求开启，因为 duckdb-rs 依赖 unstable C API。
#
# Set to 1 to enable Unstable API (binaries will only work on TARGET_DUCKDB_VERSION, forwards compatibility will be broken)
# Note: currently extension-template-rs requires this, as duckdb-rs relies on unstable C API functionality
USE_UNSTABLE_C_API=1

# 目标 DuckDB 版本 / Target DuckDB version
TARGET_DUCKDB_VERSION=v1.5.5

# 测试用的 DuckDB 版本必须与构建目标一致：扩展在 USE_UNSTABLE_C_API=1 下构建，产物被钉死在精确版本上
# （加载时校验），而 base.Makefile 里 DUCKDB_TEST_VERSION 默认留空 = 从 PyPI 装 latest —— 上游一发新的
# 补丁版，测试引擎就比产物新，`make test_release` 直接以版本不符失败（v1.5.6 发布当天，
# macos_arm64 与 windows_amd64 这两个真正跑测试的平台就是这么挂的）。这里由 TARGET_DUCKDB_VERSION 推出
# （去掉前缀 v，pip 的写法），保持版本号只有一个来源。
#
# The DuckDB version the test runner uses has to match the build target: with USE_UNSTABLE_C_API=1 the
# artifact is pinned to an exact version (verified at load time), while base.Makefile leaves
# DUCKDB_TEST_VERSION empty, which means "latest from PyPI" — one patch release upstream and the test
# engine is newer than the artifact, so `make test_release` fails on the version check. Derived from
# TARGET_DUCKDB_VERSION (minus the `v` prefix, the way pip spells it) to keep one source of truth.
DUCKDB_TEST_VERSION := $(patsubst v%,%,$(TARGET_DUCKDB_VERSION))

all: configure debug

# 引入 DuckDB 提供的 makefile / Include makefiles from DuckDB
include extension-ci-tools/makefiles/c_api_extensions/base.Makefile
include extension-ci-tools/makefiles/c_api_extensions/rust.Makefile

configure: venv platform extension_version

debug: build_extension_library_debug build_extension_with_metadata_debug
release: build_extension_library_release build_extension_with_metadata_release

test: test_debug
test_debug: test_extension_debug
test_release: test_extension_release

clean: clean_build clean_rust
clean_all: clean_configure clean
