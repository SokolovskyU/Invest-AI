import fs from "node:fs";
import path from "node:path";
import { renderHomePage } from "../src/ui/homePage";
import { renderAnalyticsPage } from "../src/ui/analyticsPage";

function rewriteNavLinks(html: string): string {
  return html
    .replace(/href="\/analytics"/g, 'href="/legacy-analytics.html"')
    .replace(/href="\/"/g, 'href="/legacy-home.html"');
}

function main(): void {
  const outDir = path.resolve("web", "public");
  fs.mkdirSync(outDir, { recursive: true });

  const home = rewriteNavLinks(renderHomePage());
  const analytics = rewriteNavLinks(renderAnalyticsPage());

  fs.writeFileSync(path.join(outDir, "legacy-home.html"), home, "utf8");
  fs.writeFileSync(path.join(outDir, "legacy-analytics.html"), analytics, "utf8");

  console.log("Legacy static pages exported to web/public");
}

main();
