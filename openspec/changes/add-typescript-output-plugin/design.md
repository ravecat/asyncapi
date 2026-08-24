## Context

Core parses each document once with the official `@asyncapi/parser`, passes its semantic model and diagnostics to plugins, and optionally retains the unresolved source snapshot. The JSON Schema plugin intentionally exports only `components.schemas`. TypeScript and the planned Zod output instead need the complete data boundary: named schemas, payloads, application headers, channel parameters, effective operation messages, and replies.

Kubb is an architectural reference rather than an AsyncAPI implementation. Its separation between input adaptation, schema projection, naming, file planning, and TypeScript printing transfers to this plugin, while its HTTP-specific artifacts do not. The source review and Modelina comparison are recorded in [TypeScript output plugin research](../../../docs/research/typescript-output-plugin.md).

The current `PluginContext` contains `document`, `diagnostics`, and optional `source`. If TypeScript and Zod each derive their own interaction roots, they can disagree about AsyncAPI version shapes, inline ownership, effective messages, and references. The shared semantic boundary therefore belongs to Core, while every target representation remains plugin-owned.

## Goals / Non-Goals

**Goals:**

- Add one target-neutral `InteractionContract` to plugin execution context.
- Normalize AsyncAPI 2.6, 3.0, and 3.1 interaction roots and relationships once per pipeline context.
- Preserve exact version, stable identities, source pointers, schema formats, dependencies, wire keys, recursion, traits, and effective message selections.
- Generate deterministic static TypeScript contracts for external-system data exchange.
- Keep `opalesce` as the primary entry point for configuration, plugin authoring, and contract types while official output plugins are independent `@opalesce/plugin-*` packages.

**Non-Goals:**

- Replace the complete parser document or expose servers, bindings, security, and extensions through the interaction contract.
- Generate clients, servers, transports, validators, serializers, mocks, Zod schemas, runtime enums, or runtime message envelopes.
- Parse again, fetch references during normalization, or introduce a second resolver policy.
- Convert Avro, OpenAPI, RAML, Protobuf, or unknown schema formats.
- Express validation semantics TypeScript cannot enforce, including exact `oneOf`, patterns, ranges, unique items, conditionals, and exact closed objects.
- Add Kubb-compatible file modes, filters, naming hooks, formatter orchestration, interfaces, classes, or configurable syntax strategies.
- Publish packages or change artifact persistence and CLI output ownership.

## Decisions

### Core owns the interaction contract

Add `packages/core/src/interaction` with public readonly contracts and an internal builder. `PluginContext` becomes:

```ts
interface PluginContext {
  readonly document: AsyncAPIDocumentInterface;
  readonly interaction: InteractionContract;
  readonly diagnostics: readonly Diagnostic[];
  readonly source?: AsyncAPISource;
}
```

Core creates a frozen context with an enumerable `interaction` getter. The getter builds the contract on first access, caches either the value or thrown error in the pipeline closure, and returns the same value to later plugins. Plugins that never access the property do not trigger normalization. A construction error occurs while the consuming plugin executes and is therefore wrapped by the existing `PluginExecutionError` with that plugin's name.

The property is always present in the public type and at runtime. It is not optional because output plugins must not branch on whether shared semantics happen to be available. Lazy construction preserves the behavior of plugins that only need `document`, including parsed versions outside this contract's explicit support.

Core exports `InteractionContract` and its root contracts. The `opalesce` facade re-exports those types. There is no `createInteractionModel` public helper, no separate interaction package, and no interaction entry in the user's plugin list.

### Contract and parser document have different purposes

`document` remains the complete official parser model for plugins that need bindings, servers, security, extensions, or other AsyncAPI metadata. `source` remains the optional authored unresolved snapshot. `interaction` contains only the normalized data-exchange graph shared by target generators.

The contract contains sorted schema, message, channel, and operation roots. Operation roots contain their optional reply contract. Every root has a kind-qualified identity, source pointer, exact source version, and authored or owner-derived name. Schema-bearing roles retain the official readonly `SchemaInterface`, effective schema format, and dependency identities.

Contract-owned arrays and metadata objects are recursively frozen. Parser-owned `SchemaInterface` instances are retained by reference and are never frozen or mutated. The public type exposes them as readonly semantic handles even though their runtime class is owned by `@asyncapi/parser`.

### Parser models remain authoritative

The builder uses `PluginContext.document` as the semantic authority. It uses parser models and `ModelMetadata.pointer` for resolved identities, applied traits, operation channels, effective message selections, and replies. It does not reconstruct those relationships from unresolved source.

For reference-provenance classification only, the builder may inspect the immutable authored snapshot already retained by Core or object-valued parser input metadata. This inspection answers whether the authored schema role contained `$ref`; it does not parse, resolve, fetch, or replace any parser-effective value. Source-less pre-parsed documents whose metadata contains only authored text remain outside that provable boundary.

AsyncAPI 3.0 and 3.1 use channel, message, and operation map identities. AsyncAPI 2.6 uses component names and `operationId` where present; otherwise exact channel identity plus publish or subscribe provides a deterministic operation identity. Publish normalizes to `send`, and subscribe normalizes to `receive`.

The contract records foreign schema formats without converting them. A target plugin chooses whether to support a format. A provably resolved external model is usable only if it maps to a stable representable identity; otherwise construction fails rather than resolving again.

### Focused dependency direction prevents cycles

Add `packages/plugin-typescript` as one independently publishable output plugin. The production graph is:

```text
opalesce -> @opalesce/core -> @asyncapi/parser
@opalesce/plugin-typescript -> @opalesce/core
```

The plugin does not depend on the facade. Core and the facade do not depend on the TypeScript plugin or compiler. Consumer tests prove the two public imports compose without introducing reverse project references or a transitive plugin dependency.

The `@opalesce/plugin-typescript` package default-exports `typescript` and exports `TypeScriptPluginOptions`. The `opalesce` facade does not re-export either. The first option is intentionally narrow:

```ts
interface TypeScriptPluginOptions {
  readonly output?: string;
}
```

`output` defaults to `types`.

### Modelina is not a first-delivery dependency

Stable `@asyncapi/modelina` 5.10.1 accepts AsyncAPI only through 3.0 and its document processor selects payload models without all required headers, channel parameters, wrappers, or operation-specific identities. The 6.x line adds 3.1 and optional headers but remains prerelease and still does not own the required contract graph.

Using only Modelina rendering would still require Opalesce to implement normalization, schema projection, naming, references, file assembly, and the fixed output policy. Its JSON Schema processor can also dereference independently, which violates the single resolver boundary. The first delivery uses the official TypeScript compiler factory and printer. Modelina can be reconsidered behind conformance fixtures after the Core contract is stable.

### The plugin owns a narrow target AST

The TypeScript plugin converts schema roles into a target AST for unknown, never, primitives, literals, arrays, tuples, objects, references, unions, intersections, property requiredness, nullability, read-only metadata, index signatures, and JSDoc.

Reference nodes retain interaction dependency identity instead of expanding graphs. The planner maps those identities through the completed naming table, removes same-file imports, and terminates for recursive graphs. The TypeScript compiler factory produces declarations and type-only imports and exports. The printer emits LF output. Generated strings are not reparsed for formatting and consumer formatter configuration is ignored.

### Public roots cover the data interaction boundary

The plugin emits:

- every named component schema, including unused schemas;
- every reusable component message and effective channel message;
- a payload alias, optional headers alias, and wrapper for each message;
- a channel-parameter object for each parameterized channel;
- an effective message alias for every operation;
- a reply-message alias for every operation with replies.

A message always exposes `payload`. When no payload schema exists, the payload alias is `unknown`. The wrapper exposes `headers` only for application headers. Binding and protocol header metadata do not become data properties.

```ts
export type UserCreatedPayload = User;

export type UserCreatedHeaders = {
  readonly traceId: string;
};

export type UserCreatedMessage = {
  payload: UserCreatedPayload;
  headers: UserCreatedHeaders;
};
```

A referenced payload still receives a message-owned payload alias. Parameter keys retain their exact wire form, and a parameter without a schema becomes `string`. Operation and reply aliases are emitted even for one selected message so imports remain operation-oriented and stable.

### Schema projection uses fixed wire-value mappings

The first delivery maps:

- JSON string, number, integer, boolean, and null to TypeScript `string`, `number`, `number`, `boolean`, and `null`;
- supported string formats to `string` and boolean schemas to `unknown` or `never`;
- const and enums to literal types and unions without runtime values;
- required properties to required members and other properties to `?`;
- nullable values to unions with `null`;
- read-only properties to `readonly` and write-only properties to retained members with `@writeOnly`;
- homogeneous arrays and tuples to array and tuple syntax;
- `allOf` to intersections and `anyOf` and `oneOf` to unions;
- `additionalProperties: true` to `[key: string]: unknown`;
- compatible typed additional properties to their value type, otherwise to `unknown`;
- `additionalProperties: false` to no index signature;
- descriptions, deprecation, defaults, examples, formats, constraints, access metadata, and discriminators to deterministic JSDoc where relevant.

The plugin does not synthesize discriminator fields. Unions narrow only when source branches already contain literal discriminants. Validation-only semantics remain documented approximations.

### Naming and files are deterministic

Public symbols use role-aware PascalCase names:

- `<Schema>`;
- `<Message>Payload`, `<Message>Headers`, `<Message>Message`;
- `<Channel>Parameters`;
- `<Operation>Message`, `<Operation>ReplyMessage`.

Component identities own their namespace, inline messages include channel ownership, and nested declarations include root ownership. Wire property names are never recased. The planner rejects public symbol collisions and per-directory filename collisions after NFC and lowercase normalization, including portable reserved filenames. It never appends counters.

The output topology is fixed:

```text
types/
  schemas/<Schema>.ts
  messages/<Message>.ts
  channels/<Channel>Parameters.ts
  operations/<Operation>.ts
  index.ts
```

Cross-file references use sorted `import type` declarations and relative `.js` specifiers. The barrel has explicit sorted `export type` declarations for public symbols only. The plugin returns the barrel first and remaining artifacts in lexicographic path order. Files use LF, two spaces, no byte-order mark, and one trailing newline.

### Errors are atomic and source-attributed

Contract normalization, schema projection, naming, planning, rendering, and syntax validation complete before an artifact array is returned. Contract and plugin errors have stable codes plus relevant source pointer and identity, format, reference, or naming detail. Core wraps failures with the consuming plugin name.

The TypeScript plugin accepts native AsyncAPI schemas and explicit JSON Schema Draft 07 roles for AsyncAPI 2.6, 3.0, and 3.1. Foreign formats fail in the plugin, not the target-neutral Core contract. Neither Core normalization nor the plugin performs filesystem or network access.

### Conformance covers Core and consumer behavior

Core owns fixtures that assert contract roots, identities, pointers, selections, replies, traits, dependencies, immutability, laziness, memoization, and parser preservation. The plugin owns self-contained corpus cases with complete expected trees.

Successful plugin cases run twice through Core, compare paths and bytes, compile with strict NodeNext settings, and include positive plus `@ts-expect-error` assignments. The corpus covers supported versions, reusable and inline messages, payloads and headers, parameters, operations, replies, traits, used and unused schemas, recursion, composition, nullability, access annotations, enums, additional properties, unsafe names, collisions, formats, empty interactions, and ordering.

A facade-owned integration fixture imports configuration helpers from `opalesce` and the generator from `@opalesce/plugin-typescript`, persists output through the CLI, imports the generated barrel, and compiles a consumer.

## Risks / Trade-offs

- [Core contract becomes target-specific] -> Keep language names, target AST, validation approximations, and file planning inside output plugins.
- [Contract construction changes unrelated plugins] -> Use a memoized lazy context getter and test that unused access performs no work.
- [Contract duplicates parser models] -> Store stable registry metadata and normalized relationships while retaining official schema handles.
- [Parser-owned models appear immutable but are not frozen] -> Expose readonly types, freeze only contract-owned values, and test that normalization never mutates parser instances.
- [TypeScript approximates validation] -> Document limitations and never claim runtime validation equivalence.
- [Recursive graphs expand indefinitely] -> Track parser object identity and emit symbolic dependency identities.
- [External identities are unstable] -> Fail without another resolution path.
- [Compiler printer output changes] -> Pin TypeScript through the lockfile and review exact golden changes on upgrades.

## Acceptance Correction Designs

The first implementation review found four acceptance defects that remain part of this delivery rather than optional follow-up enhancements. Feature #13 remains incomplete until all four corrections pass their focused and complete-corpus oracles.

### #14 derives AsyncAPI 2.6 operation identity before target naming

The parser gives an AsyncAPI 2.6 operation without `operationId` the fallback ID `publish` or `subscribe`. Core must not use that value as authored identity. The operation builder first checks whether the raw operation object has a non-empty authored `operationId`. If present, identity and name remain `operation:<operationId>` and `<operationId>`. Otherwise it uses:

```text
identity = operation:<channel-identity>:<authored-role>
name = <exact-channel-key>-<authored-role>
pointer = /channels/<escaped-channel-key>/<authored-role>
```

`channel-identity` already retains the exact unescaped map key. The pointer independently uses RFC 6901 escaping. This yields distinct Core registry keys and distinct PascalCase TypeScript operation names before the filename table is built. No suffixing or iteration-order fallback is permitted. AsyncAPI 3 operation map keys and authored AsyncAPI 2.6 IDs remain unchanged.

### #17 classifies provable external references from retained provenance

The official parser replaces `$ref` with the resolved schema object and may assign only a generated ID such as `<anonymous-schema-1>`. The resolved model alone cannot distinguish an external target from an authored inline schema. Core therefore builds a read-only authored-reference index once per interaction construction from data it already owns:

1. Use `PluginContext.source.data` when present.
2. Otherwise use `document.meta("asyncapi").input` only when it is already an object.
3. Do not parse string metadata, invoke another parser, or call a resolver.

The index records schema-role pointers whose authored value is a `$ref` plus the exact reference string. Normalization still reads every semantic value from the official parser model. When the index proves that a role originated from an external reference and the resolved model does not map to a component or owner-scoped local dependency, Core throws `INTERACTION_REFERENCE_UNSUPPORTED` with the role pointer and `{ referenceKind: "schema", reference }`. The lazy interaction getter caches and attributes that error through the consuming plugin boundary.

This fix deliberately does not reject all anonymous models. A source-less pre-parsed official document with string-valued parser input metadata cannot provide proof after the parser erases `$ref`; preserving current behavior is less destructive than rejecting ordinary inline schemas. That unverifiable boundary is documented and covered as a no-regression control. Supporting external targets requires a future resolved-resource identity registry.

### #15 proves index compatibility over the complete target AST

`targetKey` remains useful for deterministic union deduplication but cannot decide assignability because its object key currently omits nested property types and modifiers. Introduce a separate terminating structural relation over `TargetType` pairs. It handles literals and primitives, unions in the safe direction, arrays, tuples, object requiredness and nested property types, object index values, and equal symbolic reference identities. Documentation and `readonly` metadata do not alter represented value compatibility. Intersections, different reference identities, and any unhandled relation fail conservatively.

The relation is used only to decide whether a schema-valued `additionalProperties` candidate is safe for every fixed property. Failure widens the candidate to `unknown`; it does not fail generation. Pair memoization or symbolic-reference comparison prevents recursive graphs from expanding. Both native parser models and Draft 07 raw projection call the same relation.

### #16 plans recursive anonymous graphs before projection

Projection needs an owner-local graph phase before recursive descent. The owner is one public schema identity, message payload identity, or message headers identity. Graph nodes are keyed by parser object identity and canonical pointer; edges follow the same schema-child vocabulary already traversed by Core. Strongly connected components identify anonymous self-cycles and mutual cycles. Named component targets retain public identities. Acyclic anonymous nodes remain inline.

Every anonymous member of a recursive component receives:

```text
identity = schema:private:<owner-identity>:<relative-pointer>
name = <owner-public-name><role-aware-relative-path>
visibility = file-local
```

Role-aware path tokens include property keys, item positions, composition branch and index, additional properties, and definitions. The existing Unicode and collision policy applies before rendering and rejects private collisions without counters. Add visibility to the planned declaration contract so the renderer omits `export` for private aliases. Private aliases are emitted in the owning schema or message file, are absent from the root barrel, never require imports, and refer to each other symbolically. Public declarations and barrel behavior remain unchanged.

## Regression Corpus Plan

The corpus is split by ownership rather than duplicated across packages:

- `packages/core/test/fixtures/interaction-cases.ts` owns small raw-input builders, exact Core summaries, source snapshots, and resolver counters for #14 and #17.
- `packages/core/test/interaction.test.ts` asserts identities, pointers, dependencies, error details, lazy attribution, source-less controls, and zero additional resolution.
- `packages/plugin-typescript/test/projection.test.ts` owns table-driven target-AST compatibility and owner-graph unit matrices for #15 and #16.
- `packages/plugin-typescript/test/fixtures/corpus/cases/*` owns only representative end-to-end inputs and complete golden trees. Existing `corpus.ts` remains the single manifest loader, orphan-file guard, repeated-run harness, diagnostic matcher, and strict NodeNext compiler harness.
- Core tests do not import plugin fixtures, and plugin tests do not import Core test helpers. Equivalent behavior is repeated only where a separate package boundary has a distinct oracle.

### Required data and oracles

| Case                                     | Input and purpose                                                                                                                        | Expected Core oracle                                                                                                                     | Expected TypeScript or diagnostic oracle                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `operation-same-role-2.6`                | `first.publish` and `second.publish` without `operationId`                                                                               | Identities `operation:channel:first:publish` and `operation:channel:second:publish`, exact pointers, `send`, distinct message selections | Golden `FirstPublish.ts` and `SecondPublish.ts`, both barrel exports, strict compile, repeated bytes |
| `operation-mixed-2.6`                    | One channel with both roles, another authored `operationId`, and `/` plus `~` in channel keys                                            | Derived role identities remain distinct, authored ID remains authoritative, identity keys stay exact while pointers are escaped          | Focused naming assertions and no filename collision                                                  |
| `operation-control-3.x`                  | Equivalent 3.0 and 3.1 top-level `sendEvent` operations                                                                                  | Identity remains `operation:sendEvent`; replies and selections unchanged                                                                 | Existing 3.0 and 3.1 golden trees remain byte-identical                                              |
| `structured-index-compatible`            | Nested objects with equal required properties, arrays, tuples, unions, equal references, and nested index values                         | No Core contract change                                                                                                                  | Typed index retained and strict compilation succeeds                                                 |
| `structured-index-incompatible`          | `{ value: string }` fixed value against `{ value: number }`, optional-to-required mismatch, tuple and union mismatch, unequal references | No Core contract change                                                                                                                  | Index widens to `unknown`; complete tree compiles and matches golden bytes                           |
| `structured-index-cross-version`         | Equivalent native 2.6, native 3.0, and Draft 07 3.1 schemas                                                                              | Equivalent schema roles and formats retained                                                                                             | Equal retain-or-widen decisions through the shared target-AST relation                               |
| `anonymous-recursion-schema`             | 3.1 schema-owned self-cycle and mutual anonymous cycle through properties, arrays, and composition                                       | Existing public dependency identities remain unchanged                                                                                   | File-local private aliases, no private barrel export, no self-import, strict compile, repeated bytes |
| `anonymous-recursion-message`            | 2.6 message payload and headers owning recursive anonymous nodes                                                                         | Message roles retain exact pointers and owner                                                                                            | Private aliases remain in the message file while payload, headers, and wrapper stay public           |
| `anonymous-recursion-control-3.0`        | Acyclic anonymous nesting plus named component recursion                                                                                 | Public identities and dependencies remain stable                                                                                         | Acyclic shapes remain inline and component references remain public                                  |
| `anonymous-private-collision`            | Two recursive paths under one owner normalize to one private symbol                                                                      | No Core failure                                                                                                                          | Atomic `TYPESCRIPT_SYMBOL_COLLISION` with both identities and pointers                               |
| `external-reference-provable`            | Raw object and raw string inputs with `memory://schemas/Payload` resolver for 2.6, 3.0, and 3.1 where accepted                           | `INTERACTION_REFERENCE_UNSUPPORTED` at authored role pointer with exact URI; parser read count unchanged by interaction access           | Plugin execution attributes the Core error, returns no artifacts, and repeats equal diagnostics      |
| `external-reference-inline-control`      | Equivalent ordinary inline anonymous payloads                                                                                            | Contract succeeds with owner-scoped roles and no false reference edge                                                                    | Existing generation succeeds and repeats identical bytes                                             |
| `external-reference-local-control`       | Component, self-recursive, and mutual local references                                                                                   | Existing stable dependency identities and cycles remain                                                                                  | Public and private symbolic output remains compilable                                                |
| `external-reference-source-less-control` | Existing official document passed without inspectable authored snapshot                                                                  | Current interaction behavior is preserved; no blanket anonymous rejection                                                                | Explicitly documents the unverifiable external-origin boundary                                       |

The manifest must distinguish interaction-construction errors from TypeScript generation errors so #17 asserts `InteractionContractError` through `PluginExecutionError`, while existing plugin failures continue to assert `TypeScriptGenerationError`. Successful corpus entries run twice, compare complete paths and bytes, compile with `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `isolatedModules`, and NodeNext module settings, and include representative positive and `@ts-expect-error` consumers. Failure entries run twice and compare code, pointer, and details while accepting no partial tree.

## Migration Plan

1. Update Core public contracts, add the lazy interaction getter, and verify existing plugins without accessing it.
2. Implement version normalization, identity registry, dependency graph, errors, and Core contract fixtures.
3. Scaffold `@opalesce/plugin-typescript`, then implement projection, naming, planning, printing, and conformance.
4. Keep the `opalesce` facade limited to Core, configuration, and orchestration exports.
5. Add CLI and consumer compilation coverage using the facade and independent plugin package together, then run focused plus aggregate validation.
6. Document the context field, package boundary, plugin import, output surface, and validation limitations.
7. Establish the shared acceptance corpus metadata and Core fixture builders before changing the four failing behaviors.
8. Correct #14 operation identity and #17 provable external-reference rejection in Core, then lock their identities, pointers, diagnostics, and resolver-call counts.
9. Correct #15 structural index compatibility and #16 anonymous recursion in the TypeScript projector and planner, then lock complete golden trees and strict compilation.
10. Run unchanged cross-version controls, aggregate repository validation, strict OpenSpec validation, and issue reconciliation before returning #13 to review.

Rollback of the additive feature removes the context getter, Core contract modules and exports, facade type exports, and the TypeScript plugin package. Rollback of an individual acceptance correction reverts its implementation and new corpus entries together; existing persisted artifacts require no migration.

## Open Questions

None. Zod output, Modelina integration, configurable syntax, runtime constants, and broader schema formats require separate changes while consuming the same Core interaction contract.
