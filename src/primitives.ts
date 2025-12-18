import { Mirror } from './mirror';

/**
 * String primitive: any ↔ string
 */
export const string: Mirror<unknown, string> = new Mirror(
  (x) => String(x),
  (s) => s,
  { type: 'string' }
);

/**
 * Number primitive: string ↔ number
 */
export const number: Mirror<string, number> = new Mirror(
  (s) => {
    const n = parseFloat(s);
    if (Number.isNaN(n)) {
      throw new Error(`Cannot parse "${s}" as number`);
    }
    return n;
  },
  (n) => String(n),
  { type: 'number' }
);

/**
 * Integer primitive: string ↔ integer
 */
export const integer: Mirror<string, number> = new Mirror(
  (s) => {
    const n = parseInt(s, 10);
    if (Number.isNaN(n)) {
      throw new Error(`Cannot parse "${s}" as integer`);
    }
    return n;
  },
  (n) => String(Math.floor(n)),
  { type: 'integer' }
);

/**
 * Boolean primitive: string ↔ boolean
 */
export const boolean: Mirror<string, boolean> = new Mirror(
  (s) => s === 'true' || s === '1' || s === 'yes',
  (b) => String(b),
  { type: 'boolean' }
);

/**
 * JSON primitive: string ↔ unknown
 */
export const json: Mirror<string, unknown> = new Mirror(
  (s) => JSON.parse(s) as unknown,
  (v) => JSON.stringify(v),
  { type: 'json' }
);

/**
 * Typed JSON primitive: string ↔ T
 */
export function jsonAs<T>(): Mirror<string, T> {
  return new Mirror(
    (s) => JSON.parse(s) as T,
    (v) => JSON.stringify(v),
    { type: 'json' }
  );
}

/**
 * Date primitive: string ↔ Date
 */
export const date: Mirror<string, Date> = new Mirror(
  (s) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Cannot parse "${s}" as date`);
    }
    return d;
  },
  (d) => d.toISOString(),
  { type: 'date' }
);

/**
 * Base64 primitive: string ↔ decoded string
 */
export const base64: Mirror<string, string> = new Mirror(
  (s) => {
    if (typeof atob === 'function') {
      return atob(s);
    }
    return Buffer.from(s, 'base64').toString('utf-8');
  },
  (s) => {
    if (typeof btoa === 'function') {
      return btoa(s);
    }
    return Buffer.from(s, 'utf-8').toString('base64');
  },
  { type: 'base64' }
);

/**
 * URL primitive: string ↔ URL
 */
export const url: Mirror<string, URL> = new Mirror(
  (s) => new URL(s),
  (u) => u.toString(),
  { type: 'custom', data: { format: 'url' } } as any
);

/**
 * BigInt primitive: string ↔ bigint
 */
export const bigint: Mirror<string, bigint> = new Mirror(
  (s) => BigInt(s),
  (n) => n.toString(),
  { type: 'custom', data: { format: 'bigint' } } as any
);

/**
 * Hex primitive: hex string ↔ number
 */
export const hex: Mirror<string, number> = new Mirror(
  (s) => {
    const n = parseInt(s.replace(/^0x/i, ''), 16);
    if (Number.isNaN(n)) {
      throw new Error(`Cannot parse "${s}" as hex`);
    }
    return n;
  },
  (n) => n.toString(16),
  { type: 'custom', data: { format: 'hex' } } as any
);

/**
 * Binary primitive: binary string ↔ number
 */
export const binary: Mirror<string, number> = new Mirror(
  (s) => {
    const n = parseInt(s.replace(/^0b/i, ''), 2);
    if (Number.isNaN(n)) {
      throw new Error(`Cannot parse "${s}" as binary`);
    }
    return n;
  },
  (n) => n.toString(2),
  { type: 'custom', data: { format: 'binary' } } as any
);
