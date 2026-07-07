"""
.tcia マニフェストから DICOM ファイルをダウンロードして public/dicom/ に配置し、
manifest.json を更新するスクリプト。

使い方:
    python download_dicom.py                # 最初の1シリーズのみ
    python download_dicom.py --count 3      # 最初の3シリーズ
    python download_dicom.py --all          # 全シリーズ（大量データ注意）
"""

import argparse
import json
import os
import zipfile
import io
import sys
import time
import requests

TCIA_FILE = "CMB-AML_v09_20260702.tcia"
OUTPUT_DIR = os.path.join("public", "dicom")
MANIFEST_JSON = os.path.join(OUTPUT_DIR, "manifest.json")
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


def load_manifest() -> list[str]:
    if os.path.exists(MANIFEST_JSON):
        with open(MANIFEST_JSON) as f:
            return json.load(f).get("files", [])
    return []


def save_manifest(files: list[str]):
    with open(MANIFEST_JSON, "w") as f:
        json.dump({"files": sorted(set(files))}, f, indent=2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=1, help="ダウンロードするシリーズ数")
    parser.add_argument("--all", action="store_true", help="全シリーズをダウンロード")
    args = parser.parse_args()

    series_uids = parse_tcia(TCIA_FILE)
    if not series_uids:
        print("シリーズUIDが見つかりませんでした")
        sys.exit(1)

    count = len(series_uids) if args.all else args.count
    targets = series_uids[:count]

    print(f"対象: {count} シリーズ / 合計 {len(series_uids)} シリーズ")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    existing_files = load_manifest()
    new_files = list(existing_files)
    total_saved = 0

    for i, uid in enumerate(targets, 1):
        print(f"\n[{i}/{count}] シリーズ: {uid}")
        try:
            files = download_series(uid)
            for fname, data in files:
                # シリーズUIDのプレフィックスを付けて衝突を防ぐ
                short_uid = uid.split(".")[-1]
                save_name = f"{short_uid}_{fname}" if not fname.endswith(".dcm") else f"{short_uid}_{fname}"
                if not save_name.endswith(".dcm"):
                    save_name += ".dcm"
                save_path = os.path.join(OUTPUT_DIR, save_name)
                with open(save_path, "wb") as f:
                    f.write(data)
                if save_name not in new_files:
                    new_files.append(save_name)
                total_saved += 1
            print(f"  → {len(files)} ファイル保存完了")
        except Exception as e:
            print(f"  ✗ エラー: {e}")
        time.sleep(0.5)

    save_manifest(new_files)
    print(f"\n完了: 合計 {total_saved} ファイルを {OUTPUT_DIR} に保存")
    print(f"manifest.json を更新しました ({len(new_files)} ファイル)")


if __name__ == "__main__":
    main()
