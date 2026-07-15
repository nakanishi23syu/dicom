// ======================================================
// services/authService.ts — ログインAPIの呼び出し
// ======================================================
// backend/DicomLearning.GraphQL/GraphQL/Mutation.cs の login ミューテーションに対応する。

import { graphqlRequest } from './graphqlClient'

// JWT本体はもうフロントエンドのJSに渡ってこない（backendがhttpOnly Cookieとして
// レスポンスヘッダーに直接載せるため）。displayName/isAdminだけを画面表示用に受け取る。
export interface AuthPayload {
  displayName: string
  isAdmin: boolean
}

export async function login(username: string, password: string): Promise<AuthPayload> {
  const query = `
    mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password) {
        displayName
        isAdmin
      }
    }
  `

  const data = await graphqlRequest<{ login: AuthPayload }>(query, { username, password })
  return data.login
}

// httpOnly CookieはJSから削除できないため、backend側にCookie削除を依頼する。
export async function logout(): Promise<void> {
  const query = `
    mutation Logout {
      logout
    }
  `
  await graphqlRequest<{ logout: boolean }>(query)
}

// ページ再読み込み後、Cookieがまだ有効かどうかをbackendに問い合わせてログイン状態を復元する。
// 未ログイン（Cookieが無い/期限切れ）ならnullが返る。
export async function me(): Promise<AuthPayload | null> {
  const query = `
    query Me {
      me {
        displayName
        isAdmin
      }
    }
  `
  const data = await graphqlRequest<{ me: AuthPayload | null }>(query)
  return data.me
}
