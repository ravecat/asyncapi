# TypeScript Anonymous Recursion Correction Specification

## Purpose

This capability closes [#16](https://github.com/ravecat/opalesce/issues/16). It allows supported anonymous nested schemas to recurse without expansion by representing each recursive anonymous dependency as a deterministic file-local type declaration owned by the public schema or message role that contains it.

## ADDED Requirements

### Requirement: Recursive anonymous graphs receive owner-scoped identities

During projection of each public schema, message payload, or message headers role, the TypeScript plugin SHALL build one owner-local schema graph keyed by parser object identity and canonical source pointer. It SHALL identify strongly connected components before expanding target types. A self-edge or a component containing more than one anonymous schema SHALL receive symbolic private declarations for every anonymous member needed to terminate the cycle.

Each private identity SHALL be `schema:private:<owner-identity>:<relative-pointer>`, where `<owner-identity>` is the owning public declaration identity and `<relative-pointer>` is the exact RFC 6901 pointer relative to that role. Public component references SHALL keep their public Core identities. Acyclic anonymous schemas SHALL remain inline unless another existing output rule requires a declaration.

#### Scenario: Detect an anonymous self-cycle

- **GIVEN** component schema `Root` contains anonymous property schema `node`
- **AND** `node` references `#/components/schemas/Root/properties/node`
- **WHEN** the plugin builds the owner-local graph
- **THEN** the `node` schema receives one owner-scoped private identity
- **AND** projection terminates with a symbolic self-reference

#### Scenario: Detect an anonymous mutual cycle

- **GIVEN** two anonymous nested schemas under one public owner reference each other
- **WHEN** the plugin computes strongly connected components
- **THEN** both schemas receive distinct owner-scoped private identities
- **AND** neither schema is recursively expanded

#### Scenario: Keep an acyclic nested schema inline

- **GIVEN** an anonymous nested schema has no recursive path
- **WHEN** projection completes
- **THEN** its represented type remains inline
- **AND** no unnecessary private declaration is added

#### Scenario: Preserve public component recursion

- **GIVEN** recursion targets a named component schema
- **WHEN** the owner-local graph is projected
- **THEN** the target retains its public `schema:component:<name>` identity
- **AND** the plugin does not create a private duplicate

### Requirement: Private names are deterministic and collision-checked

A private symbol name SHALL begin with the owning public declaration name and SHALL append a role-aware normalized relative path. Property segments SHALL contribute the exact decoded property key, item segments SHALL contribute `Item` plus an index when applicable, composition segments SHALL contribute `AllOf<n>`, `AnyOf<n>`, or `OneOf<n>`, `additionalProperties` SHALL contribute `AdditionalProperty`, and definition segments SHALL contribute `Definition<key>`. Other schema-child segments SHALL contribute their normalized keyword and key or index.

Normalization SHALL use the same identifier validity, Unicode normalization, and collision policy as public symbols. The planner SHALL reject two distinct private identities that normalize to the same symbol with `TYPESCRIPT_SYMBOL_COLLISION`, both pointers, and both identities. It SHALL NOT append counters.

#### Scenario: Name a schema-owned private node

- **GIVEN** public alias `Root` owns recursive path `/properties/node`
- **WHEN** the private name is planned
- **THEN** its name is `RootNode`
- **AND** the name is stable across equivalent runs

#### Scenario: Name a message-owned private node

- **GIVEN** public payload alias `EventPayload` owns recursive path `/properties/node`
- **WHEN** the private name is planned
- **THEN** its name is `EventPayloadNode`
- **AND** it cannot collide with a private node owned by another message role

#### Scenario: Reject a normalized private-name collision

- **GIVEN** two recursive relative paths under one owner normalize to the same private symbol
- **WHEN** the naming table is completed
- **THEN** generation fails atomically with `TYPESCRIPT_SYMBOL_COLLISION`
- **AND** no numeric suffix or partial artifact tree is produced

### Requirement: Private declarations remain file-local

The planner SHALL add private declarations to the same schema or message file as their owner. A private declaration SHALL be emitted without the `export` modifier, SHALL NOT appear in `index.ts`, and SHALL NOT be imported from another file. Public owner declarations SHALL refer to it by its local symbol. Private declarations SHALL be ordered deterministically with all dependencies known before rendering.

#### Scenario: Emit schema-owned private recursion

- **GIVEN** a named component schema owns an anonymous self-cycle
- **WHEN** TypeScript is rendered
- **THEN** its schema file contains a non-exported private alias and the exported public alias
- **AND** the public barrel exports only the public component alias

#### Scenario: Emit message-owned private recursion

- **GIVEN** a message payload or application headers role owns an anonymous recursive graph
- **WHEN** TypeScript is rendered
- **THEN** all private aliases are in that message file
- **AND** payload, headers, and wrapper public aliases retain their existing exports

#### Scenario: Compile mutual private recursion

- **GIVEN** two file-local private declarations refer to each other
- **WHEN** the complete output tree is compiled under strict NodeNext settings
- **THEN** compilation succeeds without self-imports, missing symbols, or recursive expansion

### Requirement: Anonymous recursion behavior is version-consistent and deterministic

Supported anonymous recursion SHALL work for native schemas in AsyncAPI 2.6, 3.0, and 3.1 and for representable Draft 07 local references. The same owner graph SHALL produce stable private identities, names, declaration order, symbolic references, and bytes on repeated runs.

#### Scenario: Generate anonymous recursion across supported versions

- **GIVEN** equivalent schema-owned or message-owned anonymous cycles in AsyncAPI 2.6, 3.0, and 3.1
- **WHEN** each input is generated
- **THEN** each output uses owner-local private declarations with equivalent represented structure
- **AND** every complete tree compiles under strict NodeNext settings

#### Scenario: Repeat private recursion generation

- **GIVEN** one supported recursive anonymous input
- **WHEN** generation runs twice
- **THEN** private identities, names, declaration order, artifact order, and every byte are identical

### Requirement: The regression corpus covers recursive ownership boundaries

Focused projection and planning data SHALL cover schema-owned self-recursion, schema-owned mutual recursion, message-payload self-recursion, message-header recursion, a repeated acyclic anonymous node, recursion through arrays and composition, a private-name collision, and public component recursion as a no-regression control. Complete successful cases SHALL include golden trees and strict NodeNext compilation.

#### Scenario: Verify the #16 corpus matrix

- **WHEN** the anonymous recursion corpus runs
- **THEN** successful cases match complete expected files and omit private symbols from the barrel
- **AND** failure cases match stable code, pointers, and conflict details with no artifacts
- **AND** repeated successful runs are byte-identical
- **AND** strict NodeNext compilation reports no diagnostics

## Non-Goals

- Publishing anonymous nested schemas as public files or barrel exports.
- Assigning declarations to every acyclic inline schema.
- Supporting externally resolved anonymous targets without stable provenance.
- Adding configurable private naming or numeric collision suffixes.
