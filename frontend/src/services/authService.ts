// ======================================================
// services/authService.ts — ログインAPIの呼び出し
// ======================================================
// backend/DicomLearning.GraphQL/GraphQL/Mutation.cs の login ミューテーションに対応する。

import { graphqlRequest } from './graphqlClient'

export interface AuthPayload {
  token: string
  displayName: string
  isAdmin: boolean
}

export async function login(username: string, password: string): Promise<AuthPayload> {
  const query = `
    mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password) {
        token
        displayName
        isAdmin
      }
    }
  `

  const data = await graphqlRequest<{ login: AuthPayload }>(query, { username, password })
  return data.login
}
