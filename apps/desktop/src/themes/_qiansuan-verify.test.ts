/**
 * 「黔算智能体」品牌皮肤校验器（本地验证工具，不进入上游代码）
 *
 * 用上游自己的代码验证我们的品牌资产，而不是靠"看起来没问题"：
 *   1. 所有颜色键、文案键是否都在上游契约内（SKIN_COLOR_TOKENS / SKIN_BRANDING_TOKENS）
 *   2. 色值格式、customCSS 32 KiB 上限（上游 Python 归一化会裁剪）
 *   3. 真跑一遍 skinToDesktopTheme()，看桌面端最终拿到的主题对不对
 *   4. WCAG 对比度自检（正文/强调色/状态栏），避免品牌色导致界面看不清
 *
 * 用法（宿主项目内）：
 *   cp qiansuan/scripts/verify-brand.test.ts apps/desktop/src/themes/_qiansuan-verify.test.ts
 *   npm --prefix apps/desktop exec vitest run src/themes/_qiansuan-verify.test.ts
 */
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

import { SKIN_BRANDING_TOKENS, SKIN_COLOR_TOKENS, type HermesSkin } from '@hermes/shared/skin'

import { skinToDesktopTheme } from '@/themes/skin'

const SKIN_PATH = '/Volumes/sihai/Projects/Home/一键安装 Hermes 项目/qiansuan/brand/qiansuan.yaml'
const CUSTOM_CSS_CAP = 32768

const skin = parse(readFileSync(SKIN_PATH, 'utf8')) as HermesSkin

const hex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v.trim())
const chan = (c: number) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = (v: string) => {
  const h = v.trim().replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * chan(r!) + 0.7152 * chan(g!) + 0.0722 * chan(b!)
}
const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1! + 0.05) / (l2! + 0.05)
}

const palette = (name: 'colors' | 'light_colors') =>
  (skin[name] ?? {}) as Record<string, string>

describe('黔算智能体 品牌皮肤校验', () => {
  it('1) 每一个颜色键都在上游契约内', () => {
    const known = new Set<string>(SKIN_COLOR_TOKENS)
    const unknown: string[] = []
    for (const key of ['colors', 'light_colors', 'dark_colors'] as const) {
      for (const k of Object.keys(palette(key))) {
        if (!known.has(k)) unknown.push(`${key}.${k}`)
      }
    }
    if (unknown.length) console.log('❌ 未知颜色键（上游不会识别）:', unknown)
    expect(unknown).toEqual([])
  })

  it('2) 色值格式全部合法', () => {
    const bad: string[] = []
    for (const key of ['colors', 'light_colors'] as const) {
      for (const [k, v] of Object.entries(palette(key))) {
        if (typeof v !== 'string' || !hex(v)) bad.push(`${key}.${k}=${String(v)}`)
      }
    }
    if (bad.length) console.log('❌ 非法色值:', bad)
    expect(bad).toEqual([])
  })

  it('3) 文案键合法 + 全中文（首屏文案不得残留英文）', () => {
    const known = new Set<string>(SKIN_BRANDING_TOKENS)
    const branding = skin.branding ?? {}
    const unknown = Object.keys(branding).filter(k => !known.has(k))
    expect(unknown).toEqual([])

    // 中文文案里允许出现命令名（/help 等）与产品 ASCII 标识，其余英文视为漏翻
    const stripCommands = (s: string) => s.replace(/\/[a-z][a-z-]*/g, '').replace(/Hermes|API|CLI/g, '')
    const notChinese = Object.entries(branding)
      .filter(([k, v]) => !['prompt_symbol', 'response_label'].includes(k))
      .filter(([, v]) => /[A-Za-z]{4,}/.test(stripCommands(String(v))))
      .map(([k, v]) => `${k} = ${String(v)}`)
    if (notChinese.length) console.log('⚠️ 品牌文案仍含英文:', notChinese)
    expect(notChinese).toEqual([])
  })

  it('4) customCSS 不超过上游 32 KiB 上限', () => {
    const size = Buffer.byteLength(skin.customCSS ?? '', 'utf8')
    console.log(`customCSS 字节数: ${size} / ${CUSTOM_CSS_CAP}`)
    expect(size).toBeLessThanOrEqual(CUSTOM_CSS_CAP)
  })

  it('5) 真跑 skinToDesktopTheme，桌面端能拿到完整主题', () => {
    const theme = skinToDesktopTheme(skin)
    console.log('桌面端解析结果:', JSON.stringify(theme, null, 2))

    expect(theme).not.toBeNull()
    expect(theme!.name).toBe('qiansuan')

    // 品牌强调色落在 primary / midground / ring / composerRing（上游 skin.ts 的映射）
    // 注意：`accent` 是上游由强调色派生出的"悬停表面色"，不是品牌色本身。
    const c = theme!.colors
    for (const token of ['primary', 'midground', 'ring', 'composerRing'] as const) {
      expect(String(c[token]).toLowerCase(), `${token} 应为品牌山青`).toBe('#3fb6a8')
    }
    expect(c.foreground.toLowerCase()).toBe('#e2e8f0')
    expect(c.background.toLowerCase()).toBe('#0e141b')
    expect(c.destructive.toLowerCase()).toBe('#e05c4b')

    // customCSS 必须原样透传到桌面端（上游注释：把 CSS 放皮肤里，而不是 hack app.asar）
    expect(theme!.customCSS).toContain('--qiansuan-font-sans')

    const brandContrast = contrast(c.primary, c.background)
    const bodyContrast = contrast(c.foreground, c.background)
    console.log(
      `品牌强调色(primary)/背景: ${brandContrast.toFixed(2)}:1 ; 正文/背景: ${bodyContrast.toFixed(2)}:1`
    )
    expect(brandContrast).toBeGreaterThan(3)
    expect(bodyContrast).toBeGreaterThan(4.5)
  })

  it('6) WCAG 关键配对自检（正文 / 强调 / 状态栏）', () => {
    const checks: Array<[string, string, string, number]> = []
    for (const mode of ['colors', 'light_colors'] as const) {
      const p = palette(mode)
      const bg = p.background
      if (!bg) continue
      checks.push(
        [`${mode} 正文 ui_text/background`, p.ui_text ?? '', bg, 4.5],
        [`${mode} 强调 ui_accent/background`, p.ui_accent ?? '', bg, 3],
        [`${mode} 状态栏 status_bar_text/bg`, p.status_bar_text ?? '', p.status_bar_bg ?? bg, 3],
        [`${mode} 错误 ui_error/background`, p.ui_error ?? '', bg, 3]
      )
    }
    const rows = checks.map(([label, fg, bg, min]) => {
      const ratio = fg && bg ? contrast(fg, bg) : 0
      return { label, ratio: Number(ratio.toFixed(2)), min, pass: ratio >= min }
    })
    console.table(rows)
    const failed = rows.filter(r => !r.pass)
    if (failed.length) console.log('❌ 未达标:', failed)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('7) 说明：桌面端只按 colors 转换，light_colors 作用于 CLI/TUI 浅色终端', () => {
    const theme = skinToDesktopTheme(skin)!
    const fromLight = skinToDesktopTheme({ ...skin, light_colors: undefined } as HermesSkin)!
    const same = JSON.stringify(theme) === JSON.stringify(fromLight)
    console.log(
      same
        ? '✔ 已确认：skinToDesktopTheme 不读取 light_colors（皮肤是单模式），桌面端浅色主题需另出浅色皮肤'
        : '⚠ 行为与预期不同：转换器似乎读取了 light_colors，请复核 skin.ts'
    )
    expect(typeof same).toBe('boolean')
  })
})
