# AsyncAPI 2.6 Operation Identity Correction Specification

## Purpose

This capability closes [#14](https://github.com/ravecat/opalesce/issues/14). It prevents parser fallback IDs such as `publish` and `subscribe` from collapsing distinct AsyncAPI 2.6 operations into one Core identity or one TypeScript artifact.

## ADDED Requirements

### Requirement: AsyncAPI 2.6 operation identity distinguishes authored and derived values

For AsyncAPI 2.6, Core SHALL treat a non-empty authored `operationId` as authoritative. When `operationId` is absent, Core SHALL derive the operation identity from the already normalized exact channel identity and the authored `publish` or `subscribe` role. The derived identity SHALL be `operation:<channel-identity>:<role>`, where `<channel-identity>` is the complete `channel:<exact-channel-key>` identity and `<role>` is exactly `publish` or `subscribe`.

The owner-derived operation name used by target plugins SHALL be `<exact-channel-key>-<role>`. A parser fallback `operation.id()` equal to `publish` or `subscribe` SHALL NOT be interpreted as authored input. Derivation SHALL NOT append counters or depend on channel iteration order.

#### Scenario: Two channels publish without operationId

- **GIVEN** AsyncAPI 2.6 channels `first` and `second` each declare `publish` without `operationId`
- **WHEN** Core builds the interaction contract
- **THEN** the operation identities are `operation:channel:first:publish` and `operation:channel:second:publish`
- **AND** their owner-derived names are `first-publish` and `second-publish`

#### Scenario: One channel declares both operation roles

- **GIVEN** one AsyncAPI 2.6 channel declares `publish` and `subscribe` without `operationId`
- **WHEN** Core builds the interaction contract
- **THEN** the operation identities differ by the exact authored roles `publish` and `subscribe`
- **AND** their normalized actions remain `send` and `receive`, respectively

#### Scenario: An authored operationId remains authoritative

- **GIVEN** an AsyncAPI 2.6 operation declares non-empty `operationId: "publishEvent"`
- **WHEN** Core builds the interaction contract
- **THEN** its identity is `operation:publishEvent`
- **AND** its name is `publishEvent`
- **AND** Core does not replace it with the channel-and-role fallback

#### Scenario: Exact channel identity is distinct from JSON Pointer escaping

- **GIVEN** channels whose exact keys contain `/` or `~`
- **WHEN** Core derives operation identities and source pointers
- **THEN** each identity retains the unescaped exact channel key through its `channel:<exact-channel-key>` identity
- **AND** each source pointer uses RFC 6901 escaping independently

### Requirement: Derived operations generate collision-free TypeScript artifacts

The TypeScript plugin SHALL use the Core-provided owner-derived operation name. Same-role operations on different channels SHALL produce distinct deterministic operation symbols, files, imports, and barrel exports. Generation SHALL complete atomically and SHALL NOT report `TYPESCRIPT_FILENAME_COLLISION` solely because the parser supplied equal fallback role IDs.

#### Scenario: Same-role operations produce separate files

- **GIVEN** `first.publish` and `second.publish` without authored operation IDs
- **WHEN** `typescript()` generates the complete tree
- **THEN** it emits `types/operations/FirstPublish.ts` and `types/operations/SecondPublish.ts`
- **AND** each file references only its effective channel message selection
- **AND** the barrel exports both operation message aliases

#### Scenario: Repeated generation preserves identities and bytes

- **GIVEN** one supported AsyncAPI 2.6 input containing authored and derived operation identities
- **WHEN** Core normalization and TypeScript generation each run twice
- **THEN** operation identity order, artifact paths, artifact order, imports, exports, and bytes are identical between runs

### Requirement: Operation identity correction has bounded version scope

The fallback derivation SHALL apply only to AsyncAPI 2.6 operations without authored `operationId`. AsyncAPI 3.0 and 3.1 top-level operation map identities, authored AsyncAPI 2.6 identities, message selections, actions, replies, and source pointers SHALL otherwise retain their specified behavior.

#### Scenario: AsyncAPI 3 operation identities do not change

- **GIVEN** equivalent AsyncAPI 3.0 and 3.1 documents with top-level operation key `sendEvent`
- **WHEN** Core builds each interaction contract
- **THEN** each operation identity remains `operation:sendEvent`
- **AND** no channel-and-role fallback is introduced

### Requirement: The regression corpus proves the operation identity boundary

Core regression data SHALL cover two same-role operations on different channels, both roles on one channel, a mixed authored-and-derived document, and special channel keys. The TypeScript conformance corpus SHALL include a complete AsyncAPI 2.6 golden tree for the same-role collision reproduction and SHALL compile it under strict NodeNext settings.

#### Scenario: Verify the #14 corpus case

- **WHEN** the #14 Core fixtures and TypeScript corpus case run
- **THEN** expected Core identities, names, pointers, actions, and message selections match exactly
- **AND** the complete expected artifact tree matches path-for-path and byte-for-byte
- **AND** strict NodeNext compilation has no diagnostics

## Non-Goals

- Changing parser validation for duplicate authored `operationId` values.
- Renaming AsyncAPI 3.0 or 3.1 operations.
- Adding configurable operation naming or collision suffixes.
- Adding replies to AsyncAPI 2.6.
