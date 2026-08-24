# TypeScript Structural Index Compatibility Correction Specification

## Purpose

This capability closes [#15](https://github.com/ravecat/opalesce/issues/15). It prevents the plugin from retaining a schema-valued string index signature when a fixed property is not assignable to the represented index value type.

## ADDED Requirements

### Requirement: Typed index signatures require a conservative structural proof

For a schema-valued `additionalProperties`, the TypeScript plugin SHALL retain the projected candidate index value only when every fixed property type is provably assignable to that candidate in the plugin-owned target AST. If the relation cannot prove assignability, the plugin SHALL use `unknown`. The compatibility check SHALL be recursive, deterministic, side-effect free, and terminating.

The relation SHALL apply these rules:

- `unknown` as a target accepts every source, and `never` as a source is accepted by every target.
- Equal primitive, null, literal, and symbolic reference identities are compatible; a literal is compatible with its corresponding primitive.
- A source union is compatible only when every member is compatible with the target; a target union is compatible when the complete source is compatible with at least one member.
- Arrays compare item types recursively. Tuples compare required positions recursively, and a tuple compared with an array requires every tuple item to be compatible with the array item.
- Object comparison accounts for nested property types and optionality. Every required target property must exist as a required source property with a compatible type. An optional target property may be absent; when present, its source type must be compatible. Documentation and `readonly` annotations do not change value compatibility.
- When a target object has an index value, every represented source property and source index value must also be compatible with it.
- Symbolic references are compatible without graph expansion only when their target identities are equal.
- Intersections and any relation not proven by the preceding rules SHALL conservatively fail the proof rather than approximate success.

#### Scenario: Equal nested objects retain a typed index

- **GIVEN** a fixed property and `additionalProperties` both project to an object with required `value: string`
- **WHEN** the plugin evaluates index compatibility
- **THEN** the index value retains the structured object type
- **AND** the complete generated file compiles under strict TypeScript settings

#### Scenario: A nested property type mismatch widens the index

- **GIVEN** a fixed property projects to `{ value: string }`
- **AND** `additionalProperties` projects to `{ value: number }`
- **WHEN** the plugin evaluates index compatibility
- **THEN** it uses `[key: string]: unknown`
- **AND** it does not return the invalid typed index signature

#### Scenario: Requiredness is part of object compatibility

- **GIVEN** the candidate index value requires property `value`
- **AND** a fixed property type makes `value` optional or omits it
- **WHEN** compatibility is evaluated
- **THEN** the proof fails and the index value widens to `unknown`

#### Scenario: Arrays and tuples compare represented elements

- **GIVEN** fixed properties and an index candidate use nested arrays or tuples
- **WHEN** their element or position types differ
- **THEN** compatibility fails at the represented element boundary
- **AND** the containing index value widens to `unknown`

#### Scenario: Unions are proven in the safe direction

- **GIVEN** a fixed property projects to a union
- **WHEN** at least one source union member is not assignable to the candidate index value
- **THEN** compatibility fails
- **AND** the index value widens to `unknown`

#### Scenario: Symbolic references avoid recursive expansion

- **GIVEN** a fixed property and candidate index value refer to schema identities
- **WHEN** compatibility is evaluated
- **THEN** equal reference identities are compatible
- **AND** different identities or unresolved structural equivalence are treated as unproven
- **AND** recursive graphs terminate

### Requirement: Safe widening occurs before rendering and artifact return

Compatibility and widening SHALL finish in schema projection before file planning, printing, syntax validation, or artifact return. A successful generation SHALL never return a tree that fails strict TypeScript compilation because a fixed property violates its generated string index signature.

#### Scenario: The issue reproduction compiles after widening

- **GIVEN** the #15 schema with incompatible nested fixed and index object values
- **WHEN** `typescript()` generates and compiles the complete tree
- **THEN** generation succeeds with an `unknown` index value
- **AND** strict NodeNext compilation reports no property-to-index diagnostic

#### Scenario: Compatible structured values are not widened unnecessarily

- **GIVEN** every fixed property is structurally compatible with the schema-valued index candidate
- **WHEN** generation completes
- **THEN** the projected typed index value is retained
- **AND** strict NodeNext compilation succeeds

### Requirement: Structural compatibility applies consistently across supported schema inputs

The same target-AST relation SHALL govern native AsyncAPI Schema Objects and explicit JSON Schema Draft 07 roles for AsyncAPI 2.6, 3.0, and 3.1. Equivalent represented types SHALL produce equivalent compatibility outcomes regardless of source version or parser-model path.

#### Scenario: Equivalent cross-version schemas have equal outcomes

- **GIVEN** equivalent typed additional-properties schemas expressed through AsyncAPI 2.6 native, AsyncAPI 3.0 native, and AsyncAPI 3.1 Draft 07 inputs
- **WHEN** the plugin projects each schema
- **THEN** compatible cases retain typed indices and incompatible cases widen to `unknown` in every version

### Requirement: The regression corpus proves positive, negative, and boundary compatibility

Focused projection fixtures SHALL cover nested primitive mismatch, nested requiredness, compatible nested objects, arrays, tuples, unions, equal and unequal symbolic references, nested object index values, recursion termination, and `true`, `false`, and absent additional-properties boundaries. Complete success trees SHALL run twice, match golden bytes, and compile under strict NodeNext settings.

#### Scenario: Verify the #15 corpus matrix

- **WHEN** the structural index compatibility matrix runs
- **THEN** every case records whether a typed index or `unknown` is expected
- **AND** complete generated trees match their golden files
- **AND** repeated runs are byte-identical
- **AND** strict NodeNext compilation reports no diagnostics

## Non-Goals

- Reimplementing the complete TypeScript compiler assignability algorithm.
- Proving semantic equivalence between different symbolic schema identities.
- Changing runtime JSON Schema validation behavior.
- Rejecting safe output when conservative widening to `unknown` is sufficient.
