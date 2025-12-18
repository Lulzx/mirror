import { describe, it, expect } from 'bun:test';
import m, {
  Mirror,
  mirror,
  pipe,
  prop,
  object,
  array,
  json,
  number,
  integer,
  boolean,
  date,
  base64,
  url,
  hex,
  binary,
  route,
  queryString,
  split,
  prefix,
  suffix,
  between,
  range,
  length,
  pattern,
  oneOfValues,
  nullable,
  optional,
  entries,
  pick,
  omit,
  string,
  toString,
  trim,
  lowercase,
  uppercase,
  clamp,
  validate,
  branch,
  filter,
  many,
  many1,
  assertSectionLaw,
  assertRetractionLaw,
  testMirror,
  identity,
  lossy,
  mapValues,
} from '../src';

describe('Mirror Core', () => {
  it('should create a mirror with forward and backward', () => {
    const m = mirror(
      (x: number) => x * 2,
      (x: number) => x / 2
    );
    expect(m.forward(5)).toBe(10);
    expect(m.backward(10)).toBe(5);
  });

  it('should pipe mirrors together', () => {
    const toNumber = mirror(
      (s: string) => parseInt(s, 10),
      (n: number) => String(n)
    );
    const double = mirror(
      (n: number) => n * 2,
      (n: number) => n / 2
    );
    const piped = pipe(toNumber, double);
    expect(piped.forward('5')).toBe(10);
    expect(piped.backward(10)).toBe('5');
  });

  it('should invert a mirror', () => {
    const m = mirror(
      (x: number) => x.toString(),
      (s: string) => parseInt(s, 10)
    );
    const inverted = m.invert();
    expect(inverted.forward('5')).toBe(5);
    expect(inverted.backward(5)).toBe('5');
  });

  it('identity mirror returns same value', () => {
    const id = identity<number>();
    expect(id.forward(42)).toBe(42);
    expect(id.backward(42)).toBe(42);
  });

  it('empty pipe returns identity', () => {
    const empty = pipe();
    expect(empty.forward(42)).toBe(42);
    expect(empty.backward(42)).toBe(42);
  });
});

describe('Primitives', () => {
  it('string is identity for strings', () => {
    expect(string.forward('hello')).toBe('hello');
    expect(string.backward('world')).toBe('world');
  });

  it('toString converts to string (lossy)', () => {
    expect(toString.forward(42)).toBe('42');
    expect(toString.forward(null)).toBe('null');
    expect(toString.isLossy).toBe(true);
  });

  it('number parses and stringifies', () => {
    expect(number.forward('42.5')).toBe(42.5);
    expect(number.backward(42.5)).toBe('42.5');
  });

  it('integer parses and floors', () => {
    expect(integer.forward('42')).toBe(42);
    expect(integer.backward(42.9)).toBe('42');
  });

  it('boolean parses truthy values', () => {
    expect(boolean.forward('true')).toBe(true);
    expect(boolean.forward('1')).toBe(true);
    expect(boolean.forward('yes')).toBe(true);
    expect(boolean.forward('no')).toBe(false);
    expect(boolean.backward(true)).toBe('true');
  });

  it('json parses and stringifies', () => {
    const data = { a: 1, b: 'hello' };
    const str = JSON.stringify(data);
    expect(json.forward(str)).toEqual(data);
    expect(json.backward(data)).toBe(str);
  });

  it('date parses ISO strings', () => {
    const d = new Date('2024-01-15T12:00:00.000Z');
    expect(date.forward('2024-01-15T12:00:00.000Z').getTime()).toBe(d.getTime());
    expect(date.backward(d)).toBe('2024-01-15T12:00:00.000Z');
  });

  it('base64 encodes and decodes', () => {
    expect(base64.forward('SGVsbG8=')).toBe('Hello');
    expect(base64.backward('Hello')).toBe('SGVsbG8=');
  });
});

describe('Object Manipulation', () => {
  it('prop accesses and wraps properties', () => {
    const nameProp = prop<'name', string>('name');
    expect(nameProp.forward({ name: 'Alice' })).toBe('Alice');
    expect(nameProp.backward('Bob')).toEqual({ name: 'Bob' });
  });

  it('object combines multiple props', () => {
    const userSchema = object({
      name: prop('name'),
      age: pipe(prop('age'), integer),
    });
    const raw = { name: 'Alice', age: '30' };
    expect(userSchema.forward(raw)).toEqual({ name: 'Alice', age: 30 });
  });

  it('array maps over elements', () => {
    const nums = array(number);
    expect(nums.forward(['1', '2', '3'])).toEqual([1, 2, 3]);
    expect(nums.backward([1, 2, 3])).toEqual(['1', '2', '3']);
  });

  it('entries converts object to array', () => {
    const e = entries<string, number>();
    expect(e.forward({ a: 1, b: 2 })).toEqual([['a', 1], ['b', 2]]);
    expect(e.backward([['a', 1], ['b', 2]])).toEqual({ a: 1, b: 2 });
  });

  it('pick is lossy', () => {
    const p = pick<{ a: number; b: string; c: boolean }, 'a' | 'b'>('a', 'b');
    expect(p.forward({ a: 1, b: 'test', c: true })).toEqual({ a: 1, b: 'test' });
    expect(p.isLossy).toBe(true);
  });

  it('omit is lossy', () => {
    const o = omit<{ a: number; b: string; c: boolean }, 'c'>('c');
    expect(o.forward({ a: 1, b: 'test', c: true })).toEqual({ a: 1, b: 'test' });
    expect(o.isLossy).toBe(true);
  });

  it('mapValues transforms all values', () => {
    const mv = mapValues(number);
    expect(mv.forward({ a: '1', b: '2' })).toEqual({ a: 1, b: 2 });
    expect(mv.backward({ a: 1, b: 2 })).toEqual({ a: '1', b: '2' });
  });
});

describe('Constraints', () => {
  it('range validates and clamps', () => {
    const r = range(0, 100);
    expect(r.forward(50)).toBe(50);
    expect(() => r.forward(150)).toThrow();
    expect(r.backward(150)).toBe(100);
  });

  it('clamp never throws', () => {
    const c = clamp(0, 100);
    expect(c.forward(-10)).toBe(0);
    expect(c.forward(110)).toBe(100);
    expect(c.forward(50)).toBe(50);
  });

  it('length validates string length', () => {
    const l = length(1, 10);
    expect(l.forward('hello')).toBe('hello');
    expect(() => l.forward('')).toThrow();
    expect(l.backward('hello world!!')).toBe('hello worl');
  });

  it('pattern validates regex', () => {
    const email = pattern(/^[^@]+@[^@]+$/);
    expect(email.forward('a@b.com')).toBe('a@b.com');
    expect(() => email.forward('invalid')).toThrow();
  });

  it('pattern is stable with global regex', () => {
    const p = pattern(/^[a-z]+$/g);
    expect(() => p.forward('abc')).not.toThrow();
    expect(() => p.forward('abc')).not.toThrow();
  });

  it('oneOfValues validates enum', () => {
    const status = oneOfValues('active', 'pending', 'done');
    expect(status.forward('active')).toBe('active');
    expect(() => status.forward('invalid' as any)).toThrow();
  });

  it('nullable allows null', () => {
    const n = nullable(number);
    expect(n.forward(null)).toBe(null);
    expect(n.forward('42')).toBe(42);
  });

  it('optional uses deep equality for default', () => {
    const defaultObj = { x: 1, y: 2 };
    const opt = optional(
      mirror((x: unknown) => x, (x: unknown) => x),
      defaultObj
    );
    expect(opt.forward(undefined)).toEqual(defaultObj);
    expect(opt.backward({ x: 1, y: 2 })).toBe(undefined);
    expect(opt.backward({ x: 1, y: 3 })).toEqual({ x: 1, y: 3 });
  });

  it('optional deep equality handles Date defaults', () => {
    const defaultDate = new Date('2024-01-01T00:00:00.000Z');
    const opt = optional(
      mirror((x: unknown) => x, (x: unknown) => x),
      defaultDate
    );

    expect(opt.backward(new Date('2024-01-01T00:00:00.000Z'))).toBe(undefined);

    const other = new Date('2024-01-02T00:00:00.000Z');
    const back = opt.backward(other);
    expect(back).toBeInstanceOf(Date);
    expect((back as Date).getTime()).toBe(other.getTime());
  });

  it('validate runs custom predicate', () => {
    const positive = validate<number>((n) => n > 0, 'Must be positive');
    expect(positive.forward(5)).toBe(5);
    expect(() => positive.forward(-1)).toThrow('Must be positive');
  });

  it('trim is lossy', () => {
    expect(trim.forward('  hello  ')).toBe('hello');
    expect(trim.isLossy).toBe(true);
  });

  it('lowercase is lossy', () => {
    expect(lowercase.forward('HELLO')).toBe('hello');
    expect(lowercase.isLossy).toBe(true);
  });

  it('uppercase is lossy', () => {
    expect(uppercase.forward('hello')).toBe('HELLO');
    expect(uppercase.isLossy).toBe(true);
  });
});

describe('Composition', () => {
  it('branch selects mirror based on predicate', () => {
    const b = branch<number, string>(
      (n) => n > 0,
      mirror((n) => `positive:${n}`, (s) => parseInt(s.split(':')[1]!)),
      mirror((n) => `negative:${n}`, (s) => parseInt(s.split(':')[1]!))
    );
    expect(b.forward(5)).toBe('positive:5');
    expect(b.forward(-5)).toBe('negative:-5');
  });

  it('filter validates with predicate', () => {
    const f = filter<number>((n) => n > 0, 'Must be positive');
    expect(f.forward(5)).toBe(5);
    expect(() => f.forward(-1)).toThrow('Must be positive');
  });
});

describe('Parser Combinators', () => {
  it('route parses and builds URLs', () => {
    const r = route<{ userId: string; postId: string }>('/users/:userId/posts/:postId');
    expect(r.forward('/users/42/posts/7')).toEqual({ userId: '42', postId: '7' });
    expect(r.backward({ userId: '42', postId: '7' })).toBe('/users/42/posts/7');
  });

  it('queryString parses and builds query strings', () => {
    const qs = queryString<{ page: string; limit: string }>();
    expect(qs.forward('?page=1&limit=10')).toEqual({ page: '1', limit: '10' });
    expect(qs.backward({ page: '1', limit: '10' })).toBe('?page=1&limit=10');
  });

  it('split splits and joins', () => {
    const s = split(',');
    expect(s.forward('a,b,c')).toEqual(['a', 'b', 'c']);
    expect(s.backward(['a', 'b', 'c'])).toBe('a,b,c');
  });

  it('prefix strips and adds prefix', () => {
    const p = prefix('https://');
    expect(p.forward('https://example.com')).toBe('example.com');
    expect(p.backward('example.com')).toBe('https://example.com');
  });

  it('suffix strips and adds suffix', () => {
    const s = suffix('.json');
    expect(s.forward('config.json')).toBe('config');
    expect(s.backward('config')).toBe('config.json');
  });

  it('between extracts content', () => {
    const b = between('[', ']');
    expect(b.forward('[hello]')).toBe('hello');
    expect(b.backward('hello')).toBe('[hello]');
  });

  it('many parses zero or more', () => {
    const m = many(
      mirror(
        (s: string) => {
          const match = s.match(/^\d+/);
          if (!match) throw new Error('no match');
          return { match: match[0], rest: s.slice(match[0].length) };
        },
        ({ match, rest }) => match + rest
      )
    );
    expect(m.forward('123abc')).toEqual(['123']);
    expect(m.forward('abc')).toEqual([]);
  });

  it('many1 requires at least one', () => {
    const m = many1(
      mirror(
        (s: string) => {
          const match = s.match(/^\d+/);
          if (!match) throw new Error('no match');
          return { match: match[0], rest: s.slice(match[0].length) };
        },
        ({ match, rest }) => match + rest
      )
    );
    expect(m.forward('123abc')).toEqual(['123']);
    expect(() => m.forward('abc')).toThrow();
  });
});

describe('Round-trip Laws', () => {
  it('assertSectionLaw verifies forward(backward(b)) === b', () => {
    const numMirror = number;
    expect(() => assertSectionLaw(numMirror, 42)).not.toThrow();
  });

  it('assertRetractionLaw verifies backward(forward(a)) === a', () => {
    const numMirror = number;
    expect(() => assertRetractionLaw(numMirror, '42')).not.toThrow();
  });

  it('testMirror validates examples', () => {
    const numMirror = number;
    const result = testMirror(numMirror, [
      { a: '42', b: 42 },
      { a: '3.14', b: 3.14 },
    ]);
    expect(result.passed).toBe(2);
    expect(result.failed).toHaveLength(0);
  });

  it('testSectionLaw method works', () => {
    expect(number.testSectionLaw(42)).toBe(true);
    expect(number.testSectionLaw(NaN)).toBe(false);
  });

  it('testSectionLaw compares Date values correctly', () => {
    const broken = mirror<Date, Date>(
      (d) => d,
      (d) => new Date(d.getTime() + 1)
    );
    expect(broken.testSectionLaw(new Date(0))).toBe(false);
  });

  it('testRetractionLaw method works', () => {
    expect(number.testRetractionLaw('42')).toBe(true);
    expect(number.testRetractionLaw('invalid')).toBe(false);
  });
});

describe('Lossy Tracking', () => {
  it('isLossy property reflects metadata', () => {
    expect(string.isLossy).toBe(false);
    expect(toString.isLossy).toBe(true);
    expect(trim.isLossy).toBe(true);
    expect(lowercase.isLossy).toBe(true);
    expect(uppercase.isLossy).toBe(true);
  });

  it('lossy helper creates lossy mirror', () => {
    const l = lossy((n: number) => n.toString(), (s: string) => parseInt(s));
    expect(l.isLossy).toBe(true);
  });

  it('pipe propagates lossy flag', () => {
    const nonLossy = pipe(number, range(0, 100));
    expect(nonLossy.isLossy).toBe(false);

    const hasLossy = pipe(toString, trim);
    expect(hasLossy.isLossy).toBe(true);
  });
});

describe('Try Methods', () => {
  it('tryForward returns Result', () => {
    const result = number.tryForward('42');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }

    const failResult = number.tryForward('invalid');
    expect(failResult.ok).toBe(false);
  });

  it('tryBackward returns Result', () => {
    const result = number.tryBackward(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('42');
    }
  });
});

describe('Sample and Schema Generation', () => {
  it('sample generates values', () => {
    const sample = number.sample();
    expect(typeof sample).toBe('number');
  });

  it('sample matches primitive output types', () => {
    expect(url.sample()).toBeInstanceOf(URL);
    expect(typeof hex.sample()).toBe('number');
    expect(typeof binary.sample()).toBe('number');
  });

  it('toJsonSchema generates schema', () => {
    const schema = range(0, 100).toJsonSchema();
    expect(schema.type).toBe('number');
    expect(schema.minimum).toBe(0);
    expect(schema.maximum).toBe(100);
  });

  it('describe adds description', () => {
    const described = number.describe('A numeric value');
    expect(described.meta.description).toBe('A numeric value');
  });
});

describe('Edge Cases', () => {
  it('split handles empty string', () => {
    const s = split(',');
    expect(s.forward('')).toEqual([]);
    expect(s.backward([])).toBe('');
  });

  it('queryString handles empty', () => {
    const qs = queryString();
    expect(qs.forward('')).toEqual({});
    expect(qs.backward({})).toBe('');
  });

  it('queryString handles keys without values', () => {
    const qs = queryString();
    expect(qs.forward('?flag')).toEqual({ flag: '' });
  });

  it('queryString decodes and encodes keys', () => {
    const qs = queryString();
    expect(qs.forward('?a%20b=1')).toEqual({ 'a b': '1' });
    expect(qs.backward({ 'a b': '1' })).toBe('?a%20b=1');
  });

  it('positive has min: 1 in metadata', () => {
    expect(m.positive.meta).toEqual({ type: 'range', min: 1, max: Infinity });
  });
});
