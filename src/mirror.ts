import type { Meta, Result, JsonSchema } from './types';
import { sampleFromMeta } from './sample';
import { metaToJsonSchema } from './schema';
import { deepEqual } from './deepEqual';

/**
 * A Mirror<A, B> is a bidirectional function pair:
 * - forward:  A → B
 * - backward: B → A
 *
 * ## Important Invariants
 *
 * Mirror guarantees: `forward(backward(b)) ≈ b` (backward is a section)
 * Mirror does NOT guarantee: `backward(forward(a)) === a` (may lose information)
 *
 * This means:
 * - Going A → B → A may not return to the original A
 * - Going B → A → B should return to the original B (for non-lossy mirrors)
 *
 * For true bidirectional isomorphisms where both round-trips preserve values,
 * check `mirror.meta.lossy === false` and test with `assertRoundTrip`.
 */
export class Mirror<A, B> {
  constructor(
    public readonly forward: (a: A) => B,
    public readonly backward: (b: B) => A,
    public readonly meta: Meta = { type: 'custom' }
  ) {}

  /**
   * Check if this mirror is marked as lossy.
   * Lossy mirrors may not preserve values through round-trips.
   */
  get isLossy(): boolean {
    return this.meta.lossy === true;
  }

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
        lossy: this.isLossy || other.isLossy,
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

  /**
   * Test if a value round-trips correctly: b === forward(backward(b))
   * This is the guarantee Mirror provides.
   */
  testSectionLaw(b: B): boolean {
    try {
      const a = this.backward(b);
      const b2 = this.forward(a);
      return deepEqual(b, b2);
    } catch {
      return false;
    }
  }

  /**
   * Test if a value round-trips correctly: a === backward(forward(a))
   * This is NOT guaranteed for all mirrors, only true isomorphisms.
   */
  testRetractionLaw(a: A): boolean {
    try {
      const b = this.forward(a);
      const a2 = this.backward(b);
      return deepEqual(a, a2);
    } catch {
      return false;
    }
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
 * Create a lossy mirror where backward is best-effort.
 * Lossy mirrors explicitly don't guarantee round-trip preservation.
 */
export function lossy<A, B>(
  forward: (a: A) => B,
  backward: (b: B) => A,
  meta?: Partial<Meta>
): Mirror<A, B> {
  return new Mirror(forward, backward, {
    type: 'custom',
    ...meta,
    lossy: true,
  } as Meta);
}

/**
 * Create an asymmetric mirror with explicit best-effort backward
 * @deprecated Use `lossy` instead for clarity
 */
export function asymmetric<A, B>(
  forward: (a: A) => B,
  backward: (b: B) => A
): Mirror<A, B> {
  return lossy(forward, backward);
}

/**
 * Assert that a value round-trips correctly through a mirror.
 * Tests: b === forward(backward(b))
 *
 * @throws Error if the round-trip fails
 */
export function assertSectionLaw<A, B>(
  mirror: Mirror<A, B>,
  b: B,
  message?: string
): void {
  const a = mirror.backward(b);
  const b2 = mirror.forward(a);
  if (!deepEqual(b, b2)) {
    throw new Error(
      message ?? `Section law failed: forward(backward(b)) !== b\n  b:  ${JSON.stringify(b)}\n  b2: ${JSON.stringify(b2)}`
    );
  }
}

/**
 * Assert that a value round-trips correctly through a mirror (retraction law).
 * Tests: a === backward(forward(a))
 *
 * Note: This is NOT guaranteed for all mirrors. Only use for testing
 * true isomorphisms or verifying specific values.
 *
 * @throws Error if the round-trip fails
 */
export function assertRetractionLaw<A, B>(
  mirror: Mirror<A, B>,
  a: A,
  message?: string
): void {
  const b = mirror.forward(a);
  const a2 = mirror.backward(b);
  if (!deepEqual(a, a2)) {
    throw new Error(
      message ?? `Retraction law failed: backward(forward(a)) !== a\n  a:  ${JSON.stringify(a)}\n  a2: ${JSON.stringify(a2)}`
    );
  }
}

/**
 * Assert both section and retraction laws hold for given values.
 * Use this only when testing true bidirectional isomorphisms.
 */
export function assertIsomorphism<A, B>(
  mirror: Mirror<A, B>,
  a: A,
  b: B
): void {
  assertRetractionLaw(mirror, a);
  assertSectionLaw(mirror, b);
}

/**
 * Test helper: verify a mirror's behavior with example values
 */
export function testMirror<A, B>(
  mirror: Mirror<A, B>,
  examples: Array<{ a: A; b: B }>
): { passed: number; failed: Array<{ a: A; b: B; error: string }> } {
  const failed: Array<{ a: A; b: B; error: string }> = [];

  for (const { a, b } of examples) {
    try {
      const actualB = mirror.forward(a);
      if (!deepEqual(actualB, b)) {
        failed.push({ a, b, error: `forward(a) !== b: got ${JSON.stringify(actualB)}` });
        continue;
      }

      const actualA = mirror.backward(b);
      const roundTripB = mirror.forward(actualA);
      if (!deepEqual(roundTripB, b)) {
        failed.push({ a, b, error: `forward(backward(b)) !== b` });
      }
    } catch (e) {
      failed.push({ a, b, error: String(e) });
    }
  }

  return { passed: examples.length - failed.length, failed };
}
