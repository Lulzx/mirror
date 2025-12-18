import { describe, it, expect } from 'bun:test';
import m, {
  mirror,
  identity,
  pipe,
  prop,
  object,
  array,
  range,
  nullable,
  route,
  split,
} from './index';

describe('Mirror core', () => {
  it('should create a mirror with forward and backward', () => {
    const double = mirror(
      (x: number) => x * 2,
      (x: number) => x / 2
    );

    expect(double.forward(5)).toBe(10);
    expect(double.backward(10)).toBe(5);
  });

  it('should compose with pipe', () => {
    const double = mirror(
      (x: number) => x * 2,
      (x: number) => x / 2
    );

    const addTen = mirror(
      (x: number) => x + 10,
      (x: number) => x - 10
    );

    const composed = double.pipe(addTen);

    expect(composed.forward(5)).toBe(20); // 5 * 2 + 10
    expect(composed.backward(20)).toBe(5); // (20 - 10) / 2
  });

  it('should invert a mirror', () => {
    const double = mirror(
      (x: number) => x * 2,
      (x: number) => x / 2
    );

    const inverted = double.invert();

    expect(inverted.forward(10)).toBe(5);
    expect(inverted.backward(5)).toBe(10);
  });

  it('should handle tryForward and tryBackward', () => {
    const failing = mirror(
      (_: string) => { throw new Error('fail'); },
      (x: string) => x
    );

    const result = failing.tryForward('test');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('fail');
    }
  });
});

describe('Primitives', () => {
  it('should parse strings to numbers', () => {
    expect(m.number.forward('42.5')).toBe(42.5);
    expect(m.number.backward(42.5)).toBe('42.5');
  });

  it('should parse strings to integers', () => {
    expect(m.integer.forward('42')).toBe(42);
    expect(m.integer.backward(42)).toBe('42');
  });

  it('should parse strings to booleans', () => {
    expect(m.boolean.forward('true')).toBe(true);
    expect(m.boolean.forward('false')).toBe(false);
    expect(m.boolean.backward(true)).toBe('true');
  });

  it('should parse JSON', () => {
    const obj = { a: 1, b: 'test' };
    expect(m.json.forward(JSON.stringify(obj))).toEqual(obj);
    expect(m.json.backward(obj)).toBe(JSON.stringify(obj));
  });

  it('should parse dates', () => {
    const dateStr = '2025-01-15T10:30:00.000Z';
    const date = m.date.forward(dateStr);
    expect(date).toBeInstanceOf(Date);
    expect(m.date.backward(date)).toBe(dateStr);
  });
});

describe('Composition', () => {
  it('should pipe multiple mirrors', () => {
    const codec = pipe(m.json, prop<'name', string>('name'));
    expect(codec.forward('{"name":"Alice"}')).toBe('Alice');
    expect(codec.backward('Bob')).toBe('{"name":"Bob"}');
  });

  it('should use identity mirror', () => {
    const id = identity<number>();
    expect(id.forward(42)).toBe(42);
    expect(id.backward(42)).toBe(42);
  });
});

describe('Object manipulation', () => {
  it('should access properties with prop', () => {
    const p = prop<'x', number>('x');
    expect(p.forward({ x: 42 })).toBe(42);
    expect(p.backward(42)).toEqual({ x: 42 });
  });

  it('should map arrays', () => {
    const doubleArray = array(
      mirror(
        (x: number) => x * 2,
        (x: number) => x / 2
      )
    );

    expect(doubleArray.forward([1, 2, 3])).toEqual([2, 4, 6]);
    expect(doubleArray.backward([2, 4, 6])).toEqual([1, 2, 3]);
  });
});

describe('Constraints', () => {
  it('should validate range', () => {
    const r = range(0, 100);
    expect(r.forward(50)).toBe(50);
    expect(() => r.forward(150)).toThrow();
    expect(r.backward(150)).toBe(100); // clamps
  });

  it('should handle nullable', () => {
    const n = nullable(m.number);
    expect(n.forward(null)).toBe(null);
    expect(n.forward('42')).toBe(42);
    expect(n.backward(null)).toBe(null);
    expect(n.backward(42)).toBe('42');
  });
});

describe('Parser combinators', () => {
  it('should parse routes', () => {
    const r = route<{ userId: string; postId: string }>('/users/:userId/posts/:postId');
    expect(r.forward('/users/42/posts/7')).toEqual({ userId: '42', postId: '7' });
    expect(r.backward({ userId: '42', postId: '7' })).toBe('/users/42/posts/7');
  });

  it('should split strings', () => {
    const s = split(',');
    expect(s.forward('a,b,c')).toEqual(['a', 'b', 'c']);
    expect(s.backward(['a', 'b', 'c'])).toBe('a,b,c');
  });
});

describe('Metadata', () => {
  it('should generate samples', () => {
    const codec = pipe(m.integer, range(0, 100));
    const sample = codec.sample();
    expect(typeof sample).toBe('number');
    expect(sample).toBeGreaterThanOrEqual(0);
    expect(sample).toBeLessThanOrEqual(100);
  });

  it('should generate JSON Schema', () => {
    const r = range(0, 100);
    const schema = r.toJsonSchema();
    expect(schema.type).toBe('number');
    expect(schema.minimum).toBe(0);
    expect(schema.maximum).toBe(100);
  });
});

describe('Real-world example', () => {
  it('should handle complex codec', () => {
    const userCodec = pipe(
      m.json,
      object({
        id: pipe(prop('id'), m.string),
        email: pipe(prop('email'), m.string),
        age: pipe(prop('age'), m.integer),
      })
    );

    const jsonStr = '{"id":"123","email":"test@example.com","age":"25"}';
    const user = userCodec.forward(jsonStr);

    expect(user).toEqual({
      id: '123',
      email: 'test@example.com',
      age: 25,
    });

    const backJson = userCodec.backward(user);
    expect(JSON.parse(backJson as string)).toEqual({
      id: '123',
      email: 'test@example.com',
      age: '25',
    });
  });
});
