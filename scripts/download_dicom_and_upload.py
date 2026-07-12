"""
download_dicom_and_upload.py — .tciaマニフェストからDICOMファイルをダウンロードし、backendへ登録する

以前は frontend/download_dicom.py として存在し、frontend/public/dicom/ に直接書き出していたが、
検査一覧がbackendのDBから配信されるようになったため（指示書2.md 要望1「登録APIを使って
バックエンドに画像を格納」）、ダウンロード後は backend の /api/dicom-upload 経由で登録する形に変更した。

使い方:
    python download_dicom_and_upload.py                # 最初の1シリーズのみ
    python download_dicom_and_upload.py --count 3       # 最初の3シリーズ
    python download_dicom_and_upload.py --all           # 全シリーズ（大量データ注意）

前提: backend（backend/DicomLearning.GraphQL）が `dotnet run` で起動していること。
"""

import argparse
import io
import os
import shutil
import sys
import tempfile
import time
import zipfile

import requests

from dicom_upload_common import summarize, upload_dicom_files, DEFAULT_UPLOAD_URL

TCIA_FILE = os.path.join(os.path.dirname(__file__), "CMB-AML_v09_20260702.tcia")
API_URL = "https://services.cancerimagingarchive.net/nbia-api/services/v1/getImageWithMD5Hash"


def parse_tcia(path: str) -> list[str]:
    series_uids = []
    in_list = False
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if line == "ListOfSeriesToDownload=":
                in_list = True
                continue
            if in_list and line:
                series_uids.append(line)
    return series_uids


def download_series(series_uid: str) -> list[tuple[str, bytes]]:
    """シリーズをZIPでダウンロードし、(ファイル名, バイト列) のリストを返す"""
    params = {"SeriesInstanceUID": series_uid}
    print(f"  ダウンロード中: {series_uid[:50]}...")

    res = requests.get(API_URL, params=params, stream=True, timeout=120)
    if res.status_code != 200:
        raise RuntimeError(f"HTTPエラー: {res.status_code}")

    content = res.content
    results = []
    with zipfile.ZipFile(io.BytesIO(content)) as zf:
        for name in zf.namelist():
            if name.lower().endswith(".dcm") or not os.path.splitext(name)[1]:
                data = zf.read(name)
                results.append((os.path.basename(name), data))
    return results


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=1, help="ダウンロードするシリーズ数")
    parser.add_argument("--all", action="store_true", help="全シリーズをダウンロード")
    parser.add_argument("--upload-url", default=DEFAULT_UPLOAD_URL)
    args = parser.parse_args()

    series_uids = parse_tcia(TCIA_FILE)
    if not series_uids:
        print("シリーズUIDが見つかりませんでした")
        sys.exit(1)

    count = len(series_uids) if args.all else args.count
    targets = series_uids[:count]

    print(f"対象: {count} シリーズ / 合計 {len(series_uids)} シリーズ")

    out_dir = os.path.join(tempfile.gettempdir(), "dicom-tool-tcia-download")
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)

    all_paths: list[str] = []
    for i, uid in enumerate(targets, 1):
        print(f"\n[{i}/{count}] シリーズ: {uid}")
        try:
            files = download_series(uid)
            short_uid = uid.split(".")[-1]
            for fname, data in files:
                save_name = fname if fname.endswith(".dcm") else f"{fname}.dcm"
                save_name = f"{short_uid}_{save_name}"
                save_path = os.path.join(out_dir, save_name)
                with open(save_path, "wb") as f:
                    f.write(data)
                all_paths.append(save_path)
            print(f"  → {len(files)} ファイル保存完了")
        except Exception as e:
            print(f"  ✗ エラー: {e}")
        time.sleep(0.5)

    if not all_paths:
        print("ダウンロードできたファイルがありませんでした。")
        sys.exit(1)

    print(f"\nbackendへアップロード中… ({len(all_paths)} ファイル)")
    try:
        results = upload_dicom_files(all_paths, args.upload_url)
    except Exception as e:  # noqa: BLE001 スクリプト用途のため広めにキャッチしてメッセージ表示
        print(f"アップロードに失敗しました: {e}", file=sys.stderr)
        print("backend（backend/DicomLearning.GraphQL）が起動しているか確認してください。")
        sys.exit(1)

    summarize(results)
    shutil.rmtree(out_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
