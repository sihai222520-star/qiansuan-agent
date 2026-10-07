/**
 * Interface mode is a resolver input, never a preference writer. These tests
 * pin the precedence contract — sessionReveal ?? policy[mode] ?? userPref —
 * and the promise that matters to an existing install: Advanced is a no-op and
 * a round trip through Simple leaves every preference byte-identical.
 */

import { atom } from 'nanostores'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const MODE_KEY = 'hermes.desktop.interfaceMode.v1'

const loadStore = () => import('./interface-mode')

describe('interface mode persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  // 黔算智能体：默认模式已改为 simple，"不写记录"的现在是非默认值 simple。
  it('never writes a record for the default mode, so an untouched install stays untouched', async () => {
    const { $interfaceMode, setInterfaceMode } = await loadStore()

    expect($interfaceMode.get()).toBe('simple')
    setInterfaceMode('simple')
    expect(window.localStorage.getItem(MODE_KEY)).toBeNull()

    setInterfaceMode('advanced')
    expect(window.localStorage.getItem(MODE_KEY)).not.toBeNull()

    setInterfaceMode('simple')
    expect(window.localStorage.getItem(MODE_KEY)).toBeNull()
  })

  // 黔算智能体：这是防"高级模式切不回来"的核心回归——
  // 必须验证 Advanced 能被记住并跨重载恢复；无法识别的值回落到品牌默认值 simple。
  it('restores Advanced across a reload and treats anything unrecognised as the brand default (Simple)', async () => {
    const first = await loadStore()

    first.setInterfaceMode('advanced')
    vi.resetModules()
    expect((await loadStore()).$interfaceMode.get()).toBe('advanced')

    window.localStorage.setItem(MODE_KEY, 'intermediate')
    vi.resetModules()
    expect((await loadStore()).$interfaceMode.get()).toBe('simple')
  })
})

describe('modeBound resolver', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  // 黔算智能体：这条测的是 Advanced 语义，必须**显式**进入 Advanced——
  // 默认模式已改为 simple，不能再依赖"默认就是 Advanced"。
  it('falls through to the preference in Advanced, and writes reach the preference', async () => {
    const { modeBound, setInterfaceMode } = await loadStore()
    setInterfaceMode('advanced')
    const $pref = atom(true)
    const $bound = modeBound('statusbarVisible', $pref, value => $pref.set(value))

    expect($bound.get()).toBe(true)

    $bound.set(false)
    expect($pref.get()).toBe(false)
    expect($bound.get()).toBe(false)
  })

  it('shadows the preference in Simple without writing it, and lifts the shadow on the way back', async () => {
    const { modeBound, setInterfaceMode } = await loadStore()
    const $pref = atom(true)
    const $bound = modeBound('statusbarVisible', $pref, value => $pref.set(value))

    setInterfaceMode('simple')
    expect($bound.get()).toBe(false)
    expect($pref.get()).toBe(true)

    setInterfaceMode('advanced')
    expect($bound.get()).toBe(true)
  })

  it('routes a toggle made under a shadow to the session layer, cleared on the next mode change', async () => {
    const { modeBound, setInterfaceMode } = await loadStore()
    const $pref = atom(false)
    const $bound = modeBound('terminalOpen', $pref, value => $pref.set(value))

    setInterfaceMode('simple')
    $bound.set(true)
    expect($bound.get()).toBe(true)
    expect($pref.get()).toBe(false)

    setInterfaceMode('advanced')
    expect($bound.get()).toBe(false)

    setInterfaceMode('simple')
    expect($bound.get()).toBe(false)
  })

  it('drops a shadowed write made as layout intent: the mode decides what rests, the preference stays', async () => {
    const { asLayoutIntent, modeBound, setInterfaceMode } = await loadStore()
    const $pref = atom(false)
    const $bound = modeBound('terminalOpen', $pref, value => $pref.set(value))

    setInterfaceMode('simple')
    asLayoutIntent(() => $bound.set(true))
    expect($bound.get()).toBe(false)
    expect($pref.get()).toBe(false)

    setInterfaceMode('advanced')
    asLayoutIntent(() => $bound.set(true))
    expect($pref.get()).toBe(true)
  })

  it('leaves a surface Simple has no opinion on alone', async () => {
    const { modeBound, setInterfaceMode, $modeShadowed } = await loadStore()

    setInterfaceMode('simple')
    expect($modeShadowed('statusbarVisible').get()).toBe(true)

    setInterfaceMode('advanced')
    expect($modeShadowed('statusbarVisible').get()).toBe(false)

    const $pref = atom<'product' | 'technical'>('technical')
    const $bound = modeBound('toolViewMode', $pref, value => $pref.set(value))

    expect($bound.get()).toBe('technical')
  })

  it('keeps the profile rail available in Simple for multiple profiles or gateways', async () => {
    const { modeBound, setInterfaceMode, setModeContext } = await loadStore()
    const $pref = atom(true)
    const $bound = modeBound('profileRailVisible', $pref, value => $pref.set(value))

    setInterfaceMode('simple')
    expect($bound.get()).toBe(false)

    setModeContext({ profileCount: 2 })
    expect($bound.get()).toBe(true)

    setModeContext({ profileCount: 1 })
    expect($bound.get()).toBe(false)

    setModeContext({ connectionCount: 2 })
    expect($bound.get()).toBe(true)

    setModeContext({ connectionCount: 1 })
    expect($bound.get()).toBe(false)
  })
})

describe('tiers', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.resetModules()
  })

  it('shows untagged items everywhere and a tiered item only in its mode', async () => {
    const { shownInMode, $showsAdvancedChrome, setInterfaceMode } = await loadStore()

    const items = [
      { id: 'settings' },
      { id: 'hud', tier: 'advanced' as const },
      { id: 'side', tier: 'simple' as const }
    ]

    expect(items.filter(shownInMode('advanced')).map(item => item.id)).toEqual(['settings', 'hud'])
    expect(items.filter(shownInMode('simple')).map(item => item.id)).toEqual(['settings', 'side'])

    // 黔算智能体：品牌默认是 simple，所以初始不显示高级仪器；显式切到 advanced 才显示。
    expect($showsAdvancedChrome.get()).toBe(false)
    setInterfaceMode('advanced')
    expect($showsAdvancedChrome.get()).toBe(true)
    setInterfaceMode('simple')
    expect($showsAdvancedChrome.get()).toBe(false)
  })
})
