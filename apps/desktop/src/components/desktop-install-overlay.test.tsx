// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DesktopBootstrapEvent, DesktopBootstrapState } from '@/global'

import { DesktopInstallOverlay, splitFailureDetails } from './desktop-install-overlay'

function bootstrapState(overrides: Partial<DesktopBootstrapState> = {}): DesktopBootstrapState {
  return {
    active: false,
    manifest: null,
    stages: {},
    error: null,
    log: [],
    startedAt: null,
    completedAt: null,
    setupChoice: null,
    unsupportedPlatform: null,
    bundled: false,
    light: false,
    ...overrides
  }
}

function installDesktopMock(state: DesktopBootstrapState) {
  const bootstrapListeners = new Set<(event: DesktopBootstrapEvent) => void>()

  const desktop = {
    getBootstrapState: vi.fn().mockResolvedValue(state),
    onBootstrapEvent: vi.fn((listener: (event: DesktopBootstrapEvent) => void) => {
      bootstrapListeners.add(listener)

      return () => bootstrapListeners.delete(listener)
    }),
    continueBootstrapLocal: vi.fn().mockResolvedValue({ ok: true }),
    resetBootstrap: vi.fn().mockResolvedValue({ ok: true }),
    probeConnectionConfig: vi.fn(),
    testConnectionConfig: vi.fn(),
    applyConnectionConfig: vi.fn(),
    oauthLoginConnectionConfig: vi.fn(),
    openExternal: vi.fn(),
    emitBootstrapEvent: (event: DesktopBootstrapEvent) => {
      for (const listener of bootstrapListeners) {
        listener(event)
      }
    }
  }

  Object.defineProperty(window, 'hermesDesktop', {
    configurable: true,
    value: desktop
  })

  return desktop
}

// Resolve the instant a node commits, via MutationObserver rather than
// waitFor's polling timer. findBy* only settles on a timer tick, by which
// point React has already drained its passive effects — that hides any bug
// living in the window between paint and effect.
function whenPresent(text: string): Promise<HTMLElement> {
  return new Promise(resolve => {
    const existing = screen.queryByText(text)

    if (existing) {
      resolve(existing)

      return
    }

    const observer = new MutationObserver(() => {
      const node = screen.queryByText(text)

      if (node) {
        observer.disconnect()
        resolve(node)
      }
    })

    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  Reflect.deleteProperty(window, 'hermesDesktop')
})

describe('DesktopInstallOverlay first-run setup', () => {
  it('shows the remote/local choice without installer progress', async () => {
    installDesktopMock(
      bootstrapState({
        setupChoice: {
          platform: 'win32',
          activeRoot: 'C:\\Users\\me\\AppData\\Local\\hermes\\hermes-agent',
          local: 'none',
          bundled: false
        }
      })
    )

    render(<DesktopInstallOverlay />)

    expect(await screen.findByText('Set up Hermes Desktop')).toBeTruthy()
    expect(screen.getByText('Connect to existing Hermes')).toBeTruthy()
    expect(screen.getByText('Install Hermes locally')).toBeTruthy()
    expect(screen.getByText(/Will install to/i)).toBeTruthy()
    expect(screen.queryByText(/steps complete/i)).toBeNull()
    expect(screen.queryByText(/Fetching installer manifest/i)).toBeNull()
  })

  it('continues local bootstrap only when Install Hermes locally is selected', async () => {
    const desktop = installDesktopMock(
      bootstrapState({
        setupChoice: {
          platform: 'win32',
          activeRoot: 'C:\\Users\\me\\AppData\\Local\\hermes\\hermes-agent',
          local: 'none',
          bundled: false
        }
      })
    )

    render(<DesktopInstallOverlay />)

    fireEvent.click(await screen.findByText('Install Hermes locally'))

    expect(desktop.continueBootstrapLocal).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Set up Hermes Desktop')).toBeTruthy()

    act(() => {
      desktop.emitBootstrapEvent({ type: 'manifest', protocolVersion: 1, stages: [] })
    })

    await waitFor(() => expect(screen.queryByText('Set up Hermes Desktop')).toBeNull())
    expect(screen.getByText(/Fetching installer manifest/i)).toBeTruthy()
  })

  it('surfaces a recoverable error when the local-bootstrap bridge is unavailable', async () => {
    const desktop = installDesktopMock(
      bootstrapState({
        setupChoice: {
          platform: 'win32',
          activeRoot: 'C:\\Users\\me\\AppData\\Local\\hermes\\hermes-agent',
          local: 'none',
          bundled: false
        }
      })
    )

    desktop.continueBootstrapLocal = undefined as never
    render(<DesktopInstallOverlay />)

    const install = (await screen.findByText('Install Hermes locally')).closest('button') as HTMLButtonElement
    fireEvent.click(install)

    expect(
      await screen.findByText('Local installation could not start. Restart Hermes Desktop and try again.')
    ).toBeTruthy()
    expect(install.disabled).toBe(false)
  })

  it('keeps the local-start error when the first snapshot commits under the click', async () => {
    const desktop = installDesktopMock(
      bootstrapState({
        setupChoice: {
          platform: 'win32',
          activeRoot: 'C:\\Users\\me\\AppData\\Local\\hermes\\hermes-agent',
          local: 'none',
          bundled: false
        }
      })
    )

    desktop.continueBootstrapLocal = undefined as never
    render(<DesktopInstallOverlay />)

    // Click the instant the choice paints, before React drains the passive
    // effect that reacts to the first snapshot. A loaded runner hits this
    // window by accident; observing the DOM directly hits it every time.
    const install = (await whenPresent('Install Hermes locally')).closest('button') as HTMLButtonElement
    fireEvent.click(install)

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.queryByText('Local installation could not start. Restart Hermes Desktop and try again.')).toBeTruthy()
  })

  it('clears a stale local-start error when a repair presents a different root', async () => {
    const desktop = installDesktopMock(
      bootstrapState({
        setupChoice: {
          platform: 'win32',
          activeRoot: 'C:\\Users\\me\\AppData\\Local\\hermes\\hermes-agent',
          local: 'none',
          bundled: false
        }
      })
    )

    desktop.continueBootstrapLocal = undefined as never
    render(<DesktopInstallOverlay />)

    fireEvent.click((await screen.findByText('Install Hermes locally')).closest('button') as HTMLButtonElement)
    expect(
      await screen.findByText('Local installation could not start. Restart Hermes Desktop and try again.')
    ).toBeTruthy()

    act(() => {
      desktop.emitBootstrapEvent({
        type: 'setup-choice',
        active: false,
        platform: 'win32',
        activeRoot: 'C:\\Users\\me\\AppData\\Local\\hermes\\hermes-agent-repaired'
      })
    })

    expect(screen.queryByText('Local installation could not start. Restart Hermes Desktop and try again.')).toBeNull()
  })

  it('opens the remote connection form from the first-run choice', async () => {
    installDesktopMock(
      bootstrapState({
        setupChoice: { platform: 'linux', activeRoot: '/home/me/.hermes/hermes-agent', local: 'none', bundled: false }
      })
    )

    render(<DesktopInstallOverlay />)

    fireEvent.click(await screen.findByText('Connect to existing Hermes'))

    expect(await screen.findByText('Gateway URL')).toBeTruthy()
    expect(screen.getByText('Test connection')).toBeTruthy()
    expect(screen.getByText('Apply and reconnect')).toBeTruthy()
  })

  it('returns from the remote connection form to the first-run choice', async () => {
    installDesktopMock(
      bootstrapState({
        setupChoice: { platform: 'linux', activeRoot: '/home/me/.hermes/hermes-agent', local: 'none', bundled: false }
      })
    )

    render(<DesktopInstallOverlay />)

    fireEvent.click(await screen.findByText('Connect to existing Hermes'))
    expect(await screen.findByText('Gateway URL')).toBeTruthy()

    fireEvent.click(screen.getByText('Back'))

    expect(await screen.findByText('Set up Hermes Desktop')).toBeTruthy()
    expect(screen.getByText('Install Hermes locally')).toBeTruthy()
  })

  it('requires a successful token connection test before applying remote config', async () => {
    const desktop = installDesktopMock(
      bootstrapState({
        setupChoice: { platform: 'linux', activeRoot: '/home/me/.hermes/hermes-agent', local: 'none', bundled: false }
      })
    )

    desktop.probeConnectionConfig.mockResolvedValue({
      authMode: 'token',
      baseUrl: 'https://gateway.example.com/hermes',
      error: null,
      providers: [],
      reachable: true,
      version: '0.17.0'
    })
    desktop.testConnectionConfig.mockResolvedValue({
      baseUrl: 'https://gateway.example.com/hermes',
      ok: true,
      version: '0.17.0'
    })
    desktop.applyConnectionConfig.mockImplementation(async () => {
      desktop.emitBootstrapEvent({ type: 'dismissed' })

      return { mode: 'remote' }
    })

    render(<DesktopInstallOverlay />)

    fireEvent.click(await screen.findByText('Connect to existing Hermes'))
    fireEvent.change(await screen.findByPlaceholderText('https://gateway.example.com/hermes'), {
      target: { value: 'https://gateway.example.com/hermes' }
    })

    const apply = screen.getByText('Apply and reconnect').closest('button') as HTMLButtonElement
    expect(apply.disabled).toBe(true)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 550))
    })

    fireEvent.change(await screen.findByPlaceholderText('Paste session token'), {
      target: { value: 'session-secret' }
    })
    fireEvent.click(screen.getByText('Test connection'))

    await waitFor(() => {
      expect(desktop.testConnectionConfig).toHaveBeenCalledWith({
        mode: 'remote',
        remoteAuthMode: 'token',
        remoteToken: 'session-secret',
        remoteUrl: 'https://gateway.example.com/hermes'
      })
    })

    await screen.findByText('Connected to https://gateway.example.com/hermes (0.17.0).')
    expect(apply.disabled).toBe(false)

    fireEvent.click(screen.getByText('Apply and reconnect'))

    await waitFor(() => {
      expect(desktop.applyConnectionConfig).toHaveBeenCalledWith({
        mode: 'remote',
        remoteAuthMode: 'token',
        remoteToken: 'session-secret',
        remoteUrl: 'https://gateway.example.com/hermes'
      })
    })
    await waitFor(() => expect(screen.queryByText('Gateway URL')).toBeNull())
  })

  it('restores remote apply controls when applying the tested connection fails', async () => {
    const desktop = installDesktopMock(
      bootstrapState({
        setupChoice: { platform: 'linux', activeRoot: '/home/me/.hermes/hermes-agent', local: 'none', bundled: false }
      })
    )

    desktop.probeConnectionConfig.mockResolvedValue({
      authMode: 'token',
      baseUrl: 'https://gateway.example.com/hermes',
      error: null,
      providers: [],
      reachable: true,
      version: '0.17.0'
    })
    desktop.testConnectionConfig.mockResolvedValue({
      baseUrl: 'https://gateway.example.com/hermes',
      ok: true,
      version: '0.17.0'
    })
    desktop.applyConnectionConfig.mockRejectedValue(new Error('remote apply failed'))

    render(<DesktopInstallOverlay />)

    fireEvent.click(await screen.findByText('Connect to existing Hermes'))
    fireEvent.change(await screen.findByPlaceholderText('https://gateway.example.com/hermes'), {
      target: { value: 'https://gateway.example.com/hermes' }
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 550))
    })

    fireEvent.change(await screen.findByPlaceholderText('Paste session token'), {
      target: { value: 'session-secret' }
    })
    fireEvent.click(screen.getByText('Test connection'))
    await screen.findByText('Connected to https://gateway.example.com/hermes (0.17.0).')

    const apply = screen.getByText('Apply and reconnect').closest('button') as HTMLButtonElement
    fireEvent.click(apply)

    expect(await screen.findByText('remote apply failed')).toBeTruthy()
    expect(apply.disabled).toBe(false)
    expect(screen.getByText('Gateway URL')).toBeTruthy()
  })

  it('signs in, tests, and applies a password-style remote gateway', async () => {
    const desktop = installDesktopMock(
      bootstrapState({
        setupChoice: { platform: 'linux', activeRoot: '/home/me/.hermes/hermes-agent', local: 'none', bundled: false }
      })
    )

    desktop.probeConnectionConfig.mockResolvedValue({
      authMode: 'oauth',
      baseUrl: 'https://gateway.example.com/hermes',
      error: null,
      providers: [{ displayName: 'Username & Password', name: 'password', supportsPassword: true }],
      reachable: true,
      version: '0.17.0'
    })
    desktop.oauthLoginConnectionConfig.mockResolvedValue({
      baseUrl: 'https://gateway.example.com/hermes',
      connected: true,
      ok: true
    })
    desktop.testConnectionConfig.mockResolvedValue({
      baseUrl: 'https://gateway.example.com/hermes',
      ok: true,
      version: null
    })
    desktop.applyConnectionConfig.mockResolvedValue({ mode: 'remote' })

    render(<DesktopInstallOverlay />)

    fireEvent.click(await screen.findByText('Connect to existing Hermes'))
    fireEvent.change(await screen.findByPlaceholderText('https://gateway.example.com/hermes'), {
      target: { value: 'https://gateway.example.com/hermes' }
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 550))
    })

    expect(screen.queryByText('Sign in with Username & Password')).toBeNull()
    fireEvent.click(await screen.findByText('Sign in'))

    await waitFor(() => {
      expect(desktop.oauthLoginConnectionConfig).toHaveBeenCalledWith('https://gateway.example.com/hermes')
    })

    fireEvent.click(screen.getByText('Test connection'))

    await waitFor(() => {
      expect(desktop.testConnectionConfig).toHaveBeenCalledWith({
        mode: 'remote',
        remoteAuthMode: 'oauth',
        remoteToken: undefined,
        remoteUrl: 'https://gateway.example.com/hermes'
      })
    })

    await screen.findByText('Connected to https://gateway.example.com/hermes.')
    const apply = screen.getByText('Apply and reconnect').closest('button') as HTMLButtonElement
    expect(apply.disabled).toBe(false)
    fireEvent.click(apply)

    await waitFor(() => {
      expect(desktop.applyConnectionConfig).toHaveBeenCalledWith({
        mode: 'remote',
        remoteAuthMode: 'oauth',
        remoteToken: undefined,
        remoteUrl: 'https://gateway.example.com/hermes'
      })
    })
  })

  it('does not authorize a new URL with an old login result or save before Apply', async () => {
    const desktop = installDesktopMock(
      bootstrapState({
        setupChoice: { platform: 'linux', activeRoot: '/tmp/hermes', local: 'none', bundled: false }
      })
    )

    const saveConnectionConfig = vi.fn()
    Object.assign(desktop, { saveConnectionConfig })
    desktop.probeConnectionConfig.mockResolvedValue({
      authMode: 'oauth',
      baseUrl: 'https://a.example',
      reachable: true,
      providers: [],
      error: null,
      version: null
    })
    let finishLogin!: (value: { connected: boolean }) => void
    desktop.oauthLoginConnectionConfig.mockReturnValueOnce(
      new Promise<{ connected: boolean }>(resolve => {
        finishLogin = resolve
      })
    )
    render(<DesktopInstallOverlay />)
    fireEvent.click(await screen.findByText('Connect to existing Hermes'))
    const url = screen.getByPlaceholderText('https://gateway.example.com/hermes')
    fireEvent.change(url, { target: { value: 'https://a.example' } })
    fireEvent.click(await screen.findByRole('button', { name: /Sign in with/ }))
    await waitFor(() => expect(desktop.oauthLoginConnectionConfig).toHaveBeenCalledWith('https://a.example'))
    fireEvent.change(url, { target: { value: 'https://b.example' } })
    await waitFor(() => expect(desktop.probeConnectionConfig).toHaveBeenCalledWith('https://b.example'))
    await act(async () => finishLogin({ connected: true }))
    fireEvent.click(screen.getByText('Test connection'))
    expect(desktop.testConnectionConfig).not.toHaveBeenCalled()
    expect(saveConnectionConfig).not.toHaveBeenCalled()
    expect(desktop.applyConnectionConfig).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Back'))
    fireEvent.click(await screen.findByText('Install Hermes locally'))
    expect(desktop.continueBootstrapLocal).toHaveBeenCalledTimes(1)
    expect(saveConnectionConfig).not.toHaveBeenCalled()
  })

  it('offers remote connection from the unsupported packaged install screen', async () => {
    const desktop = installDesktopMock(
      bootstrapState({
        unsupportedPlatform: {
          platform: 'darwin',
          activeRoot: '/Users/me/.hermes/hermes-agent',
          installCommand: 'curl -fsSL https://example.invalid/install.sh | sh',
          docsUrl: 'https://example.invalid/docs'
        }
      })
    )

    render(<DesktopInstallOverlay />)

    expect(await screen.findByText('Hermes needs a one-time install')).toBeTruthy()

    fireEvent.click(screen.getByText('Connect existing'))

    expect(await screen.findByText('Gateway URL')).toBeTruthy()

    desktop.probeConnectionConfig.mockResolvedValue({
      authMode: 'token',
      baseUrl: 'https://gateway.example.com/hermes',
      error: null,
      providers: [],
      reachable: true,
      version: '0.17.0'
    })
    desktop.testConnectionConfig.mockResolvedValue({
      baseUrl: 'https://gateway.example.com/hermes',
      ok: true,
      version: '0.17.0'
    })
    desktop.applyConnectionConfig.mockImplementation(async () => {
      desktop.emitBootstrapEvent({ type: 'dismissed' })

      return { mode: 'remote' }
    })

    fireEvent.change(screen.getByPlaceholderText('https://gateway.example.com/hermes'), {
      target: { value: 'https://gateway.example.com/hermes' }
    })

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 550))
    })

    fireEvent.change(await screen.findByPlaceholderText('Paste session token'), {
      target: { value: 'session-secret' }
    })
    fireEvent.click(screen.getByText('Test connection'))
    await screen.findByText('Connected to https://gateway.example.com/hermes (0.17.0).')
    fireEvent.click(screen.getByText('Apply and reconnect'))

    await waitFor(() => expect(screen.queryByText('Gateway URL')).toBeNull())
    expect(screen.queryByText('Hermes needs a one-time install')).toBeNull()
  })

  it('dismisses a cancelled/failed install via the footer Close button, without reloading or resetting bootstrap', async () => {
    const desktop = installDesktopMock(bootstrapState({ error: 'cancelled by user' }))

    render(<DesktopInstallOverlay />)

    expect(await screen.findByText('Installation failed')).toBeTruthy()

    fireEvent.click(screen.getByText('Close'))

    await waitFor(() => expect(screen.queryByText('Installation failed')).toBeNull())
    expect(desktop.resetBootstrap).not.toHaveBeenCalled()
  })

  it('dismisses a failed install on Escape', async () => {
    installDesktopMock(bootstrapState({ error: 'cancelled by user' }))

    render(<DesktopInstallOverlay />)

    expect(await screen.findByText('Installation failed')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByText('Installation failed')).toBeNull())
  })
})

it.each([
  ['installed', false, 'Use Hermes on this computer', /already installed here/i, false],
  ['bundled', true, 'Use Hermes on this computer', /included with this app/i, false],
  [undefined, false, 'Install Hermes locally', /Will install to/i, true]
] as const)(
  'local presentation for %s (including old backends)',
  async (
    local: 'installed' | 'bundled' | undefined,
    bundled: boolean,
    title: string,
    description: RegExp,
    footer: boolean
  ): Promise<void> => {
    const state: DesktopBootstrapState = bootstrapState({
      setupChoice: { platform: 'win32', activeRoot: 'C:\\Hermes', local: local ?? 'none', bundled }
    })

    if (local === undefined && state.setupChoice) {
      Reflect.deleteProperty(state.setupChoice, 'local')
    }

    installDesktopMock(state)
    render(<DesktopInstallOverlay />)
    expect(await screen.findByText(title)).toBeTruthy()
    expect(screen.getByText(description)).toBeTruthy()
    expect(screen.queryByText(/Will install to/i) !== null).toBe(footer)

    if (!footer) {
      expect(screen.queryByText('Install Hermes locally')).toBeNull()
    }
  }
)

// 黔算（异族审查 fdff 指出分割器零测试覆盖）：bootstrap 失败文案已中文化，
// 分割器必须同时认中文「详细信息：」与旧英文 "Details:"（上游其余消息仍用后者）。
describe('splitFailureDetails（失败文案 lead/明细分割）', () => {
  it('认中文标记：详细信息：', () => {
    const [lead, detail] = splitFailureDetails(
      '安装黔算智能体在「Python 虚拟环境」这一步中断了。 常见原因：没有联网……\n详细信息：venv failed with exit code 1'
    )

    expect(lead).toBe('安装黔算智能体在「Python 虚拟环境」这一步中断了。 常见原因：没有联网……')
    expect(detail).toBe('venv failed with exit code 1')
  })

  it('认旧英文标记：Details:（上游/更新器消息兼容）', () => {
    const [lead, detail] = splitFailureDetails('lead sentence\n\nDetails: raw error text')

    expect(lead).toBe('lead sentence')
    expect(detail).toBe('raw error text')
  })

  it('无标记时整段当 lead，明细为 null', () => {
    const [lead, detail] = splitFailureDetails('只是一句话，没有明细')

    expect(lead).toBe('只是一句话，没有明细')
    expect(detail).toBeNull()
  })

  it('空值/Null 安全', () => {
    expect(splitFailureDetails(null)).toEqual(['', null])
    expect(splitFailureDetails('   ')).toEqual(['', null])
  })
})
