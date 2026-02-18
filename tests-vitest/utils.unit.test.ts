import { describe, expect, it } from "vitest";
import { formatPercent, safePercent, xirr } from "../src/utils";

describe("utils unit", () => {
  it("formats percent values", () => {
    expect(formatPercent(12.345)).toBe("12.35%");
    expect(safePercent(600)).toBe("-");
  });

  it("calculates xirr for one-year 10 percent case", () => {
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const result = xirr([
      { time: now, amount: -1000 },
      { time: now + oneYear, amount: 1100 },
    ]);

    expect(result).not.toBeNull();
    expect(Math.abs((result as number) - 0.1)).toBeLessThan(0.005);
  });
});
