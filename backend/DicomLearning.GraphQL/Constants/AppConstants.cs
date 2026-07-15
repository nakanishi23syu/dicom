namespace DicomLearning.GraphQL.Constants;

// ======================================================
// AppConstants — アプリ全体で使う定数
// ======================================================
// マジックストリングをあちこちに書くと、片方だけ直し忘れて動かなくなる事故が起きやすい。
// 複数箇所（Program.cs の AddCors と UseCors 等）で同じ文字列を使うものはここに集約する。
internal static class AppConstants
{
    // フロントエンド用CORSポリシーの名前。
    public const string FrontendCorsPolicy = "FrontendCorsPolicy";

    // JWTを保持するhttpOnly Cookieの名前。
    // 以前はJWTをレスポンスボディで返しフロントエンドがlocalStorageに保存していたが、
    // XSS（悪意あるスクリプトの混入）が起きた場合にlocalStorageは任意のJSから読み放題のため
    // トークンを盗まれるリスクがあった。httpOnly Cookieはブラウザが自動送信し、
    // JavaScriptからは（document.cookie経由でも）読み書きできないため、その経路を塞げる。
    public const string AuthCookieName = "dicom_auth_token";
}
