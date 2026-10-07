import { INSTALL_STAMP, installShape, type InstallStamp } from './install-stamp'

export function bootstrapSnapshot<State>(
  state: State,
  stamp: Readonly<InstallStamp> | null = INSTALL_STAMP
): State & { bundled: boolean; light: boolean } {
  // 黔算智能体：把 light 事实与 bundled 一起下发，渲染层据此隐藏本机安装入口。
  // 注意：不能用 installShape() 判 light——它只返回 'bundled' | 'checkout'，
  // light 被归入 checkout（上游测试抓住过这个错误假设）。
  return {
    ...state,
    bundled: installShape(stamp) === 'bundled',
    light: stamp?.payload === 'light'
  }
}
