import fs from 'node:fs'

import { describe, expect, it } from 'vitest'

import { TRANSLATIONS } from './catalog'
import type { BundledLocale } from './types'

type Leaf = { path: string; value: unknown }

function leaves(value: unknown, path = ''): Leaf[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      leaves(child, path ? `${path}.${key}` : key)
    )
  }

  return [{ path, value }]
}

const cat = (locale: BundledLocale) =>
  new Map(
    leaves(TRANSLATIONS[locale])
      .filter(leaf => !leaf.path.startsWith('intro.'))
      .map(leaf => [leaf.path, leaf.value])
  )

const hasHan = (s: string) => /[\u4e00-\u9fff]/.test(s)
/** English prose: at least two words, or a long single lowercase word. */
const looksEnglishProse = (s: string) => {
  if (hasHan(s)) return false
  if (!/[A-Za-z]/.test(s)) return false
  const words = s.trim().split(/\s+/).filter(w => /[A-Za-z]{2,}/.test(w))
  return words.length >= 2 || (words.length === 1 && /^[a-z]{8,}$/.test(words[0]!))
}
/** Short Latin tokens (API, OK, Hermes, model ids, URLs) — usually intentional. */
const looksLatinToken = (s: string) => !hasHan(s) && /[A-Za-z]/.test(s)

const group = (paths: string[]) => {
  const counts = new Map<string, number>()
  for (const p of paths) {
    const top = p.split('.')[0] ?? '(root)'
    counts.set(top, (counts.get(top) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

describe('zh localization audit', () => {
  it('classifies every leaf so the real translation gap is visible', () => {
    const en = cat('en')
    const zh = cat('zh')
    const hant = cat('zh-hant')

    const missing = [...en.keys()].filter(k => !zh.has(k))
    const extra = [...zh.keys()].filter(k => !en.has(k))

    const kinds = { text: 0, fn: 0, other: 0, emptyString: 0 }
    const prose: string[] = []
    const latinOnly: string[] = []
    const sameAsEnglish: string[] = []

    for (const [key, value] of zh.entries()) {
      if (typeof value === 'function') {
        kinds.fn += 1
        continue
      }
      if (typeof value !== 'string') {
        kinds.other += 1
        continue
      }
      if (value.trim() === '') {
        kinds.emptyString += 1
        continue
      }
      kinds.text += 1
      if (looksEnglishProse(value)) {
        prose.push(`${key} = ${value}`)
        const enValue = en.get(key)
        if (typeof enValue === 'string' && enValue.trim() === value.trim()) {
          sameAsEnglish.push(`${key} = ${value}`)
        }
      } else if (looksLatinToken(value)) {
        latinOnly.push(`${key} = ${value}`)
      }
    }

    const report = {
      counts: {
        enKeys: en.size,
        zhKeys: zh.size,
        zhHantKeys: hant.size,
        missingInZh: missing.length,
        extraInZh: extra.length,
        zhKinds: kinds,
        englishProseInZh: prose.length,
        identicalToEnglish: sameAsEnglish.length,
        latinTokenOnly: latinOnly.length,
        zhKeyCoveragePercent: Number((((en.size - missing.length) / en.size) * 100).toFixed(2))
      },
      proseByGroup: group(prose.map(l => l.split(' = ')[0]!)),
      missing,
      prose,
      identicalToEnglish: sameAsEnglish,
      latinTokenOnly: latinOnly,
      connectorsPageSample: prose.filter(l => l.startsWith('connectorsPage.')).slice(0, 40)
    }

    fs.writeFileSync('/tmp/zh-audit.json', JSON.stringify(report, null, 2))
    fs.writeFileSync(
      '/tmp/zh-audit-summary.txt',
      [
        `en keys                 : ${report.counts.enKeys}`,
        `zh keys                 : ${report.counts.zhKeys}`,
        `zh-hant keys            : ${report.counts.zhHantKeys}`,
        `missing in zh           : ${report.counts.missingInZh}  (key coverage ${report.counts.zhKeyCoveragePercent}%)`,
        `zh leaf kinds           : ${JSON.stringify(kinds)}`,
        `zh values in English    : ${report.counts.englishProseInZh}`,
        `  of which == English   : ${report.counts.identicalToEnglish}`,
        `zh latin-token-only     : ${report.counts.latinTokenOnly}`,
        '',
        'English-prose values by top-level group:',
        ...report.proseByGroup.map(([g, n]) => `  ${g}: ${n}`),
        '',
        'connectorsPage samples (first 12):',
        ...report.connectorsPageSample.slice(0, 12).map(l => `  ${l}`)
      ].join('\n')
    )

    expect(en.size).toBeGreaterThan(0)
  })
})
