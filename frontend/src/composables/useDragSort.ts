// ======================================================
// composables/useDragSort.ts — HTML標準のドラッグ&ドロップで並べ替える共通ロジック
// ======================================================
// 検査一覧・シリーズ一覧・SOP（画像）一覧の3箇所でNotion風のドラッグ&ドロップ並べ替えが
// 必要になるが、「配列の要素をドラッグで入れ替える」というロジック自体はどの一覧でも同じ。
// ライブラリ（vuedraggable等）を使わず、ブラウザ標準の draggable 属性 + dragstart/dragover/drop
// イベントだけで実装し、この関数1つを3箇所から呼び出して共通化する。
//
// 【使う側の書き方（例: StudyTable.vue）】
//   const { orderedItems, dragHandlers } = useDragSort(toRef(props, 'studies'))
//
//   <tr
//     v-for="(study, index) in orderedItems"
//     :key="study.studyInstanceUID"
//     draggable="true"
//     v-bind="dragHandlers(index)"
//   >
//
// 【HTML標準のドラッグ&ドロップの基本】
// - draggable="true" を付けた要素だけがドラッグ操作の対象になる
// - dragstart : ドラッグを開始した要素で発火。「どれを掴んだか」を覚えておく
// - dragover  : ドラッグ中の要素が他の要素の上を通過するたびに発火。
//               既定動作（ドロップ禁止）のままだと drop が発火しないため、必ず preventDefault() する
// - drop      : 掴んでいた要素を離した場所で発火。ここで配列の並び替えを実際に行う
// - dragend   : ドラッグ操作の終了（ドロップの有無に関わらず）で発火。後始末用

import { ref, type Ref } from 'vue'

export interface DragHandlers {
  draggable: true
  ondragstart: (event: DragEvent) => void
  ondragover: (event: DragEvent) => void
  ondrop: (event: DragEvent) => void
  ondragend: (event: DragEvent) => void
}

export function useDragSort<T>(items: Ref<T[]>) {
  // 現在ドラッグ中の要素のインデックス（ドラッグしていなければnull）。
  // 「今どの行がつままれているか」をハイライト表示する等にも使える。
  const draggingIndex = ref<number | null>(null)

  function onDragStart(index: number) {
    draggingIndex.value = index
  }

  function onDragOver(event: DragEvent) {
    // 既定動作のままだとドロップ不可の扱いになるため、これが無いとdropイベントが発火しない。
    event.preventDefault()
  }

  function onDrop(targetIndex: number) {
    const fromIndex = draggingIndex.value
    if (fromIndex === null || fromIndex === targetIndex) {
      draggingIndex.value = null
      return
    }

    // 配列を直接書き換えず、コピーしてから並べ替える（Vueのリアクティビティにも優しい）。
    const next = [...items.value]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(targetIndex, 0, moved)
    items.value = next

    draggingIndex.value = null
  }

  function onDragEnd() {
    draggingIndex.value = null
  }

  // v-bind="dragHandlers(index)" で <tr> 等に一括で属性・イベントを渡せるようにまとめたヘルパー。
  function dragHandlers(index: number): DragHandlers {
    return {
      draggable: true,
      ondragstart: () => onDragStart(index),
      ondragover: onDragOver,
      ondrop: () => onDrop(index),
      ondragend: onDragEnd,
    }
  }

  return { draggingIndex, dragHandlers }
}
