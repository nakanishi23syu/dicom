// ======================================================
// services/authErrorMessage.ts — 認証/認可エラーを分かりやすい日本語に変換する
// ======================================================
// backend側で [Authorize] / [Authorize(Roles = "Admin")] を付けたミューテーションを
// 未ログイン・権限不足の状態で呼ぶと GraphQLRequestError（graphqlClient.ts）が投げられる。
// codes（AUTH_NOT_AUTHENTICATED / AUTH_NOT_AUTHORIZED）を見て、
// 「ログインしてください」「管理者アカウントが必要です」を出し分ける。

import { GraphQLRequestError } from './graphqlClient'

export function describeAuthError(e: unknown, forbiddenMessage: string): string {
  if (e instanceof GraphQLRequestError) {
    if (e.codes.includes('AUTH_NOT_AUTHENTICATED')) {
      return 'この操作にはログインが必要です。/login からログインしてください。'
    }
    if (e.codes.includes('AUTH_NOT_AUTHORIZED')) {
      return forbiddenMessage
    }
  }
  return e instanceof Error ? e.message : String(e)
}
