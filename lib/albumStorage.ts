import { Album } from "./types";

const DB_NAME = "knigodar-albums";
const STORE_NAME = "albums";
const CURRENT_KEY = "current";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAlbumToIDB(album: Album): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    // JSON round-trip: strips non-serializable fields (File objects), dates become ISO strings
    const req = store.put(JSON.parse(JSON.stringify(album)), CURRENT_KEY);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function loadAlbumFromIDB(): Promise<Album | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(CURRENT_KEY);
    req.onsuccess = () => {
      db.close();
      const raw = req.result;
      if (!raw) return resolve(null);
      // Restore Date objects from ISO strings
      if (raw.createdAt) raw.createdAt = new Date(raw.createdAt);
      if (raw.updatedAt) raw.updatedAt = new Date(raw.updatedAt);
      resolve(raw as Album);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function clearAlbumFromIDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(CURRENT_KEY);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}
