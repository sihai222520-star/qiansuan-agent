import { expect, test } from 'vitest'

import { bootstrapSnapshot } from './bootstrap-state'
import { type InstallStamp } from './install-stamp'

function stamp(payload: InstallStamp['payload']): InstallStamp {
  return {
    schemaVersion: 2,
    commit: null,
    commitDate: null,
    branch: null,
    builtAt: null,
    dirty: false,
    source: 'build',
    distribution: 'desktop-app',
    updateMechanism: 'self',
    baseVersion: null,
    displayVersion: null,
    distance: null,
    payload,
    tag: null
  }
}

test.each(['bundled', 'bootstrap', 'light'] as const)(
  'bootstrap state retains the %s artifact fact across failure and reset',
  payload => {
    const artifact = stamp(payload)
    const state = { error: 'backend exited before setup', setupChoice: null }
    // 黔算智能体：快照现在同时携带 bundled 与 light 两个安装戳事实。
    expect(bootstrapSnapshot(state, artifact)).toEqual({
      ...state,
      bundled: payload === 'bundled',
      light: payload === 'light'
    })
    expect(bootstrapSnapshot({ error: null, setupChoice: null }, artifact).bundled).toBe(payload === 'bundled')
    expect(bootstrapSnapshot({ error: null, setupChoice: null }, artifact).light).toBe(payload === 'light')
    expect(state).not.toHaveProperty('bundled')
    expect(bootstrapSnapshot(state, null).bundled).toBe(false)
    expect(bootstrapSnapshot({ ...state, bundled: payload !== 'bundled' }, artifact).bundled).toBe(
      payload === 'bundled'
    )
  }
)
