// ======================================================
// useMouseTracker.ts — Composable（コンポーザブル）の例
// ======================================================
// 【Composable とは？】
// 「use」から始まる関数名で、リアクティブな状態＋それを操作するロジックを
// コンポーネントの外に切り出したもの。
// React の「カスタムフック（use から始まる関数）」に相当する。
//
// 普通の関数と違い、内部で ref() などのリアクティブAPIを使えるのが特徴。
// このファイル自体は Vue コンポーネントではなく、ただの .ts ファイルであることに注目。
// ロジックだけを再利用したいときに、コンポーネントを経由せずに直接 import できる。

import { ref, onMounted, onUnmounted, type Ref } from 'vue'

// ======================================================
// useMouseTracker — マウス座標を追跡するコンポーザブル
// ======================================================
// この関数を呼ぶたびに、x と y という「新しい ref のペア」が作られる。
// 同じコンポーザブルを2箇所で呼んでも、状態は共有されず独立している
// （= 実体は毎回別々に作られる「関数」なので当然の挙動）。
// 状態を複数箇所で共有したい場合は Pinia の Store を使う（単元6を参照）。
//
// 引数は「テンプレート参照そのもの（Ref）」を受け取る点に注意。
// テンプレート参照（<div ref="boxA">）は、マウントが完了するまで .value が null のまま。
// そのため setup() 実行時点の値（boxA.value）を渡すのではなく、
// Ref自体を渡して onMounted 実行時（＝マウント後）に .value を読む必要がある。
export function useMouseTracker(targetRef?: Ref<HTMLElement | null>) {
  const x = ref(0)
  const y = ref(0)

  function handleMove(event: MouseEvent) {
    const target = targetRef?.value
    // target が指定されていればその要素内の相対座標、なければ画面全体の座標
    if (target) {
      const rect = target.getBoundingClientRect()
      x.value = Math.round(event.clientX - rect.left)
      y.value = Math.round(event.clientY - rect.top)
    } else {
      x.value = event.clientX
      y.value = event.clientY
    }
  }

  // コンポーザブルの中でもライフサイクルフック（onMounted/onUnmounted）を使える。
  // これを呼び出した側のコンポーネントのライフサイクルにそのまま連動する。
  // onMounted が実行される時点では targetRef.value はすでにDOM要素で埋まっている。
  onMounted(() => {
    ;(targetRef?.value ?? window).addEventListener('mousemove', handleMove as EventListener)
  })

  onUnmounted(() => {
    ;(targetRef?.value ?? window).removeEventListener('mousemove', handleMove as EventListener)
  })

  // 呼び出し元が使うのは x, y のリアクティブな値だけ。
  // イベント登録・解除の面倒な処理はこの関数の中に隠蔽されている。
  return { x, y }
}
