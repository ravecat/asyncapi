# AsyncAPI External Reference Identity Correction Specification

## Purpose

This capability closes [#17](https://github.com/ravecat/opalesce/issues/17) for raw string and object pipeline inputs where Core already retains authored source data. It prevents a parser-resolved external `$ref` from silently becoming an anonymous schema role with no stable interaction dependency identity.

## ADDED Requirements

### Requirement: Core classifies schema roles from retained authored provenance

When Core has an immutable authored source snapshot for a raw string or object pipeline input, interaction construction SHALL inspect the authored value at each schema-role pointer only to classify whether the parser model originated from a `$ref`. It SHALL continue to use the official parsed model for schema semantics and relationships.

Core SHALL prefer `PluginContext.source.data` and MAY use object-valued official parser input metadata already attached to the parsed document. It SHALL NOT parse source text again, invoke another parser, call a resolver, fetch a URI, or reconstruct effective traits and relationships from authored data.

#### Scenario: Classify an ordinary inline anonymous schema

- **GIVEN** a raw input contains an inline anonymous payload schema at `/channels/events/messages/Event/payload`
- **AND** the authored value at that pointer has no `$ref`
- **WHEN** Core constructs `context.interaction`
- **THEN** the schema remains an ordinary owner-scoped inline role
- **AND** contract construction succeeds

#### Scenario: Classify a parser-resolved external reference

- **GIVEN** a raw input contains `$ref: "memory://schemas/Payload"` at `/channels/events/messages/Event/payload`
- **AND** the official parser resolves it to an anonymous `SchemaInterface`
- **WHEN** Core constructs `context.interaction`
- **THEN** Core retains the authored pointer and reference URI as provenance evidence
- **AND** it does not treat the resolved model as an ordinary inline schema

#### Scenario: Keep parser-effective semantics authoritative

- **GIVEN** Core has both an authored snapshot and an official resolved schema model
- **WHEN** it classifies the schema role
- **THEN** authored data is used only to identify reference provenance
- **AND** schema format, effective values, traits, selections, and parser models still come from the official parsed document

### Requirement: Provable unrepresentable external targets fail closed

If authored provenance proves that a schema role came from an external `$ref` and the parser-resolved target does not map to a stable component or owner-scoped interaction identity, Core SHALL fail interaction construction with `INTERACTION_REFERENCE_UNSUPPORTED`. The error pointer SHALL be the authored schema-role pointer. Error details SHALL include `referenceKind: "schema"` and the exact authored `reference` URI.

Core SHALL NOT return the anonymous model with an empty dependency collection. It SHALL NOT synthesize an identity from a parser-generated schema ID, external URI basename, retrieval order, or numeric counter.

#### Scenario: Reject the #17 reproduction

- **GIVEN** the official parser resolves `memory://schemas/Payload` for an inline channel message payload
- **AND** the target is not represented by a stable interaction identity
- **WHEN** a plugin first accesses `context.interaction`
- **THEN** Core throws `INTERACTION_REFERENCE_UNSUPPORTED`
- **AND** the error pointer is `/channels/events/messages/Event/payload`
- **AND** error details contain the exact reference URI and `referenceKind: "schema"`

#### Scenario: Reject deterministically through the lazy plugin boundary

- **GIVEN** two equivalent runs access a provably unrepresentable external target
- **WHEN** interaction construction fails
- **THEN** both failures have equal code, pointer, and details
- **AND** the existing plugin execution boundary attributes the failure to the first consuming plugin
- **AND** no later plugin or partial artifact generation runs

#### Scenario: Keep representable local references

- **GIVEN** an authored `$ref` resolves to a named local component or an owner-scoped local recursive dependency
- **WHEN** Core builds dependencies
- **THEN** the existing stable component or owner-scoped identity is retained
- **AND** no unsupported-reference error is raised

### Requirement: Interaction construction performs no additional resolution

The initial official parse MAY call the configured resolver according to existing parser options. Subsequent interaction construction SHALL perform zero filesystem, network, parser, or resolver calls, whether classification succeeds or fails.

#### Scenario: Count resolver reads for an unsupported external target

- **GIVEN** a memory resolver records each read
- **WHEN** Core parses the raw input and a plugin accesses `context.interaction`
- **THEN** the resolver records exactly the reads made by the initial official parse
- **AND** interaction construction adds no read

#### Scenario: Repeat access after a cached construction error

- **GIVEN** lazy interaction construction has cached `INTERACTION_REFERENCE_UNSUPPORTED`
- **WHEN** the same pipeline context is accessed again through the existing error path
- **THEN** Core reuses the memoized failure behavior
- **AND** it performs no resolution work

### Requirement: Source-less pre-parsed document behavior remains non-breaking

This correction SHALL NOT reject every anonymous schema in a source-less pre-parsed official AsyncAPI document. When Core has neither an authored source snapshot nor object-valued authored parser input and therefore cannot prove that an anonymous role originated from an external `$ref`, it SHALL preserve the current interaction behavior. This unverifiable boundary SHALL be documented as a limitation rather than inferred from parser-generated anonymous IDs.

#### Scenario: Preserve a source-less official document with inline schemas

- **GIVEN** an existing official document contains an ordinary anonymous inline schema
- **AND** no inspectable authored snapshot is available
- **WHEN** a plugin accesses `context.interaction`
- **THEN** Core does not introduce a new blanket anonymous-schema rejection
- **AND** existing supported behavior is preserved

#### Scenario: Record the unverifiable external-reference boundary

- **GIVEN** a source-less pre-parsed official document may already contain a resolved anonymous external target
- **AND** the official model exposes no authored `$ref` provenance
- **WHEN** Core cannot distinguish that target from an authored inline schema without another parse or resolver
- **THEN** this correction makes no claim that the external origin can be detected
- **AND** documentation identifies the limitation explicitly

### Requirement: The regression corpus proves both classified paths and the limitation

Core data SHALL include raw object and raw string cases for an ordinary inline role and a memory-resolved external role, representable local component and recursive references, and a source-less official-document control. Supported-version coverage SHALL include AsyncAPI 2.6, 3.0, and 3.1 where the official parser accepts the equivalent reference location.

#### Scenario: Verify the #17 corpus matrix

- **WHEN** the external-reference identity matrix runs
- **THEN** provable external anonymous targets fail with exact code, pointer, reference URI, and zero extra resolver reads
- **AND** ordinary inline anonymous schemas succeed
- **AND** local component and recursive references keep stable dependencies
- **AND** the source-less official-document control preserves current behavior
- **AND** repeated outcomes are deterministic

## Non-Goals

- Generating TypeScript for external schema targets.
- Creating a resolved-resource registry or stable external URI identity scheme.
- Parsing authored text or resolving a reference during interaction construction.
- Reliably detecting erased external reference provenance in source-less pre-parsed official documents.
- Rejecting all parser-generated anonymous schema IDs.
