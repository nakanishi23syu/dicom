// ======================================================
// constants/auth.ts — 認証関連の定数
// ======================================================
// localStorageのキー名を1箇所にまとめておく。
// graphqlClient.ts（プレーンな関数）と stores/authStore.ts（Piniaストア）の
// 両方から同じキーで読み書きする必要があるため、バラバラに書くと片方だけ直し忘れる事故が起きる。
export const AUTH_TOKEN_STORAGE_KEY = 'dicom-tool.auth.token'
export const AUTH_DISPLAY_NAME_STORAGE_KEY = 'dicom-tool.auth.displayName'
export const AUTH_IS_ADMIN_STORAGE_KEY = 'dicom-tool.auth.isAdmin'
