type SeenPairs = WeakMap<object, WeakSet<object>>;

function hasSeenPair(seen: SeenPairs, a: object, b: object): boolean {
  const existing = seen.get(a);
  if (existing) {
    if (existing.has(b)) return true;
    existing.add(b);
    return false;
  }
  const set = new WeakSet<object>();
  set.add(b);
  seen.set(a, set);
  return false;
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const ctor = (proto as { constructor?: unknown }).constructor;
  return typeof ctor === 'function' && (ctor as Function).name === 'Object';
}

function deepEqualInternal(a: unknown, b: unknown, seen: SeenPairs): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const objA = a as object;
  const objB = b as object;

  if (hasSeenPair(seen, objA, objB)) return true;

  const tagA = Object.prototype.toString.call(objA);
  const tagB = Object.prototype.toString.call(objB);
  if (tagA !== tagB) return false;

  switch (tagA) {
    case '[object Date]':
      return Object.is((objA as Date).getTime(), (objB as Date).getTime());

    case '[object RegExp]': {
      const reA = objA as RegExp;
      const reB = objB as RegExp;
      return reA.source === reB.source && reA.flags === reB.flags;
    }

    case '[object URL]':
      return (objA as URL).toString() === (objB as URL).toString();

    case '[object ArrayBuffer]': {
      const abA = new Uint8Array(objA as ArrayBuffer);
      const abB = new Uint8Array(objB as ArrayBuffer);
      if (abA.byteLength !== abB.byteLength) return false;
      for (let i = 0; i < abA.byteLength; i++) {
        if (abA[i] !== abB[i]) return false;
      }
      return true;
    }

    case '[object Map]': {
      const mapA = objA as Map<unknown, unknown>;
      const mapB = objB as Map<unknown, unknown>;
      if (mapA.size !== mapB.size) return false;

      const iterA = mapA.entries();
      const iterB = mapB.entries();
      // Match Node's deepEqual semantics: Map iteration order matters.
      while (true) {
        const nextA = iterA.next();
        const nextB = iterB.next();
        if (nextA.done || nextB.done) return nextA.done === nextB.done;
        const [keyA, valA] = nextA.value;
        const [keyB, valB] = nextB.value;
        if (!deepEqualInternal(keyA, keyB, seen)) return false;
        if (!deepEqualInternal(valA, valB, seen)) return false;
      }
    }

    case '[object Set]': {
      const setA = objA as Set<unknown>;
      const setB = objB as Set<unknown>;
      if (setA.size !== setB.size) return false;

      // Order-insensitive deep matching.
      const remaining = Array.from(setB.values());
      outer: for (const valueA of setA.values()) {
        for (let i = 0; i < remaining.length; i++) {
          if (deepEqualInternal(valueA, remaining[i], seen)) {
            remaining.splice(i, 1);
            continue outer;
          }
        }
        return false;
      }
      return remaining.length === 0;
    }
  }

  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) return false;
    for (let i = 0; i < objA.length; i++) {
      if (!deepEqualInternal(objA[i], objB[i], seen)) return false;
    }
    return true;
  }

  if (ArrayBuffer.isView(objA) && ArrayBuffer.isView(objB)) {
    if (Object.prototype.toString.call(objA) !== Object.prototype.toString.call(objB)) return false;
    if (objA.byteLength !== objB.byteLength) return false;
    const bytesA = new Uint8Array(objA.buffer, objA.byteOffset, objA.byteLength);
    const bytesB = new Uint8Array(objB.buffer, objB.byteOffset, objB.byteLength);
    for (let i = 0; i < bytesA.byteLength; i++) {
      if (bytesA[i] !== bytesB[i]) return false;
    }
    return true;
  }

  // For unknown object types with no enumerable keys, avoid false positives.
  // (E.g. Date/URL/Map/Set are handled above; custom classes may otherwise compare equal erroneously.)
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length === 0 && keysB.length === 0) {
    return isPlainObject(objA) && isPlainObject(objB);
  }

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!deepEqualInternal((objA as Record<string, unknown>)[key], (objB as Record<string, unknown>)[key], seen)) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality used for comparing values in round-trip tests and defaults.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return deepEqualInternal(a, b, new WeakMap());
}

