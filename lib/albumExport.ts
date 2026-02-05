import { Album } from "./types";

interface KnigodarExport {
  _knigodar: true;
  version: number;
  exportedAt: string;
  album: Album;
}

export function exportAlbum(album: Album): void {
  const payload: KnigodarExport = {
    _knigodar: true,
    version: 1,
    exportedAt: new Date().toISOString(),
    album,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${album.title.replace(/[^a-zA-Zа-яА-Я0-9_\-]/g, "_")}.knigodar.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importAlbumFromFile(file: File): Promise<Album> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  // Support both wrapped (.knigodar.json) and raw album format
  const raw: Record<string, unknown> = parsed._knigodar ? parsed.album : parsed;

  if (!Array.isArray(raw.spreads)) {
    throw new Error("Невалидный файл альбома");
  }

  // Restore Date objects from ISO strings
  if (raw.createdAt) raw.createdAt = new Date(raw.createdAt as string);
  if (raw.updatedAt) raw.updatedAt = new Date(raw.updatedAt as string);

  return raw as unknown as Album;
}
