# Mirror

**One function. Both directions. Zero duplication.**

Mirror is a lightweight TypeScript library that introduces *bidirectional functions*—single definitions that execute forward or backward, with composition that preserves bidirectionality automatically.

```typescript
import m from 'mirror-fn';

const codec = m.pipe(
  m.json,
  m.prop('user'),
  m.prop('email')
);

codec.forward('{"user":{"email":"a@b.com"}}')  // → "a@b.com"
codec.backward("x@y.com")                       // → '{"user":{"email":"x@y.com"}}'
```

## Installation

```bash
npm install mirror-fn
```

## The Problem

Every application contains mirrored pairs of functions that must stay synchronized:

| Forward | Backward |
|---------|----------|
| `JSON.parse` | `JSON.stringify` |
| `parseUrl` | `formatUrl` |
| `validate` | `generate` |
| `decode` | `encode` |
| `get` | `set` |

These pairs are written separately, tested separately, and inevitably drift apart. Mirror eliminates this class of bugs by construction.

## Core Concept

A `Mirror<A, B>` is a pair of functions:

```
forward:  A → B
backward: B → A
```

Composition preserves bidirectionality:

```typescript
// If we have:
//   f: Mirror<A, B>
//   g: Mirror<B, C>
//
// Then pipe(f, g) gives us:
//   forward:  A → B → C
//   backward: C → B → A

const pipeline = m.pipe(f, g, h);

pipeline.forward(a);   // h.forward(g.forward(f.forward(a)))
pipeline.backward(c);  // f.backward(g.backward(h.backward(c)))
```

## API Reference

### Primitives

```typescript
m.string      // any ↔ string
m.number      // string ↔ number
m.integer     // string ↔ integer
m.boolean     // string ↔ boolean
m.json        // string ↔ unknown
m.date        // string ↔ Date
m.base64      // base64 string ↔ decoded string
m.url         // string ↔ URL
m.hex         // hex string ↔ number
m.binary      // binary string ↔ number
```

### Composition

```typescript
// Sequential composition
m.pipe(m1, m2, m3)

// Parallel composition (for independent fields)
m.all({ a: m1, b: m2 })

// Conditional (first match wins)
m.oneOf(m1, m2, m3)

// Fallback
m.fallback(primary, backup)

// Lazy evaluation (for recursive types)
m.lazy(() => recursiveMirror)
```

### Object Manipulation

```typescript
// Property access lens
m.prop('fieldName')
m.prop('nested', m.prop('deep'))

// Object schema
m.object({
  id: m.pipe(m.prop('id'), m.string),
  count: m.pipe(m.prop('count'), m.integer)
})

// Array mapping
m.array(itemMirror)

// Tuple mapping
m.tuple(m1, m2, m3)

// Pick/omit fields
m.pick('a', 'b')
m.omit('c', 'd')

// Deep path access
m.path('a', 'b', 'c')  // accesses obj.a.b.c

// Immutable updates
m.set(lens, source, value)
m.over(lens, source, fn)
```

### Constraints

```typescript
m.range(0, 100)           // constrain numbers
m.length(1, 255)          // constrain string length
m.pattern(/regex/)        // constrain string format
m.oneOfValues('a', 'b')   // enum constraint
m.nullable(inner)         // allow null
m.optional(inner, def)    // allow undefined with default
m.withDefault(inner, def) // use default for null/undefined

// Built-in validators
m.nonEmpty                // non-empty string
m.positive                // positive number
m.nonNegative             // non-negative number
m.isInteger               // integer check
m.isFinite                // finite number check

// String transforms
m.trim
m.lowercase
m.uppercase

// Common patterns
m.email                   // email format
m.uuid                    // UUID format
m.slug                    // URL slug format
m.alphanumeric            // alphanumeric only
```

### Parser Combinators

```typescript
// Exact string match
m.literal('https://')

// Regex capture
m.regex(/[^\/]+/)

// Named capture
m.capture('userId', /\d+/)

// Sequential parsing
m.seq(
  m.literal('/users/'),
  ['userId', m.regex(/\d+/)],
  m.literal('/posts')
)

// Separated list
m.sepBy(item, ',')

// URL routing
m.route('/users/:userId/posts/:postId')

// Query string
m.queryString()

// Full URL parser
m.urlParser('/users/:id')

// String utilities
m.split(',')
m.prefix('https://')
m.suffix('.json')
m.between('[', ']')
```

### Derived Capabilities

```typescript
// Generate sample values
const user = userMirror.sample();

// Generate JSON Schema
const schema = userMirror.toJsonSchema();

// Try without throwing
const result = mirror.tryForward(input);
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}

// Invert a mirror
const inverted = mirror.invert();

// Add description
const documented = mirror.describe('User email address');
```

## Use Cases

### Schema Definition = Parser = Serializer = Generator

```typescript
import m, { pipe, prop, object, range, oneOfValues } from 'mirror-fn';

const User = object({
  id: pipe(prop('id'), m.string, m.uuid),
  email: pipe(prop('email'), m.string, m.email),
  age: pipe(prop('age'), m.integer, range(0, 150)),
  role: pipe(prop('role'), oneOfValues('admin', 'user', 'guest'))
});

// Parse incoming data
const user = User.forward(rawData);

// Serialize outgoing data
const data = User.backward(user);

// Generate test fixtures
const mockUser = User.sample();

// Generate JSON Schema
const schema = User.toJsonSchema();
```

### URL Routing

```typescript
import m from 'mirror-fn';

const userRoute = m.route('/users/:userId/posts/:postId');

// Parse URL
userRoute.forward('/users/42/posts/7')
// → { userId: '42', postId: '7' }

// Build URL
userRoute.backward({ userId: '42', postId: '7' })
// → '/users/42/posts/7'
```

### Form Binding

```typescript
import m, { pipe, prop, object } from 'mirror-fn';

const formCodec = object({
  name: pipe(prop('name'), m.string),
  age: pipe(prop('age'), m.integer),
  subscribed: pipe(prop('newsletter'), m.boolean)
});

// Populate form from data
const formValues = formCodec.forward(userData);

// Read form to data
const userData = formCodec.backward(formValues);
```

### Lenses for Immutable Updates

```typescript
import m, { pipe, prop, set, over } from 'mirror-fn';

const nameLens = pipe(
  prop('user'),
  prop('profile'),
  prop('name')
);

// Get
nameLens.forward(state)  // → 'Alice'

// Set (immutable)
set(nameLens, state, 'Bob')
// → { user: { profile: { name: 'Bob', ...rest }, ...rest }, ...rest }

// Update (immutable)
over(nameLens, state, name => name.toUpperCase())
```

### Configuration Parsing

```typescript
import m, { pipe } from 'mirror-fn';

const configCodec = pipe(
  m.json,
  m.object({
    port: pipe(m.prop('port'), m.integer, m.range(1, 65535)),
    host: pipe(m.prop('host'), m.string),
    debug: pipe(m.prop('debug'), m.optional(m.boolean, false))
  })
);

// Parse config file
const config = configCodec.forward(fs.readFileSync('config.json', 'utf-8'));

// Serialize config
const json = configCodec.backward(config);
```

## Advanced Usage

### Custom Mirrors

```typescript
import { mirror, Mirror } from 'mirror-fn';

const celsius: Mirror<number, number> = mirror(
  (f) => (f - 32) * 5/9,  // Fahrenheit to Celsius
  (c) => c * 9/5 + 32,    // Celsius to Fahrenheit
  { type: 'custom', data: { unit: 'temperature' } }
);

celsius.forward(212)   // → 100
celsius.backward(0)    // → 32
```

### Recursive Types

```typescript
import m, { lazy, pipe, prop, object, array, nullable } from 'mirror-fn';

interface TreeNode {
  value: number;
  children: TreeNode[] | null;
}

const TreeNode: Mirror<unknown, TreeNode> = object({
  value: pipe(prop('value'), m.integer),
  children: pipe(
    prop('children'),
    nullable(array(lazy(() => TreeNode)))
  )
});
```

### Error Handling

```typescript
import m from 'mirror-fn';

const parser = m.pipe(m.json, m.prop('data'));

// Throwing version
try {
  const result = parser.forward('invalid json');
} catch (e) {
  console.error('Parse failed:', e.message);
}

// Non-throwing version
const result = parser.tryForward('invalid json');
if (!result.ok) {
  console.error('Parse failed:', result.error.message);
}
```

## Comparison

| Capability | Mirror | Zod | io-ts | Ramda |
|------------|--------|-----|-------|-------|
| Validation | ✓ | ✓ | ✓ | ✗ |
| Serialization | ✓ | ✗ | ✓ | ✗ |
| Generation | ✓ | ✗ | ✗ | ✗ |
| Lenses | ✓ | ✗ | ✗ | ✓ |
| URL parsing | ✓ | ✗ | ✗ | ✗ |
| Single definition | ✓ | ✗ | partial | ✗ |
| Bundle size | ~4KB | ~12KB | ~8KB | ~50KB |

## Prior Art

Mirror draws from:

- **Lenses** (Haskell, Ramda): Bidirectional property access
- **Codecs** (io-ts, Schemata): Decode/encode pairs
- **Bidirectional Programming** (academic): Boomerang, BiGUL
- **Parser Combinators** (Parsec, Arcsecond): Composable parsing

## TypeScript Support

Mirror is written in TypeScript and provides full type inference:

```typescript
import m, { pipe, prop } from 'mirror-fn';

const codec = pipe(m.json, prop('user'), prop('name'));
//    ^? Mirror<string, string>

const name = codec.forward('{"user":{"name":"Alice"}}');
//    ^? string
```

## License

MIT © 2025 Lulzx
