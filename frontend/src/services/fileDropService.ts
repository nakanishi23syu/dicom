// ======================================================
// services/fileDropService.ts — ドラッグ&ドロップされたファイル/フォルダの収集
// ======================================================
// 【なぜこれが必要か】
// 通常の <input type="file"> と違い、ドラッグ&ドロップで「フォルダ」が落とされた場合、
// event.dataTransfer.files には中身が展開されず、フォルダ自体は取得できない。
// フォルダの中身を再帰的に読み取るには、ブラウザ独自拡張の
// "File and Directory Entries API"（DataTransferItem.webkitGetAsEntry()）を使う必要がある。
// 標準化はされていないが主要ブラウザ（Chrome/Edge/Safari/Firefox）で利用可能。

// webkitGetAsEntry() 等は標準のTypeScript DOM型定義に一部しか含まれないため、
// 必要な最小限の型だけここで補っておく。
interface FileSystemEntryLike {
  isFile: boolean
  isDirectory: boolean
  name: string
}

interface FileSystemFileEntryLike extends FileSystemEntryLike {
  file: (successCallback: (file: File) => void, errorCallback?: (err: unknown) => void) => void
}

interface FileSystemDirectoryEntryLike extends FileSystemEntryLike {
  createReader: () => FileSystemDirectoryReaderLike
}

interface FileSystemDirectoryReaderLike {
  // readEntries は仕様上「1回の呼び出しで全件返るとは限らない」ため、
  // 空配列が返るまでループして呼び続ける必要がある。
  readEntries: (
    successCallback: (entries: FileSystemEntryLike[]) => void,
    errorCallback?: (err: unknown) => void
  ) => void
}

function readAllEntries(reader: FileSystemDirectoryReaderLike): Promise<FileSystemEntryLike[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntryLike[] = []
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (batch.length === 0) {
          resolve(all)
          return
        }
        all.push(...batch)
        readBatch()
      }, reject)
    }
    readBatch()
  })
}

function fileFromEntry(entry: FileSystemFileEntryLike): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

async function collectFromEntry(entry: FileSystemEntryLike): Promise<File[]> {
  if (entry.isFile) {
    const file = await fileFromEntry(entry as FileSystemFileEntryLike)
    return [file]
  }

  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntryLike
    const children = await readAllEntries(dirEntry.createReader())
    const nested = await Promise.all(children.map((child) => collectFromEntry(child)))
    return nested.flat()
  }

  return []
}

// ======================================================
// collectFilesFromDataTransfer — ドロップされたファイル/フォルダをまとめてFile[]にする
// ======================================================
// items（File and Directory Entries API）が使える環境ではフォルダも再帰的に展開し、
// 使えない古い環境では files（フォルダ非対応）にフォールバックする。
export async function collectFilesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const items = dataTransfer.items
  if (!items || items.length === 0) {
    return Array.from(dataTransfer.files)
  }

  const entries: FileSystemEntryLike[] = []
  for (const item of Array.from(items)) {
    // webkitGetAsEntry は標準DOM型に無いため any 経由で呼び出す。
    const entry = (item as unknown as { webkitGetAsEntry?: () => FileSystemEntryLike | null })
      .webkitGetAsEntry?.()
    if (entry) {
      entries.push(entry)
    }
  }

  if (entries.length === 0) {
    // webkitGetAsEntry非対応ブラウザ向けフォールバック（フォルダの再帰展開はできない）。
    return Array.from(dataTransfer.files)
  }

  const nested = await Promise.all(entries.map((entry) => collectFromEntry(entry)))
  return nested.flat()
}
