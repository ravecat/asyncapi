import type { SchemaContract } from "@opalesce/core";
import { TypeScriptGenerationError } from "./errors.js";

type SchemaInterface = SchemaContract["schema"];

export interface PrivateRoot {
  readonly identity: string;
  readonly name: string;
  readonly schema: SchemaInterface;
  readonly pointer: string;
}

// The owner-local anonymous recursion graph for one public schema/payload/headers
// root. `referenceByIdentity` maps a recursive parser object to the identity a
// reference to it should use (the public root for the root itself, a private
// identity for anonymous strongly connected members). `privateRoots` lists the
// anonymous members that need a non-exported alias declaration.
export interface OwnerGraph {
  readonly referenceByIdentity: WeakMap<object, string>;
  readonly privateRoots: readonly PrivateRoot[];
  readonly allReferenceEntries: ReadonlyArray<readonly [object, string]>;
}

function parserObject(schema: SchemaInterface): object | undefined {
  const value: unknown = schema.json<unknown>();
  return typeof value === "object" && value !== null ? value : undefined;
}

function schemaChildren(schema: SchemaInterface): readonly SchemaInterface[] {
  const children: SchemaInterface[] = [];
  const append = (candidate: SchemaInterface | undefined): void => {
    if (candidate !== undefined) {
      children.push(candidate);
    }
  };
  const appendMany = (candidates: readonly SchemaInterface[] | undefined): void => {
    if (candidates !== undefined) {
      children.push(...candidates);
    }
  };
  appendMany(schema.allOf());
  appendMany(schema.anyOf());
  appendMany(schema.oneOf());
  append(schema.not());
  append(schema.if());
  append(schema.then());
  append(schema.else());
  append(schema.contains());
  append(schema.propertyNames());
  const items = schema.items();
  if (Array.isArray(items)) {
    appendMany(items);
  } else {
    append(items);
  }
  const additionalItems = schema.additionalItems();
  if (typeof additionalItems !== "boolean") {
    append(additionalItems);
  }
  if (typeof schema.additionalProperties() !== "boolean") {
    append(schema.additionalProperties() as SchemaInterface | undefined);
  }
  for (const group of [schema.properties(), schema.patternProperties(), schema.definitions()]) {
    if (group !== undefined) {
      children.push(...Object.values(group));
    }
  }
  const dependencies = schema.dependencies();
  if (dependencies !== undefined) {
    for (const dependency of Object.values(dependencies)) {
      if (!Array.isArray(dependency)) {
        children.push(dependency);
      }
    }
  }
  return children;
}

// Compute the anonymous recursive members of an owner-local schema graph. A node
// is recursive when a cycle (including a self-loop through anonymous children)
// stays entirely within the anonymous node set; named component and public
// reference targets break the cycle and stay public.
export function buildOwnerGraph(
  root: SchemaInterface,
  ownerIdentity: string,
  rootName: string,
  componentObject: WeakMap<object, string>,
): OwnerGraph {
  const rootRecord = parserObject(root);
  const isComponent = (schema: SchemaInterface): boolean => {
    const object = parserObject(schema);
    return object !== undefined && componentObject.has(object);
  };

  // Collect the anonymous node set reachable from the root (stop at components).
  const anonymousObjects = new Set<object>();
  const objects = new Map<object, SchemaInterface>();
  const queue: SchemaInterface[] = [root];
  const queuedObjects = new Set<object>();
  const enqueue = (candidate: SchemaInterface): void => {
    if (isComponent(candidate)) {
      return;
    }
    const object = parserObject(candidate);
    if (object === undefined) {
      return;
    }
    if (queuedObjects.has(object)) {
      return;
    }
    queuedObjects.add(object);
    queue.push(candidate);
  };
  enqueue(root);
  while (queue.length > 0) {
    const current = queue.pop() as SchemaInterface;
    const object = parserObject(current);
    if (object !== undefined) {
      if (!anonymousObjects.has(object)) {
        anonymousObjects.add(object);
        objects.set(object, current);
      }
      enqueue(current);
    }
    for (const child of schemaChildren(current)) {
      enqueue(child);
    }
  }

  // Tarjan SCC over anonymous nodes, using only anonymous children as edges.
  const indexByObject = new WeakMap<object, number>();
  const lowByObject = new WeakMap<object, number>();
  const onStack = new WeakSet<object>();
  const stack: object[] = [];
  let nextIndex = 0;
  const sccs: object[][] = [];

  const strongConnect = (node: object): void => {
    indexByObject.set(node, nextIndex);
    lowByObject.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    const schema = objects.get(node);
    if (schema !== undefined) {
      for (const child of schemaChildren(schema)) {
        const childObject = parserObject(child);
        if (childObject === undefined || isComponent(child)) {
          continue;
        }
        if (!anonymousObjects.has(childObject)) {
          continue;
        }
        if (!indexByObject.has(childObject)) {
          strongConnect(childObject);
          lowByObject.set(
            node,
            Math.min(lowByObject.get(node) ?? 0, lowByObject.get(childObject) ?? 0),
          );
        } else if (onStack.has(childObject)) {
          lowByObject.set(
            node,
            Math.min(lowByObject.get(node) ?? 0, indexByObject.get(childObject) ?? 0),
          );
        }
      }
    }

    if ((lowByObject.get(node) ?? 0) === (indexByObject.get(node) ?? 0)) {
      const component: object[] = [];
      let member: object | undefined;
      do {
        member = stack.pop();
        if (member !== undefined) {
          onStack.delete(member);
          component.push(member);
        }
      } while (member !== node);
      sccs.push(component);
    }
  };

  for (const node of anonymousObjects) {
    if (!indexByObject.has(node)) {
      strongConnect(node);
    }
  }

  const referenceByIdentity = new WeakMap<object, string>();
  const referenceEntries: Array<readonly [object, string]> = [];
  const privateRoots: PrivateRoot[] = [];

  const setReference = (node: object, identity: string): void => {
    referenceByIdentity.set(node, identity);
    referenceEntries.push([node, identity]);
  };

  for (const component of sccs) {
    const recursive =
      component.length > 1 ||
      component.some((node) => {
        const schema = objects.get(node);
        if (schema === undefined) {
          return false;
        }
        const object = parserObject(schema);
        return schemaChildren(schema).some((child) => parserObject(child) === object);
      });
    if (!recursive) {
      continue;
    }
    for (const node of component) {
      const schema = objects.get(node);
      if (schema === undefined) {
        continue;
      }
      // The owner root stays public and any reference to it uses its public identity.
      if (rootRecord !== undefined && node === rootRecord) {
        setReference(node, ownerIdentity);
        continue;
      }
      const pointer = schema.meta("pointer");
      const relativePointer =
        rootRecord !== undefined && pointer.startsWith(root.meta("pointer"))
          ? pointer.slice(root.meta("pointer").length)
          : pointer;
      const name = privateName(rootName, relativePointer);
      const existing = privateRoots.find((candidate) => candidate.name === name);
      if (existing !== undefined && existing.pointer !== pointer) {
        throw new TypeScriptGenerationError(
          "TYPESCRIPT_SYMBOL_COLLISION",
          `The private symbol ${name} collides under owner ${rootName}.`,
          {
            pointer,
            details: {
              identity: `schema:private:${ownerIdentity}:${relativePointer}`,
              conflictingIdentity: existing.identity,
              conflictingPointer: existing.pointer,
            },
          },
        );
      }
      const identity = `schema:private:${ownerIdentity}:${relativePointer}`;
      setReference(node, identity);
      privateRoots.push({ identity, name, schema, pointer });
    }
  }

  return Object.freeze({
    referenceByIdentity,
    privateRoots: Object.freeze(privateRoots),
    allReferenceEntries: Object.freeze([...referenceEntries]),
  });
}

function privateName(ownerName: string, relativePointer: string): string {
  const tokens = relativePointer
    .split("/")
    .filter((segment) => segment.length > 0 && !STRUCTURAL_SEGMENTS.has(segment))
    .map((segment) => segment.normalize("NFC"))
    .map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
    .join("");
  const name = `${ownerName}${tokens}`;
  if (!/^[$_\p{ID_Start}](?:[$_\p{ID_Continue}]|\u200C|\u200D)*$/u.test(name)) {
    throw new TypeScriptGenerationError(
      "TYPESCRIPT_NAME_INVALID",
      `The private name ${name} cannot be a TypeScript symbol.`,
      { pointer: relativePointer, details: { name } },
    );
  }
  return name;
}

const STRUCTURAL_SEGMENTS = new Set([
  "properties",
  "patternProperties",
  "items",
  "allOf",
  "anyOf",
  "oneOf",
  "not",
  "if",
  "then",
  "else",
  "contains",
  "propertyNames",
  "additionalProperties",
  "additionalItems",
  "definitions",
  "dependencies",
]);
