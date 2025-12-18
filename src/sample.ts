import type {
  Meta,
  PipeMeta,
  ObjectMeta,
  ArrayMeta,
  RangeMeta,
  LengthMeta,
  PatternMeta,
  RegexMeta,
  EnumMeta,
  NullableMeta,
  OptionalMeta,
  AllMeta,
  OneOfMeta,
} from './types';

/**
 * Random integer in range [min, max]
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random float in range [min, max]
 */
function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Random string of given length
 */
function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomInt(0, chars.length - 1)];
  }
  return result;
}

/**
 * Generate a sample value from metadata.
 * This is the core function that makes metadata-driven generation work.
 */
export function sampleFromMeta(meta: Meta): unknown {
  switch (meta.type) {
    case 'string':
      return randomString(8);

    case 'number':
      return randomFloat(
        (meta as { min?: number }).min ?? 0,
        (meta as { max?: number }).max ?? 100
      );

    case 'integer':
      return randomInt(
        (meta as { min?: number }).min ?? 0,
        (meta as { max?: number }).max ?? 100
      );

    case 'boolean':
      return Math.random() > 0.5;

    case 'date':
      return new Date(Date.now() - randomInt(0, 365 * 24 * 60 * 60 * 1000));

    case 'json':
      return {};

    case 'base64':
      return randomString(8);

    case 'url':
      return new URL(`https://example.com/${randomString(6)}`);

    case 'bigint':
      return BigInt(randomInt(0, 1000000));

    case 'hex':
      return randomInt(0, 255);

    case 'binary':
      return randomInt(0, 255);

    case 'identity':
      return null;

    case 'pipe': {
      const pipeMeta = meta as PipeMeta;
      const stages = pipeMeta.stages;
      if (stages.length === 0) {
        return null;
      }
      return sampleFromMeta(stages[stages.length - 1]!);
    }

    case 'object': {
      const objectMeta = meta as ObjectMeta;
      const result: Record<string, unknown> = {};
      for (const [key, fieldMeta] of Object.entries(objectMeta.shape)) {
        result[key] = sampleFromMeta(fieldMeta);
      }
      return result;
    }

    case 'array': {
      const arrayMeta = meta as ArrayMeta;
      const minItems = arrayMeta.minItems ?? 1;
      const maxItems = arrayMeta.maxItems ?? 3;
      const length = randomInt(minItems, maxItems);
      const items: unknown[] = [];
      for (let i = 0; i < length; i++) {
        items.push(sampleFromMeta(arrayMeta.items));
      }
      return items;
    }

    case 'prop':
      return sampleFromMeta((meta as { inner?: Meta }).inner ?? { type: 'string' });

    case 'range': {
      const rangeMeta = meta as RangeMeta;
      return randomFloat(rangeMeta.min, rangeMeta.max);
    }

    case 'length': {
      const lengthMeta = meta as LengthMeta;
      const len = randomInt(lengthMeta.min, Math.min(lengthMeta.max, 100));
      return randomString(len);
    }

    case 'pattern': {
      const patternMeta = meta as PatternMeta;
      if (patternMeta.generator) {
        return patternMeta.generator();
      }
      return randomString(10);
    }

    case 'enum': {
      const enumMeta = meta as EnumMeta;
      const values = enumMeta.values;
      return values[randomInt(0, values.length - 1)];
    }

    case 'nullable': {
      const nullableMeta = meta as NullableMeta;
      if (Math.random() > 0.8) {
        return null;
      }
      return sampleFromMeta(nullableMeta.inner);
    }

    case 'optional': {
      const optionalMeta = meta as OptionalMeta;
      if (Math.random() > 0.8) {
        return optionalMeta.defaultValue;
      }
      return sampleFromMeta(optionalMeta.inner);
    }

    case 'literal':
      return (meta as { value: string }).value;

    case 'regex': {
      const regexMeta = meta as RegexMeta;
      if (regexMeta.generator) {
        return regexMeta.generator();
      }
      return randomString(8);
    }

    case 'seq':
      return {};

    case 'sepBy':
      return [];

    case 'split':
      return [randomString(4), randomString(4)];

    case 'between':
      return randomString(6);

    case 'route':
      return { id: randomString(6) };

    case 'queryString':
      return { key: randomString(4) };

    case 'pick':
    case 'omit':
      return {};

    case 'entries':
      return [[randomString(4), randomString(4)]];

    case 'keys':
      return [randomString(4)];

    case 'values':
      return [randomString(4)];

    case 'all': {
      const allMeta = meta as AllMeta;
      const result: Record<string, unknown> = {};
      for (const [key, fieldMeta] of Object.entries(allMeta.mirrors)) {
        result[key] = sampleFromMeta(fieldMeta);
      }
      return result;
    }

    case 'oneOf': {
      const oneOfMeta = meta as OneOfMeta;
      const options = oneOfMeta.options;
      if (options.length === 0) {
        return null;
      }
      return sampleFromMeta(options[randomInt(0, options.length - 1)]!);
    }

    case 'custom':
      return null;

    default:
      return null;
  }
}

/**
 * Generate multiple samples
 */
export function samples<T>(meta: Meta, count: number): T[] {
  const results: T[] = [];
  for (let i = 0; i < count; i++) {
    results.push(sampleFromMeta(meta) as T);
  }
  return results;
}
