"""
generate_synthetic_dicom.py — 学習用の合成DICOMデータを生成し、backendへ登録する

指示書2.md の要望1「検査データを増やしたい」「比較読影のために同じ患者の複数検査データを
用意してほしい」に対応する。実際の医用画像ではなく、pydicomで最低限有効な
DICOMファイル（患者・検査・シリーズ・タグ一式 + 簡易パターンのpixel_array）を組み立てる。

生成するデータ（PATIENTS を参照）:
    - 4名の架空の患者
    - 各患者ごとに2〜3回分の検査（同一PatientID・異なるStudyDate）
      → 比較読影・タイムラインビューのデモ用データになる
    - 各検査に1〜2シリーズ、各シリーズに数枚のスライス

使い方:
    python generate_synthetic_dicom.py            # 生成してbackendへアップロードまで行う
    python generate_synthetic_dicom.py --dry-run   # 生成のみ（アップロードしない。out/に残る）
    python generate_synthetic_dicom.py --upload-url http://localhost:5030/api/dicom-upload

前提: backend（backend/DicomLearning.GraphQL）が `dotnet run` で起動していること
（--dry-run のときは不要）。
"""

import argparse
import os
import shutil
import sys
import tempfile

import numpy as np
import pydicom
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, SecondaryCaptureImageStorage, generate_uid

from dicom_upload_common import summarize, upload_dicom_files, DEFAULT_UPLOAD_URL

IMAGE_SIZE = 256

# ======================================================
# 生成する患者・検査データの定義
# ======================================================
# 同一患者(patient_id)に複数のstudyを持たせることで、
# 「同一患者の過去検査と比較する」比較読影のデモデータにしている。
PATIENTS = [
    {
        "patient_id": "patient-101",
        "patient_name": "鈴木 一郎",
        "modality": "CT",
        "body_part": "ABDOMEN",
        "studies": [
            {"date": "20250815", "desc": "腹部CT（初回）"},
            {"date": "20251215", "desc": "腹部CT（経過観察1）"},
            {"date": "20260610", "desc": "腹部CT（経過観察2）"},
        ],
        "series_per_study": [
            {"desc": "単純", "num_slices": 4},
            {"desc": "造影後", "num_slices": 4},
        ],
    },
    {
        "patient_id": "patient-102",
        "patient_name": "高橋 陽子",
        "modality": "CR",
        "body_part": "CHEST",
        "studies": [
            {"date": "20260103", "desc": "胸部単純X線（前回）"},
            {"date": "20260625", "desc": "胸部単純X線（今回）"},
        ],
        "series_per_study": [
            {"desc": "PA", "num_slices": 1},
        ],
    },
    {
        "patient_id": "patient-103",
        "patient_name": "伊藤 健太",
        "modality": "MR",
        "body_part": "BRAIN",
        "studies": [
            {"date": "20260220", "desc": "頭部MRI（初回）"},
            {"date": "20260530", "desc": "頭部MRI（経過観察）"},
        ],
        "series_per_study": [
            {"desc": "T1", "num_slices": 3},
            {"desc": "T2", "num_slices": 3},
        ],
    },
    {
        "patient_id": "patient-104",
        "patient_name": "渡辺 美咲",
        "modality": "CT",
        "body_part": "CHEST",
        "studies": [
            {"date": "20250710", "desc": "胸部CT（術前）"},
            {"date": "20251005", "desc": "胸部CT（術後1）"},
            {"date": "20260401", "desc": "胸部CT（術後2）"},
        ],
        "series_per_study": [
            {"desc": "肺野条件", "num_slices": 5},
        ],
    },
]


def make_pixel_array(slice_index: int, total_slices: int) -> np.ndarray:
    """簡易パターン（放射状グラデーション + スライス位置を示す帯）の8bitグレースケール画像を作る。"""
    yy, xx = np.mgrid[0:IMAGE_SIZE, 0:IMAGE_SIZE]
    center = IMAGE_SIZE / 2
    radius = np.sqrt((xx - center) ** 2 + (yy - center) ** 2)
    base = 255 - (radius / radius.max() * 255)

    # スライスが進むごとに明るい帯が下から上へ移動していく見た目にする（枚数を捲る動作の確認用）。
    band_y = int((slice_index / max(total_slices - 1, 1)) * (IMAGE_SIZE - 20))
    base[band_y : band_y + 20, :] = np.clip(base[band_y : band_y + 20, :] + 60, 0, 255)

    return base.astype(np.uint8)


def build_dicom_file(
    *,
    patient_id: str,
    patient_name: str,
    modality: str,
    body_part: str,
    study_uid: str,
    study_date: str,
    study_desc: str,
    accession_number: str,
    series_uid: str,
    series_number: int,
    series_desc: str,
    instance_number: int,
    pixel_array: np.ndarray,
) -> FileDataset:
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = FileDataset(None, {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID

    # 患者名が日本語のため、既定のISO8859ではエンコードできない。UTF-8明示でpydicomに正しく書かせる。
    ds.SpecificCharacterSet = "ISO_IR 192"

    ds.PatientID = patient_id
    ds.PatientName = patient_name
    ds.Modality = modality
    ds.BodyPartExamined = body_part

    ds.StudyInstanceUID = study_uid
    ds.StudyDate = study_date
    ds.StudyDescription = study_desc
    ds.AccessionNumber = accession_number

    ds.SeriesInstanceUID = series_uid
    ds.SeriesNumber = str(series_number)
    ds.SeriesDescription = series_desc

    ds.InstanceNumber = str(instance_number)

    ds.Rows, ds.Columns = pixel_array.shape
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.BitsAllocated = 8
    ds.BitsStored = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0
    ds.PixelData = pixel_array.tobytes()

    return ds


def generate_all(out_dir: str) -> list[str]:
    """PATIENTSの定義に従って合成DICOMファイルを生成し、生成したファイルパスの一覧を返す。"""
    paths: list[str] = []
    accession_seq = 1000

    for patient in PATIENTS:
        for study in patient["studies"]:
            study_uid = generate_uid()
            accession_seq += 1
            for series_index, series_def in enumerate(patient["series_per_study"], start=1):
                series_uid = generate_uid()
                num_slices = series_def["num_slices"]
                for slice_index in range(num_slices):
                    pixel_array = make_pixel_array(slice_index, num_slices)
                    ds = build_dicom_file(
                        patient_id=patient["patient_id"],
                        patient_name=patient["patient_name"],
                        modality=patient["modality"],
                        body_part=patient["body_part"],
                        study_uid=study_uid,
                        study_date=study["date"],
                        study_desc=study["desc"],
                        accession_number=f"ACC-SYN-{accession_seq}",
                        series_uid=series_uid,
                        series_number=series_index,
                        series_desc=series_def["desc"],
                        instance_number=slice_index + 1,
                        pixel_array=pixel_array,
                    )
                    file_name = f"{patient['patient_id']}_{study['date']}_s{series_index}_i{slice_index + 1}.dcm"
                    file_path = os.path.join(out_dir, file_name)
                    ds.save_as(file_path, enforce_file_format=True)
                    paths.append(file_path)

    return paths


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="生成のみ行いアップロードしない")
    parser.add_argument("--upload-url", default=DEFAULT_UPLOAD_URL)
    parser.add_argument("--keep-out-dir", action="store_true", help="生成したファイルを削除せず残す")
    args = parser.parse_args()

    out_dir = os.path.join(tempfile.gettempdir(), "dicom-tool-synthetic")
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)

    print(f"合成DICOMファイルを生成中… (出力先: {out_dir})")
    paths = generate_all(out_dir)
    print(f"{len(paths)} ファイルを生成しました。")

    if args.dry_run:
        print("--dry-run のためアップロードはスキップしました。")
        return

    print(f"backendへアップロード中… ({args.upload_url})")
    try:
        results = upload_dicom_files(paths, args.upload_url)
    except Exception as e:  # noqa: BLE001 スクリプト用途のため広めにキャッチしてメッセージ表示
        print(f"アップロードに失敗しました: {e}", file=sys.stderr)
        print("backend（backend/DicomLearning.GraphQL）が起動しているか確認してください。")
        sys.exit(1)

    summarize(results)

    if not args.keep_out_dir:
        shutil.rmtree(out_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
