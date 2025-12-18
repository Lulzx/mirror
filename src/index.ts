/**
 * Mirror - Bidirectional Functions for TypeScript
 *
 * One function. Both directions. Zero duplication.
 *
 * @packageDocumentation
 */

// Core
export {
  Mirror,
  mirror,
  identity,
  lossy,
  asymmetric,
  assertSectionLaw,
  assertRetractionLaw,
  assertIsomorphism,
  testMirror,
} from './mirror';

// Primitives
export {
  string,
  toString,
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
export { pipe, all, oneOf, fallback, lazy, branch, filter } from './composition';

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
  mapValues,
  merge,
  spread,
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
  clamp,
  validate,
  refine,
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
  many,
  many1,
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
  UrlMeta,
  BigIntMeta,
  HexMeta,
  BinaryMeta,
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
  PickMeta,
  OmitMeta,
  EntriesMeta,
  KeysMeta,
  ValuesMeta,
  SplitMeta,
  BetweenMeta,
  RouteMeta,
  QueryStringMeta,
  CustomMeta,
} from './types';

// Re-export object schema type
export type { ObjectSchema } from './object';

// Default export for convenience
import { Mirror, mirror, identity, assertSectionLaw, assertRetractionLaw, assertIsomorphism, testMirror } from './mirror';
import * as primitives from './primitives';
import * as composition from './composition';
import * as objectOps from './object';
import * as constraints from './constraints';
import * as parser from './parser';

/**
 * Main namespace containing all mirror utilities.
 */
const m = {
  Mirror,
  mirror,
  identity,
  assertSectionLaw,
  assertRetractionLaw,
  assertIsomorphism,
  testMirror,

  // Primitives
  string: primitives.string,
  toString: primitives.toString,
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
  branch: composition.branch,
  filter: composition.filter,

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
  mapValues: objectOps.mapValues,
  merge: objectOps.merge,
  spread: objectOps.spread,

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
  clamp: constraints.clamp,
  validate: constraints.validate,
  refine: constraints.refine,

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
  many: parser.many,
  many1: parser.many1,
};

export default m;
