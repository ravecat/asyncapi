## 0.1.0 (2026-08-27)

### 🚀 Features

- **core:** expose unresolved AsyncAPI source ([a53e3dd](https://github.com/ravecat/opalesce/commit/a53e3dd))
- ⚠️  **config:** rename project config type ([238ac81](https://github.com/ravecat/opalesce/commit/238ac81))
- ⚠️  **core:** simplify plugin execution ([0c56b20](https://github.com/ravecat/opalesce/commit/0c56b20))

### ⚠️  Breaking Changes

- **config:** rename project config type  ([238ac81](https://github.com/ravecat/opalesce/commit/238ac81))
  replace imports of OpalesceConfig from @opalesce/config with Config.
- **core:** simplify plugin execution  ([0c56b20](https://github.com/ravecat/opalesce/commit/0c56b20))
  plugins must provide a build hook; setup, dependsOn, service tokens, phase-specific contexts, and accumulated artifact access are removed.

### 🧱 Updated Dependencies

- Updated @opalesce/config to 0.1.0
- Updated @opalesce/core to 0.1.0

## 0.0.1 (2026-07-31)

### 🧱 Updated Dependencies

- Updated @opalesce/config to 0.0.1
- Updated @opalesce/core to 0.0.1