import { Mirror } from './mirror';

/**
 * Literal: matches an exact string.
 * Forward: consumes the literal from input
 * Backward: produces the literal
 */
export function literal<T extends string>(value: T): Mirror<string, string> {
  return new Mirror(
    (input) => {
      if (!input.startsWith(value)) {
        throw new Error(`Expected "${value}" but got "${input.slice(0, value.length)}"`);
      }
      return input.slice(value.length);
    },
    (rest) => value + rest,
    { type: 'literal', value }
  );
}

/**
 * Regex capture: matches a pattern and captures the match.
 * Forward: captures the match, returns remaining input as tuple
 * Backward: prepends the captured value
 *
 * Uses sticky flag for reliable matching at string start.
 */
export function regex(
  pattern: RegExp,
  generator?: () => string
): Mirror<string, { match: string; rest: string }> {
  // Create a sticky version of the pattern for reliable start-anchored matching
  const stickyPattern = new RegExp(pattern.source, pattern.flags.includes('y') ? pattern.flags : pattern.flags + 'y');

  return new Mirror(
    (input) => {
      stickyPattern.lastIndex = 0;
      const match = stickyPattern.exec(input);
      if (!match) {
        throw new Error(`Pattern ${pattern} did not match at start of "${input.slice(0, 20)}${input.length > 20 ? '...' : ''}"`);
      }
      return {
        match: match[0],
        rest: input.slice(match[0].length),
      };
    },
    ({ match, rest }) => match + rest,
    { type: 'regex', pattern, generator }
  );
}

/**
 * Named regex capture: captures to a named property.
 */
export function capture<K extends string>(
  name: K,
  pattern: RegExp,
  generator?: () => string
): Mirror<string, Record<K, string> & { __rest: string }> {
  const regexMirror = regex(pattern, generator);

  return new Mirror(
    (input) => {
      const result = regexMirror.forward(input);
      return {
        [name]: result.match,
        __rest: result.rest,
      } as Record<K, string> & { __rest: string };
    },
    (obj) => regexMirror.backward({ match: obj[name], rest: obj.__rest }),
    { type: 'regex', pattern, generator }
  );
}

/**
 * Sequence: concatenates multiple parsers.
 */
export function seq<T extends Record<string, unknown>>(
  ...items: Array<Mirror<string, string> | [string, Mirror<string, { match: string; rest: string }>]>
): Mirror<string, T> {
  return new Mirror(
    (input) => {
      const result = {} as T;
      let current = input;

      for (const item of items) {
        if (Array.isArray(item)) {
          const [key, parser] = item;
          const parsed = parser.forward(current);
          (result as Record<string, unknown>)[key] = parsed.match;
          current = parsed.rest;
        } else {
          current = item.forward(current);
        }
      }

      if (current.length > 0) {
        (result as Record<string, unknown>).__rest = current;
      }

      return result;
    },
    (obj) => {
      let result = (obj as Record<string, unknown>).__rest as string || '';

      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i]!;
        if (Array.isArray(item)) {
          const [key, parser] = item;
          const match = (obj as Record<string, unknown>)[key] as string;
          result = parser.backward({ match, rest: result });
        } else {
          result = item.backward(result);
        }
      }

      return result;
    },
    { type: 'seq', items: items.map((item) => (Array.isArray(item) ? item[1].meta : item.meta)) }
  );
}

/**
 * Simple sequence that just consumes and produces strings.
 */
export function sequence(
  ...mirrors: Mirror<string, string>[]
): Mirror<string, string> {
  return new Mirror(
    (input) => {
      let current = input;
      for (const m of mirrors) {
        current = m.forward(current);
      }
      return current;
    },
    (output) => {
      let current = output;
      for (let i = mirrors.length - 1; i >= 0; i--) {
        current = mirrors[i]!.backward(current);
      }
      return current;
    },
    { type: 'seq', items: mirrors.map((m) => m.meta) }
  );
}

/**
 * Separated by: parses items separated by a delimiter.
 * Handles edge cases: empty input, trailing separators.
 */
export function sepBy<T>(
  item: Mirror<string, { match: string; rest: string }>,
  separator: string
): Mirror<string, T[]> {
  return new Mirror(
    (input) => {
      if (input.length === 0) {
        return [];
      }

      const results: T[] = [];
      let current = input;

      while (current.length > 0) {
        // Try to parse an item
        const itemResult = item.tryForward(current);
        if (!itemResult.ok) {
          // If we can't parse an item, we're done
          break;
        }

        results.push(itemResult.value.match as T);
        current = itemResult.value.rest;

        // Check for separator
        if (current.startsWith(separator)) {
          current = current.slice(separator.length);
          // Handle trailing separator - if nothing left, we're done
          if (current.length === 0) {
            break;
          }
        } else {
          break;
        }
      }

      return results;
    },
    (values) => {
      if (values.length === 0) {
        return '';
      }
      return values.map((v) => String(v)).join(separator);
    },
    { type: 'sepBy', item: item.meta, separator: { type: 'literal', value: separator } }
  );
}

/**
 * Route parser: parses URL-like routes.
 * Example: route('/users/:userId/posts/:postId')
 */
export function route<T extends Record<string, string>>(
  template: string
): Mirror<string, T> {
  const parts = template.split(/(:[\w]+)/);
  const paramNames: string[] = [];

  const regexParts = parts.map((part) => {
    if (part.startsWith(':')) {
      const name = part.slice(1);
      paramNames.push(name);
      return '([^/]+)';
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });

  const fullRegex = new RegExp(`^${regexParts.join('')}$`);

  return new Mirror(
    (input) => {
      const match = input.match(fullRegex);
      if (!match) {
        throw new Error(`Route "${template}" did not match "${input}"`);
      }

      const result = {} as T;
      paramNames.forEach((name, i) => {
        (result as Record<string, string>)[name] = match[i + 1]!;
      });
      return result;
    },
    (params) => {
      let result = template;
      for (const [key, value] of Object.entries(params)) {
        result = result.replace(`:${key}`, value as string);
      }
      return result;
    },
    { type: 'route', template }
  );
}

/**
 * Query string parser: parses URL query strings.
 */
export function queryString<T extends Record<string, string>>(): Mirror<string, T> {
  return new Mirror(
    (input) => {
      const result = {} as T;
      const queryPart = input.startsWith('?') ? input.slice(1) : input;

      if (queryPart.length === 0) {
        return result;
      }

      const pairs = queryPart.split('&');
      for (const pair of pairs) {
        const eqIndex = pair.indexOf('=');
        if (eqIndex === -1) {
          // Handle keys without values
          if (pair) {
            (result as Record<string, string>)[pair] = '';
          }
        } else {
          const key = pair.slice(0, eqIndex);
          const value = pair.slice(eqIndex + 1);
          if (key) {
            (result as Record<string, string>)[key] = decodeURIComponent(value);
          }
        }
      }
      return result;
    },
    (params) => {
      const entries = Object.entries(params);
      if (entries.length === 0) {
        return '';
      }
      return (
        '?' +
        entries
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&')
      );
    },
    { type: 'queryString' }
  );
}

/**
 * Full URL parser: combines route and query string.
 */
export function urlParser<
  TRoute extends Record<string, string>,
  TQuery extends Record<string, string>
>(template: string): Mirror<string, { route: TRoute; query: TQuery }> {
  const routeMirror = route<TRoute>(template);
  const queryMirror = queryString<TQuery>();

  return new Mirror(
    (input) => {
      const qIndex = input.indexOf('?');
      const [path, query] = qIndex === -1
        ? [input, '']
        : [input.slice(0, qIndex), input.slice(qIndex)];
      return {
        route: routeMirror.forward(path),
        query: queryMirror.forward(query),
      };
    },
    ({ route: r, query }) => {
      const path = routeMirror.backward(r);
      const qs = queryMirror.backward(query);
      return path + qs;
    },
    { type: 'route', template }
  );
}

/**
 * Split on delimiter: splits string into array.
 */
export function split(delimiter: string): Mirror<string, string[]> {
  return new Mirror(
    (input) => (input.length === 0 ? [] : input.split(delimiter)),
    (arr) => arr.join(delimiter),
    { type: 'split', delimiter }
  );
}

/**
 * Prefix: adds/removes a prefix.
 */
export function prefix(value: string): Mirror<string, string> {
  return new Mirror(
    (input) => {
      if (!input.startsWith(value)) {
        throw new Error(`Expected prefix "${value}"`);
      }
      return input.slice(value.length);
    },
    (rest) => value + rest,
    { type: 'literal', value }
  );
}

/**
 * Suffix: adds/removes a suffix.
 */
export function suffix(value: string): Mirror<string, string> {
  return new Mirror(
    (input) => {
      if (!input.endsWith(value)) {
        throw new Error(`Expected suffix "${value}"`);
      }
      return input.slice(0, -value.length || undefined);
    },
    (rest) => rest + value,
    { type: 'literal', value }
  );
}

/**
 * Between: parses content between two delimiters.
 */
export function between(
  start: string,
  end: string
): Mirror<string, string> {
  return new Mirror(
    (input) => {
      if (!input.startsWith(start)) {
        throw new Error(`Expected start delimiter "${start}"`);
      }
      if (!input.endsWith(end)) {
        throw new Error(`Expected end delimiter "${end}"`);
      }
      return input.slice(start.length, -end.length || undefined);
    },
    (content) => start + content + end,
    { type: 'between', start, end }
  );
}

/**
 * Many: parses zero or more occurrences of a pattern.
 */
export function many<T>(
  item: Mirror<string, { match: T; rest: string }>
): Mirror<string, T[]> {
  return new Mirror(
    (input) => {
      const results: T[] = [];
      let current = input;

      while (current.length > 0) {
        const result = item.tryForward(current);
        if (!result.ok) break;
        results.push(result.value.match);
        current = result.value.rest;
      }

      return results;
    },
    (values) => values.map(v => String(v)).join(''),
    { type: 'array', items: item.meta }
  );
}

/**
 * Many1: parses one or more occurrences of a pattern.
 */
export function many1<T>(
  item: Mirror<string, { match: T; rest: string }>
): Mirror<string, T[]> {
  return new Mirror(
    (input) => {
      const results: T[] = [];
      let current = input;

      while (current.length > 0) {
        const result = item.tryForward(current);
        if (!result.ok) break;
        results.push(result.value.match);
        current = result.value.rest;
      }

      if (results.length === 0) {
        throw new Error('Expected at least one match');
      }

      return results;
    },
    (values) => values.map(v => String(v)).join(''),
    { type: 'array', items: item.meta, minItems: 1 }
  );
}
