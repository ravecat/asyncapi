## 0.1.0 (2026-08-27)

### 🚀 Features

- **plugin:** add TypeScript plugin ([#13](https://github.com/ravecat/opalesce/issues/13), [#14](https://github.com/ravecat/opalesce/issues/14), [#15](https://github.com/ravecat/opalesce/issues/15), [#16](https://github.com/ravecat/opalesce/issues/16), [#17](https://github.com/ravecat/opalesce/issues/17))
- **core:** expose unresolved AsyncAPI source ([a53e3dd](https://github.com/ravecat/opalesce/commit/a53e3dd))
- ⚠️  **core:** simplify plugin execution ([0c56b20](https://github.com/ravecat/opalesce/commit/0c56b20))

### 🩹 Fixes

- **core:** fail closed on unrepresentable external schema references ([#17](https://github.com/ravecat/opalesce/issues/17))
- **core:** derive collision-free AsyncAPI 2.6 operation identities ([#14](https://github.com/ravecat/opalesce/issues/14))

### ⚠️  Breaking Changes

- **core:** simplify plugin execution  ([0c56b20](https://github.com/ravecat/opalesce/commit/0c56b20))
  plugins must provide a build hook; setup, dependsOn, service tokens, phase-specific contexts, and accumulated artifact access are removed.

## 0.0.1 (2026-07-31)

### 🚀 Features

- ⚠️  **opalesce:** narrow consumer API ([4e874a2](https://github.com/ravecat/opalesce/commit/4e874a2))

### ⚠️  Breaking Changes

- **opalesce:** narrow consumer API  ([4e874a2](https://github.com/ravecat/opalesce/commit/4e874a2))
  remove advanced Core runtime and type exports from opalesce and opalesce/config.