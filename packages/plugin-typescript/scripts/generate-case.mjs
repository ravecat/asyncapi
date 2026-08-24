import { writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(__dirname, "..");
const coreRoot = join(pluginRoot, "../core");

const { run } = await import(`file://${coreRoot}/dist/index.js`);
const { default: typescript } = await import(`file://${pluginRoot}/dist/index.js`);

// Usage: node scripts/generate-case.mjs <caseId> [--error] [--draft07] [--resolver]
const [caseId, ...flags] = process.argv.slice(2);
const caseDir = join(process.cwd(), "test/fixtures/corpus/cases", caseId);
const inputText = readFileSync(join(caseDir, "asyncapi.json"), "utf8");

let parser = {};
if (flags.includes("--draft07")) {
  parser = {
    parser: {
      schemaParsers: [
        {
          getMimeTypes() {
            return ["application/schema+json;version=draft-07"];
          },
          validate() {},
          parse() {
            return { type: "string" };
          },
        },
      ],
    },
  };
}
let parse = { source: `memory://${caseId}/asyncapi.json` };
if (flags.includes("--resolver")) {
  parser = {
    ...parser,
    __unstable: {
      resolver: {
        resolvers: [
          {
            schema: "memory",
            order: 1,
            read() {
              return JSON.stringify({ type: "object", properties: { id: { type: "string" } } });
            },
          },
        ],
      },
    },
  };
}

try {
  const result = await run({
    input: JSON.parse(inputText),
    parser: { parse, ...parser },
    plugins: [typescript()],
  });
  for (const artifact of result.artifacts) {
    const target = join(caseDir, "expected", artifact.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, artifact.contents, "utf8");
    console.log("wrote", artifact.path);
  }
  console.log("OK");
} catch (error) {
  const cause = error?.cause ?? error;
  console.log("ERROR", cause?.name, cause?.code, cause?.pointer, JSON.stringify(cause?.details));
}
