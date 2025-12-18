import { Mirror } from './mirror';

/**
 * Range constraint for numbers.
 * Forward: validates number is in range
 * Backward: identity (clamps if needed)
 */
export function range(min: number, max: number): Mirror<number, number> {
  return new Mirror(
    (n) => {
      if (n < min || n > max) {
        throw new Error(`Value ${n} is out of range [${min}, ${max}]`);
      }
      return n;
    },
    (n) => Math.max(min, Math.min(max, n)),
    { type: 'range', min, max }
  );
}

/**
 * Length constraint for strings.
 */
export function length(min: number, max: number): Mirror<string, string> {
  return new Mirror(
    (s) => {
      if (s.length < min || s.length > max) {
        throw new Error(
          `String length ${s.length} is out of range [${min}, ${max}]`
        );
      }
      return s;
    },
    (s) => s.slice(0, max),
    { type: 'length', min, max }
  );
}

/**
 * Pattern constraint for strings.
 * Optionally provide a generator for sampling.
 */
export function pattern(
  regex: RegExp,
  generator?: () => string
): Mirror<string, string> {
  return new Mirror(
    (s) => {
      if (!regex.test(s)) {
        throw new Error(`String "${s}" does not match pattern ${regex}`);
      }
      return s;
    },
    (s) => s,
    { type: 'pattern', pattern: regex, generator }
  );
}

/**
 * Enum constraint: value must be one of the provided options.
 */
export function oneOfValues<T extends readonly unknown[]>(
  ...values: T
): Mirror<T[number], T[number]> {
  const set = new Set(values);
  return new Mirror(
    (v) => {
      if (!set.has(v)) {
        throw new Error(`Value ${String(v)} is not one of [${values.join(', ')}]`);
      }
      return v;
    },
    (v) => v,
    { type: 'enum', values }
  );
}

/**
 * Nullable wrapper: allows null values.
 */
export function nullable<A, B>(
  inner: Mirror<A, B>
): Mirror<A | null, B | null> {
  return new Mirror(
    (a) => (a === null ? null : inner.forward(a)),
    (b) => (b === null ? null : inner.backward(b)),
    { type: 'nullable', inner: inner.meta }
  );
}

/**
 * Optional wrapper: allows undefined values with a default.
 */
export function optional<A, B>(
  inner: Mirror<A, B>,
  defaultValue: B
): Mirror<A | undefined, B> {
  return new Mirror(
    (a) => (a === undefined ? defaultValue : inner.forward(a)),
    (b) => (b === defaultValue ? undefined : inner.backward(b)),
    { type: 'optional', inner: inner.meta, defaultValue }
  );
}

/**
 * Default value: uses default when forward receives undefined/null.
 */
export function withDefault<A, B>(
  inner: Mirror<A, B>,
  defaultValue: A
): Mirror<A | undefined | null, B> {
  return new Mirror(
    (a) => inner.forward(a ?? defaultValue),
    (b) => inner.backward(b),
    { type: 'optional', inner: inner.meta, defaultValue: inner.forward(defaultValue) }
  );
}

/**
 * Non-empty constraint for strings.
 */
export const nonEmpty: Mirror<string, string> = new Mirror(
  (s) => {
    if (s.length === 0) {
      throw new Error('String cannot be empty');
    }
    return s;
  },
  (s) => s,
  { type: 'length', min: 1, max: Infinity }
);

/**
 * Non-empty constraint for arrays.
 */
export function nonEmptyArray<T>(): Mirror<T[], T[]> {
  return new Mirror(
    (arr) => {
      if (arr.length === 0) {
        throw new Error('Array cannot be empty');
      }
      return arr;
    },
    (arr) => arr,
    { type: 'array', items: { type: 'custom' }, minItems: 1 }
  );
}

/**
 * Positive number constraint.
 */
export const positive: Mirror<number, number> = new Mirror(
  (n) => {
    if (n <= 0) {
      throw new Error(`Value ${n} must be positive`);
    }
    return n;
  },
  (n) => Math.max(1, n),
  { type: 'range', min: 0, max: Infinity }
);

/**
 * Non-negative number constraint.
 */
export const nonNegative: Mirror<number, number> = new Mirror(
  (n) => {
    if (n < 0) {
      throw new Error(`Value ${n} must be non-negative`);
    }
    return n;
  },
  (n) => Math.max(0, n),
  { type: 'range', min: 0, max: Infinity }
);

/**
 * Integer constraint.
 */
export const isInteger: Mirror<number, number> = new Mirror(
  (n) => {
    if (!Number.isInteger(n)) {
      throw new Error(`Value ${n} must be an integer`);
    }
    return n;
  },
  (n) => Math.floor(n),
  { type: 'integer' }
);

/**
 * Finite number constraint.
 */
export const isFinite: Mirror<number, number> = new Mirror(
  (n) => {
    if (!Number.isFinite(n)) {
      throw new Error(`Value ${n} must be finite`);
    }
    return n;
  },
  (n) => n,
  { type: 'number' }
);

/**
 * Trim whitespace from strings.
 */
export const trim: Mirror<string, string> = new Mirror(
  (s) => s.trim(),
  (s) => s,
  { type: 'string' }
);

/**
 * Lowercase strings.
 */
export const lowercase: Mirror<string, string> = new Mirror(
  (s) => s.toLowerCase(),
  (s) => s,
  { type: 'string' }
);

/**
 * Uppercase strings.
 */
export const uppercase: Mirror<string, string> = new Mirror(
  (s) => s.toUpperCase(),
  (s) => s,
  { type: 'string' }
);

/**
 * Common patterns with generators
 */
export const email = pattern(
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
  () => `user${Math.floor(Math.random() * 1000)}@example.com`
);

export const uuid = pattern(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  () => {
    const hex = () =>
      Math.floor(Math.random() * 16)
        .toString(16);
    const segment = (len: number) =>
      Array.from({ length: len }, hex).join('');
    return `${segment(8)}-${segment(4)}-${segment(4)}-${segment(4)}-${segment(12)}`;
  }
);

export const slug = pattern(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  () => `slug-${Math.floor(Math.random() * 1000)}`
);

export const alphanumeric = pattern(
  /^[a-zA-Z0-9]+$/,
  () => `abc${Math.floor(Math.random() * 1000)}`
);
