const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type BaseConversion = {
  input: string;
  normalized: string;
  fromBase: number;
  toBase: number;
  output: string;
  all: { base: number; label: string; value: string }[];
};

function stripPrefix(value: string, base: number) {
  if (base === 2 && value.startsWith("0B")) return value.slice(2);
  if (base === 8 && value.startsWith("0O")) return value.slice(2);
  if (base === 16 && value.startsWith("0X")) return value.slice(2);
  return value;
}

function parseToBigInt(value: string, base: number) {
  let result = 0n;
  for (const char of value) {
    const digit = DIGITS.indexOf(char);
    if (digit < 0 || digit >= base) return null;
    result = result * BigInt(base) + BigInt(digit);
  }
  return result;
}

function formatFromBigInt(value: bigint, base: number) {
  if (value === 0n) return "0";
  let n = value < 0n ? -value : value;
  let output = "";
  const baseBig = BigInt(base);
  while (n > 0n) {
    const digit = Number(n % baseBig);
    output = DIGITS[digit] + output;
    n /= baseBig;
  }
  return value < 0n ? `-${output}` : output;
}

export function convertBase(
  rawInput: string,
  fromBase: number,
  toBase: number
): { result?: BaseConversion; error?: string } {
  const input = rawInput.trim();
  if (!input) {
    return { error: "请输入需要转换的数值。" };
  }

  if (!Number.isInteger(fromBase) || fromBase < 2 || fromBase > 36) {
    return { error: "输入进制必须是 2 到 36 之间的整数。" };
  }

  if (!Number.isInteger(toBase) || toBase < 2 || toBase > 36) {
    return { error: "输出进制必须是 2 到 36 之间的整数。" };
  }

  let normalized = input.toUpperCase().replace(/[_\s]/g, "");
  let sign = 1n;
  if (normalized.startsWith("-")) {
    sign = -1n;
    normalized = normalized.slice(1);
  }

  normalized = stripPrefix(normalized, fromBase);

  if (!normalized) {
    return { error: "请输入有效数字。" };
  }

  const parsed = parseToBigInt(normalized, fromBase);
  if (parsed === null) {
    return {
      error: `输入值包含不属于 ${fromBase} 进制的字符。`,
    };
  }

  const value = parsed * sign;
  const output = formatFromBigInt(value, toBase);

  const baseList = [2, 8, 10, 16, toBase];
  const seen = new Set<number>();
  const all = baseList
    .filter((base) => {
      if (seen.has(base)) return false;
      seen.add(base);
      return true;
    })
    .map((base) => ({
      base,
      label: `${base} 进制`,
      value: formatFromBigInt(value, base),
    }));

  return {
    result: {
      input,
      normalized: sign < 0n ? `-${normalized}` : normalized,
      fromBase,
      toBase,
      output,
      all,
    },
  };
}
