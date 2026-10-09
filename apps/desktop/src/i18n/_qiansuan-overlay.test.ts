/*
 * 黔算智能体 · 中文覆写层的防呆回归测试（P-04）
 *
 * 为什么需要它：覆写层最大的风险**不是"没翻"**，而是**静默把上游已有的中文换回英文**。
 * `defineLocale(overrides)` 的语义是 `mergeTranslations(en, overrides)`——与**英文**深合并。
 * 如果在 `zh.ts` 顶层铺开我们的片段，会把上游整个子树的已翻中文**替换掉且不报错**。
 * 所以本测试的重点是：**证明我们只填空缺，没有覆盖任何已翻好的中文**。
 *
 * 第二个风险是**陈旧**：上游以后把这条补上了 / 改了英文原文，我们的覆写就过期了。
 * 下面的"只允许覆盖"回落到英文的键"这条断言会在上游补翻时自动报红，提醒我们删掉覆写。
 */
import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { englishBaseline } from './_qiansuan-english-baseline'
import { en } from './en'
import type { Translations } from './types'
import { zh } from './zh'
import { zhQiansuan } from './zh_qiansuan'

type Leaf = unknown

/** 把嵌套的文案目录压平成 `dotted.key -> 叶子`。
 *  数组与函数都算叶子——`mergeTranslations` 对它们是**整块替换**，不递归。 */
function flatten(value: unknown, prefix = '', out = new Map<string, Leaf>()): Map<string, Leaf> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix === '' ? key : `${prefix}.${key}`, out)
    }

    return out
  }

  out.set(prefix, value)

  return out
}

const enLeaves = flatten(en)
const zhLeaves = flatten(zh)
const mergedLeaves = flatten(zhQiansuan)

/** 我们真正改动（新增或改写）的键。 */
const overriddenKeys = [...mergedLeaves.keys()].filter(
  key => mergedLeaves.get(key) !== zhLeaves.get(key)
)

/** 上游已经翻好的键（zh 与 en 不同 = 有人翻过）。 */
const translatedByUpstream = [...zhLeaves.keys()].filter(key => {
  const zhValue = zhLeaves.get(key)
  const enValue = enLeaves.get(key)

  // 函数型条目在 zh 里可能本来就是同一个引用（没翻），那不算"已翻"
  return zhValue !== enValue && typeof zhValue === 'string' && zhValue.trim() !== ''
})

/**
 * 产品文案改写键：上游**已有中文**，但为去品牌/中转站产品语义**有意改写**
 * （不是补缺）。这是"只填空缺"不变量的唯一合法例外：
 * - 每个键仍受其余全部不变量约束（存在性/非空/非英文/无品牌/形状/英文指纹）；
 * - 改这里任何一条文案，都必须同步 `_qiansuan-english-baseline.ts` 的指纹。
 */
const COPY_REFINEMENT_KEYS = new Set<string>([
  'onboarding.apiKeyOptions.local.short',
  'onboarding.apiKeyOptions.local.description',
  'onboarding.localModelNamePlaceholder'
])

/** 允许保持纯英文的值（技术标识，不是说给用户听的话）。 */
const TECHNICAL_ALLOWLIST = new Set<string>([
  'Ctrl+K',
  'Ctrl+Shift+K',
  '⌘K',
  'GitHub',
  'VS Code',
  'macOS',
  'Windows',
  'Linux'
])

/**
 * 技术性取值（命令示例、路径、URL、包名）保持英文是**正确**的。
 * 实测踩过：`npx -y @modelcontextprotocol/server-filesystem /path/to/dir`
 * 是一条命令示例，我的启发式曾把它误判成"没翻"。
 */
const TECHNICAL_SHAPE =
  /(^|\s)(npx|npm|pnpm|yarn|pip|uv|git|docker|curl|ssh|http:\/\/|https:\/\/|@[a-z0-9-]+\/|~\/|\/path\/|\.{1,2}\/)/i

const isMostlyEnglish = (value: string): boolean => {
  const trimmed = value.trim()

  if (TECHNICAL_ALLOWLIST.has(trimmed)) {return false}

  if (TECHNICAL_SHAPE.test(trimmed)) {return false}

  if (/[\u4e00-\u9fff]/.test(trimmed)) {return false}
  // 三个及以上拉丁词、且一个汉字都没有 → 基本可以断定没翻
  const words = trimmed.split(/\s+/).filter(w => /[A-Za-z]{2,}/.test(w))

  return words.length >= 3
}

describe('黔算智能体 中文覆写层', () => {
  it('覆写层确实填了量级正确的缺口（防止整体被误删）', () => {
    // 实测缺口 286 条；留出余量，但绝不允许"一片空白也算通过"
    expect(overriddenKeys.length).toBeGreaterThanOrEqual(250)
  })

  it('**只填空缺**：每个被覆写的键，上游原本都回落到英文（P-03 陷阱的正向证明）', () => {
    const overwroteRealChinese = overriddenKeys.filter(key => {
      // 产品文案改写键是登记在册的例外（见 COPY_REFINEMENT_KEYS 注释）
      if (COPY_REFINEMENT_KEYS.has(key)) {return false}
      const zhValue = zhLeaves.get(key)
      const enValue = enLeaves.get(key)

      // 上游已经翻过（zh 与 en 不同）却仍被我们覆盖 → 就是踩了陷阱
      return zhValue !== enValue && zhValue !== undefined
    })

    expect(overwroteRealChinese).toEqual([])
  })

  it('**没碰过的键必须还是中文**：抽样证明深合并没有波及别处', () => {
    // 取上游已翻好的键，检查合并后逐一不变（文案改写键除外——它们本就是要改的）
    const disturbed = translatedByUpstream.filter(
      key => !COPY_REFINEMENT_KEYS.has(key) && mergedLeaves.get(key) !== zhLeaves.get(key)
    )

    expect(disturbed).toEqual([])
    // 且样本量要够大，避免"没有可检查的键"这种假通过
    expect(translatedByUpstream.length).toBeGreaterThan(3000)
  })

  it('每个覆写的键都真实存在于英文目录里（类型之外的运行时兜底）', () => {
    const unknownKeys = overriddenKeys.filter(key => !enLeaves.has(key))

    expect(unknownKeys).toEqual([])
  })

  it('没有空译文', () => {
    const empty = overriddenKeys.filter(key => {
      const value = mergedLeaves.get(key)

      return typeof value === 'string' && value.trim() === ''
    })

    expect(empty).toEqual([])
  })

  it('没有把英文原样搬过来充数', () => {
    const stillEnglish = overriddenKeys.filter(key => {
      const value = mergedLeaves.get(key)

      return typeof value === 'string' && isMostlyEnglish(value)
    })

    expect(stillEnglish).toEqual([])
  })

  it('用户可见文案里不出现上游品牌（Hermes / Nous），技术标识除外', () => {
    // 允许的技术标识：`~/.hermes` 这类路径、环境变量、CLI 名、包名，以及**进程名**
    // （实测：`boot.updateHold.recoveryHint` 教用户在任务管理器里结束残留的 `git` / `hermes`
    //  进程——那是进程名，不是品牌，合理保留）。
    const allowed = /(~\/\.hermes|\.hermes|hermes\.|NOUS_INFERENCE|HERMES_[A-Z_]+|hermes-cli|qiansuan|结束残留的 git 或 hermes 进程|hermes 进程)/i

    const branded = overriddenKeys.filter(key => {
      const value = mergedLeaves.get(key)

      return typeof value === 'string' && /Hermes|Nous/i.test(value) && !allowed.test(value)
    })

    expect(branded).toEqual([])
  })

  it('键的形状没被改动（值仍是与上游同类的叶子）', () => {
    const kindOf = (value: Leaf): string => {
      if (typeof value === 'function') {return 'function'}

      if (Array.isArray(value)) {return 'array'}

      if (typeof value === 'string') {return 'string'}

      if (value === null) {return 'null'}

      if (typeof value === 'object') {return 'object'}

      return typeof value
    }

    const mismatched = overriddenKeys
      .filter(key => kindOf(mergedLeaves.get(key)) !== kindOf(enLeaves.get(key)))
      .map(key => `${key}: ${kindOf(enLeaves.get(key))} → ${kindOf(mergedLeaves.get(key))}`)

    expect(mismatched).toEqual([])
  })

  // ── 英文原文漂移 ──
  // 上面所有断言都只能证明"我们没覆盖别人的中文"。这一条解决另一半问题：
  // 上游以后**改了英文措辞**，我们当初的译文就可能已经不准了。
  // 指纹对不上 → 报红 → 强制人工复审，而不是让过期译文留在界面上。
  it('译文对应的英文原文没被上游改过（改了就必须复审译文）', () => {
    const drifted: string[] = []
    const missingBaseline: string[] = []

    for (const key of overriddenKeys) {
      const expected = englishBaseline[key]

      if (expected === undefined) {
        missingBaseline.push(key)

        continue
      }

      const current = enLeaves.get(key)

      if (typeof current !== 'string') {continue}
      const digest = createHash('sha256').update(current, 'utf8').digest('hex').slice(0, 16)

      if (digest !== expected) {drifted.push(key)}
    }

    // 指纹缺失说明基线没跟上覆写（构建流程被绕过）
    expect(missingBaseline).toEqual([])
    expect(drifted).toEqual([])
  })
})

export type { Translations }
