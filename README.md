# Mirror

**One function. Both directions. Zero duplication.**

Mirror is a TypeScript library for bidirectional functions: single definitions that execute forward or backward, with composition that preserves bidirectionality automatically.

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
m.string      // string ↔ string (identity)
m.toString    // any → string (lossy)
m.number      // string ↔ number
m.integer     // string ↔ integer
m.boolean     // string ↔ boolean
m.json        // string ↔ unknown
m.date        // string ↔ Date
m.base64      // base64 ↔ decoded string
m.url         // string ↔ URL
m.hex         // hex string ↔ number
m.binary      // binary string ↔ number
```

### Composition

```typescript
m.pipe(m1, m2, m3)              // sequential
m.all({ a: m1, b: m2 })         // parallel
m.oneOf(m1, m2, m3)             // first match wins
m.fallback(primary, backup)     // try primary, then backup
m.lazy(() => recursiveMirror)   // lazy evaluation
m.branch(predicate, then, else) // conditional
m.filter(predicate, message)    // validation filter
```

### Object Manipulation

```typescript
m.prop('fieldName')             // property lens
m.object({ id: m.prop('id') })  // object schema
m.array(itemMirror)             // array mapping
m.tuple(m1, m2, m3)             // tuple mapping
m.pick('a', 'b')                // pick fields (lossy)
m.omit('c', 'd')                // omit fields (lossy)
m.path('a', 'b', 'c')           // deep path access
m.entries()                     // object ↔ [key, value][]
m.mapValues(mirror)             // map object values
m.set(lens, source, value)      // immutable set
m.over(lens, source, fn)        // immutable update
```

### Constraints

```typescript
m.range(0, 100)             // number range
m.clamp(0, 100)             // clamp without throwing
m.length(1, 255)            // string length
m.pattern(/regex/)          // string format
m.oneOfValues('a', 'b')     // enum
m.nullable(inner)           // allow null
m.optional(inner, default)  // allow undefined
m.validate(predicate, msg)  // custom validation
m.refine(guard, msg)        // type refinement

// Built-in validators
m.nonEmpty, m.positive, m.nonNegative, m.isInteger, m.isFinite

// String transforms (lossy)
m.trim, m.lowercase, m.uppercase

// Common patterns
m.email, m.uuid, m.slug, m.alphanumeric
```

### Parser Combinators

```typescript
m.literal('https://')                   // exact match
m.regex(/[^\/]+/)                       // regex capture
m.capture('userId', /\d+/)              // named capture
m.seq(m.literal('/'), ['id', m.regex(/\d+/)])  // sequence
m.sepBy(item, ',')                      // separated list
m.many(item), m.many1(item)             // zero+ or one+ matches
m.route('/users/:userId/posts/:postId') // URL routing
m.queryString()                         // query string
m.urlParser('/users/:id')               // full URL parser
m.split(',')                            // split string
m.prefix('https://'), m.suffix('.json') // prefix/suffix
m.between('[', ']')                     // between delimiters
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
