<!--
  ======================================================
  SeriesMainStage.vue — 拡大表示（右側パネル）
  ======================================================
  現在選択中の1枚を拡大表示する。ズーム状態はこのコンポーネント内だけで
  完結する見た目の話なので、Propsで渡さずローカルで持つ。
  前後移動は自分ではインデックスを変えず、'prev'/'next' イベントで親に伝える。
-->

<template>
  <section class="main-panel">
    <div class="main-viewport">
      <!--
        ズームは canvas 自体を再描画するのではなく、
        CSS の transform: scale() で見た目の拡大率だけを変える。
        画像データ自体は等倍のまま扱えるので実装がシンプルになる。
      -->
      <div class="main-zoom-wrap" :style="{ transform: `scale(${zoom})` }">
        <canvas ref="mainCanvasEl" />
      </div>
      <div v-if="mainRenderError" class="main-error">描画に失敗しました</div>
    </div>

    <!-- ズーム操作 -->
    <div class="zoom-controls">
      <button type="button" :disabled="zoom <= MIN_ZOOM" @click="zoomOut">－</button>
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
      <button type="button" :disabled="zoom >= MAX_ZOOM" @click="zoomIn">＋</button>
      <button type="button" class="zoom-reset" @click="resetZoom">リセット</button>
    </div>

    <!-- 前後の画像切り替え（画面右下） -->
    <div class="nav-controls">
      <button type="button" class="nav-btn" :disabled="index === 0" @click="$emit('prev')">
        ◀
      </button>
      <span class="nav-count">{{ index + 1 }} / {{ total }}</span>
      <button type="button" class="nav-btn" :disabled="index === total - 1" @click="$emit('next')">
        ▶
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { renderDicomToCanvas } from '@/services/dicomService'
import type { DicomInstance } from '@/types/dicom'

const props = defineProps<{
  instance: DicomInstance | null
  index: number
  total: number
}>()

defineEmits<{
  prev: []
  next: []
}>()

// ======================================================
// メイン画像の描画
// ======================================================
const mainCanvasEl = ref<HTMLCanvasElement | null>(null)
const mainRenderError = ref(false)

async function renderMain() {
  const canvas = mainCanvasEl.value
  const instance = props.instance
  if (!canvas || !instance) return

  mainRenderError.value = false
  try {
    await renderDicomToCanvas(instance.filePath, canvas)
  } catch {
    mainRenderError.value = true
  }
}

// ======================================================
// ズーム操作
// ======================================================
const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25
const zoom = ref(1)

onMounted(renderMain)
// instance（表示対象）が変わるたびに同じ<canvas>要素へ再描画し、
// ズームも初期状態に戻す（前後移動・別シリーズへの遷移のいずれも含む）。
watch(
  () => props.instance,
  () => {
    zoom.value = 1
    renderMain()
  }
)

function zoomIn() {
  zoom.value = Math.min(MAX_ZOOM, Math.round((zoom.value + ZOOM_STEP) * 100) / 100)
}

function zoomOut() {
  zoom.value = Math.max(MIN_ZOOM, Math.round((zoom.value - ZOOM_STEP) * 100) / 100)
}

function resetZoom() {
  zoom.value = 1
}
</script>

<style scoped>
.main-panel {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-canvas-bg);
}

.main-viewport {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.main-zoom-wrap {
  transition: transform 0.1s ease-out;
}

.main-zoom-wrap canvas {
  display: block;
  max-width: 70vw;
  max-height: 70vh;
}

.main-error {
  position: absolute;
  color: var(--color-danger);
  font-size: 0.85rem;
}

.zoom-controls {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(17, 24, 39, 0.85);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 0.35rem 0.6rem;
}

.zoom-controls button {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  border: 1px solid var(--color-border-strong);
  background: var(--color-accent-bg);
  color: var(--color-accent);
  cursor: pointer;
  font-size: 0.9rem;
}

.zoom-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.zoom-level {
  font-size: 0.75rem;
  color: var(--color-text);
  min-width: 3.5ch;
  text-align: center;
}

.zoom-reset {
  border-radius: 12px !important;
  width: auto !important;
  padding: 0 0.6rem;
  font-size: 0.72rem !important;
}

/* 前後移動ボタン（画面右下に固定） */
.nav-controls {
  position: absolute;
  bottom: 1.25rem;
  right: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(17, 24, 39, 0.85);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  padding: 0.4rem 0.9rem;
}

.nav-btn {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  border: 1px solid var(--color-border-strong);
  background: var(--color-accent-bg);
  color: var(--color-accent);
  font-size: 1rem;
  cursor: pointer;
}

.nav-btn:hover:not(:disabled) {
  background: var(--color-accent-bg-hover);
}

.nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.nav-count {
  font-size: 0.8rem;
  color: var(--color-text);
  min-width: 5ch;
  text-align: center;
}
</style>
