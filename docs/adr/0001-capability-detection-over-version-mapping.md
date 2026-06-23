# ADR 0001 — 能力探测优先于版本号映射

- 状态：Accepted
- 日期：2026-06-17

## 背景

kimi-tools-mcp 通过子进程调用 Kimi CLI。Kimi CLI 处于 0.x 阶段，flag 表面不稳定：0.12.1 移除了 `--print` 与 `--final-message-only`，导致 v0.3.0 的三处硬编码调用全部失效。

兼容层需要判定当前 Kimi CLI 支持哪套 flag，有两种主流策略：

1. **版本号映射**：`kimi --version` → 维护「版本号 → flag 集」表
2. **能力探测**：解析 `kimi --help` 文本特征（是否含 `--final-message-only`）

## 决策

采用**能力探测优先、版本号兜底、异常时 modern 降级**的三段式策略：

1. 解析 `kimi --help`，按特征匹配判定 Legacy / Modern surface
2. 若 `--help` 解析异常，回退到 `kimi --version` 的 SemVer 判断
3. 若两者都失败，采用 Modern surface（当前主流 0.12.x），并输出 warning

## 理由（真实权衡）

- 版本号映射的痛点：0.x 阶段 flag 断点的**精确版本号未知**，维护版本表成本高且易滞后
- 能力探测的优势：直接问「你支持这个 flag 吗」，对版本号漂移免疫
- 能力探测的风险：`--help` 措辞若变更会失效 → 用版本号 + modern 兜底对冲
- 三段式降级确保任何单点失败都不会让整个适配层崩

## 后果

- 无需维护版本号 → flag 表
- 需关注 Kimi CLI `--help` 输出格式变更（纳入升级检查清单）
- 测试需覆盖三条路径：legacy / modern / fallback
- detector 的特征字符串集中常量化，便于一处修改
