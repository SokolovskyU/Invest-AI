import fs from "fs";

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

const FILE_PATH = ".project-control/data.json";

function isObject(value: JsonValue): value is { [k: string]: JsonValue } {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isBrokenText(text: string): boolean {
  if (!text) return false;
  if (/�/.test(text)) return true;
  if (/\?{3,}/.test(text)) return true;
  if (/(?:Р[\u0000-\u024F\u0400-\u04FF]|С[\u0000-\u024F\u0400-\u04FF]){4,}/.test(text)) return true;
  return false;
}

function collectBrokenStrings(value: JsonValue, path: string, out: string[]): void {
  if (typeof value === "string") {
    if (isBrokenText(value)) out.push(path);
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      collectBrokenStrings(value[i], `${path}[${i}]`, out);
    }
    return;
  }

  if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectBrokenStrings(child, `${path}.${key}`, out);
    }
  }
}

function main(): void {
  const raw = fs.readFileSync(FILE_PATH, "utf8");
  const normalized = raw.replace(/^\uFEFF/, "");
  if (normalized !== raw) {
    // Heal BOM-encoded file in-place so other tools read it safely.
    fs.writeFileSync(FILE_PATH, normalized, "utf8");
  }
  const parsed = JSON.parse(normalized) as JsonValue;
  const brokenPaths: string[] = [];
  collectBrokenStrings(parsed, "$", brokenPaths);

  if (brokenPaths.length > 0) {
    console.error("Project Control check failed: broken text detected in .project-control/data.json");
    for (const p of brokenPaths.slice(0, 30)) {
      console.error(`- ${p}`);
    }
    if (brokenPaths.length > 30) {
      console.error(`... and ${brokenPaths.length - 30} more`);
    }
    process.exit(1);
  }

  console.log("Project Control check passed: data.json text is valid.");
}

main();
