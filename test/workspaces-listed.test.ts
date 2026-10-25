import { expect, test } from 'vitest'
import { listsWorktree } from '../extensions/workspaces/workspaces.ts'

const listed = [
  'worktree C:/Users/Shay/personal/ultimate',
  'HEAD 932f45cc2a434901f2d09ae8ad7d2a3e3cf5ebc2',
  'branch refs/heads/main',
  '',
  'worktree C:/Users/Shay/.ultimate/projects/ultimate/worktrees/1207',
  'HEAD c8b50d9155392e241a62c93c854a534dec26800a',
  'branch refs/heads/ultimate/1207',
  '',
].join('\n')

test('Git lists a Windows worktree with forward slashes, the recorded path has backslashes', () => {
  expect(
    listsWorktree(
      listed,
      'C:\\Users\\Shay\\.ultimate\\projects\\ultimate\\worktrees\\1207',
      'win32',
    ),
  ).toBe(true)
  expect(
    listsWorktree(listed, 'C:\\Users\\Shay\\.ultimate\\projects\\ultimate\\worktrees\\8', 'win32'),
  ).toBe(false)
})

test('a Windows path matches regardless of case, since a drive letter and a home folder may differ', () => {
  expect(
    listsWorktree(
      listed,
      'c:\\users\\shay\\.ultimate\\projects\\ultimate\\worktrees\\1207',
      'win32',
    ),
  ).toBe(true)
})

test('on POSIX the listed path matches exactly, case included', () => {
  const posix = 'worktree /home/shay/ultimate/worktrees/1207\nHEAD abc\nbranch refs/heads/w\n'
  expect(listsWorktree(posix, '/home/shay/ultimate/worktrees/1207', 'linux')).toBe(true)
  expect(listsWorktree(posix, '/home/shay/ultimate/worktrees/8', 'linux')).toBe(false)
  expect(listsWorktree(posix, '/Home/Shay/ultimate/worktrees/1207', 'linux')).toBe(false)
})

test('a checkout Git no longer lists, or an empty listing, is not registered', () => {
  expect(listsWorktree('', '/home/shay/ultimate/worktrees/1207', 'linux')).toBe(false)
  expect(listsWorktree(listed, '/home/shay/other', 'linux')).toBe(false)
})
