// ======================================================
// router/index.ts — Vue Router の設定
// ======================================================
// 【Vue Router とは？】
// URL のパスとコンポーネントを対応づける「ルーティング」を管理するライブラリ。
// 例: "/" にアクセスしたら StudyListView を表示する。
//
// SPA（Single Page Application）ではページ遷移時に実際の HTML ページを
// ロードし直さず、JavaScript でコンポーネントを切り替えることで高速に動作する。
// Vue Router はこの仕組みを提供する。

import { createRouter, createWebHistory } from 'vue-router'

// 【遅延インポート（Lazy Load）】
// import() を使うと、そのルートに初めてアクセスしたときだけコンポーネントを読み込む。
// これにより初回ロードのバンドルサイズを削減できる。
// 小規模なうちは効果は薄いが、ページが増えたときに重要になるため最初から使っておく。
const StudyListView = () => import('@/views/StudyListView.vue')
const TutorialView = () => import('@/views/TutorialView.vue')
const SeriesViewerView = () => import('@/views/SeriesViewerView.vue')
const UploadView = () => import('@/views/UploadView.vue')
const LoginView = () => import('@/views/LoginView.vue')

// ======================================================
// ルート定義
// ======================================================
// 各ルートオブジェクトのプロパティ:
//   path      : URLのパス
//   name      : ルート名（<RouterLink :to="{ name: 'study-list' }"> で使える）
//   component : 表示するコンポーネント
const routes = [
  {
    path: '/',
    name: 'study-list', // ルート名（文字列でなく名前で参照するとリファクタリングに強い）
    component: StudyListView,
  },
  {
    path: '/tutorial',
    name: 'tutorial', // Vue学習チュートリアルページ
    component: TutorialView,
  },
  {
    path: '/viewer/:seriesInstanceUID',
    name: 'series-viewer', // 新しい画像ビューアページ（旧ImageViewer.vueは未使用のまま残置）
    component: SeriesViewerView,
  },
  {
    path: '/upload',
    name: 'upload', // DICOMアップロードページ（backend/DicomLearning.GraphQL への保存）
    component: UploadView,
  },
  {
    path: '/login',
    name: 'login', // ログインページ（JWT取得。stores/authStore.ts参照）
    component: LoginView,
  },
  // 将来の拡張例:
  // {
  //   path: '/study/:studyUID',
  //   name: 'study-detail',
  //   component: () => import('@/views/StudyDetailView.vue'),
  // },
]

// ======================================================
// Router インスタンスの作成
// ======================================================
const router = createRouter({
  // createWebHistory: HTML5 の History API を使ったルーティング。
  // URL が "/study-list" のように見えるクリーンな形式になる（ハッシュ "#" が付かない）。
  // ※ サーバーは全パスに対して index.html を返す設定が必要（Vite dev サーバーは自動対応）
  history: createWebHistory(),
  routes,
})

export default router
