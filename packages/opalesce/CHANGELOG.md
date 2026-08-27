## 0.2.0 (2026-08-27)

### 🚀 Features

- **plugin:** add TypeScript plugin ([#13](https://github.com/ravecat/opalesce/issues/13), [#14](https://github.com/ravecat/opalesce/issues/14), [#15](https://github.com/ravecat/opalesce/issues/15), [#16](https://github.com/ravecat/opalesce/issues/16), [#17](https://github.com/ravecat/opalesce/issues/17))
- ⚠️  **core:** simplify plugin execution ([0c56b20](https://github.com/ravecat/opalesce/commit/0c56b20))

### 🩹 Fixes

- ⚠️  **plugin-typescript:** rename output path option ([#13](https://github.com/ravecat/opalesce/issues/13))

### ⚠️  Breaking Changes

- **plugin-typescript:** rename output path option  ([#13](https://github.com/ravecat/opalesce/issues/13))
  TypeScript plugin callers must pass `{ output: ... }` instead of `{ outputPath: ... }`.
- **core:** simplify plugin execution  ([0c56b20](https://github.com/ravecat/opalesce/commit/0c56b20))
  plugins must provide a build hook; setup, dependsOn, service tokens, phase-specific contexts, and accumulated artifact access are removed.

### 🧱 Updated Dependencies

- Updated @opalesce/plugin-typescript to 0.1.0
- Updated @opalesce/config to 0.1.0
- Updated @opalesce/core to 0.1.0
- Updated @opalesce/cli to 0.1.0

## 0.1.0 (2026-07-31)

### 🚀 Features

- ⚠️  **opalesce:** narrow consumer API ([4e874a2](https://github.com/ravecat/opalesce/commit/4e874a2))
- ⚠️  **core:** merge orchestration into core ([fc4c4a2](https://github.com/ravecat/opalesce/commit/fc4c4a2))
- **cli:** expose command runner as run ([6d3b656](https://github.com/ravecat/opalesce/commit/6d3b656))
- **facade:** add opalesce consumer package ([e03d87d](https://github.com/ravecat/opalesce/commit/e03d87d))

### ⚠️  Breaking Changes

- **opalesce:** narrow consumer API  ([4e874a2](https://github.com/ravecat/opalesce/commit/4e874a2))
  remove advanced Core runtime and type exports from opalesce and opalesce/config.
- **core:** merge orchestration into core  ([fc4c4a2](https://github.com/ravecat/opalesce/commit/fc4c4a2))
  replace runPipeline with run and remove @opalesce/orchestrator and opalesce/orchestrator.

### 🧱 Updated Dependencies

- Updated @opalesce/config to 0.0.1
- Updated @opalesce/core to 0.0.1
- Updated @opalesce/cli to 0.0.1