/**
 * User-facing copy for a failed first-run install (bootstrap).
 *
 * The install runner reports the manifest stage name that failed (see
 * electron/bootstrap-runner.ts and the stage manifests in scripts/install.ps1 /
 * scripts/install.sh) plus the raw error text. This module turns that into an
 * Error.message the install overlay can show verbatim: a plain lead sentence
 * naming the step in everyday words and what to do next, with the raw error on
 * a trailing "Details:" line.
 *
 * Pure module: no Electron imports, unit-tested next to it.
 */

/** Manifest stage name -> everyday label. Unknown names fall back to humanizeStageName. */
export const BOOTSTRAP_STAGE_LABELS: ReadonlyMap<string, string> = new Map([
  // scripts/install.ps1 manifest
  ['uv', '包安装器'],
  ['git', 'Git'],
  ['node', 'Node.js'],
  ['system-packages', '系统组件'],
  ['repository', '黔算智能体源码'],
  ['python', 'Python 运行时'],
  ['venv', 'Python 虚拟环境'],
  ['dependencies', 'Python 依赖包'],
  ['node-deps', '浏览器工具依赖'],
  ['desktop', '桌面应用构建'],
  ['platform-sdks', '平台工具'],
  ['configure', '配置'],
  ['config-templates', '配置模板'],
  ['path', '命令行程序'],
  ['gateway', '黔算服务'],
  ['bootstrap-marker', '收尾步骤'],
  // scripts/install.sh manifest (names that differ from the Windows one)
  ['prerequisites', '系统前置组件'],
  ['python-deps', 'Python 依赖包'],
  ['config', '配置'],
  ['setup', '配置'],
  ['complete', '收尾步骤']
])

/** `system-packages` -> `System packages`. */
export function humanizeStageName(stage: string): string {
  const words = stage.replace(/[-_]+/g, ' ').trim()

  return words ? words.charAt(0).toUpperCase() + words.slice(1) : ''
}

export function bootstrapStageLabel(stage: string | null | undefined): string | null {
  if (!stage) {
    return null
  }

  return BOOTSTRAP_STAGE_LABELS.get(stage) ?? humanizeStageName(stage)
}

const BOOTSTRAP_FAILURE_REMEDY =
  '常见原因：没有联网、杀毒软件拦截了安装器，或者有另一个黔算智能体正在运行。' +
  '请关闭其他黔算智能体窗口后选择「重新加载并重试」；如果再次失败，请打开日志并把日志发给支持人员。'

/**
 * Build the Error.message for a failed bootstrap. First line is the plain
 * explanation; the raw error follows on its own "详细信息：" line. The marker
 * is matched by desktop-install-overlay's splitter (which accepts both the
 * Chinese and the legacy English form).
 */
export function describeBootstrapFailure(failedStage: string | null | undefined, rawError: unknown): string {
  const label = bootstrapStageLabel(failedStage)

  const lead = label
    ? `安装黔算智能体在「${label}」这一步中断了。`
    : '安装黔算智能体还没完成就中断了。'

  const details = typeof rawError === 'string' && rawError.trim() ? rawError.trim() : '未知错误'

  return `${lead} ${BOOTSTRAP_FAILURE_REMEDY}\n详细信息：${details}`
}

/**
 * Error.message for an installed Hermes with a piece missing (source tree,
 * Python environment). The renderer's install overlay offers the Repair install
 * button ('hermes:bootstrap:repair'), so the copy points there. `whatIsMissing`
 * names the missing part and its path, e.g. "Python environment missing at /x".
 */
export function missingInstallPartMessage(whatIsMissing: string): string {
  return (
    '黔算智能体的安装缺少了一部分（可能被误删，或被杀毒软件隔离）。' +
    '请在下方选择「修复安装」找回——你的聊天记录和设置不会受影响。' +
    `详细信息：${whatIsMissing}`
  )
}
