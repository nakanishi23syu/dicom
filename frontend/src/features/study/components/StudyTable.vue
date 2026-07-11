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
      ── Notion風のフィルター・ソートツールバー ──
      composables/useFilterSort.ts に共通ロジックを持たせ、ここではUIの組み立てだけを行う。
    -->
    <div class="filter-sort-toolbar">
      <div class="toolbar-buttons">
        <BaseButton variant="secondary" @click="showFilterPanel = !showFilterPanel">
          🔍 フィルター<span v-if="filterRules.length">（{{ filterRules.length }}）</span>
        </BaseButton>
        <BaseButton variant="secondary" @click="showSortPanel = !showSortPanel">
          ↕ 並び替え<span v-if="sortRules.length">（{{ sortRules.length }}）</span>
        </BaseButton>
      </div>

      <!-- フィルターパネル: 条件を1つずつ「項目・演算子・値」の3点セットで積み重ねる -->
      <div v-if="showFilterPanel" class="rule-panel filter-panel">
        <div v-for="rule in filterRules" :key="rule.id" class="rule-row">
          <select v-model="rule.field" class="rule-select" @change="onFilterFieldChange(rule)">
            <option v-for="f in FILTER_FIELDS" :key="f" :value="f">{{ FIELD_LABELS[f] }}</option>
          </select>
          <select v-model="rule.operator" class="rule-select">
            <option v-for="op in operatorsForField(rule.field)" :key="op" :value="op">
              {{ OPERATOR_LABELS[op] }}
            </option>
          </select>
          <input
            v-if="operatorNeedsValue(rule.operator) && rule.field !== 'studyDate'"
            v-model="rule.value"
            class="rule-value"
            type="text"
            placeholder="値を入力"
          />
          <input
            v-else-if="operatorNeedsValue(rule.operator)"
            class="rule-value"
            type="date"
            :value="toInputDate(rule.value)"
            @input="rule.value = fromInputDate(($event.target as HTMLInputElement).value)"
          />
          <button class="rule-remove" aria-label="削除" @click="removeFilterRule(rule.id)">
            ✕
          </button>
        </div>
        <button class="rule-add" @click="addFilterRule('patientName')">+ フィルターを追加</button>
      </div>

      <!-- 並び替えパネル: 上から順に優先される（1段目が同値のときだけ2段目を見る） -->
      <div v-if="showSortPanel" class="rule-panel sort-panel">
        <div v-for="rule in sortRules" :key="rule.id" class="rule-row">
          <select v-model="rule.field" class="rule-select">
            <option v-for="f in FILTER_FIELDS" :key="f" :value="f">{{ FIELD_LABELS[f] }}</option>
          </select>
          <select v-model="rule.direction" class="rule-select">
            <option value="asc">昇順</option>
            <option value="desc">降順</option>
          </select>
          <button class="rule-remove" aria-label="削除" @click="removeSortRule(rule.id)">✕</button>
        </div>
        <button class="rule-add" @click="addSortRule('studyDate')">+ 並び替えを追加</button>
      </div>
    </div>

    <!--
      【v-if / v-else-if / v-else】 条件分岐レンダリング
      上から順に評価され、最初に true になったものだけが表示される。
      5つの状態を切り替えている:
        1. loading が true          → スピナー表示
        2. error がある              → エラーメッセージ表示
        3. 元データが0件             → 空メッセージ表示
        4. フィルター後が0件         → フィルター起因の空メッセージ表示
        5. それ以外                  → テーブル表示
    -->

    <!-- ① 読み込み中 -->
    <div v-if="loading" class="state-msg">
      <span class="spinner" />
      読み込み中...
    </div>

    <!-- ② エラーあり（error が null でない場合） -->
    <div v-else-if="error" class="state-msg error">{{ error }}</div>

    <!-- ③ 元データなし -->
    <div v-else-if="studies.length === 0" class="state-msg">
      <p>DICOMファイルがありません。</p>
      <p class="hint">public/dicom/ にファイルを配置し、manifest.json に追記してください。</p>
    </div>

    <!-- ④ フィルター条件に一致する検査が0件 -->
    <div v-else-if="filteredSortedStudies.length === 0" class="state-msg">
      <p>フィルター条件に一致する検査がありません。</p>
    </div>

    <!-- ⑤ データあり → テーブルを描画 -->
    <table v-else class="study-table">
      <thead>
        <tr>
          <th>患者ID</th>
          <th>読影ステータス</th>
          <th>患者氏名</th>
          <th>検査日時</th>
          <th>代表モダリティ</th>
          <th>全検査部位</th>
          <th>検査記述</th>
          <th>シリーズ数</th>
          <th>タイムライン</th>
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
          v-for="study in filteredSortedStudies"
          :key="study.studyInstanceUID"
          class="study-row"
          :class="{ selected: selectedUID === study.studyInstanceUID }"
          @click="$emit('select-study', study)"
        >
          <!--
            【|| '—'】 フォールバック
            値が空文字・null・undefined の場合にダッシュ（—）を表示する。
          -->
          <td>{{ study.patientID || '—' }}</td>
          <td>
            <!-- ステータスのクリックが行選択（select-study）に伝播しないよう@click.stopで止める -->
            <ReadingStatusBadge
              :status="getStatus(study.studyInstanceUID)"
              @click.stop
              @update:status="setStatus(study.studyInstanceUID, $event)"
            />
          </td>
          <td>{{ study.patientName || '—' }}</td>
          <!--
            formatDate() を呼んで YYYYMMDD → YYYY/MM/DD に整形する。
            テンプレート内でも関数呼び出しができる。
          -->
          <td>{{ formatDate(study.studyDate) }}</td>
          <td>
            <span class="badge">{{ study.modality || '—' }}</span>
          </td>
          <td>{{ allBodyParts(study) }}</td>
          <td>{{ study.studyDescription || '—' }}</td>
          <td>{{ study.series.length }}</td>
          <td>
            <!--
              @click.stop: 行全体の@click（select-study）へのバブリング（伝播）を止める。
              これが無いと、リンクをクリックしたときに行選択も同時に発火してしまう。
            -->
            <RouterLink
              v-if="study.patientID"
              :to="{ name: 'timeline', params: { patientId: study.patientID } }"
              class="timeline-link"
              @click.stop
            >
              🕐 比較読影
            </RouterLink>
            <span v-else class="timeline-link disabled">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import type { DicomStudy } from '@/types/dicom'
import BaseButton from '@/components/common/BaseButton.vue'
import ReadingStatusBadge from './ReadingStatusBadge.vue'
import { useReadingStatus } from '@/composables/useReadingStatus'
import {
  useFilterSort,
  operatorNeedsValue,
  type FilterOperator,
  type FilterRule,
} from '@/composables/useFilterSort'

// ======================================================
// defineProps — 親から受け取るプロパティの定義
// ======================================================
// Props（プロパティ）は親コンポーネントから子へデータを渡す仕組み。
// 子は受け取るだけで直接書き換えてはいけない（単方向データフロー）。
// TypeScript のジェネリクス構文 <{ ... }> で型を定義する。
const props = defineProps<{
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

// ======================================================
// Notion風フィルター・ソート（useFilterSort.ts を検査一覧向けに使う）
// ======================================================
type StudyFilterField =
  | 'patientName'
  | 'patientID'
  | 'studyDate'
  | 'studyDescription'
  | 'modality'
  | 'accessionNumber'

const FILTER_FIELDS: StudyFilterField[] = [
  'patientName',
  'patientID',
  'studyDate',
  'studyDescription',
  'modality',
  'accessionNumber',
]

const FIELD_LABELS: Record<StudyFilterField, string> = {
  patientName: '患者名',
  patientID: '患者ID',
  studyDate: '検査日',
  studyDescription: '検査説明',
  modality: 'モダリティ',
  accessionNumber: 'アクセッション番号',
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: '含む',
  notContains: '含まない',
  equals: 'と等しい',
  isEmpty: '空である',
  isNotEmpty: '空でない',
  onOrAfter: '以降',
  onOrBefore: '以前',
}

// 検査日は「以降/以前」中心、それ以外の文字列項目は「含む/含まない」中心にする
// （日付に「含む」を出しても使いどころが無いため、項目ごとに選択肢を絞る）。
function operatorsForField(field: StudyFilterField): FilterOperator[] {
  if (field === 'studyDate') {
    return ['onOrAfter', 'onOrBefore', 'equals', 'isEmpty', 'isNotEmpty']
  }
  return ['contains', 'notContains', 'equals', 'isEmpty', 'isNotEmpty']
}

// 項目を切り替えたときに、新しい項目で選べない演算子のままにならないよう補正する
function onFilterFieldChange(rule: FilterRule<StudyFilterField>) {
  const allowed = operatorsForField(rule.field)
  if (!allowed.includes(rule.operator)) {
    rule.operator = allowed[0]
  }
}

// "20240315" ⇔ "2024-03-15"（<input type="date"> はハイフン区切りを要求するため相互変換する）
function toInputDate(dicomDate: string): string {
  if (dicomDate.length !== 8) return ''
  return `${dicomDate.slice(0, 4)}-${dicomDate.slice(4, 6)}-${dicomDate.slice(6, 8)}`
}
function fromInputDate(inputDate: string): string {
  // tsconfigのtargetがES2020のためreplaceAllが使えず、split/joinで代用している
  return inputDate.split('-').join('')
}

function getFieldValue(study: DicomStudy, field: StudyFilterField): string {
  return study[field] ?? ''
}

// このプロジェクトのDicomStudyには「検査部位」そのものを持つ項目が無いため、
// 含まれるシリーズの説明（PLAIN、造影後 等）から重複を除いて簡易的に「全検査部位」を組み立てる。
function allBodyParts(study: DicomStudy): string {
  const parts = [...new Set(study.series.map((s) => s.seriesDescription).filter(Boolean))]
  return parts.length > 0 ? parts.join(' / ') : '—'
}

const { getStatus, setStatus } = useReadingStatus()

const {
  filterRules,
  sortRules,
  filteredSortedItems: filteredSortedStudies,
  addFilterRule,
  removeFilterRule,
  addSortRule,
  removeSortRule,
} = useFilterSort<DicomStudy, StudyFilterField>(toRef(props, 'studies'), getFieldValue)

const showFilterPanel = ref(false)
const showSortPanel = ref(false)
</script>

<!--
  scoped: このコンポーネント内だけに適用されるスタイル。
  他コンポーネントの同名クラスには影響しない。
-->
<style scoped>
.filter-sort-toolbar {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.toolbar-buttons {
  display: flex;
  gap: 0.5rem;
}

.rule-panel {
  margin-top: 0.6rem;
  padding: 0.75rem;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rule-select,
.rule-value {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.3rem 0.5rem;
  font-size: 0.8rem;
}

.rule-value {
  flex: 1;
  min-width: 0;
}

.rule-remove {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.rule-remove:hover {
  color: var(--color-danger);
}

.rule-add {
  align-self: flex-start;
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.2rem 0;
}

.rule-add:hover {
  text-decoration: underline;
}

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
  background: var(--color-border);
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.study-table th,
.study-table td {
  padding: 0.625rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap; /* セル内のテキストを折り返さない */
}

.study-row {
  cursor: pointer; /* クリック可能であることをマウスカーソルで示す */
  color: var(--color-text);
  background: var(--color-surface); /* 明示しないと親要素の背景が透けて見えてしまうため指定する */
  transition: background 0.15s; /* ホバー時の背景色変化をなめらかにする */
}

.study-row:hover {
  background: var(--color-thumbnail-selected-bg);
}

/* v-if で動的に付与されるクラス: 選択中の行を強調表示 */
.study-row.selected {
  background: var(--color-accent-selected-bg);
  color: var(--color-accent);
}

.badge {
  display: inline-block;
  background: var(--color-border-strong);
  color: var(--color-accent);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.timeline-link {
  font-size: 0.78rem;
  color: var(--color-accent);
  text-decoration: none;
  white-space: nowrap;
}

.timeline-link:hover {
  text-decoration: underline;
}

.timeline-link.disabled {
  color: var(--color-text-faint);
  cursor: default;
}

.state-msg {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.state-msg.error {
  color: var(--color-danger);
}

.hint {
  font-size: 0.8rem;
  color: var(--color-text-disabled);
}

/* CSS アニメーションで回転するスピナー */
.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border-strong);
  border-top-color: var(--color-accent); /* 1辺だけ色を変えて回転させると円形になる */
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
