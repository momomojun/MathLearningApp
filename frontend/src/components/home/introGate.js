// 开场动画放不放的闸。
//
// 这个标记刻意放在模块作用域，而不是 sessionStorage：
//   - 站内跳转（知识库 → 介绍）不会重置它，回首页不会再放一遍；
//   - 刷新或重新打开页面会把整个 bundle 重新求值，于是又能看到一次。
// 原来用的是 sessionStorage，那个刷新也不清，导致自己调试和演示时
// 每次都得手动加 ?intro=1 才看得到。
let played = false

/** 这次进首页要不要放开场 */
export function shouldPlayIntro(win = typeof window === 'undefined' ? null : window) {
  if (!win) return false

  // ?intro=1 强制放，不受上面那个标记影响，演示时可以连着看几遍
  const params = new URLSearchParams(win.location?.search || '')
  if (params.get('intro') === '1') return true

  if (win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return false

  return !played
}

export function markIntroPlayed() {
  played = true
}

/** 只给测试用：模块级状态在用例之间不会自己复位 */
export function resetIntroGate() {
  played = false
}
