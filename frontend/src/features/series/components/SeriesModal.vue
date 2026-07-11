<!--
  ======================================================
  SeriesModal.vue — シリーズ情報ポップアップコンポーネント
  ======================================================
  StudyTable で検査行がクリックされたとき App.vue から表示される。
  選択された検査（DicomStudy）に含まれるシリーズ一覧をカード形式で表示。
  シリーズをダブルクリックすると 'open-images' イベントを親に通知する。
-->

<template>
  <!--
    【Teleport】 Vue 3 の組み込みコンポーネント
    to="body" を指定すると、このコンポーネントの DOM は
    実際には <body> の直下に配置される。
    通常、モーダルやポップアップは親要素の overflow や z-index の影響を受けることがある。
    Teleport を使うと、コンポーネントの論理的な位置（App.vue の子）と
    実際の DOM の位置（body の直下）を分離できる。
  -->
  <Teleport to="body">
    <!--
      オーバーレイ（背景の半透明黒い領域）
      【@click.self】 イベント修飾子 ".self"
      クリックイベントが「この要素自身」で発生したときだけハンドラを実行する。
      子要素（モーダル本体）をクリックしても閉じないようにするために使う。
      .self がないと、モーダル内をクリックしても閉じてしまう。
    -->
    <div class="overlay" @click.self="$emit('close')">
      <div class="modal">
        <!-- ── モーダルヘッダー ─────────────────────────── -->
        <div class="modal-header">
          <div>
            <h2>シリーズ情報</h2>
            <!--
              Props で受け取った study のプロパティを直接参照できる。
              formatDate() でDICOMの日付形式（YYYYMMDD）を整形している。
            -->
            <p class="subtitle">{{ study.patientName }} / {{ formatDate(study.studyDate) }}</p>
          </div>
          <!-- ✕ ボタン: クリックで 'close' イベントを emit する -->
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <!-- ── シリーズカード一覧 ──────────────────────── -->
        <div class="series-list">
          <!--
            【v-for でオブジェクト配列をループ】
            study.series は DicomSeries[] 型の配列。
            :key には一意な seriesInstanceUID を使う。

            【@dblclick】 ダブルクリックイベント
            @click が1回クリック、@dblclick がダブルクリック。
            イベント名は DOM の標準イベント名（dblclick）をそのまま使う。
          -->
          <div
            v-for="series in study.series"
            :key="series.seriesInstanceUID"
            class="series-card"
            @dblclick="$emit('open-images', series)"
          >
            <div class="series-header">
              <span class="series-num">Series {{ series.seriesNumber || '—' }}</span>
              <span class="badge">{{ series.modality || '—' }}</span>
            </div>
            <div class="series-desc">{{ series.seriesDescription || '説明なし' }}</div>
            <div class="series-meta">
              <span>{{ series.numberOfInstances }} インスタンス</span>
            </div>
            <div class="series-hint">ダブルクリックで画像を表示</div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// DicomStudy と DicomSeries の両方を使うためインポート
import type { DicomStudy, DicomSeries } from '@/types/dicom'

// ======================================================
// defineProps — 親から受け取るプロパティの定義
// ======================================================
// このコンポーネントは選択された検査（study）だけを受け取る。
// study.series を v-for でループしてシリーズ一覧を表示する。
defineProps<{
  study: DicomStudy
}>()

// ======================================================
// defineEmits — 発火するイベントの定義
// ======================================================
// close       : オーバーレイや✕ボタンのクリックでモーダルを閉じる
// open-images : シリーズのダブルクリックで画像ビューアを開く
//               引数として選択したシリーズオブジェクトを親に渡す
defineEmits<{
  close: []
  'open-images': [series: DicomSeries]
}>()

// 日付フォーマット関数（StudyTable.vue と同じロジック）
// YYYYMMDD → YYYY/MM/DD
function formatDate(raw: string): string {
  if (!raw || raw.length !== 8) return raw || '—'
  return `${raw.slice(0, 4)}/${raw.slice(4, 6)}/${raw.slice(6, 8)}`
}
</script>

<style scoped>
/* 画面全体を覆う半透明の黒いオーバーレイ */
.overlay {
  position: fixed; /* スクロールしても画面に固定 */
  inset: 0; /* top:0 right:0 bottom:0 left:0 の一括指定 */
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100; /* 他の要素より前面に表示 */
}

.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  width: 700px;
  max-width: 95vw; /* 画面幅が狭い場合は画面幅に合わせる */
  max-height: 80vh; /* 画面高さの80%を超えない */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--color-text-heading);
}

.subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
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

.series-list {
  overflow-y: auto; /* シリーズが多い場合に縦スクロール可能 */
  padding: 1rem 1.5rem;
  /* CSS Grid: minmax(190px, 1fr) で最小190px・最大均等に並ぶ */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 0.75rem;
}

.series-card {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-accent-bg);
  border-radius: 6px;
  padding: 0.875rem 1rem;
  cursor: pointer;
  /* transition に複数プロパティを指定する場合は改行して列挙 */
  transition:
    border-color 0.15s,
    background 0.15s;
}

.series-card:hover {
  border-color: var(--color-thumbnail-selected-border);
  background: var(--color-thumbnail-selected-bg);
}

.series-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.series-num {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-accent);
}

.badge {
  display: inline-block;
  background: var(--color-border-strong);
  color: var(--color-accent);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.7rem;
  font-weight: 600;
}

.series-desc {
  font-size: 0.875rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  word-break: break-all; /* 長いUID等が溢れないように折り返す */
}

.series-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.35rem;
}

.series-hint {
  font-size: 0.7rem;
  color: var(--color-text-faint);
  font-style: italic;
}
</style>
