import assert from "assert";
import {
  formatMoney,
  formatPercent,
  formatRiskLevel,
  isCodeName,
  normalizeBondCompany,
  safePercent,
  xirr,
} from "../src/utils";
import {
  getDisplayName,
  instrumentCache,
} from "../src/cache";

function approx(a: number, b: number, eps = 1e-4) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ~ ${b}`);
}

// formatRiskLevel
assert.equal(formatRiskLevel("RISK_LEVEL_LOW"), "Низкий");
assert.equal(formatRiskLevel("RISK_LEVEL_MODERATE"), "Средний");
assert.equal(formatRiskLevel("RISK_LEVEL_HIGH"), "Высокий");
assert.equal(formatRiskLevel("UNKNOWN"), "-");

// isCodeName
assert.equal(isCodeName("TCS00A10D1W2"), true);
assert.equal(isCodeName("Газпром 001P-06"), false);
assert.equal(isCodeName("ru000a102938"), true);

// normalizeBondCompany
assert.equal(normalizeBondCompany("Газпром 001P-06"), "Газпром");
assert.equal(normalizeBondCompany("Роснефть ПАО 001P-SBER51"), "Роснефть ПАО");

// getDisplayName hides codes
instrumentCache.set("TCS00A10D1W2", { name: "TCS00A10D1W2" });
assert.equal(getDisplayName({ figi: "TCS00A10D1W2" }), "Название недоступно");
instrumentCache.set("RU000A0JX0J2", { name: "RU000A0JX0J2" });
assert.equal(getDisplayName({ figi: "RU000A0JX0J2" }), "Название недоступно");
instrumentCache.set("GAZP", { name: "Газпром" });
assert.equal(getDisplayName({ figi: "GAZP" }), "Газпром");

// formatMoney/Percent
assert.ok(formatMoney(1234.56, "RUB").includes("1"));
assert.equal(formatPercent(12.345), "12.35%");
assert.equal(safePercent(600), "-");

// xirr basic: invest 1000, return 1100 in 1 year => ~10%
const now = Date.now();
const oneYear = 365 * 24 * 60 * 60 * 1000;
const r = xirr([
  { time: now, amount: -1000 },
  { time: now + oneYear, amount: 1100 },
]);
assert.ok(r !== null);
approx(r as number, 0.1, 1e-3);

console.log("utils tests passed");
