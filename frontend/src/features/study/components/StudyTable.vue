<!--
  ======================================================
  StudyTable.vue — 検査一覧テーブルコンポーネント
  ======================================================
  親（App.vue）から studies / loading / error / selectedUID を受け取り、
  テーブルとして表示する。行クリックで 'select-study' イベントを親に通知する。

  並べ替え・ソートはNotionのテーブルビューの操作感に合わせている:
    - 列見出し（カラム名）をクリックするとその列でソートされる（昇順→降順→解除の順に切り替え）
    - ソートが無効な間は、行の左端のハンドル（⠿）をドラッグして手動で並べ替えられる
      （ソートが有効な間は表示順がソート結果で決まるため、手動並べ替えはできない。
      Notion本体も同じ仕様）
-->

<template>
  <div class="study-table-wrap">
    <!--
      ── Notion風のフィルターツールバー ──
      composables/useFilterSort.ts に共通ロジックを持たせ、ここではUIの組み立てだけを行う。
    -->
    <div class="filter-sort-toolbar">
      <div class="toolbar-buttons">
        <BaseButton variant="secondary" @click="showFilterPanel = !showFilterPanel">
          🔍 フィルター
          <span v-if="filterRules.length">（{{ filterRules.length }}）</span>
        </BaseButton>
        <span v-if="sort" class="sort-status">
          ↕ {{ FIELD_LABELS[sort.field] }}で{{ sort.direction === 'asc' ? '昇順' : '降順' }}ソート中
          <button class="sort-clear" @click="sort = null">解除</button>
        </span>
        <span v-else class="sort-hint">列見出しをクリックするとソートできます</span>

        <!--
          ── 変更の保存（並べ替え + インライン編集の統合。追加要望対応）──
          並べ替え・インライン編集どちらも、まずはローカルの作業用配列（editable.workingItems）
          だけを書き換え、この保存ボタンを押したときに「最初に取得したデータとの差分」だけを
          まとめてDBへ反映する。差分が無ければ何もしない。
          元に戻す: DBに保存済みの状態に表示を戻す（未保存の変更を破棄する）。
        -->
        <span class="reorder-actions">
          <button
            class="reorder-btn"
            :disabled="!editable.dirty.value || editable.saving.value"
            title="変更した内容をDBに保存します"
            @click="handleSave"
          >
            💾 保存
          </button>
          <button
            class="reorder-btn"
            :disabled="!editable.dirty.value || editable.saving.value"
            @click="editable.apply()"
          >
            ↺ 元に戻す
          </button>
          <span v-if="editable.dirty.value" class="dirty-hint">未保存の変更があります</span>
          <span v-if="!authStore.isAdmin" class="sort-hint">
            ※並べ替えの保存は管理者のみ反映されます
          </span>
          <span v-if="editable.saveError.value" class="reorder-error">
            {{ editable.saveError.value }}
          </span>
        </span>

        <!-- ── Notion風チェック→編集・削除（指示書2.md要望4）── -->
        <span v-if="checkable.checkedIds.value.size > 0" class="checked-actions">
          <button class="revert-btn" :disabled="reverting" @click="handleRevertChecked">
            🔄 選択した{{ checkable.checkedIds.value.size }}件をDICOMタグの値に戻す
          </button>
          <button class="delete-selected-btn" @click="showDeleteConfirm = true">
            🗑 選択した{{ checkable.checkedIds.value.size }}件を削除
          </button>
        </span>
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
      <p>検査データがありません。</p>
      <p class="hint">/upload からDICOMファイルをアップロードしてください。</p>
    </div>

    <!-- ④ フィルター条件に一致する検査が0件 -->
    <div v-else-if="displayedStudies.length === 0" class="state-msg">
      <p>フィルター条件に一致する検査がありません。</p>
    </div>

    <!-- ⑤ データあり → テーブルを描画 -->
    <table v-else class="study-table">
      <thead>
        <tr>
          <!-- Notion風チェックボックス用の空列 -->
          <th class="check-col" />
          <!-- ドラッグハンドル用の空列 -->
          <th class="drag-col" />
          <th class="sortable" @click="toggleSort('patientID')">
            患者ID
            <span v-if="sort?.field === 'patientID'" class="sort-arrow">{{ sortArrow }}</span>
          </th>
          <th>読影ステータス</th>
          <th class="sortable" @click="toggleSort('patientName')">
            患者氏名
            <span v-if="sort?.field === 'patientName'" class="sort-arrow">{{ sortArrow }}</span>
          </th>
          <th class="sortable" @click="toggleSort('studyDate')">
            検査日時
            <span v-if="sort?.field === 'studyDate'" class="sort-arrow">{{ sortArrow }}</span>
          </th>
          <th class="sortable" @click="toggleSort('modality')">
            代表モダリティ
            <span v-if="sort?.field === 'modality'" class="sort-arrow">{{ sortArrow }}</span>
          </th>
          <th>全検査部位</th>
          <th class="sortable" @click="toggleSort('studyDescription')">
            検査記述
            <span v-if="sort?.field === 'studyDescription'" class="sort-arrow">
              {{ sortArrow }}
            </span>
          </th>
          <th>シリーズ数</th>
          <th>タイムライン</th>
        </tr>
      </thead>
      <tbody>
        <!--
          【v-for】 リストレンダリング
          displayedStudies 配列の要素を1つずつ study という変数で受け取り、
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
          v-for="(study, index) in displayedStudies"
          :key="study.studyInstanceUID"
          class="study-row"
          :class="{
            selected: selectedUID === study.studyInstanceUID,
            dragging: !sort && draggingIndex === index,
          }"
          v-bind="!sort ? dragHandlers(index) : {}"
          @click="$emit('select-study', study)"
        >
          <!-- Notion風チェックボックス。チェックすると同じ行の主要カラムが編集可能になる。 -->
          <td class="check-col" @click.stop>
            <input
              type="checkbox"
              :checked="checkable.isChecked(study)"
              @change="checkable.toggle(study)"
            />
          </td>
          <!-- ソート中はドラッグでの手動並べ替えができないため、ハンドルを薄く表示するだけにする -->
          <td class="drag-col" :class="{ 'drag-disabled': !!sort }" @click.stop>
            <span
              class="drag-handle"
              :title="sort ? 'ソート解除で手動並べ替え可能' : 'ドラッグで並べ替え'"
            >
              ⠿
            </span>
          </td>
          <!--
            【|| '—'】 フォールバック
            値が空文字・null・undefined の場合にダッシュ（—）を表示する。
            チェック中の行だけ<input>に切り替える（指示書2.md要望4「チェックすると、
            値編集ができるようにしてほしい」）。v-modelでworkingItems内のオブジェクトを
            直接書き換えるだけで、backendへの送信は行わない（保存ボタンを押すまで待つ。
            追加要望「変更箇所だけ保存ボタンでまとめて反映」対応）。
            @click.stopは<input>自体に付ける（<td>に付けると、非チェック時の
            通常セルクリックまで行選択(select-study)へのバブリングが止まってしまうため）。
          -->
          <td>
            <input
              v-if="checkable.isChecked(study)"
              v-model="study.patientID"
              class="cell-input"
              @click.stop
            />
            <template v-else>{{ study.patientID || '—' }}</template>
          </td>
          <td>
            <!-- ステータスのクリックが行選択（select-study）に伝播しないよう@click.stopで止める -->
            <ReadingStatusBadge
              :status="getStatus(study.studyInstanceUID)"
              @click.stop
              @update:status="setStatus(study.studyInstanceUID, $event)"
            />
          </td>
          <td>
            <input
              v-if="checkable.isChecked(study)"
              v-model="study.patientName"
              class="cell-input"
              @click.stop
            />
            <template v-else>{{ study.patientName || '—' }}</template>
          </td>
          <!--
            formatDate() を呼んで YYYYMMDD → YYYY/MM/DD に整形する。
            テンプレート内でも関数呼び出しができる。
            <input type="date">の値は常に"YYYY-MM-DD"形式だが、study.studyDateは
            DICOM由来の"YYYYMMDD"形式で保持しているため、v-modelではなく
            相互変換（toInputDate/fromInputDate）を挟んだ手動バインディングにする。
          -->
          <td>
            <input
              v-if="checkable.isChecked(study)"
              class="cell-input"
              type="date"
              :value="toInputDate(study.studyDate)"
              @click.stop
              @input="study.studyDate = fromInputDate(($event.target as HTMLInputElement).value)"
            />
            <template v-else>{{ formatDate(study.studyDate) }}</template>
          </td>
          <td>
            <input
              v-if="checkable.isChecked(study)"
              v-model="study.modality"
              class="cell-input"
              @click.stop
            />
            <span v-else class="badge">{{ study.modality || '—' }}</span>
          </td>
          <td>{{ allBodyParts(study) }}</td>
          <td>
            <input
              v-if="checkable.isChecked(study)"
              v-model="study.studyDescription"
              class="cell-input"
              @click.stop
            />
            <template v-else>{{ study.studyDescription || '—' }}</template>
          </td>
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

    <!-- チェックした検査の削除確認ポップアップ。DB・紐づくDICOMファイルの両方が削除される。 -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="検査の削除"
      confirm-text="削除する"
      @confirm="handleDeleteChecked"
    >
      選択した{{ checkable.checkedIds.value.size }}件の検査を削除します。
      DBのレコードと紐づくDICOM画像も削除され、元に戻せません。よろしいですか？
    </ConfirmDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef, computed } from 'vue'
import type { DicomStudy } from '@/types/dicom'
import BaseButton from '@/components/common/BaseButton.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ReadingStatusBadge from './ReadingStatusBadge.vue'
import { useReadingStatus } from '@/composables/useReadingStatus'
import { useDragSort } from '@/composables/useDragSort'
import { useEditableList } from '@/composables/useEditableList'
import { useCheckableRows } from '@/composables/useCheckableRows'
import { useAuthStore } from '@/stores/authStore'
import { useToast } from '@/composables/useToast'
import {
  saveStudyChanges,
  revertStudyFields,
  deleteStudy,
  type StudyChangeInput,
} from '@/services/backendApiService'
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
const emit = defineEmits<{
  'select-study': [study: DicomStudy] // 行クリック時に選択した検査を渡す
  'data-changed': [] // チェックした検査の削除が完了したので一覧を再取得してほしい
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
  'patientName' | 'patientID' | 'studyDate' | 'studyDescription' | 'modality' | 'accessionNumber'

const FILTER_FIELDS: StudyFilterField[] = [
  'patientName',
  'patientID',
  'studyDate',
  'studyDescription',
  'modality',
  'accessionNumber',
]

const FIELD_LABELS: Record<StudyFilterField, string> = {
  patientName: '患者氏名',
  patientID: '患者ID',
  studyDate: '検査日時',
  studyDescription: '検査記述',
  modality: '代表モダリティ',
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
  sort,
  filteredItems,
  filteredSortedItems,
  addFilterRule,
  removeFilterRule,
  toggleSort,
} = useFilterSort<DicomStudy, StudyFilterField>(toRef(props, 'studies'), getFieldValue)

const showFilterPanel = ref(false)

const sortArrow = computed(() => (sort.value?.direction === 'asc' ? '▲' : '▼'))

// ======================================================
// 変更の保存（並べ替え + インライン編集の統合。追加要望対応）
// ======================================================
// ソートが有効な間は表示順がソート結果で決まるため、ドラッグ並べ替えの対象にはしない
// （Notion本体も同じ挙動）。ソートが無効なときだけ、フィルター後の一覧を
// 「DBのOrder順（または未保存の編集結果）」で並べ、ドラッグ・セル編集できるようにする。
const authStore = useAuthStore()
const toast = useToast()
const editable = useEditableList(filteredItems, {
  getId: (s: DicomStudy) => s.studyInstanceUID,
  getOrder: (s: DicomStudy) => s.order,
  getFields: (s: DicomStudy) => ({
    patientId: s.patientID,
    patientName: s.patientName,
    studyDate: s.studyDate,
    studyDescription: s.studyDescription,
    modality: s.modality,
  }),
})

const { draggingIndex, dragHandlers } = useDragSort(editable.workingItems)

async function handleSave() {
  try {
    const count = await editable.save(
      (study, patch): StudyChangeInput => ({
        studyInstanceUid: study.studyInstanceUID,
        order: patch.order,
        patientId: patch.fields?.patientId,
        patientName: patch.fields?.patientName,
        studyDate: patch.fields?.studyDate ? toInputDate(patch.fields.studyDate) : undefined,
        studyDescription: patch.fields?.studyDescription,
        modality: patch.fields?.modality,
      }),
      saveStudyChanges
    )
    if (count > 0) toast.success(`${count}件の変更を保存しました`)
  } catch (e) {
    // editable.saveError にも同じ内容が入るが、トーストでも即時に気づけるようにする。
    toast.error(e instanceof Error ? e.message : '保存に失敗しました')
  }
}

// 実際にテーブルへ描画する一覧: ソート中はソート結果、そうでなければ編集中の作業用配列。
const displayedStudies = computed(() =>
  sort.value ? filteredSortedItems.value : editable.workingItems.value
)

// ======================================================
// Notion風チェック→インライン編集・削除（指示書2.md要望4）
// ======================================================
const checkable = useCheckableRows<DicomStudy>((s) => s.studyInstanceUID)
const showDeleteConfirm = ref(false)
const reverting = ref(false)

// チェックした行を、実際のDICOMファイルのタグ値に戻す（インライン編集で上書きした値を破棄する）。
// 「編集前の値」はDB側で保持していないため、backendが都度実ファイルを読み直して復元し、
// その復元結果をレスポンスとして受け取ってローカルのstudyオブジェクトへ反映する。
async function handleRevertChecked() {
  const ids = [...checkable.checkedIds.value]
  reverting.value = true
  try {
    for (const id of ids) {
      const reverted = await revertStudyFields(id)
      const study = props.studies.find((s) => s.studyInstanceUID === id)
      if (!study) continue
      study.patientID = reverted.patientId
      study.patientName = reverted.patientName
      study.studyDate = reverted.studyDate.split('-').join('')
      study.studyDescription = reverted.studyDescription
      study.modality = reverted.modality
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'DICOMタグへの復元に失敗しました')
  } finally {
    reverting.value = false
  }
}

async function handleDeleteChecked() {
  const ids = [...checkable.checkedIds.value]
  try {
    await Promise.all(ids.map((id) => deleteStudy(id)))
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '削除に失敗しました')
  } finally {
    checkable.clear()
    emit('data-changed')
  }
}
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
  align-items: center;
  gap: 0.75rem;
}

.sort-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--color-accent);
}

.sort-clear {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.sort-hint {
  font-size: 0.76rem;
  color: var(--color-text-faint);
}

.reorder-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.reorder-btn {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.3rem 0.65rem;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
}

.reorder-btn:hover:not(:disabled) {
  background: var(--color-accent-bg-hover);
}

.reorder-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dirty-hint {
  font-size: 0.75rem;
  color: var(--color-warning);
  white-space: nowrap;
}

.reorder-error {
  font-size: 0.75rem;
  color: var(--color-danger);
}

.checked-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.revert-btn {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.3rem 0.65rem;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
}

.revert-btn:hover:not(:disabled) {
  background: var(--color-accent-bg-hover);
}

.revert-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-selected-btn {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger-border);
  border-radius: 5px;
  padding: 0.3rem 0.65rem;
  font-size: 0.78rem;
  cursor: pointer;
  white-space: nowrap;
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

.study-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.study-table th.sortable:hover {
  color: var(--color-accent);
}

.sort-arrow {
  margin-left: 0.25rem;
  font-size: 0.65rem;
}

.check-col,
.drag-col {
  width: 1.5rem;
  padding-left: 0.75rem !important;
  padding-right: 0 !important;
}

.cell-input {
  width: 100%;
  min-width: 6rem;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  padding: 0.25rem 0.4rem;
  font-size: 0.85rem;
  font-family: inherit;
}

.study-table th,
.study-table td {
  padding: 0.625rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap; /* セル内のテキストを折り返さない */
}

.drag-handle {
  color: var(--color-text-faint);
  cursor: grab;
}

.drag-col.drag-disabled .drag-handle {
  color: var(--color-text-disabled);
  cursor: not-allowed;
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

/* ドラッグ中の行は半透明にして「今つまんでいる」ことを視覚的に示す（DragSortUnit.vueと同じ表現） */
.study-row.dragging {
  opacity: 0.4;
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
