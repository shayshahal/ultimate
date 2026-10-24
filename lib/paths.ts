import { sep } from 'node:path'

/**
 * `path` with `/` separators, for the prefix and segment checks that decide which extension a changed file belongs
 * to: a watcher reports OS paths, so on Windows `C:\project\extensions\x` never matches a `root + '/'` prefix.
 */
export const slashed = (path: string) => path.replaceAll(sep, '/')
