import { LOCAL_CONNECTION_ID } from '@hermes/shared'
import { useRef, useState } from 'react'

import { FirstRunRemoteSetup } from '@/components/remote-setup/first-run'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useI18n } from '@/i18n'
import { notifyError } from '@/store/notifications'

/**
 * Resolve whether This device would install, without starting the installer.
 * Missing bridge fails closed: a click must not reach runBootstrap unseen.
 */
async function probeLocalBackend(): Promise<boolean> {
  const probe = window.hermesDesktop?.probeLocalBackend

  if (!probe) {
    return true
  }

  return (await probe()).bootstrapNeeded === true
}

export interface LocalDeviceTarget {
  connectionId: string
  label: string
  profile?: string
  /** The switch replaces the center with a fresh session, even when Hermes is already installed. */
  replaceCenter?: boolean
}

interface LocalDevicePrompt extends LocalDeviceTarget {
  kind: 'install' | 'switch'
}

/**
 * Gate a re-home onto This device. Bootstrap-needed always confirms, and offers
 * Connect to existing inline so the click cannot fall through into runBootstrap.
 * An already-installed runtime still confirms before a fresh session replaces
 * the center. Named profiles on an installed local runtime keep the existing
 * spinner path — they are not the Home-looking misclick.
 */
/* 黔算智能体：light 变体检测（模块级缓存，一次 IPC，之后同步返回）。 */
let lightVariantCache: boolean | null = null

async function isLightVariantClient(): Promise<boolean> {
  if (lightVariantCache !== null) {
    return lightVariantCache
  }
  try {
    const desktop = window.hermesDesktop

    lightVariantCache =
      desktop && typeof desktop.getBootstrapState === 'function'
        ? Boolean((await desktop.getBootstrapState())?.light)
        : false
  } catch {
    lightVariantCache = false
  }

  return lightVariantCache
}

export function useLocalDeviceSwitch() {
  const { t } = useI18n()
  const [prompt, setPrompt] = useState<LocalDevicePrompt | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const waiter = useRef<((accepted: boolean) => void) | null>(null)

  const settle = (accepted: boolean) => {
    const resolve = waiter.current
    waiter.current = null
    setPrompt(null)
    resolve?.(accepted)
  }

  const request = async (target: LocalDeviceTarget): Promise<boolean> => {
    if (target.connectionId !== LOCAL_CONNECTION_ID) {
      return true
    }

    // 黔算智能体：light 变体本机无运行时，"本机"入口直接不可用（不弹安装确认）。
    // 主进程已拒绝安装（纵深防御第二层），这里把 UI 入口也收掉。
    if (await isLightVariantClient()) {
      return false
    }

    if (waiter.current) {
      return false
    }

    let bootstrapNeeded: boolean

    try {
      bootstrapNeeded = await probeLocalBackend()
    } catch (error) {
      notifyError(error, t.profiles.switchConnectionFailed(target.label))

      return false
    }

    const freshSession = target.replaceCenter === true || target.profile == null || target.profile === 'default'

    if (!bootstrapNeeded && !freshSession) {
      return true
    }

    return new Promise(resolve => {
      waiter.current = resolve
      setPrompt({ ...target, kind: bootstrapNeeded ? 'install' : 'switch' })
    })
  }

  const fleet = t.profiles.fleet
  const install = prompt?.kind === 'install'

  const dialog = (
    <>
      {prompt ? (
        <ConfirmDialog
          confirmLabel={install ? fleet.installDeviceConfirm : fleet.switchDeviceConfirm}
          description={install ? fleet.installDeviceDesc : fleet.switchDeviceDesc}
          dismissOnConfirm
          onClose={() => settle(false)}
          onConfirm={() => settle(true)}
          open
          secondaryAction={
            install
              ? {
                  label: fleet.connectExistingInstead,
                  onClick: () => {
                    settle(false)
                    setConnectOpen(true)
                  }
                }
              : undefined
          }
          title={install ? fleet.installDeviceTitle : fleet.switchDeviceTitle}
        />
      ) : null}
      {connectOpen ? <FirstRunRemoteSetup onBack={() => setConnectOpen(false)} /> : null}
    </>
  )

  return { dialog, request }
}
