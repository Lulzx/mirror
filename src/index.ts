/**
 * Mirror - Bidirectional Functions for TypeScript
 *
 * One function. Both directions. Zero duplication.
 *
 * @packageDocumentation
 */

// Core
export { Mirror, mirror, identity, lossy, asymmetric } from './mirror';

// Primitives
export {
  string,
  number,
  integer,
  boolean,
  json,
  jsonAs,
  date,
  base64,
  url,
  bigint,
  hex,
  binary,
} from './primitives';

// Composition
export { pipe, all, oneOf, fallback, lazy } from './composition';

// Object manipulation
export {
  prop,
  object,
  array,
  tuple,
  pick,
  omit,
  path,
  set,
  over,
  entries,
  keys,
  values,
} from './object';

// Constraints
export {
  range,
  length,
  pattern,
  oneOfValues,
  nullable,
  optional,
  withDefault,
  nonEmpty,
  nonEmptyArray,
  positive,
  nonNegative,
  isInteger,
  isFinite,
  trim,
  lowercase,
  uppercase,
  email,
  uuid,
  slug,
  alphanumeric,
} from './constraints';

// Parser combinators
export {
  literal,
  regex,
  capture,
  seq,
  sequence,
  sepBy,
  route,
  queryString,
  urlParser,
  split,
  prefix,
  suffix,
  between,
} from './parser';

// Metadata utilities
export { sampleFromMeta, samples } from './sample';
export { metaToJsonSchema, metaToTypeScript } from './schema';

// Types
export type {
  Meta,
  MetaType,
  Result,
  JsonSchema,
  StringMeta,
  NumberMeta,
  IntegerMeta,
  BooleanMeta,
  DateMeta,
  JsonMeta,
  Base64Meta,
  IdentityMeta,
  PipeMeta,
  ObjectMeta,
  ArrayMeta,
  PropMeta,
  RangeMeta,
  LengthMeta,
  PatternMeta,
  EnumMeta,
  NullableMeta,
  OptionalMeta,
  LiteralMeta,
  RegexMeta,
  SeqMeta,
  SepByMeta,
  AllMeta,
  OneOfMeta,
  CustomMeta,
} from './types';

// Re-export object schema type
export type { ObjectSchema } from './object';

// Default export for convenience
import { Mirror, mirror, identity } from './mirror';
import * as primitives from './primitives';
import * as composition from './composition';
import * as objectOps from './object';
import * as constraints from './constraints';
import * as parser from './parser';

/**
 * Main namespace containing all mirror utilities.
 * Can be used as `m.pipe(m.json, m.prop('user'))` for cleaner syntax.
 */
const m = {
  // Core
  Mirror,
  mirror,
  identity,

  // Primitives
  string: primitives.string,
  number: primitives.number,
  integer: primitives.integer,
  boolean: primitives.boolean,
  json: primitives.json,
  jsonAs: primitives.jsonAs,
  date: primitives.date,
  base64: primitives.base64,
  url: primitives.url,
  bigint: primitives.bigint,
  hex: primitives.hex,
  binary: primitives.binary,

  // Composition
  pipe: composition.pipe,
  all: composition.all,
  oneOf: composition.oneOf,
  fallback: composition.fallback,
  lazy: composition.lazy,

  // Object manipulation
  prop: objectOps.prop,
  object: objectOps.object,
  array: objectOps.array,
  tuple: objectOps.tuple,
  pick: objectOps.pick,
  omit: objectOps.omit,
  path: objectOps.path,
  set: objectOps.set,
  over: objectOps.over,
  entries: objectOps.entries,
  keys: objectOps.keys,
  values: objectOps.values,

  // Constraints
  range: constraints.range,
  length: constraints.length,
  pattern: constraints.pattern,
  oneOfValues: constraints.oneOfValues,
  nullable: constraints.nullable,
  optional: constraints.optional,
  withDefault: constraints.withDefault,
  nonEmpty: constraints.nonEmpty,
  nonEmptyArray: constraints.nonEmptyArray,
  positive: constraints.positive,
  nonNegative: constraints.nonNegative,
  isInteger: constraints.isInteger,
  isFinite: constraints.isFinite,
  trim: constraints.trim,
  lowercase: constraints.lowercase,
  uppercase: constraints.uppercase,
  email: constraints.email,
  uuid: constraints.uuid,
  slug: constraints.slug,
  alphanumeric: constraints.alphanumeric,

  // Parser combinators
  literal: parser.literal,
  regex: parser.regex,
  capture: parser.capture,
  seq: parser.seq,
  sequence: parser.sequence,
  sepBy: parser.sepBy,
  route: parser.route,
  queryString: parser.queryString,
  urlParser: parser.urlParser,
  split: parser.split,
  prefix: parser.prefix,
  suffix: parser.suffix,
  between: parser.between,
};

export default m;
