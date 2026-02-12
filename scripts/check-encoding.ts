import fs from "fs";
import path from "path";

const ROOT_DIR = process.cwd();
const INCLUDED_EXTENSIONS = new Set([".ts", ".md", ".json", ".cmd"]);
const EXCLUDED_DIRS = new Set([".git", "node_modules", "dist", ".cache", ".temp"]);
const EXCLUDED_FILES = new Set(["scripts/check-encoding.ts"]);

const suspiciousRegexps: RegExp[] = [
  /пїЅ/g,
  /(?:Гђ[\u0000-\u024F\u0400-\u04FF]|Г‘[\u0000-\u024F\u0400-\u04FF]){3,}/g,
  /(?:Р [\u0400-\u04FF]|РЎ[\u0400-\u04FF]){4,}/g,
];

type Finding = {
  file: string;
  reason: string;
  sample: string;
};

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".project-control") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      result.push(...walk(fullPath));
      continue;
    }

    if (!INCLUDED_EXTENSIONS.has(path.extname(entry.name))) continue;

    const normalizedRelPath = relPath.replace(/\\/g, "/");
    if (EXCLUDED_FILES.has(normalizedRelPath)) continue;

    result.push(relPath);
  }

  return result;
}

function findSuspiciousChunk(content: string): { reason: string; sample: string } | null {
  const counts = suspiciousRegexps.map((re) => (content.match(re) ?? []).length);

  const hasReplacementChar = counts[0] > 0;
  const hasLatinMojibake = counts[1] > 0;
  const hasRusMojibakePattern = counts[2] > 0;
  if (!(hasReplacementChar || hasLatinMojibake || hasRusMojibakePattern)) {
    return null;
  }

  let index = content.search(/пїЅ/);
  if (index < 0) index = content.search(/(?:Гђ[\u0000-\u024F\u0400-\u04FF]|Г‘[\u0000-\u024F\u0400-\u04FF]){3,}/);
  if (index < 0) index = content.search(/(?:Р [\u0400-\u04FF]|РЎ[\u0400-\u04FF]){4,}/);
  if (index < 0) index = 0;

  const start = Math.max(0, index - 30);
  const end = Math.min(content.length, index + 50);
  const sample = content.slice(start, end).replace(/\s+/g, " ");

  let reason = "Detected signs of broken text encoding";
  if (hasReplacementChar) {
    reason = "Found replacement symbol пїЅ";
  } else if (hasLatinMojibake) {
    reason = "Found Гђ/Г‘ mojibake artifacts (broken UTF-8)";
  } else if (hasRusMojibakePattern) {
    reason = "Found suspicious Р*/С* mojibake sequences";
  }

  return { reason, sample };
}

function main(): void {
  const files = walk(ROOT_DIR);
  const findings: Finding[] = [];

  for (const relPath of files) {
    const absPath = path.join(ROOT_DIR, relPath);
    const content = fs.readFileSync(absPath, "utf8");
    const finding = findSuspiciousChunk(content);
    if (finding) findings.push({ file: relPath, ...finding });
  }

  if (findings.length === 0) {
    console.log("Encoding check passed: no broken encodings found.");
    return;
  }

  console.error("Encoding check failed. Suspicious encoding found in files:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.reason}`);
    console.error(`  sample: ${finding.sample}`);
  }
  process.exit(1);
}

main();
