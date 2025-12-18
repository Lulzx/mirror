import { Mirror } from './mirror';

/**
 * Deep equality check for comparing default values
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (Array.isArray(a) || Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every(key =>
    Object.prototype.hasOwnProperty.call(b, key) &&
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

/**
 * Range constraint for numbers.
 * Forward: validates number is in range
 * Backward: clamps to range
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
 * Uses deep equality for comparing with default value.
 */
export function optional<A, B>(
  inner: Mirror<A, B>,
  defaultValue: B
): Mirror<A | undefined, B> {
  return new Mirror(
    (a) => (a === undefined ? defaultValue : inner.forward(a)),
    (b) => (deepEqual(b, defaultValue) ? undefined : inner.backward(b)),
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
 * Positive number constraint (n > 0).
 */
export const positive: Mirror<number, number> = new Mirror(
  (n) => {
    if (n <= 0) {
      throw new Error(`Value ${n} must be positive`);
    }
    return n;
  },
  (n) => Math.max(1, n),
  { type: 'range', min: 1, max: Infinity }
);

/**
 * Non-negative number constraint (n >= 0).
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
 * LOSSY: Original whitespace cannot be recovered.
 */
export const trim: Mirror<string, string> = new Mirror(
  (s) => s.trim(),
  (s) => s,
  { type: 'string', lossy: true }
);

/**
 * Lowercase strings.
 * LOSSY: Original casing cannot be recovered.
 */
export const lowercase: Mirror<string, string> = new Mirror(
  (s) => s.toLowerCase(),
  (s) => s,
  { type: 'string', lossy: true }
);

/**
 * Uppercase strings.
 * LOSSY: Original casing cannot be recovered.
 */
export const uppercase: Mirror<string, string> = new Mirror(
  (s) => s.toUpperCase(),
  (s) => s,
  { type: 'string', lossy: true }
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

/**
 * Clamp a number to a range without throwing on invalid input.
 * Unlike `range`, this never throws - it always clamps.
 */
export function clamp(min: number, max: number): Mirror<number, number> {
  return new Mirror(
    (n) => Math.max(min, Math.min(max, n)),
    (n) => Math.max(min, Math.min(max, n)),
    { type: 'range', min, max }
  );
}

/**
 * Validate with a custom predicate.
 */
export function validate<T>(
  predicate: (value: T) => boolean,
  message: string | ((value: T) => string)
): Mirror<T, T> {
  return new Mirror(
    (v) => {
      if (!predicate(v)) {
        throw new Error(typeof message === 'function' ? message(v) : message);
      }
      return v;
    },
    (v) => v,
    { type: 'custom' }
  );
}

/**
 * Refine a type with a type guard.
 */
export function refine<T, U extends T>(
  guard: (value: T) => value is U,
  message: string
): Mirror<T, U> {
  return new Mirror(
    (v) => {
      if (!guard(v)) {
        throw new Error(message);
      }
      return v;
    },
    (v) => v,
    { type: 'custom' }
  );
}
