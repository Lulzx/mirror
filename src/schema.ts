import type {
  Meta,
  JsonSchema,
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
 * Convert Mirror metadata to JSON Schema.
 * This enables integration with OpenAPI, form generators, etc.
 */
export function metaToJsonSchema(meta: Meta): JsonSchema {
  const base: JsonSchema = {};

  if (meta.description) {
    base.description = meta.description;
  }

  switch (meta.type) {
    case 'string':
      return { ...base, type: 'string' };

    case 'number':
      return {
        ...base,
        type: 'number',
        minimum: (meta as { min?: number }).min,
        maximum: (meta as { max?: number }).max,
      };

    case 'integer':
      return {
        ...base,
        type: 'integer',
        minimum: (meta as { min?: number }).min,
        maximum: (meta as { max?: number }).max,
      };

    case 'boolean':
      return { ...base, type: 'boolean' };

    case 'date':
      return { ...base, type: 'string', format: 'date-time' };

    case 'json':
      return { ...base, type: 'object' };

    case 'base64':
      return { ...base, type: 'string', format: 'byte' };

    case 'url':
      return { ...base, type: 'string', format: 'uri' };

    case 'bigint':
      return { ...base, type: 'string', pattern: '^-?\\d+$' };

    case 'hex':
      return { ...base, type: 'string', pattern: '^[0-9a-fA-F]+$' };

    case 'binary':
      return { ...base, type: 'string', pattern: '^[01]+$' };

    case 'identity':
      return base;

    case 'pipe': {
      const pipeMeta = meta as PipeMeta;
      const stages = pipeMeta.stages;
      if (stages.length === 0) {
        return base;
      }
      const lastSchema = metaToJsonSchema(stages[stages.length - 1]!);
      return { ...base, ...lastSchema };
    }

    case 'object': {
      const objectMeta = meta as ObjectMeta;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, fieldMeta] of Object.entries(objectMeta.shape)) {
        properties[key] = metaToJsonSchema(fieldMeta);
        if (fieldMeta.type !== 'optional' && fieldMeta.type !== 'nullable') {
          required.push(key);
        }
      }

      return {
        ...base,
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    case 'array': {
      const arrayMeta = meta as ArrayMeta;
      return {
        ...base,
        type: 'array',
        items: metaToJsonSchema(arrayMeta.items),
        minItems: arrayMeta.minItems,
        maxItems: arrayMeta.maxItems,
      };
    }

    case 'prop': {
      const propMeta = meta as { inner?: Meta };
      if (propMeta.inner) {
        return metaToJsonSchema(propMeta.inner);
      }
      return base;
    }

    case 'range': {
      const rangeMeta = meta as RangeMeta;
      return {
        ...base,
        type: 'number',
        minimum: rangeMeta.min,
        maximum: rangeMeta.max,
      };
    }

    case 'length': {
      const lengthMeta = meta as LengthMeta;
      return {
        ...base,
        type: 'string',
        minLength: lengthMeta.min,
        maxLength: lengthMeta.max === Infinity ? undefined : lengthMeta.max,
      };
    }

    case 'pattern': {
      const patternMeta = meta as PatternMeta;
      return {
        ...base,
        type: 'string',
        pattern: patternMeta.pattern.source,
      };
    }

    case 'enum': {
      const enumMeta = meta as EnumMeta;
      return {
        ...base,
        enum: enumMeta.values as unknown[],
      };
    }

    case 'nullable': {
      const nullableMeta = meta as NullableMeta;
      const inner = metaToJsonSchema(nullableMeta.inner);
      return {
        ...base,
        ...inner,
        nullable: true,
      };
    }

    case 'optional': {
      const optionalMeta = meta as OptionalMeta;
      const inner = metaToJsonSchema(optionalMeta.inner);
      return {
        ...base,
        ...inner,
        default: optionalMeta.defaultValue,
      };
    }

    case 'literal':
      return {
        ...base,
        type: 'string',
        enum: [(meta as { value: string }).value],
      };

    case 'regex': {
      const regexMeta = meta as RegexMeta;
      return {
        ...base,
        type: 'string',
        pattern: regexMeta.pattern.source,
      };
    }

    case 'seq':
      return { ...base, type: 'object' };

    case 'sepBy':
      return { ...base, type: 'array', items: { type: 'string' } };

    case 'split':
      return { ...base, type: 'array', items: { type: 'string' } };

    case 'between':
      return { ...base, type: 'string' };

    case 'route':
      return { ...base, type: 'object' };

    case 'queryString':
      return { ...base, type: 'object' };

    case 'pick':
    case 'omit':
      return { ...base, type: 'object' };

    case 'entries':
      return { ...base, type: 'array', items: { type: 'array', items: { type: 'string' } } };

    case 'keys':
    case 'values':
      return { ...base, type: 'array', items: { type: 'string' } };

    case 'all': {
      const allMeta = meta as AllMeta;
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

      for (const [key, fieldMeta] of Object.entries(allMeta.mirrors)) {
        properties[key] = metaToJsonSchema(fieldMeta);
        if (fieldMeta.type !== 'optional' && fieldMeta.type !== 'nullable') {
          required.push(key);
        }
      }

      return {
        ...base,
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    case 'oneOf': {
      const oneOfMeta = meta as OneOfMeta;
      return {
        ...base,
        oneOf: oneOfMeta.options.map(metaToJsonSchema),
      };
    }

    case 'custom':
      return base;

    default:
      return base;
  }
}

/**
 * Generate TypeScript type definition from metadata
 */
export function metaToTypeScript(meta: Meta, name: string = 'T'): string {
  const typeStr = metaToTsType(meta);
  return `type ${name} = ${typeStr};`;
}

function metaToTsType(meta: Meta): string {
  switch (meta.type) {
    case 'string':
    case 'base64':
    case 'literal':
    case 'regex':
    case 'pattern':
    case 'length':
    case 'between':
      return 'string';

    case 'url':
      return 'URL';

    case 'bigint':
      return 'bigint';

    case 'number':
    case 'integer':
    case 'range':
    case 'hex':
    case 'binary':
      return 'number';

    case 'boolean':
      return 'boolean';

    case 'date':
      return 'Date';

    case 'json':
      return 'unknown';

    case 'identity':
      return 'unknown';

    case 'pipe': {
      const pipeMeta = meta as PipeMeta;
      if (pipeMeta.stages.length === 0) return 'unknown';
      return metaToTsType(pipeMeta.stages[pipeMeta.stages.length - 1]!);
    }

    case 'object': {
      const objectMeta = meta as ObjectMeta;
      const fields = Object.entries(objectMeta.shape)
        .map(([key, fieldMeta]) => {
          const optional = fieldMeta.type === 'optional' ? '?' : '';
          return `  ${key}${optional}: ${metaToTsType(fieldMeta)}`;
        })
        .join(';\n');
      return `{\n${fields}\n}`;
    }

    case 'array': {
      const arrayMeta = meta as ArrayMeta;
      return `${metaToTsType(arrayMeta.items)}[]`;
    }

    case 'prop': {
      const propMeta = meta as { inner?: Meta };
      if (propMeta.inner) return metaToTsType(propMeta.inner);
      return 'unknown';
    }

    case 'enum': {
      const enumMeta = meta as EnumMeta;
      return enumMeta.values.map((v) => JSON.stringify(v)).join(' | ');
    }

    case 'nullable': {
      const nullableMeta = meta as NullableMeta;
      return `${metaToTsType(nullableMeta.inner)} | null`;
    }

    case 'optional': {
      const optionalMeta = meta as OptionalMeta;
      return metaToTsType(optionalMeta.inner);
    }

    case 'all': {
      const allMeta = meta as AllMeta;
      const fields = Object.entries(allMeta.mirrors)
        .map(([key, fieldMeta]) => `  ${key}: ${metaToTsType(fieldMeta)}`)
        .join(';\n');
      return `{\n${fields}\n}`;
    }

    case 'oneOf': {
      const oneOfMeta = meta as OneOfMeta;
      return oneOfMeta.options.map(metaToTsType).join(' | ');
    }

    case 'split':
    case 'keys':
    case 'values':
      return 'string[]';

    case 'entries':
      return '[string, unknown][]';

    case 'route':
    case 'queryString':
    case 'pick':
    case 'omit':
      return 'Record<string, unknown>';

    case 'seq':
    case 'sepBy':
      return 'unknown';

    default:
      return 'unknown';
  }
}
