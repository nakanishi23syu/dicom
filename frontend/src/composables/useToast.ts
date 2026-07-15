// ======================================================
// composables/useToast.ts — 汎用トースト通知（成功・エラー・情報表示の共通化）
// ======================================================
// これまで各コンポーネントが個別に alert() を呼んでエラーを伝えていたが、
// alert() は画面をブロックする・見た目を統一できない等の問題があるため、
// 右下に積み上げ表示される非ブロッキングなトースト通知に置き換える。
//
// Pinia化するほどの複雑な状態ではないため、モジュールスコープの reactive な配列を
// 「唯一のインスタンス」として全コンポーネントで共有するシンプルな実装にしている
// （Vueの Composable は関数を毎回呼び直しても同じ ref を返せば実質シングルトンにできる）。
//
// 【使い方】
//   import { useToast } from '@/composables/useToast'
//   const toast = useToast()
//   toast.success('保存しました')
//   toast.error(e instanceof Error ? e.message : '保存に失敗しました')

import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

export interface Toast {
  id: number
  type: ToastType
  message: string
  // loading系トーストは処理が終わるまで自動で消えてほしくないため、
  // 種類ごとに既定の表示時間を分ける（0=自動では消さない）。
  duration: number
}

// モジュールスコープに置くことで、どのコンポーネントから useToast() を呼んでも
// 同じ配列を共有する（＝どこで表示してもToastContainer.vue 1箇所に反映される）。
const toasts = ref<Toast[]>([])
let nextId = 1

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 3000,
  loading: 0,
}

function dismiss(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function push(type: ToastType, message: string, duration?: number): number {
  const id = nextId++
  const resolvedDuration = duration ?? DEFAULT_DURATION[type]
  toasts.value.push({ id, type, message, duration: resolvedDuration })
  if (resolvedDuration > 0) {
    setTimeout(() => dismiss(id), resolvedDuration)
  }
  return id
}

// loading系トーストは「終わったら成功/失敗の見た目に更新する」使い方をしたいことが多いため、
// 表示中のトースト自体を書き換えられる update() を用意する。
function update(id: number, type: ToastType, message: string, duration?: number) {
  const toast = toasts.value.find((t) => t.id === id)
  if (!toast) return
  toast.type = type
  toast.message = message
  const resolvedDuration = duration ?? DEFAULT_DURATION[type]
  toast.duration = resolvedDuration
  if (resolvedDuration > 0) {
    setTimeout(() => dismiss(id), resolvedDuration)
  }
}

export function useToast() {
  return {
    toasts,
    dismiss,
    success: (message: string, duration?: number) => push('success', message, duration),
    error: (message: string, duration?: number) => push('error', message, duration),
    info: (message: string, duration?: number) => push('info', message, duration),
    // 戻り値のidをdismiss()やupdate()に渡すことで、後から消す・内容を差し替えることができる。
    loading: (message: string) => push('loading', message, 0),
    update,
  }
}
