import { registerHooks } from "node:module";
import { statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Resolves the `@/*` path alias from tsconfig.json for Node's test
 * runner. Node 24 strips TypeScript types natively but knows nothing
 * about tsconfig `paths`, so this maps `@/x` to `<repo>/src/x` and
 * fills in the extension.
 *
 * Kept dependency-free on purpose: the project ships a deliberately
 * small dependency tree, and a test-only transpiler would widen it.
 */

const root = path.resolve(import.meta.dirname, "..");
const EXTENSIONS = ["", ".ts", ".tsx", ".mjs", ".js", ".json"];

function resolveFile(base) {
  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // try the next extension
    }
  }
  for (const index of ["/index.ts", "/index.tsx"]) {
    const candidate = base + index;
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // not a directory module
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const resolved = resolveFile(path.join(root, "src", specifier.slice(2)));
      if (resolved) {
        return { url: pathToFileURL(resolved).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});
