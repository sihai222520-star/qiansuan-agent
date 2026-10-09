// Report a detached update's result once, where boot passes the update gate.

import path from 'node:path'

import type { Dialog, Shell } from 'electron'

import { readAndConsumeHandoffResult } from './handoff-result'

export interface HandoffReportHost {
  hermesHome: string
  /** Marker line 2 of the run this boot parked on (C2 started_at match), else null. */
  expectedStartedAt: number | null
  /** Stable run id of that marker (survives heartbeat refreshes), else null. */
  expectedRunId: string | null
  log: (line: string) => void
  dialog: Pick<Dialog, 'showMessageBox'>
  shell: Pick<Shell, 'showItemInFolder'>
  /** The menu's open-updates path (queued until the renderer is ready). */
  openUpdates: () => void
}

/** The run identity a live marker carried when the boot gate saw it. */
export interface ParkedRun {
  startedAt: number | null
  runId: string | null
}

/**
 * The run a boot wait parked on: the result reported when the wait ends is
 * that run's, never an older one's. The run id is stable across the scripts'
 * line-2 heartbeat, including when the wait first saw the marker mid-update;
 * line 2 is kept only for older result producers that write no run id.
 */
export function parkedRunReport() {
  let parked: ParkedRun = { startedAt: null, runId: null }

  return {
    park: (marker: ParkedRun) => {
      parked = marker
    },
    report: (host: Omit<HandoffReportHost, 'expectedStartedAt' | 'expectedRunId'>) =>
      reportHandoffResult({ ...host, expectedStartedAt: parked.startedAt, expectedRunId: parked.runId })
  }
}

/**
 * The detached hand-off script (scripts/desktop-update/windows.ps1) runs hidden;
 * its result file is the ONLY way the user learns a detached update
 * failed. Consume it exactly once, here, right where boot passes the
 * update gate — success gets a log line, failure gets a real dialog
 * (previously a failed detached update was indistinguishable from
 * "nothing happened").
 */
export function reportHandoffResult(host: HandoffReportHost): void {
  try {
    const result = readAndConsumeHandoffResult(host.hermesHome, {
      expectedStartedAt: host.expectedStartedAt,
      expectedRunId: host.expectedRunId,
      log: host.log
    })

    if (result && result.ok && result.warnings.length && !result.manual) {
      // Committed, but follow-up work failed (C2/C3): the user IS on the new
      // version, so this is a non-blocking notice, never "previous version".
      host.log(`[updates] detached update finished with warnings: ${result.warnings.join(' | ')}`)
      void host.dialog.showMessageBox({
        type: 'info',
        title: '黔算智能体更新',
        message: '黔算智能体已更新，但有几个收尾步骤需要再试一次',
        detail: `${result.warnings.join('\n')}\n\n黔算智能体会在下次启动或下次更新时自动重试。`
      })
    } else if (result && result.ok && result.manual) {
      // Update landed but the user must act (reopen/reinstall/sandbox). On
      // machines with no shim browser and no notifier this dialog is the
      // FIRST time the message is visible — it must not be a log line.
      host.log(`[updates] detached update finished with manual action (branch ${result.branch}): ${result.message}`)
      host.dialog.showMessageBox({
        type: 'warning',
        title: '黔算智能体更新',
        message: '更新已完成，还差最后一步',
        detail: result.message
      })
    } else if (result && result.ok) {
      host.log(`[updates] detached update finished OK (branch ${result.branch})`)
    } else if (result) {
      host.log(`[updates] detached update FAILED (exit ${result.exitCode}): ${result.message}`)
      const handoffLogPath = path.join(host.hermesHome, 'logs', 'desktop-update-handoff.log')

      // Async so boot is not blocked behind the dialog; the response handlers
      // reuse the menu's open-updates path (queued until the renderer is ready)
      // and the same reveal primitive as 'hermes:logs:reveal'.
      void host.dialog
        .showMessageBox({
          type: 'error',
          title: '黔算智能体更新',
          message: '黔算智能体没能完成更新',
          detail:
            '你现在仍是旧版本，可以继续使用。可以再试一次更新，或打开更新日志查看问题。\n\n' +
            `详细信息：${result.message}`,
          buttons: ['再试一次', '打开日志', '关闭'],
          defaultId: 0,
          cancelId: 2,
          noLink: true
        })
        .then(({ response }) => {
          if (response === 0) {
            host.openUpdates()
          } else if (response === 1) {
            host.shell.showItemInFolder(handoffLogPath)
          }
        })
    }
  } catch (err) {
    host.log(`[updates] could not read hand-off result: ${(err as Error).message}`)
  }
}
