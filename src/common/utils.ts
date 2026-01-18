export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function remap(
  value: number,
  fromLow: number,
  fromHigh: number,
  toLow: number,
  toHigh: number,
) {
  return toLow + ((toHigh - toLow) * (value - fromLow)) / (fromHigh - fromLow);
}

export function validate<T extends readonly string[]>(
  value: string,
  array: T,
  type = 'value',
): asserts value is T[number] {
  if (!array.includes(value as any)) {
    throw new Error(
      `Invalid ${type}: ${value}. Can only be one of ${array.join(', ')}`,
    );
  }
}

export function applyDefaults<T extends {}>(
  a: Partial<T> | undefined,
  b: T,
): T {
  if (Array.isArray(b)) {
    return (a ?? b) as T;
  }

  const result = {};

  for (const key of Object.keys(b)) {
    if (a?.[key] !== undefined && typeof a?.[key] === 'object') {
      result[key] = applyDefaults(a[key], b[key]);
    } else {
      result[key] = a?.[key] ?? b[key];
    }
  }

  return result as never;
}
