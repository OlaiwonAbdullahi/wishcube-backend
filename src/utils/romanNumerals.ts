/**
 * Converts a number to a Roman numeral.
 * @param num The number to convert.
 * @returns The Roman numeral string.
 */
export function toRoman(num: number): string {
  if (num <= 0) return "";
  const romanMap: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let result = "";
  for (const [value, symbol] of romanMap) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}

/**
 * Gets the current year in Roman numerals.
 * @returns The current year as a Roman numeral string.
 */
export function getCurrentYearRoman(): string {
  return toRoman(new Date().getFullYear());
}
