// The desktop product identity — THE single source for every name-shaped
// value a variant owns. HERMES_DESKTOP_VARIANT=light builds "Hermes
// Light", the remote-only client; everything else is full "Hermes".
//
// Consumed at build time by electron-builder.config.cjs (packaging
// identity). electron/product-identity.ts is the typed runtime accessor.
// @ts-check
/// <reference types="node" />
'use strict'

// ── 黔算智能体品牌取值（本补丁新增；改品牌只改这一处）────────────────────
// 中文名给人看，ASCII 名给系统用（appId / exe / CLI / MSIX 身份）——
// 两套名字刻意分开，避免中文流进标识符。
//
// appId / msixAppId 用**显式值**而不是从 kebab/pascal 拼：
// 上游的拼接公式会得到 com.qiansuan.qiansuan 与 QianSuan.QianSuan，
// 既难看也不是我们定的身份；身份是契约，应当写死而不是"拼出来碰巧对"。
const BRAND = {
  display: '黔算智能体',
  kebab: 'qiansuan',
  pascal: 'QianSuan',
  appId: 'com.qiansuan.agent',
  msixAppId: 'QianSuan.Agent'
}

const variants = {
  '': { display: 'Hermes', kebab: 'hermes', pascal: 'Hermes' },
  light: {
    display: BRAND.display,
    kebab: BRAND.kebab,
    pascal: BRAND.pascal
  },
  bundled: {
    display: 'Hermes Agent',
    kebab: 'hermes-bundled',
    pascal: 'HermesBundled'
  }
}

const variant = process.env.HERMES_DESKTOP_VARIANT || ''
if (!['', 'light', 'bundled', 'store'].includes(variant)) {
  throw new Error(`Unknown HERMES_DESKTOP_VARIANT ${variant}. expected one of (empty), light, bundled, store`)
}

// 'store' is a Store-submission packaging identity layered on the bundled
// variant: same Electron app (displayName/appId/appNamePascal -> shared
// userData + single-instance lock with the out-of-store install), different
// MSIX package identity. The Store re-signs on submission.
const store = variant === 'store'
const light = variant === 'light'
const name = variants[store ? 'bundled' : (variant || '')]

// The electron-updater feed channel this build PUBLISHES to. A canary
// tag (vX.Y.Z+canary.YYYYMMDDTHHMMSSZ) writes canary.yml / light-canary.yml;
// stable tags write latest.yml / light.yml. Keyed on the payload tag so
// the one release workflow serves both channels — a canary build can
// never overwrite the stable feed file, and vice versa.
const canary = /\+canary\.20\d{6}T\d{6}Z$/.test(process.env.HERMES_PAYLOAD_TAG || '')

// Nonstable installs own their package family and local desktop state. The
// seven-character commit suffix also names the CLI and fits MSIX's name cap.
const buildCommitEnv = process.env.HERMES_BUILD_COMMIT || ''
const buildCommit = /^[a-f0-9]{40}$/.test(buildCommitEnv) ? buildCommitEnv.slice(0, 7) : null
const displayName = buildCommit
  ? `${name.display} ${buildCommit}`
  : canary
    ? `${name.display} Canary`
    : name.display

const kebabSuffix = buildCommit ? `-${buildCommit}` : canary ? '-canary' : ''
const pascalSuffix = buildCommit ? `Commit${buildCommit}` : canary ? 'Canary' : ''
const cliName = `${light ? BRAND.kebab : 'hermes'}${kebabSuffix}`
if (store && (canary || buildCommit)) {
  throw new Error('Store packaging is only eligible for stable releases')
}

/** @typedef {import("./product-identity.d.cts")} ProductIdentity */

/** @type {ProductIdentity} */
const identity = {
  store,
  light,
  displayName,
  appId: light ? `${BRAND.appId}${kebabSuffix}` : `com.nousresearch.${name.kebab}${kebabSuffix}`,
  // Store and commit builds do not publish a release feed.
  channel: store || buildCommit ? null : light ? (canary ? 'light-canary' : 'light') : (canary ? 'canary' : 'latest'),
  appNamePascal: `${name.pascal}${pascalSuffix}`,
  artifactNamePascal: name.pascal,
  // 中文产品名不能当 exe 名：快捷方式目标、脚本调用、杀软启发式、
  // 更新产物命名都假设 exe 是 ASCII。light（我们的瘦客户端）用 Pascal 品牌名。
  windowsExecutableName: kebabSuffix ? cliName : light ? name.pascal : displayName,
  cliName,
  msixAppIdWithOrg: light
    ? `${BRAND.msixAppId}${pascalSuffix}`
    : `NousResearch.${name.pascal}${pascalSuffix}`,
  ...(store
    ? {
        storeMsix: {
          // Partner Center publisher identity (the account's publisher ID) —
          // validated + re-signed by the Store on submission.
          identityName: 'NousResearchInc.HermesAgent',
          publisher: 'CN=EE6D86E4-606F-4E38-B940-AD7248C9D519',
          publisherDisplayName: 'Nous Research Inc.'
        }
      }
    : {})
}

const { channelBuildRequest } = require('../../scripts/msix-shared.mjs')
const request = channelBuildRequest()

// A channel created with --branding stable copies stable's identity, so it IS
// the regular app. It must also run like one: a token would make the runtime
// pin a userData dir and single-instance lock that installed stable doesn't use.
// The updater reads the token from the stamped request, not from this export.
const officialChannel =
  request !== null &&
  ['appId', 'displayName', 'appNamePascal', 'artifactNamePascal', 'windowsExecutableName', 'cliName', 'msixAppIdWithOrg'].every(
    key => request.identity[key] === identity[key]
  )

module.exports = !request
  ? identity
  : Object.freeze(
      officialChannel
        ? { ...identity, channel: request.channel }
        : { ...request.identity, store: false, light: false, channel: request.channel }
    )
