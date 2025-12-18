import type { Meta, Result, JsonSchema } from './types';
import { sampleFromMeta } from './sample';
import { metaToJsonSchema } from './schema';

/**
 * A Mirror<A, B> is a bidirectional function pair:
 * - forward:  A → B
 * - backward: B → A
 *
 * The key insight is that composition preserves bidirectionality.
 */
export class Mirror<A, B> {
  constructor(
    public readonly forward: (a: A) => B,
    public readonly backward: (b: B) => A,
    public readonly meta: Meta = { type: 'custom' }
  ) {}

  /**
   * Compose this mirror with another: A ↔ B, B ↔ C => A ↔ C
   */
  pipe<C>(other: Mirror<B, C>): Mirror<A, C> {
    return new Mirror(
      (a: A) => other.forward(this.forward(a)),
      (c: C) => this.backward(other.backward(c)),
      {
        type: 'pipe',
        stages: [this.meta, other.meta],
      }
    );
  }

  /**
   * Invert the mirror: A ↔ B becomes B ↔ A
   */
  invert(): Mirror<B, A> {
    return new Mirror(this.backward, this.forward, this.meta);
  }

  /**
   * Try forward, returning a Result instead of throwing
   */
  tryForward(a: A): Result<B> {
    try {
      return { ok: true, value: this.forward(a) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  /**
   * Try backward, returning a Result instead of throwing
   */
  tryBackward(b: B): Result<A> {
    try {
      return { ok: true, value: this.backward(b) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  /**
   * Generate a sample value (from the B side)
   */
  sample(): B {
    return sampleFromMeta(this.meta) as B;
  }

  /**
   * Generate JSON Schema for this mirror
   */
  toJsonSchema(): JsonSchema {
    return metaToJsonSchema(this.meta);
  }

  /**
   * Add a description to this mirror's metadata
   */
  describe(description: string): Mirror<A, B> {
    return new Mirror(this.forward, this.backward, {
      ...this.meta,
      description,
    } as Meta);
  }

  /**
   * Transform with a custom function on the B side
   */
  map<C>(
    f: (b: B) => C,
    g: (c: C) => B,
    meta?: Partial<Meta>
  ): Mirror<A, C> {
    return new Mirror(
      (a: A) => f(this.forward(a)),
      (c: C) => this.backward(g(c)),
      meta ? ({ ...this.meta, ...meta } as Meta) : this.meta
    );
  }
}

/**
 * Create a mirror from forward and backward functions
 */
export function mirror<A, B>(
  forward: (a: A) => B,
  backward: (b: B) => A,
  meta: Meta = { type: 'custom' }
): Mirror<A, B> {
  return new Mirror(forward, backward, meta);
}

/**
 * Identity mirror: A ↔ A
 */
export function identity<T>(): Mirror<T, T> {
  return new Mirror(
    (x: T) => x,
    (x: T) => x,
    { type: 'identity' }
  );
}

/**
 * Create a lossy mirror where backward is best-effort
 */
export function lossy<A, B>(
  forward: (a: A) => B,
  backward: (b: B) => A
): Mirror<A, B> {
  return new Mirror(forward, backward, {
    type: 'custom',
    data: { lossy: true },
  } as Meta);
}

/**
 * Create an asymmetric mirror with explicit best-effort backward
 */
export function asymmetric<A, B>(
  forward: (a: A) => B,
  backward: (b: B) => A
): Mirror<A, B> {
  return lossy(forward, backward);
}
