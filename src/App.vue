<!--
  ======================================================
  App.vue — アプリのルートコンポーネント
  ======================================================
  リファクタリング後の App.vue はシンプル。
  グローバル CSS の定義と <RouterView> の配置だけを担当する。

  【ページレベルの責務分離】
  以前はヘッダーや状態管理ロジックもここにあったが、
  ルーターを導入した後は各ページの内容は views/ に移動する。
  App.vue はあくまで「アプリの器」として薄く保つのがセオリー。

  【将来の拡張例】
  ナビゲーションバーを全ページで共通表示したい場合は、
  <RouterView> の外側に置くことで実現できる:

    <template>
      <AppNavbar />   ← 全ページ共通のナビ
      <RouterView />  ← ページごとに切り替わるコンテンツ
    </template>
-->

<template>
  <!--
    <RouterView> — Vue Router の組み込みコンポーネント
    現在の URL に対応するコンポーネント（views/ のファイル）がここにレンダリングされる。
    例: URL が "/" なら StudyListView.vue がここに表示される。
  -->
  <RouterView />
</template>

<!--
  グローバルスタイル（scoped なし）
  アプリ全体に適用される CSS リセットと基本設定。
  コンポーネント固有のスタイルは各ファイルの <style scoped> に書く。
-->
<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  background: #0d1117;
  color: #c8d6e5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
