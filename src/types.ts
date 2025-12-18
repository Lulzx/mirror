/**
 * Metadata types for Mirror instances
 */

export type MetaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'json'
  | 'base64'
  | 'url'
  | 'bigint'
  | 'hex'
  | 'binary'
  | 'identity'
  | 'pipe'
  | 'object'
  | 'array'
  | 'prop'
  | 'range'
  | 'length'
  | 'pattern'
  | 'enum'
  | 'nullable'
  | 'optional'
  | 'literal'
  | 'regex'
  | 'seq'
  | 'sepBy'
  | 'all'
  | 'oneOf'
  | 'pick'
  | 'omit'
  | 'entries'
  | 'keys'
  | 'values'
  | 'split'
  | 'between'
  | 'route'
  | 'queryString'
  | 'custom';

export interface BaseMeta {
  type: MetaType;
  description?: string;
  /**
   * Indicates this mirror is lossy - backward(forward(x)) may not equal x.
   * Lossy mirrors should be used with care in pipelines.
   */
  lossy?: boolean;
}

export interface StringMeta extends BaseMeta {
  type: 'string';
}

export interface NumberMeta extends BaseMeta {
  type: 'number';
  min?: number;
  max?: number;
}

export interface IntegerMeta extends BaseMeta {
  type: 'integer';
  min?: number;
  max?: number;
}

export interface BooleanMeta extends BaseMeta {
  type: 'boolean';
}

export interface DateMeta extends BaseMeta {
  type: 'date';
}

export interface JsonMeta extends BaseMeta {
  type: 'json';
}

export interface Base64Meta extends BaseMeta {
  type: 'base64';
}

export interface UrlMeta extends BaseMeta {
  type: 'url';
}

export interface BigIntMeta extends BaseMeta {
  type: 'bigint';
}

export interface HexMeta extends BaseMeta {
  type: 'hex';
}

export interface BinaryMeta extends BaseMeta {
  type: 'binary';
}

export interface IdentityMeta extends BaseMeta {
  type: 'identity';
}

export interface PipeMeta extends BaseMeta {
  type: 'pipe';
  stages: Meta[];
}

export interface ObjectMeta extends BaseMeta {
  type: 'object';
  shape: Record<string, Meta>;
}

export interface ArrayMeta extends BaseMeta {
  type: 'array';
  items: Meta;
  minItems?: number;
  maxItems?: number;
}

export interface PropMeta extends BaseMeta {
  type: 'prop';
  key: string;
  inner?: Meta;
}

export interface RangeMeta extends BaseMeta {
  type: 'range';
  min: number;
  max: number;
}

export interface LengthMeta extends BaseMeta {
  type: 'length';
  min: number;
  max: number;
}

export interface PatternMeta extends BaseMeta {
  type: 'pattern';
  pattern: RegExp;
  generator?: () => string;
}

export interface EnumMeta extends BaseMeta {
  type: 'enum';
  values: readonly unknown[];
}

export interface NullableMeta extends BaseMeta {
  type: 'nullable';
  inner: Meta;
}

export interface OptionalMeta extends BaseMeta {
  type: 'optional';
  inner: Meta;
  defaultValue: unknown;
}

export interface LiteralMeta extends BaseMeta {
  type: 'literal';
  value: string;
}

export interface RegexMeta extends BaseMeta {
  type: 'regex';
  pattern: RegExp;
  generator?: () => string;
}

export interface SeqMeta extends BaseMeta {
  type: 'seq';
  items: Meta[];
}

export interface SepByMeta extends BaseMeta {
  type: 'sepBy';
  item: Meta;
  separator: Meta;
}

export interface AllMeta extends BaseMeta {
  type: 'all';
  mirrors: Record<string, Meta>;
}

export interface OneOfMeta extends BaseMeta {
  type: 'oneOf';
  options: Meta[];
}

export interface PickMeta extends BaseMeta {
  type: 'pick';
  keys: string[];
}

export interface OmitMeta extends BaseMeta {
  type: 'omit';
  keys: string[];
}

export interface EntriesMeta extends BaseMeta {
  type: 'entries';
}

export interface KeysMeta extends BaseMeta {
  type: 'keys';
}

export interface ValuesMeta extends BaseMeta {
  type: 'values';
}

export interface SplitMeta extends BaseMeta {
  type: 'split';
  delimiter: string;
}

export interface BetweenMeta extends BaseMeta {
  type: 'between';
  start: string;
  end: string;
}

export interface RouteMeta extends BaseMeta {
  type: 'route';
  template: string;
}

export interface QueryStringMeta extends BaseMeta {
  type: 'queryString';
}

export interface CustomMeta extends BaseMeta {
  type: 'custom';
  data?: unknown;
}

export type Meta =
  | StringMeta
  | NumberMeta
  | IntegerMeta
  | BooleanMeta
  | DateMeta
  | JsonMeta
  | Base64Meta
  | UrlMeta
  | BigIntMeta
  | HexMeta
  | BinaryMeta
  | IdentityMeta
  | PipeMeta
  | ObjectMeta
  | ArrayMeta
  | PropMeta
  | RangeMeta
  | LengthMeta
  | PatternMeta
  | EnumMeta
  | NullableMeta
  | OptionalMeta
  | LiteralMeta
  | RegexMeta
  | SeqMeta
  | SepByMeta
  | AllMeta
  | OneOfMeta
  | PickMeta
  | OmitMeta
  | EntriesMeta
  | KeysMeta
  | ValuesMeta
  | SplitMeta
  | BetweenMeta
  | RouteMeta
  | QueryStringMeta
  | CustomMeta;

/**
 * Result type for fallible operations
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * JSON Schema type (simplified)
 */
export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: unknown[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  format?: string;
  default?: unknown;
  nullable?: boolean;
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  description?: string;
  readOnly?: boolean;
}
