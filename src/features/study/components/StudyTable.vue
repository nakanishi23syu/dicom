<!--
  ======================================================
  StudyTable.vue — 検査一覧テーブルコンポーネント
  ======================================================
  親（App.vue）から studies / loading / error / selectedUID を受け取り、
  テーブルとして表示する。行クリックで 'select-study' イベントを親に通知する。
-->

<template>
  <div class="study-table-wrap">
    <!--
      【v-if / v-else-if / v-else】 条件分岐レンダリング
      上から順に評価され、最初に true になったものだけが表示される。
      4つの状態を切り替えている:
        1. loading が true  → スピナー表示
        2. error がある     → エラーメッセージ表示
        3. 件数がゼロ       → 空メッセージ表示
        4. それ以外         → テーブル表示
    -->

    <!-- ① 読み込み中 -->
    <div v-if="loading" class="state-msg">
      <span class="spinner" />
      読み込み中...
    </div>

    <!-- ② エラーあり（error が null でない場合） -->
    <div v-else-if="error" class="state-msg error">{{ error }}</div>

    <!-- ③ データなし -->
    <div v-else-if="studies.length === 0" class="state-msg">
      <p>DICOMファイルがありません。</p>
      <p class="hint">public/dicom/ にファイルを配置し、manifest.json に追記してください。</p>
    </div>

    <!-- ④ データあり → テーブルを描画 -->
    <table v-else class="study-table">
      <thead>
        <tr>
          <th>患者名</th>
          <th>患者ID</th>
          <th>検査日</th>
          <th>検査説明</th>
          <th>モダリティ</th>
          <th>アクセッション番号</th>
          <th>シリーズ数</th>
        </tr>
      </thead>
      <tbody>
        <!--
          【v-for】 リストレンダリング
          studies 配列の要素を1つずつ study という変数で受け取り、
          <tr> を繰り返し生成する。

          【:key】 一意のキー（必須）
          Vue がどの要素が変更・追加・削除されたかを効率よく判断するために必要。
          配列のインデックス（0,1,2...）ではなく、一意のIDを使うのがベストプラクティス。

          【:class のオブジェクト構文】
          :class="{ selected: selectedUID === study.studyInstanceUID }"
          → 現在選択中の行にだけ "selected" クラスを付与する。
          オブジェクトの値が true のときにキー名のクラスが付く。

          【@click="$emit('select-study', study)"】
          $emit は子コンポーネントから親にイベントを送る組み込み関数。
          'select-study' イベントと共に study オブジェクトを親へ渡す。
          親（App.vue）の @select-study="onSelectStudy" が受け取る。
        -->
        <tr
          v-for="study in studies"
          :key="study.studyInstanceUID"
          class="study-row"
          :class="{ selected: selectedUID === study.studyInstanceUID }"
          @click="$emit('select-study', study)"
        >
          <!--
            【|| '—'】 フォールバック
            値が空文字・null・undefined の場合にダッシュ（—）を表示する。
          -->
          <td>{{ study.patientName || '—' }}</td>
          <td>{{ study.patientID || '—' }}</td>
          <!--
            formatDate() を呼んで YYYYMMDD → YYYY/MM/DD に整形する。
            テンプレート内でも関数呼び出しができる。
          -->
          <td>{{ formatDate(study.studyDate) }}</td>
          <td>{{ study.studyDescription || '—' }}</td>
          <td>
            <span class="badge">{{ study.modality || '—' }}</span>
          </td>
          <td>{{ study.accessionNumber || '—' }}</td>
          <td>{{ study.series.length }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { DicomStudy } from '@/types/dicom'

// ======================================================
// defineProps — 親から受け取るプロパティの定義
// ======================================================
// Props（プロパティ）は親コンポーネントから子へデータを渡す仕組み。
// 子は受け取るだけで直接書き換えてはいけない（単方向データフロー）。
// TypeScript のジェネリクス構文 <{ ... }> で型を定義する。
defineProps<{
  studies: DicomStudy[] // 検査の配列
  loading: boolean // 読み込み中フラグ
  error: string | null // エラーメッセージ（なければ null）
  selectedUID: string | null // 現在選択中の Study UID（なければ null）
}>()

// ======================================================
// defineEmits — このコンポーネントが発火するイベントの定義
// ======================================================
// Emits（イベント）は子から親にデータを伝える仕組み。
// Props と Emits で Vue の「単方向データフロー」が成り立つ。
// 'イベント名': [引数の型] の形式で定義する。
defineEmits<{
  'select-study': [study: DicomStudy] // 行クリック時に選択した検査を渡す
}>()

// ======================================================
// formatDate — 日付フォーマット関数
// ======================================================
// DICOM の日付は "YYYYMMDD" という8文字の文字列で格納されている。
// slice() で分割して "YYYY/MM/DD" 形式に変換する。
function formatDate(raw: string): string {
  // 想定外の値（空文字や8文字以外）はそのまま返す
  if (!raw || raw.length !== 8) return raw || '—'
  // "20240315" → "2024/03/15"
  return `${raw.slice(0, 4)}/${raw.slice(4, 6)}/${raw.slice(6, 8)}`
}
</script>

<!--
  scoped: このコンポーネント内だけに適用されるスタイル。
  他コンポーネントの同名クラスには影響しない。
-->
<style scoped>
.study-table-wrap {
  width: 100%;
  overflow-x: auto; /* 画面幅が狭い場合に横スクロール可能にする */
}

.study-table {
  width: 100%;
  border-collapse: collapse; /* セルの境界線を重ねる（隙間をなくす）*/
  font-size: 0.875rem;
}

.study-table thead tr {
  background: #1e2535;
  color: #8b9ab3;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.study-table th,
.study-table td {
  padding: 0.625rem 1rem;
  text-align: left;
  border-bottom: 1px solid #1e2535;
  white-space: nowrap; /* セル内のテキストを折り返さない */
}

.study-row {
  cursor: pointer; /* クリック可能であることをマウスカーソルで示す */
  color: #c8d6e5;
  transition: background 0.15s; /* ホバー時の背景色変化をなめらかにする */
}

.study-row:hover {
  background: #1e2e44;
}

/* v-if で動的に付与されるクラス: 選択中の行を強調表示 */
.study-row.selected {
  background: #1a3a5c;
  color: #7eb8f7;
}

.badge {
  display: inline-block;
  background: #2a3f5f;
  color: #7eb8f7;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.state-msg {
  padding: 3rem;
  text-align: center;
  color: #8b9ab3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.state-msg.error {
  color: #f87171;
}

.hint {
  font-size: 0.8rem;
  color: #566475;
}

/* CSS アニメーションで回転するスピナー */
.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #2a3f5f;
  border-top-color: #7eb8f7; /* 1辺だけ色を変えて回転させると円形になる */
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
