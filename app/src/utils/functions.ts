import type { DebugInstance, UnknownObject } from './types/index.js';

/**********************************************************************************/

export function strcasecmp<T extends string>(s1: T, s2: T) {
  return s1.localeCompare(s2, undefined, {
    sensitivity: 'accent',
  });
}

export function objHasValues(obj: UnknownObject) {
  for (const k in obj) {
    if (obj[k] !== null && obj[k] !== undefined) {
      return true;
    }
  }

  return false;
}

export function filterNullAndUndefined<T>(value?: T | null): value is T {
  return value !== null && value !== undefined;
}

export function debugWrapper<T>(
  fn: () => T,
  debug: { instance: DebugInstance; msg: string }
) {
  const { instance: debugInstance, msg } = debug;

  try {
    debugInstance(`Begin --- ${msg}`);

    return fn();
  } finally {
    debugInstance(`End   --- ${msg}`);
  }
}

export async function asyncDebugWrapper<T>(
  fn: () => Promise<T>,
  debug: { instance: DebugInstance; msg: string }
) {
  const { instance: debugInstance, msg } = debug;

  try {
    debugInstance(`Begin --- ${msg}`);

    return await fn();
  } finally {
    debugInstance(`End   --- ${msg}`);
  }
}

/**********************************************************************************/

export function isDevelopmentMode(mode?: string) {
  return mode === 'development';
}

export function isTestMode(mode?: string) {
  return mode === 'test';
}

export function isProductionMode(mode?: string) {
  return mode === 'production';
}
