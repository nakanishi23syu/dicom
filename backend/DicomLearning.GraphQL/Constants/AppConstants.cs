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
}
