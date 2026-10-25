import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { runLanderCheck } from '../../extensions/workspaces/lander.ts'
import { context } from '../../server/harness.ts'
import { removeTemp, temp } from '../helpers.ts'

it.runIf(process.platform === 'win32')(
  'runs a check through cmd.exe and kills its whole tree on stall',
  async () => {
    const directory = await temp('ultimate-lander-watchdog-')
    try {
      const pids = join(directory, 'pids')
      const tmp = join(directory, 'tmp')
      expect(await runLanderCheck(directory, 'echo "one" && echo two', context, pids, tmp)).toEqual(
        { summary: 'two' },
      )

      const childFile = join(directory, 'child')
      // node stays alive while the child it started runs: a tree two processes deep, silent once its child is recorded.
      const script = `require('fs').writeFileSync('${childFile.replaceAll('\\', '/')}', String(require('child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)']).pid)); console.log('ready')`
      const command = `echo started && "${process.execPath}" -e "${script}"`
      const result = await runLanderCheck(directory, command, context, pids, tmp, {
        stall: 2,
        total: 15,
      })
      expect(await readdir(pids)).toEqual([])
      expect(result.failure).toMatch(/^Stalled: no output for 2 s, stopped\nstarted\s+ready/)
      const child = Number(await readFile(childFile, 'utf8'))
      expect(() => process.kill(child, 0)).toThrow('ESRCH')
    } finally {
      await removeTemp(directory)
    }
  },
)

it.skipIf(process.platform === 'win32')(
  'kills a silent process group on stall and a printing process on the total cap',
  async () => {
    const directory = await temp('ultimate-lander-watchdog-')
    try {
      for (const printing of [false, true]) {
        const pidFile = join(directory, 'pid')
        const childFile = join(directory, 'child')
        const command = `echo $$ > '${pidFile}'; sleep 10 & echo $! > '${childFile}'; ${printing ? 'while true; do echo progress; sleep 0.02; done' : 'wait'}`
        const pids = join(directory, 'pids')
        const tmp = join(directory, 'tmp')
        const result = await runLanderCheck(directory, command, context, pids, tmp, {
          stall: 0.2,
          total: 0.5,
        })
        expect(await readdir(pids)).toEqual([])
        expect(await readdir(tmp)).toEqual([])
        expect(result.failure).toContain(printing ? 'Timed out after' : 'Stalled: no output for')
        expect(result.failure?.includes('progress')).toBe(printing)
        const pid = Number(await readFile(pidFile, 'utf8'))
        expect(() => process.kill(pid, 0)).toThrow('ESRCH')
        const child = Number(await readFile(childFile, 'utf8'))
        // A killed orphan may remain a zombie until init reaps it; it must not still be running.
        const stat = await readFile(`/proc/${child}/stat`, 'utf8').catch(() => '')
        expect(stat === '' || stat.split(' ')[2] === 'Z').toBe(true)
      }
    } finally {
      await removeTemp(directory)
    }
  },
)
