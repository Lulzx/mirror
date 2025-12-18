import { Mirror } from './mirror';
import type { Meta } from './types';

/**
 * Property access lens: extracts/injects a property from/into an object.
 * Forward: { key: value, ...rest } → value
 * Backward: value → { key: value }
 *
 * Can be nested: prop('a', prop('b')) for deep access
 */
export function prop<K extends string, V>(
  key: K
): Mirror<Record<K, V>, V>;
export function prop<K extends string, V, W>(
  key: K,
  inner: Mirror<V, W>
): Mirror<Record<K, V>, W>;
export function prop(
  key: string,
  inner?: Mirror<unknown, unknown>
): Mirror<Record<string, unknown>, unknown> {
  if (inner) {
    return new Mirror(
      (obj) => inner.forward(obj[key]),
      (value) => ({ [key]: inner.backward(value) }),
      { type: 'prop', key, inner: inner.meta }
    );
  }

  return new Mirror(
    (obj) => obj[key],
    (value) => ({ [key]: value }),
    { type: 'prop', key }
  );
}

/**
 * Type for object schema definition
 */
export type ObjectSchema<T> = {
  [K in keyof T]: Mirror<unknown, T[K]>;
};

/**
 * Object schema: combines multiple mirrors into an object.
 * Each mirror transforms from the source object to its field value.
 */
export function object<T extends Record<string, unknown>>(
  schema: ObjectSchema<T>
): Mirror<unknown, T> {
  const keys = Object.keys(schema) as (keyof T)[];

  const forward = (input: unknown): T => {
    const result = {} as T;
    for (const key of keys) {
      result[key] = schema[key]!.forward(input);
    }
    return result;
  };

  const backward = (obj: T): unknown => {
    let result: Record<string, unknown> = {};
    for (const key of keys) {
      const backValue = schema[key]!.backward(obj[key]);
      if (typeof backValue === 'object' && backValue !== null) {
        result = { ...result, ...(backValue as Record<string, unknown>) };
      } else if (backValue !== undefined) {
        // Handle non-object backward values by storing them directly
        // This enables simpler mirror compositions
        result[key as string] = backValue;
      }
    }
    return result;
  };

  const shape: Record<string, Meta> = {};
  for (const key of keys) {
    shape[key as string] = schema[key]!.meta;
  }

  return new Mirror(forward, backward, {
    type: 'object',
    shape,
  });
}

/**
 * Array mapping: applies a mirror to each element of an array.
 */
export function array<A, B>(itemMirror: Mirror<A, B>): Mirror<A[], B[]> {
  return new Mirror(
    (arr) => arr.map((item) => itemMirror.forward(item)),
    (arr) => arr.map((item) => itemMirror.backward(item)),
    {
      type: 'array',
      items: itemMirror.meta,
    }
  );
}

/**
 * Tuple: applies mirrors to corresponding tuple positions.
 */
export function tuple<T extends Mirror<unknown, unknown>[]>(
  ...mirrors: T
): Mirror<unknown[], unknown[]> {
  return new Mirror(
    (arr) => arr.map((item, i) => mirrors[i]!.forward(item)),
    (arr) => arr.map((item, i) => mirrors[i]!.backward(item)),
    {
      type: 'array',
      items: { type: 'custom' },
    }
  );
}

/**
 * Pick specific keys from an object.
 * LOSSY: Dropped fields cannot be recovered.
 * Backward returns partial object - combine with original for full reconstruction.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  ...keys: K[]
): Mirror<T, Pick<T, K>> {
  return new Mirror(
    (obj) => {
      const result = {} as Pick<T, K>;
      for (const key of keys) {
        result[key] = obj[key];
      }
      return result;
    },
    // Return partial - consumer should merge with source if needed
    (partial) => partial as unknown as T,
    { type: 'pick', keys: keys as string[], lossy: true }
  );
}

/**
 * Omit specific keys from an object.
 * LOSSY: Omitted fields cannot be recovered.
 * Backward returns partial object - combine with original for full reconstruction.
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  ...keys: K[]
): Mirror<T, Omit<T, K>> {
  const keySet = new Set(keys as string[]);
  return new Mirror(
    (obj) => {
      const result = {} as Omit<T, K>;
      for (const key of Object.keys(obj)) {
        if (!keySet.has(key)) {
          (result as Record<string, unknown>)[key] = obj[key];
        }
      }
      return result;
    },
    // Return partial - consumer should merge with source if needed
    (partial) => partial as unknown as T,
    { type: 'omit', keys: keys as string[], lossy: true }
  );
}

/**
 * Deep get using a path: ['a', 'b', 'c'] accesses obj.a.b.c
 */
export function path<T>(...keys: string[]): Mirror<Record<string, unknown>, T> {
  return new Mirror(
    (obj) => {
      let current: unknown = obj;
      for (const key of keys) {
        if (current == null || typeof current !== 'object') {
          throw new Error(`Cannot access ${key} on ${typeof current}`);
        }
        current = (current as Record<string, unknown>)[key];
      }
      return current as T;
    },
    (value) => {
      let result: Record<string, unknown> = {};
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i]!;
        current[key] = {};
        current = current[key] as Record<string, unknown>;
      }

      const lastKey = keys[keys.length - 1];
      if (lastKey) {
        current[lastKey] = value;
      }

      return result;
    },
    { type: 'prop', key: keys.join('.') }
  );
}

/**
 * Set a value at a lens position (immutable update).
 * Merges the backward result with the source object.
 */
export function set<A extends object, B>(
  lens: Mirror<A, B>,
  source: A,
  value: B
): A {
  const partial = lens.backward(value);
  if (typeof partial === 'object' && partial !== null) {
    return { ...source, ...(partial as object) } as A;
  }
  return partial as A;
}

/**
 * Modify a value at a lens position (immutable update)
 */
export function over<A extends object, B>(
  lens: Mirror<A, B>,
  source: A,
  fn: (value: B) => B
): A {
  const current = lens.forward(source);
  return set(lens, source, fn(current));
}

/**
 * Entries: object ↔ [key, value][]
 * Fully reversible.
 */
export function entries<K extends string, V>(): Mirror<Record<K, V>, [K, V][]> {
  return new Mirror(
    (obj) => Object.entries(obj) as [K, V][],
    (entries) => Object.fromEntries(entries) as Record<K, V>,
    { type: 'entries' }
  );
}

/**
 * Keys: object → keys[]
 * LOSSY: Values are lost and cannot be recovered.
 * Consider using `entries` for reversible key-value access.
 */
export function keys<K extends string>(): Mirror<Record<K, unknown>, K[]> {
  return new Mirror(
    (obj) => Object.keys(obj) as K[],
    (_keys): Record<K, unknown> => {
      throw new Error('keys() backward is lossy: cannot recover original object values');
    },
    { type: 'keys', lossy: true }
  );
}

/**
 * Values: object → values[]
 * LOSSY: Keys are lost and cannot be recovered.
 * Consider using `entries` for reversible key-value access.
 */
export function values<V>(): Mirror<Record<string, V>, V[]> {
  return new Mirror(
    (obj) => Object.values(obj) as V[],
    (_values): Record<string, V> => {
      throw new Error('values() backward is lossy: cannot recover original object keys');
    },
    { type: 'values', lossy: true }
  );
}

/**
 * Map object values while preserving keys.
 * Fully reversible.
 */
export function mapValues<V, W>(
  valueMirror: Mirror<V, W>
): Mirror<Record<string, V>, Record<string, W>> {
  return new Mirror(
    (obj) => {
      const result: Record<string, W> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = valueMirror.forward(value as V);
      }
      return result;
    },
    (obj) => {
      const result: Record<string, V> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = valueMirror.backward(value as W);
      }
      return result;
    },
    { type: 'object', shape: {} }
  );
}

/**
 * Merge two objects. The second object's properties override the first.
 */
export function merge<A extends object, B extends object>(): Mirror<[A, B], A & B> {
  return new Mirror(
    ([a, b]) => ({ ...a, ...b }),
    // Cannot unmerge - this is inherently lossy when keys overlap
    (merged) => [merged as unknown as A, merged as unknown as B],
    { type: 'custom', lossy: true }
  );
}

/**
 * Spread/collect: converts between { ...spread } and { collected }
 * Use when you need to flatten/unflatten a specific key.
 */
export function spread<K extends string, V extends object>(
  key: K
): Mirror<Record<K, V>, V> {
  return new Mirror(
    (obj) => obj[key],
    (value) => ({ [key]: value }) as Record<K, V>,
    { type: 'prop', key }
  );
}
