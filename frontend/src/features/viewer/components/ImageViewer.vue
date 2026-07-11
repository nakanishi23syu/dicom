<!--
  ======================================================
  ImageViewer.vue — DICOM 画像ビューアコンポーネント
  ======================================================
  SeriesModal でシリーズがダブルクリックされたとき App.vue から表示される。
  シリーズに含まれる全インスタンス（画像）を <canvas> にレンダリングして表示する。
-->

<template>
  <!--
    Teleport で body 直下に配置（SeriesModal と同じ理由: z-index の干渉を避けるため）
    z-index: 200 を設定しており、SeriesModal（z-index:100）より前面に表示される。
  -->
  <Teleport to="body">
    <div class="viewer-overlay" @click.self="$emit('close')">
      <div class="viewer">
        <!-- ── ビューアヘッダー ─────────────────────────── -->
        <div class="viewer-header">
          <div>
            <h2>画像ビューア</h2>
            <!--
              series.seriesDescription が空の場合は "Series {番号}" を表示する。
              || 演算子: 左辺が falsy（空文字・null・undefined）なら右辺を返す。
            -->
            <p class="subtitle">
              {{ series.seriesDescription || 'Series ' + series.seriesNumber }} —
              {{ series.numberOfInstances }} 枚
            </p>
          </div>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <!-- ── 画像グリッド ─────────────────────────────── -->
        <div class="image-grid">
          <!--
            series.instances 配列をループして各画像を表示する。
            (instance, idx) の idx はループのインデックス（0, 1, 2...）。
            instance.sopInstanceUID がないケースに備えて idx を :key のフォールバックにする。
          -->
          <div
            v-for="(instance, idx) in series.instances"
            :key="instance.sopInstanceUID || idx"
            class="image-cell"
          >
            <div class="canvas-wrap">
              <!--
                【:ref に関数を渡す】 Vue 3 の高度な使い方
                通常の ref="名前" は1つの要素への参照だが、
                v-for の中では複数の要素が生成されるため関数形式で受け取る。
                el: この <canvas> 要素の DOM 参照（null になることもある）
                この関数は要素がマウントされたとき（DOMに追加されたとき）に自動で呼ばれる。
                as HTMLCanvasElement | null : TypeScript の型アサーション。
                el は ComponentPublicInstance | Element | null のユニオン型なので
                HTMLCanvasElement として扱うためにキャストする。
              -->
              <canvas
                :ref="(el) => mountCanvas(el as HTMLCanvasElement | null, instance.filePath)"
              />
              <!--
                renderErrors[instance.filePath] が true のときエラー表示。
                reactive オブジェクトのプロパティ変更もリアクティブに追跡される。
              -->
              <div v-if="renderErrors[instance.filePath]" class="render-error">描画失敗</div>
            </div>
            <div class="image-meta">
              <!-- instanceNumber がなければループインデックス+1 を表示 -->
              <span>#{{ instance.instanceNumber || idx + 1 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// reactive: オブジェクト全体をリアクティブにする関数。
// ref が .value でアクセスするのに対し、reactive はプロパティに直接アクセスできる。
// オブジェクトのプロパティが変更されると自動で再描画が走る。
import { reactive } from 'vue'

// サービス層の関数を使う（dicom.ts を直接触らない）。
// 描画ロジックを service に集約することで、ライブラリ変更時の影響をここに持ち込まない。
import { renderDicomToCanvas } from '@/services/dicomService'

import type { DicomSeries } from '@/types/dicom'

// Props: 親（App.vue）から表示するシリーズデータを受け取る
defineProps<{
  series: DicomSeries
}>()

// Emits: ✕ボタンやオーバーレイクリックで閉じるイベント
defineEmits<{
  close: []
}>()

// ======================================================
// renderErrors — 描画失敗した画像を管理するリアクティブオブジェクト
// ======================================================
// Record<string, boolean> は { [キー: string]: boolean } の省略記法。
// キーに filePath を使い、描画失敗なら true をセットする。
// reactive() でラップしているので、プロパティを追加・変更すると
// テンプレートが自動で再描画される。
const renderErrors = reactive<Record<string, boolean>>({})

// ======================================================
// mountCanvas — <canvas> 要素がマウントされたときに DICOM 画像を描画する
// ======================================================
// :ref に渡す関数として使われる。
// canvas: マウントされた <canvas> 要素（アンマウント時は null）
// filePath: 描画する DICOM ファイルのパス
async function mountCanvas(canvas: HTMLCanvasElement | null, filePath: string) {
  // アンマウント時（コンポーネントが消えるとき）に null が渡るので早期リターン
  if (!canvas) return

  try {
    // サービス層の関数に filePath と canvas を渡すだけ。
    // fetch・parse・render の詳細は dicomService.ts が担う。
    await renderDicomToCanvas(filePath, canvas)
  } catch {
    // fetch 失敗・パース失敗・描画エラーをまとめてキャッチしてエラー表示
    renderErrors[filePath] = true
  }
}
</script>

<style scoped>
/* 画面全体を覆うオーバーレイ（SeriesModal より高い z-index: 200）*/
.viewer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85); /* より暗くして画像に集中させる */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.viewer {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  width: 90vw; /* 画面幅の90% */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.viewer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0; /* ヘッダーはスクロールしても縮まない */
}

.viewer-header h2 {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text-heading);
}

.subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
  transition: color 0.15s;
}

.close-btn:hover {
  color: var(--color-text-heading);
}

/* CSS Grid で画像を均等に並べるグリッドレイアウト */
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  overflow-y: auto; /* 画像が多い場合は縦スクロール */
}

.image-cell {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

/* canvas を中央配置するラッパー */
.canvas-wrap {
  position: relative; /* .render-error の absolute 配置の基準 */
  background: var(--color-canvas-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px; /* 読み込み中も最低限の高さを確保 */
}

.canvas-wrap canvas {
  max-width: 100%;
  max-height: 300px;
  display: block; /* デフォルトの inline による隙間を消す */
}

/* 描画失敗時のエラーラベル（canvas-wrap の中央に absolute で配置）*/
.render-error {
  position: absolute;
  color: var(--color-danger);
  font-size: 0.78rem;
}

.image-meta {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
