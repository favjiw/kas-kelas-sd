/**
 * Penyimpanan foto nota di IndexedDB (karena base64 foto terlalu besar untuk localStorage).
 * Setiap nota disimpan sebagai { full, thumb } (data URL JPEG hasil kompres).
 */
import type { Receipt } from './types'

const DB_NAME = 'kas-kelas-sd'
const STORE = 'receipts'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB tidak tersedia'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const r = fn(t.objectStore(STORE))
    t.oncomplete = () => {
      db.close()
      resolve(r.result)
    }
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

const memory = new Map<string, Receipt>()

export async function saveReceipt(id: string, r: Receipt): Promise<void> {
  memory.set(id, r)
  try {
    await tx('readwrite', (s) => s.put(r, id))
  } catch {
    /* tetap tersedia di memori selama sesi */
  }
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  const hit = memory.get(id)
  if (hit) return hit
  try {
    const r = (await tx('readonly', (s) => s.get(id))) as Receipt | undefined
    if (r) {
      memory.set(id, r)
      return r
    }
  } catch {
    /* abaikan */
  }
  return null
}

export async function deleteReceipt(id: string): Promise<void> {
  memory.delete(id)
  try {
    await tx('readwrite', (s) => s.delete(id))
  } catch {
    /* abaikan */
  }
}

export async function clearReceipts(): Promise<void> {
  memory.clear()
  try {
    await tx('readwrite', (s) => s.clear())
  } catch {
    /* abaikan */
  }
}

export async function allReceipts(ids: string[]): Promise<Record<string, Receipt>> {
  const out: Record<string, Receipt> = {}
  for (const id of ids) {
    const r = await getReceipt(id)
    if (r) out[id] = r
  }
  return out
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal membaca gambar'))
    img.src = src
  })
}

function scaleTo(img: HTMLImageElement, max: number, quality: number): string {
  const ratio = Math.min(1, max / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * ratio))
  const h = Math.max(1, Math.round(img.height * ratio))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return c.toDataURL('image/jpeg', quality)
}

/** Kompres foto (kamera / galeri) menjadi gambar penuh ≤1280px dan thumbnail ≤200px. */
export async function compressImage(file: Blob | string): Promise<Receipt> {
  let url: string
  let revoke = false
  if (typeof file === 'string') url = file
  else {
    url = URL.createObjectURL(file)
    revoke = true
  }
  try {
    const img = await loadImage(url)
    return { full: scaleTo(img, 1280, 0.72), thumb: scaleTo(img, 200, 0.7) }
  } finally {
    if (revoke) URL.revokeObjectURL(url)
  }
}
