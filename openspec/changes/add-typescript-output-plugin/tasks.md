## 1. Core Interaction Contract Surface

- [x] 1.1 Define readonly public metadata, schema-role, schema-root, message, channel, parameter, operation, reply, dependency, and `InteractionContract` types under `packages/core/src/interaction`.
- [x] 1.2 Add stable `InteractionContractError` codes and source-attributed details for unsupported versions, identities, and references.
- [x] 1.3 Export the intended interaction contract types and error from `@opalesce/core` without exposing internal registry helpers.
- [x] 1.4 Add compile-time export and immutability contracts for the new Core public surface.

## 2. Contract Identity and Schema Dependencies

- [x] 2.1 Complete kind-qualified identities and exact parser pointer extraction for component, channel-owned inline, operation, and reply roots, including the exact #14 AsyncAPI 2.6 fallback identity contract and the #17 reference-provenance boundary.
- [x] 2.2 Implement a registry that deduplicates parser model objects and retains schema handles plus effective formats without mutating them.
- [x] 2.3 Traverse schema-bearing roles into deterministic dependency identities while terminating for repeated, self-recursive, and mutually recursive graphs.
- [x] 2.4 Implement recursive freezing for contract-owned objects and arrays while leaving parser-owned model instances unchanged.
- [x] 2.5 Add focused tests for identities, dependency deduplication, recursion, ordering, parser preservation, #14 same-role AsyncAPI 2.6 operations, and #17 provable external reference targets with exact diagnostics and resolver-call counts.

## 3. AsyncAPI Version Normalization

- [x] 3.1 Normalize AsyncAPI 3.0 and 3.1 component schemas, reusable and channel messages, application headers, payloads, channel parameters, operations, and replies.
- [x] 3.2 Normalize AsyncAPI 2.6 component schemas, reusable and channel messages, application headers, payloads, parameters, publish and subscribe operations, and #14 collision-free `operation:<channel-identity>:<role>` derived identities.
- [x] 3.3 Use parser-effective traits, channels, message selections, and reply selections instead of rebuilding those relationships from unresolved source.
- [x] 3.4 Preserve foreign schema formats without conversion and implement #17 fail-closed rejection only for externally resolved anonymous targets proven from an already retained authored snapshot, without another parse or resolver.
- [x] 3.5 Add 2.6, 3.0, and 3.1 contract fixtures covering inline ownership, traits, selections, replies, used and unused schemas, parameters, formats, recursion, #14 derived operation identities, #17 provable external failures, ordinary inline success, and the source-less official-document control.
- [x] 3.6 Add tests for deterministic repeated normalization and absence of filesystem, network, parser, or artifact side effects.

## 4. PluginContext Integration

- [x] 4.1 Add readonly `interaction: InteractionContract` to `PluginContext`.
- [x] 4.2 Implement an enumerable lazy getter that memoizes one contract or construction error per pipeline context.
- [x] 4.3 Verify two consuming plugins receive the same contract identity and normalization runs once.
- [x] 4.4 Verify plugins that never access `interaction` preserve current behavior, including parsed versions outside contract support.
- [x] 4.5 Verify contract construction failures use the existing consuming-plugin error attribution and prevent later plugin execution.
- [x] 4.6 Update Core README and public type tests for the expanded context contract.

## 5. TypeScript Plugin Foundation

- [x] 5.1 Scaffold `packages/plugin-typescript` as the independently publishable `@opalesce/plugin-typescript` package with the workspace Nx, package, TypeScript, Vitest, license, changelog, and export configuration used by focused libraries.
- [x] 5.2 Add dependencies on `@opalesce/core` and TypeScript plus the required workspace references and lockfile metadata.
- [x] 5.3 Implement `TypeScriptPluginOptions` with only readonly `output?: string`, defaulting to `types`.
- [x] 5.4 Implement the default `typescript` factory with literal plugin name `typescript` and generation from `context.interaction` only.
- [x] 5.5 Add stable plugin error codes carrying source pointer and identity, format, reference, naming, or projection details.
- [x] 5.6 Add direct-package runtime, compile-time export, default-path, custom-path, and contract-consumption tests.

## 6. Schema Projection

- [x] 6.1 Define the plugin-owned target AST for unknown, never, primitives, null, literals, arrays, tuples, objects, references, unions, intersections, properties, index signatures, and documentation.
- [x] 6.2 Project boolean, primitive, const, enum, array, tuple, required, optional, nullable, read-only, and write-only semantics.
- [x] 6.3 Project `allOf`, `anyOf`, and `oneOf` with documented TypeScript approximations and no synthesized discriminator fields.
- [x] 6.4 Implement #15 conservative structural target-AST compatibility for schema-valued additional properties and safe widening to `unknown` for every unproven nested value relation.
- [x] 6.5 Preserve symbolic dependency identities and transitive recursion without expanding parser graphs, including the #16 owner-local graph and strongly connected component handling for recursive anonymous schemas.
- [x] 6.6 Collect and safely escape deterministic JSDoc for descriptions, deprecation, defaults, examples, formats, constraints, access annotations, and discriminators.
- [x] 6.7 Reject unsupported formats and unprojectable schemas before artifact return.
- [x] 6.8 Add table-driven focused projection tests for every mapping, approximation, escape case, #15 structural compatibility branch, #16 named and anonymous recursion branch, and stable failure mode.

## 7. Naming, Planning, and Rendering

- [x] 7.1 Implement deterministic role-aware PascalCase names and #16 owner-scoped private names from canonical relative pointers while preserving exact wire keys and rejecting normalized collisions without counters.
- [x] 7.2 Complete the symbol table before rendering and reject public symbol collisions without counter suffixes.
- [x] 7.3 Reject per-directory filename collisions after NFC, lowercase, and portable reserved-name normalization.
- [x] 7.4 Plan fixed schema, message, channel, operation, and barrel paths under the normalized output path.
- [x] 7.5 Compute imports and exports from dependency identities, remove same-file imports, and use sorted relative `.js` type-only specifiers.
- [x] 7.6 Render target AST declarations with the TypeScript compiler factory and printer using fixed LF and two-space formatting.
- [x] 7.7 Render schema files, message payload and header wrappers, #16 non-exported owner-scoped private declarations, channel parameters, operation selections, replies, and a barrel containing public symbols only.
- [x] 7.8 Validate rendered TypeScript syntax, enforce one trailing newline, and return the barrel first followed by lexicographic paths only after all stages succeed.
- [x] 7.9 Add naming, planning, and rendering tests for unsafe names, public and #16 private collisions, empty output, imports, public and private cycles, paths, bytes, visibility, and atomic failures.

## 8. TypeScript Conformance Corpus

- [x] 8.1 Build corpus utilities that run self-contained inputs and complete expected artifact trees through the public Core pipeline.
- [x] 8.2 Add representative AsyncAPI 2.6, 3.0, and 3.1 cases that collectively cover schemas, reusable and inline messages, payloads, headers, parameters, operations, and replies.
- [x] 8.3 Add representative corpus cases for #14 derived operations, #15 compatible and incompatible structured indices, #16 schema-owned and message-owned anonymous recursion, plus used and unused schemas, references, composition, literals, nullability, access annotations, unsafe keys, and JSDoc escaping.
- [x] 8.4 Add corpus failures for unsupported formats and references, unrepresentable roots, symbol collisions, and filename collisions, plus a rendering-boundary failure test.
- [x] 8.5 Compare every path and byte, run success cases twice, and assert atomic stable diagnostics for failure cases.
- [x] 8.6 Compile every success tree under strict NodeNext settings, including #14 operation output, #15 structured indices, #16 private recursion, and #17 inline controls, and add representative positive plus `@ts-expect-error` assignments.

## 9. Facade and CLI Integration

- [x] 9.1 Keep `opalesce` free of output-plugin dependencies and expose TypeScript only through the independent `@opalesce/plugin-typescript` package.
- [x] 9.2 Re-export `InteractionContract` and its intended public types from `opalesce` through the existing Core dependency.
- [x] 9.3 Add consumer type tests proving third-party plugins can consume `context.interaction` from `opalesce` and configure TypeScript from `@opalesce/plugin-typescript`.
- [x] 9.4 Add facade-owned CLI persistence and strict consumer-compilation coverage using `opalesce` with the independent TypeScript plugin package.
- [x] 9.5 Verify existing Core, CLI, config, and JSON Schema plugin behavior and contracts remain compatible when interaction is unused.

## 10. Documentation and Validation

- [x] 10.1 Document the Core context contract, facade and independent plugin-package boundary, generated interaction surface, fixed directory layout, and types-only limitations.
- [x] 10.2 Document parser and resolver ownership, lazy normalization, foreign-format handling, and why Modelina is not a first-delivery dependency.
- [x] 10.3 Run focused builds, type checks, and tests for Core, `@opalesce/plugin-typescript`, `opalesce`, and affected CLI integration.
- [x] 10.4 Run repository formatting, linting, aggregate checks, builds, and package verification through established workspace commands.
- [x] 10.5 Run strict OpenSpec validation and reconcile implementation, conformance, documentation, GitHub Feature #13, and bugs #14 through #17 with all six capability specifications.

## 11. Acceptance Corpus Foundations

- [x] 11.1 Add `packages/core/test/fixtures/interaction-cases.ts` with reusable raw-input builders, expected contract summaries, source snapshots, and resolver counters for #14 and #17 without importing plugin test data.
- [x] 11.2 Extend the existing TypeScript corpus manifest and harness to distinguish Core interaction errors from plugin generation errors and to compare stable code, pointer, details, plugin attribution, and atomic artifact absence.
- [x] 11.3 Keep golden cases self-contained and case-local, reuse one strict NodeNext compiler and repeated-run harness, and reject orphan files so fixture growth does not duplicate infrastructure.

## 12. Issue #14 Operation Identity Correction

- [x] 12.1 Add Core matrix cases for two same-role channels, both roles on one channel, mixed authored and derived IDs, special `/` and `~` channel keys, and unchanged 3.0 and 3.1 operation-map identities.
- [x] 12.2 Derive missing AsyncAPI 2.6 identities as `operation:<channel-identity>:<publish|subscribe>` and names as `<exact-channel-key>-<publish|subscribe>` while preserving authored IDs, exact pointers, actions, and selections.
- [x] 12.3 Add the `operation-same-role-2.6` complete golden tree with distinct `FirstPublish.ts` and `SecondPublish.ts`, barrel exports, repeated-run byte identity, and strict compilation.

## 13. Issue #17 External Reference Identity Correction

- [x] 13.1 Build an authored-reference index from retained `source.data` or already object-valued parser input metadata, and use it only for provenance classification without parsing, fetching, relationship reconstruction, or resolver calls.
- [x] 13.2 Reject provable externally resolved anonymous targets with `INTERACTION_REFERENCE_UNSUPPORTED`, the authored role pointer, exact reference URI, and `referenceKind: "schema"`, while retaining local component and owner-scoped recursive identities.
- [x] 13.3 Add raw object and string cases for ordinary inline success and memory-resolved external failure across 2.6, 3.0, and 3.1 where accepted, asserting initial resolver reads and zero interaction-time reads.
- [x] 13.4 Add a source-less official-document control that preserves current anonymous inline behavior and document the unverifiable external-origin boundary as a limitation and non-goal.

## 14. Issue #15 Structural Index Compatibility Correction

- [x] 14.1 Implement one terminating conservative relation over primitives, literals, unions, arrays, tuples, object properties and requiredness, nested indices, and equal symbolic references, with unproven intersections or unequal references returning false.
- [x] 14.2 Use the relation in native and Draft 07 projection before planning, widening incompatible schema-valued index candidates to `unknown` without failing generation.
- [x] 14.3 Add a table-driven focused matrix for nested type mismatch, optional-to-required mismatch, arrays, tuples, unions, equal and unequal references, nested indices, recursion termination, and boolean or absent additional-properties boundaries.
- [x] 14.4 Add compatible and incompatible structured-index golden output with native 2.6, native 3.0, and Draft 07 3.1 controls, repeated bytes, and strict NodeNext compilation.

## 15. Issue #16 Anonymous Recursion Correction

- [x] 15.1 Build one owner-local schema graph for each public schema, payload, or headers role and assign private identities to anonymous strongly connected components while leaving acyclic anonymous nodes inline and component targets public.
- [x] 15.2 Derive collision-checked private names from owner names and role-aware relative pointer tokens, rejecting normalized conflicts with `TYPESCRIPT_SYMBOL_COLLISION` and no counters.
- [x] 15.3 Add declaration visibility to planning and rendering so private aliases are non-exported, stay in the owner file, remain absent from the barrel, and use no cross-file imports.
- [x] 15.4 Add focused self-cycle, mutual-cycle, array, composition, acyclic, public-reference, and private-collision cases for schema and message owners across supported versions.
- [x] 15.5 Add complete `anonymous-recursion-schema` and `anonymous-recursion-message` golden trees with strict compilation, no private barrel exports, no self-imports, and repeated-run byte identity.

## 16. Blocker Validation and Reconciliation

- [x] 16.1 Run focused Core and TypeScript plugin tests, verify exact Core identities, dependencies, diagnostics, golden paths and bytes, strict compilation, and absence of additional parser, resolver, filesystem, network, or artifact side effects.
- [x] 16.2 Run existing 2.6, 3.0, and 3.1 conformance cases unchanged as no-regression controls, then run repository formatting, linting, aggregate checks, builds, and package verification.
- [x] 16.3 Validate OpenSpec strictly, reconcile all acceptance checkboxes and linked documentation with verified results, close #14 through #17 only after their individual matrices pass, and return #13 to review only when no blocker remains.
