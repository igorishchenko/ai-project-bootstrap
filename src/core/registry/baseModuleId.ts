/**
 * The always-on pseudo-module every project gets.
 *
 * Its own file, with no imports, precisely so that browser-safe code can name
 * it: `loadModules.ts` reads the filesystem, and a constant string is not a
 * good enough reason to drag `node:fs` into a bundle. Re-exported from
 * `loadModules.ts` so every existing import keeps working.
 */
export const BASE_MODULE_ID = 'base';
