// Runs a command with the test suites' allocator settings on every platform: a `MIMALLOC_*=…` prefix in package.json
// works only where pnpm runs scripts through a POSIX shell, and on Windows it runs them through cmd.exe.
// Usage: node scripts/run.ts <command> [args…]. See "test" and "test:e2e" in package.json.
import { spawn } from 'node:child_process'

const [command, ...args] = process.argv.slice(2)
if (!command) throw new Error('Usage: node scripts/run.ts <command> [args…]')
const options = {
  stdio: 'inherit' as const,
  // Avoid huge-page amplification in Rolldown's allocator, as bin/ultimate.ts does for the core it forks.
  env: { ...process.env, MIMALLOC_ALLOW_THP: '0', MIMALLOC_PURGE_DELAY: '0' },
}
// `vp` and `vitest` are `.cmd` shims on Windows, which only a shell can start.
const child =
  process.platform === 'win32'
    ? spawn([command, ...args].join(' '), { ...options, shell: true })
    : spawn(command, args, options)
child.on('error', (error) => {
  console.error(String(error))
  process.exitCode = 1
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
