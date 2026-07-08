<!--
  ======================================================
  SeriesViewer.vue — DICOM画像ビューア（新版）
  ======================================================
  旧 features/viewer/components/ImageViewer.vue はモーダル表示・全画像グリッド表示だったが、
  こちらは専用ページ（別ルート）として、
  「左にサムネイル一覧・右に拡大表示＋ズーム＋前後移動」というビューア然としたUIにする。

  Props にシリーズ（DicomSeries）だけを受け取り、
  「どのシリーズを開くか」の解決（ルートパラメータからのstore検索等）は
  呼び出し側の View（views/SeriesViewerView.vue）の責務とする。

  このコンポーネント自身は「左右どちらのパネルを表示するか」の配置と、
  選択中インデックスというページ全体の状態管理だけを担当する。
  実際の見た目・描画ロジックは左右それぞれの子コンポーネントに任せる。
-->

<template>
  <div class="series-viewer">
    <SeriesThumbnailPanel
      :instances="series.instances"
      :selected-index="selectedIndex"
      @select="selectedIndex = $event"
    />

    <SeriesMainStage
      :instance="currentInstance"
      :index="selectedIndex"
      :total="series.instances.length"
      @prev="selectedIndex--"
      @next="selectedIndex++"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SeriesThumbnailPanel from './SeriesThumbnailPanel.vue'
import SeriesMainStage from './SeriesMainStage.vue'
import type { DicomSeries } from '@/types/dicom'

const props = defineProps<{
  series: DicomSeries
}>()

// ======================================================
// 選択中の画像インデックス（左右パネルが共有する状態なのでここで持つ）
// ======================================================
const selectedIndex = ref(0)

const currentInstance = computed(() => props.series.instances[selectedIndex.value] ?? null)

// series が別のシリーズに差し替わったとき（別のシリーズページへの遷移等）は
// 選択位置を初期状態に戻す。
watch(
  () => props.series.seriesInstanceUID,
  () => {
    selectedIndex.value = 0
  }
)
</script>

<style scoped>
.series-viewer {
  height: 100%;
  display: flex;
  overflow: hidden;
}
</style>
