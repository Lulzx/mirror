import { Mirror, identity } from './mirror';
import type { Meta } from './types';

/**
 * Pipe multiple mirrors together: A → B → C → ... → Z
 * Forward: runs left-to-right
 * Backward: runs right-to-left
 */
export function pipe<A, B>(m1: Mirror<A, B>): Mirror<A, B>;
export function pipe<A, B, C>(m1: Mirror<A, B>, m2: Mirror<B, C>): Mirror<A, C>;
export function pipe<A, B, C, D>(
  m1: Mirror<A, B>,
  m2: Mirror<B, C>,
  m3: Mirror<C, D>
): Mirror<A, D>;
export function pipe<A, B, C, D, E>(
  m1: Mirror<A, B>,
  m2: Mirror<B, C>,
  m3: Mirror<C, D>,
  m4: Mirror<D, E>
): Mirror<A, E>;
export function pipe<A, B, C, D, E, F>(
  m1: Mirror<A, B>,
  m2: Mirror<B, C>,
  m3: Mirror<C, D>,
  m4: Mirror<D, E>,
  m5: Mirror<E, F>
): Mirror<A, F>;
export function pipe<A, B, C, D, E, F, G>(
  m1: Mirror<A, B>,
  m2: Mirror<B, C>,
  m3: Mirror<C, D>,
  m4: Mirror<D, E>,
  m5: Mirror<E, F>,
  m6: Mirror<F, G>
): Mirror<A, G>;
export function pipe<A, B, C, D, E, F, G, H>(
  m1: Mirror<A, B>,
  m2: Mirror<B, C>,
  m3: Mirror<C, D>,
  m4: Mirror<D, E>,
  m5: Mirror<E, F>,
  m6: Mirror<F, G>,
  m7: Mirror<G, H>
): Mirror<A, H>;
export function pipe<A, B, C, D, E, F, G, H, I>(
  m1: Mirror<A, B>,
  m2: Mirror<B, C>,
  m3: Mirror<C, D>,
  m4: Mirror<D, E>,
  m5: Mirror<E, F>,
  m6: Mirror<F, G>,
  m7: Mirror<G, H>,
  m8: Mirror<H, I>
): Mirror<A, I>;
export function pipe(...mirrors: Mirror<unknown, unknown>[]): Mirror<unknown, unknown>;
export function pipe(...mirrors: Mirror<unknown, unknown>[]): Mirror<unknown, unknown> {
  // Empty pipe returns identity mirror
  if (mirrors.length === 0) {
    return identity<unknown>();
  }

  if (mirrors.length === 1) {
    return mirrors[0]!;
  }

  // Check if any stage is lossy
  const hasLossy = mirrors.some(m => m.meta.lossy);

  const forward = (a: unknown): unknown => {
    let result = a;
    for (const m of mirrors) {
      result = m.forward(result);
    }
    return result;
  };

  const backward = (b: unknown): unknown => {
    let result = b;
    for (let i = mirrors.length - 1; i >= 0; i--) {
      result = mirrors[i]!.backward(result);
    }
    return result;
  };

  return new Mirror(forward, backward, {
    type: 'pipe',
    stages: mirrors.map((m) => m.meta),
    lossy: hasLossy,
  });
}

/**
 * Parallel composition for independent fields.
 * Applies each mirror to the corresponding field of the input object.
 */
export function all<T extends Record<string, Mirror<unknown, unknown>>>(
  mirrors: T
): Mirror<
  { [K in keyof T]: T[K] extends Mirror<infer A, unknown> ? A : never },
  { [K in keyof T]: T[K] extends Mirror<unknown, infer B> ? B : never }
> {
  type A = { [K in keyof T]: T[K] extends Mirror<infer X, unknown> ? X : never };
  type B = { [K in keyof T]: T[K] extends Mirror<unknown, infer X> ? X : never };

  const keys = Object.keys(mirrors) as (keyof T)[];
  const hasLossy = keys.some(k => mirrors[k]!.meta.lossy);

  const forward = (a: A): B => {
    const result = {} as B;
    for (const key of keys) {
      (result as Record<keyof T, unknown>)[key] = mirrors[key]!.forward(
        (a as Record<keyof T, unknown>)[key]
      );
    }
    return result;
  };

  const backward = (b: B): A => {
    const result = {} as A;
    for (const key of keys) {
      (result as Record<keyof T, unknown>)[key] = mirrors[key]!.backward(
        (b as Record<keyof T, unknown>)[key]
      );
    }
    return result;
  };

  const shape: Record<string, Meta> = {};
  for (const key of keys) {
    shape[key as string] = mirrors[key]!.meta;
  }

  return new Mirror(forward, backward, {
    type: 'all',
    mirrors: shape,
    lossy: hasLossy,
  }) as Mirror<A, B>;
}

/**
 * Conditional: try each mirror in order, use first one that succeeds.
 * Forward: tries each mirror until one succeeds
 * Backward: tries each mirror until one succeeds
 */
export function oneOf<A, B>(...mirrors: Mirror<A, B>[]): Mirror<A, B> {
  if (mirrors.length === 0) {
    throw new Error('oneOf requires at least one mirror');
  }

  const forward = (a: A): B => {
    let lastError: Error | undefined;
    for (const m of mirrors) {
      const result = m.tryForward(a);
      if (result.ok) {
        return result.value;
      }
      lastError = result.error;
    }
    throw lastError ?? new Error('All mirrors failed');
  };

  const backward = (b: B): A => {
    let lastError: Error | undefined;
    for (const m of mirrors) {
      const result = m.tryBackward(b);
      if (result.ok) {
        return result.value;
      }
      lastError = result.error;
    }
    throw lastError ?? new Error('All mirrors failed');
  };

  return new Mirror(forward, backward, {
    type: 'oneOf',
    options: mirrors.map((m) => m.meta),
  });
}

/**
 * Fallback: try the first mirror, if it fails, use the fallback
 */
export function fallback<A, B>(
  primary: Mirror<A, B>,
  fallbackMirror: Mirror<A, B>
): Mirror<A, B> {
  return oneOf(primary, fallbackMirror);
}

/**
 * Lazy evaluation for recursive types
 */
export function lazy<A, B>(getMirror: () => Mirror<A, B>): Mirror<A, B> {
  let cached: Mirror<A, B> | undefined;

  const get = (): Mirror<A, B> => {
    if (!cached) {
      cached = getMirror();
    }
    return cached;
  };

  return new Mirror(
    (a: A) => get().forward(a),
    (b: B) => get().backward(b),
    { type: 'custom' }
  );
}

/**
 * Branch based on a predicate.
 * If predicate returns true, use `then` mirror, otherwise use `else` mirror.
 */
export function branch<A, B>(
  predicate: (a: A) => boolean,
  thenMirror: Mirror<A, B>,
  elseMirror: Mirror<A, B>
): Mirror<A, B> {
  return new Mirror(
    (a: A) => predicate(a) ? thenMirror.forward(a) : elseMirror.forward(a),
    // For backward, try both and use first success
    (b: B) => {
      const thenResult = thenMirror.tryBackward(b);
      if (thenResult.ok) return thenResult.value;
      return elseMirror.backward(b);
    },
    { type: 'oneOf', options: [thenMirror.meta, elseMirror.meta] }
  );
}

/**
 * Filter: only allow values matching a predicate through.
 * Non-matching values throw an error.
 */
export function filter<A>(
  predicate: (a: A) => boolean,
  message?: string
): Mirror<A, A> {
  return new Mirror(
    (a: A) => {
      if (!predicate(a)) {
        throw new Error(message ?? 'Value did not match filter predicate');
      }
      return a;
    },
    (a: A) => a,
    { type: 'custom' }
  );
}
