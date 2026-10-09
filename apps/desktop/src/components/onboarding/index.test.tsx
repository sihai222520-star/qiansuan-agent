import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { $desktopOnboarding, type DesktopOnboardingState, type OnboardingContext } from '@/store/onboarding'
import { makeOAuthProvider } from '@/test/oauth-provider'
import type { OAuthProvider } from '@/types/hermes'

import { ApiKeyForm, Picker } from '.'

function setProviders(providers: OAuthProvider[]) {
  $desktopOnboarding.set({
    configured: false,
    flow: { status: 'idle' },
    mode: 'oauth',
    providers,
    reason: null,
    requested: false,
    firstRunSkipped: false,
    manual: false,
    localEndpoint: false,
    freeTierReady: false
  } satisfies DesktopOnboardingState)
}

const ctx: OnboardingContext = { requestGateway: async () => undefined as never }

afterEach(() => {
  cleanup()

  try {
    window.localStorage.clear()
  } catch {
    // jsdom localStorage should always be present; ignore if not.
  }

  $desktopOnboarding.set({
    configured: null,
    flow: { status: 'idle' },
    mode: 'oauth',
    providers: null,
    reason: null,
    requested: false,
    firstRunSkipped: false,
    manual: false,
    localEndpoint: false,
    freeTierReady: false
  })
})

describe('onboarding Picker', () => {
  // 黔算产品主线：首启不再先出 OAuth 门户，直接渲染 API key 表单，
  // 且默认选中"自定义 API"卡片（中转站直连）。
  it('lands directly on the custom-API key form with the custom endpoint preselected', () => {
    setProviders([makeOAuthProvider('nous', 'Nous Portal'), makeOAuthProvider('anthropic', 'Anthropic Claude')])
    render(<Picker ctx={ctx} />)

    expect(screen.getByText('自定义 API（OpenAI 兼容）')).toBeTruthy()
    expect(screen.queryByText('Nous Portal')).toBeNull()
    expect(screen.queryByText('Recommended')).toBeNull()
  })

  it('still lists the other key options and offers "choose later" on first run', () => {
    setProviders([makeOAuthProvider('nous', 'Nous Portal')])
    render(<Picker ctx={ctx} />)

    expect(screen.getByText('Fireworks AI')).toBeTruthy()
    expect(screen.getByText('OpenRouter')).toBeTruthy()

    const skip = screen.getByRole('button', { name: "I'll choose a provider later" })

    fireEvent.click(skip)

    expect($desktopOnboarding.get().firstRunSkipped).toBe(true)
    expect(window.localStorage.getItem('hermes-onboarding-skipped-v1')).toBe('1')
  })

  it('hides "choose later" in manual (add-provider) mode', () => {
    setProviders([makeOAuthProvider('nous', 'Nous Portal')])
    $desktopOnboarding.set({ ...$desktopOnboarding.get(), manual: true })
    render(<Picker ctx={ctx} />)

    expect(screen.queryByRole('button', { name: "I'll choose a provider later" })).toBeNull()
  })
})

describe('ApiKeyForm manual local-model fallback', () => {
  it('reveals the model-name input only after the endpoint enumerates no models, then forwards the name', async () => {
    // First Connect: reachable endpoint, empty /v1/models — the wizard must ask
    // for a manual model name instead of dead-ending. Second Connect: the typed
    // name is forwarded as the 5th onSave argument.
    const onSave = vi
      .fn<
        (
          envKey: string,
          value: string,
          name: string,
          apiKey?: string,
          modelName?: string
        ) => Promise<{ message?: string; needsModelInput?: boolean; ok: boolean }>
      >()
      .mockResolvedValueOnce({
        ok: false,
        needsModelInput: true,
        message: "Connected, but it didn't enumerate any models at /v1/models."
      })
      .mockResolvedValueOnce({ ok: true })

    render(<ApiKeyForm canGoBack={false} initialEnvKey="OPENAI_BASE_URL" onBack={() => undefined} onSave={onSave} />)

    fireEvent.change(screen.getByPlaceholderText('https://api.example.com/v1'), {
      target: { value: 'https://api.cohere.ai/compatibility/v1' }
    })

    // Hidden on the happy path — discovery hasn't failed yet.
    expect(screen.queryByPlaceholderText('Model name (e.g. command-a-plus-05-2026)')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Model name (e.g. command-a-plus-05-2026)')).toBeTruthy()
    })

    fireEvent.change(screen.getByPlaceholderText('Model name (e.g. command-a-plus-05-2026)'), {
      target: { value: 'command-a-plus-05-2026' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => {
      // apiKey is the (empty) local-key field, forwarded as-is for the local option.
      expect(onSave).toHaveBeenLastCalledWith(
        'OPENAI_BASE_URL',
        'https://api.cohere.ai/compatibility/v1',
        '自定义 API（OpenAI 兼容）',
        '',
        'command-a-plus-05-2026'
      )
    })
  })
})
