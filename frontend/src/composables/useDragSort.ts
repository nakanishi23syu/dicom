// ======================================================
// composables/useDragSort.ts — HTML標準のドラッグ&ドロップで並べ替える共通ロジック
// ======================================================
// 検査一覧・シリーズ一覧・SOP（画像）一覧の3箇所でNotion風のドラッグ&ドロップ並べ替えが
// 必要になるが、「配列の要素をドラッグで入れ替える」というロジック自体はどの一覧でも同じ。
// ライブラリ（vuedraggable等）を使わず、ブラウザ標準の draggable 属性 + dragstart/dragover/drop
// イベントだけで実装し、この関数1つを3箇所から呼び出して共通化する。
//
// 【使う側の書き方（例: StudyTable.vue）】
//   const { draggingIndex, dragHandleProps, dropTargetProps } = useDragSort(toRef(props, 'studies'))
//
//   <tr v-for="(study, index) in orderedItems" :key="study.studyInstanceUID"
//       v-bind="dropTargetProps(index)">
//     <td class="drag-col">
//       <span class="drag-handle" v-bind="dragHandleProps(index)">⠿</span>
//     </td>
//   </tr>
//
// 【ドラッグの起点をハンドルだけに限定する理由】
// 以前は draggable 属性を <tr> 自体に付けていたため、行内のどこ（セルの編集用input等）を
// つまんでもドラッグが始まってしまっていた。Notion等の実製品と同じく「⠿ハンドルをつまんだ
// ときだけドラッグ操作のマウス判定が有効になる」ようにするため、draggable属性・dragstart・
// dragendはハンドル要素にだけ渡す（dragHandleProps）。一方dragover/drop（＝どこにドロップ
// されたか）は行全体で受け取りたいため、そちらは行要素に渡す（dropTargetProps）。
//
// 【HTML標準のドラッグ&ドロップの基本】
// - draggable="true" を付けた要素だけがドラッグ操作の対象になる
// - dragstart : ドラッグを開始した要素で発火。「どれを掴んだか」を覚えておく
// - dragover  : ドラッグ中の要素が他の要素の上を通過するたびに発火。
//               既定動作（ドロップ禁止）のままだと drop が発火しないため、必ず preventDefault() する
// - drop      : 掴んでいた要素を離した場所で発火。ここで配列の並び替えを実際に行う
// - dragend   : ドラッグ操作の終了（ドロップの有無に関わらず）で発火。後始末用

import { ref, type Ref } from 'vue'

export interface DragHandleProps {
  draggable: true
  ondragstart: (event: DragEvent) => void
  ondragend: (event: DragEvent) => void
}

export interface DropTargetProps {
  ondragover: (event: DragEvent) => void
  ondrop: (event: DragEvent) => void
}

export function useDragSort<T>(items: Ref<T[]>) {
  // 現在ドラッグ中の要素のインデックス（ドラッグしていなければnull）。
  // 「今どの行がつままれているか」をハイライト表示する等にも使える。
  const draggingIndex = ref<number | null>(null)

  function onDragStart(index: number, event: DragEvent) {
    draggingIndex.value = index
    // ドラッグ中に画面に追従する「ドラッグイメージ」を、ハンドル要素（⠿の1文字）ではなく
    // 行全体（<tr>や<li>）にする。既定のままだとつまんだ要素自体がドラッグイメージになるため、
    // ハンドルだけをドラッグ起点にした結果イメージも「⠿」だけになってしまい、
    // 何を並べ替えているのか分かりづらくなるのを防ぐ。
    const row = (event.currentTarget as HTMLElement | null)?.closest<HTMLElement>('tr, li')
    if (row && event.dataTransfer) {
      event.dataTransfer.setDragImage(row, 0, 0)
    }
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

  // v-bind="dragHandleProps(index)" をハンドル要素（⠿）に付ける。
  // ドラッグの開始点をここだけに限定する。
  function dragHandleProps(index: number): DragHandleProps {
    return {
      draggable: true,
      ondragstart: (event) => onDragStart(index, event),
      ondragend: onDragEnd,
    }
  }

  // v-bind="dropTargetProps(index)" を行要素（<tr>等）に付ける。
  // ドロップ判定はハンドルの真上に限定せず、行のどこに落としても並べ替えが完了してほしいため、
  // dragHandlePropsとは別に行全体へ渡す。
  function dropTargetProps(index: number): DropTargetProps {
    return {
      ondragover: onDragOver,
      ondrop: () => onDrop(index),
    }
  }

  return { draggingIndex, dragHandleProps, dropTargetProps }
}
