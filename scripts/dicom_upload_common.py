"""
dicom_upload_common.py — backendの登録API（/api/dicom-upload）へファイルをアップロードする共通処理

generate_synthetic_dicom.py（合成データ生成）と download_dicom_and_upload.py（実データダウンロード）の
両方から使う。backend（backend/DicomLearning.GraphQL）が `dotnet run` で起動済みであることが前提。

使い方（他スクリプトから）:
    from dicom_upload_common import upload_dicom_files
    results = upload_dicom_files(["a.dcm", "b.dcm"])
"""

import os

import requests

DEFAULT_UPLOAD_URL = "http://localhost:5030/api/dicom-upload"

# 1回のPOSTに含めるファイル数の上限。全部まとめて送ると同時オープンハンドル数・
# リクエストサイズが際限なく増えるため、studyや生成単位でこの件数ごとに分割送信する。
BATCH_SIZE = 20


def upload_dicom_files(paths: list[str], upload_url: str = DEFAULT_UPLOAD_URL) -> list[dict]:
    """.dcmファイルパスのリストをbackendへアップロードする。結果（成功/失敗）のリストを返す。"""
    all_results: list[dict] = []

    for i in range(0, len(paths), BATCH_SIZE):
        batch = paths[i : i + BATCH_SIZE]
        files = [
            ("files", (os.path.basename(p), open(p, "rb"), "application/dicom"))
            for p in batch
        ]
        try:
            res = requests.post(upload_url, files=files, timeout=300)
        finally:
            for _, (_name, fh, _ct) in files:
                fh.close()

        if res.status_code != 200:
            raise RuntimeError(
                f"アップロードに失敗しました (HTTP {res.status_code}): {res.text[:500]}"
            )
        all_results.extend(res.json())

    return all_results


def summarize(results: list[dict]) -> None:
    ok = sum(1 for r in results if r.get("success"))
    ng = len(results) - ok
    print(f"アップロード結果: 成功 {ok} 件 / 失敗・スキップ {ng} 件")
    for r in results:
        if not r.get("success"):
            print(f"  ✗ {r.get('fileName')}: {r.get('message')}")
