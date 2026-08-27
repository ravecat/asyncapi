## 0.1.0 (2026-08-27)

### 🚀 Features

- **plugin:** add TypeScript plugin ([#13](https://github.com/ravecat/opalesce/issues/13), [#14](https://github.com/ravecat/opalesce/issues/14), [#15](https://github.com/ravecat/opalesce/issues/15), [#16](https://github.com/ravecat/opalesce/issues/16), [#17](https://github.com/ravecat/opalesce/issues/17))

### 🩹 Fixes

- **plugin-typescript:** scope recursive anonymous schemas to owner-local private aliases ([#16](https://github.com/ravecat/opalesce/issues/16))
- **plugin-typescript:** widen structurally incompatible index signatures ([#15](https://github.com/ravecat/opalesce/issues/15))
- **core:** fail closed on unrepresentable external schema references ([#17](https://github.com/ravecat/opalesce/issues/17))
- **core:** derive collision-free AsyncAPI 2.6 operation identities ([#14](https://github.com/ravecat/opalesce/issues/14))
- ⚠️  **plugin-typescript:** rename output path option ([#13](https://github.com/ravecat/opalesce/issues/13))

### ⚠️  Breaking Changes

- **plugin-typescript:** rename output path option  ([#13](https://github.com/ravecat/opalesce/issues/13))
  TypeScript plugin callers must pass `{ output: ... }` instead of `{ outputPath: ... }`.

### 🧱 Updated Dependencies

- Updated @opalesce/core to 0.1.0

# Changelog

## 0.0.1

- Initial workspace implementation.
