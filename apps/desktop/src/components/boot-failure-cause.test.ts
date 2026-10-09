import { describe, expect, it } from 'vitest'

import { classifyLocalBootFailure, localBootFailureCopy } from './boot-failure-cause'

const CAUSES = {
  diskFull: 'disk full copy',
  exitedEarly: 'exited early copy',
  installMissing: 'install missing copy',
  permission: 'permission copy',
  portInUse: 'port copy',
  timedOut: 'timed out copy'
}

// The red box on the boot-failure overlay must lead with ONE plain sentence;
// exit codes, millisecond values and Python tracebacks belong under Details.
describe('local boot failure classification', () => {
  it('classifies the raw main-process failures into plain causes', () => {
    expect(
      classifyLocalBootFailure(
        'Hermes backend exited before it became ready (1).\nRecent backend output:\nTraceback (most recent call last):\n  File "x.py"'
      )
    ).toBe('exitedEarly')
    expect(classifyLocalBootFailure('Timed out connecting to Hermes backend after 45000ms')).toBe('timedOut')
    expect(classifyLocalBootFailure("EACCES: permission denied, open '/home/x/.hermes/state.db'")).toBe('permission')
    expect(classifyLocalBootFailure('OSError: [Errno 28] No space left on device')).toBe('diskFull')
    expect(classifyLocalBootFailure('listen EADDRINUSE: address already in use 127.0.0.1:9191')).toBe('portInUse')
    expect(classifyLocalBootFailure(null)).toBeNull()
  })

  // 黔算：主进程报错已中文化（块3b），分类器必须认中文锚点——
  // 异族审查 22 号文指出旧版只测英文串、对新中文串零覆盖（断裂一逃逸原因）。
  it('分类器认中文主进程串（超时/提前退出）', () => {
    expect(classifyLocalBootFailure('连接后端超时（45000ms）')).toBe('timedOut')
    expect(classifyLocalBootFailure('等待后端报告端口超时（90000ms）（更新收尾正在进行）')).toBe('timedOut')
    expect(classifyLocalBootFailure('后端在报告端口前就退出了（1）')).toBe('exitedEarly')
    // '后端没有在预期时间内就绪' 在英文版同样不落 timedOut（行为对齐）
    expect(classifyLocalBootFailure('后端没有在预期时间内就绪：细节')).toBeNull()
  })

  it('keeps the raw output out of the headline and behind details', () => {
    const raw =
      'Hermes backend exited before it became ready (1).\nRecent backend output:\nTraceback (most recent call last):'

    const copy = localBootFailureCopy(raw, CAUSES)

    expect(copy.headline).toBe(CAUSES.exitedEarly)
    expect(copy.headline).not.toMatch(/\(1\)|Traceback|ms\b/)
    expect(copy.rawDetail).toBe(raw)
  })

  it('falls back to the first raw line for an unknown failure, never a dump', () => {
    const copy = localBootFailureCopy('Something odd happened\nline 2\nline 3', CAUSES)

    expect(copy.headline).toBe('Something odd happened')
    expect(copy.rawDetail).toContain('line 3')
  })
})
