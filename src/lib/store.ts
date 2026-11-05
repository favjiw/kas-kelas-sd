import { useMemo } from 'react'
import { create } from 'zustand'
import type { DataSet, Expense, OpnameRecord, Receipt, Settings, Student, Week } from './types'
import { addDays, todayISO, uid } from './format'
import {
  currentWeekId,
  indexPayments,
  makeWeek,
  payKey,
  planPayment,
  sortWeeks,
  weeksToAppend,
} from './calc'
import { buildSeed, emptyDataSet } from './seed'
import { allReceipts, clearReceipts, deleteReceipt, saveReceipt } from './receipts'

const STORAGE_KEY = 'kas-kelas-sd:v1'

function load(): DataSet | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as DataSet
    if (!d || !Array.isArray(d.students) || !Array.isArray(d.weeks) || !d.settings) return null
    return { ...emptyDataSet(), ...d, opnames: d.opnames ?? [] }
  } catch {
    return null
  }
}

function persist(d: DataSet) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch {
    /* kuota penuh / mode privat */
  }
}

/** Pastikan daftar minggu mencakup hari ini. */
function ensureWeeks(d: DataSet): DataSet {
  const add = weeksToAppend(sortWeeks(d.weeks), todayISO(), d.settings.weeklyAmount)
  if (!add.length) return d
  return { ...d, weeks: sortWeeks([...d.weeks, ...add]) }
}

export async function hashPin(pin: string): Promise<string> {
  const text = `kas-kelas-sd:${pin}`
  try {
    if (globalThis.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch {
    /* fallback di bawah */
  }
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return `djb2-${h >>> 0}`
}

export type Toast = { id: number; message: string; undo?: () => void; tone?: 'ok' | 'warn' }

interface State {
  data: DataSet
  weekId: string
  locked: boolean
  toast: Toast | null

  // minggu & pembayaran
  setWeekId: (id: string) => void
  togglePay: (studentId: string, weekId: string) => void
  payWeeks: (studentId: string, count: number) => { paid: number; until: string | null }
  // minggu
  addNextWeek: () => void
  setHoliday: (weekId: string, isHoliday: boolean, note?: string) => void
  setWeekAmount: (weekId: string, amount: number) => void
  // siswa
  addStudent: (name: string, joinedWeek: string) => void
  updateStudent: (id: string, patch: Partial<Pick<Student, 'name' | 'absen' | 'joinedWeek'>>) => void
  deactivateStudent: (id: string) => void
  reactivateStudent: (id: string) => void
  // pengeluaran
  addExpense: (e: Omit<Expense, 'id' | 'createdAt' | 'hasReceipt'>, receipt?: Receipt | null) => Promise<void>
  updateExpense: (
    id: string,
    e: Omit<Expense, 'id' | 'createdAt' | 'hasReceipt'>,
    receipt?: Receipt | null | undefined,
  ) => Promise<void>
  removeExpense: (id: string) => void
  // opname
  saveOpname: (r: Omit<OpnameRecord, 'id'>) => void
  // pengaturan
  updateSettings: (patch: Partial<Settings>) => void
  setPin: (pin: string | null) => Promise<void>
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  // data
  resetToSeed: () => Promise<void>
  resetEmpty: () => Promise<void>
  exportJSON: () => Promise<string>
  importJSON: (text: string) => Promise<{ ok: boolean; message: string }>
  showToast: (message: string, opts?: { undo?: () => void; tone?: 'ok' | 'warn' }) => void
  dismissToast: () => void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined
let toastSeq = 0

function bootstrap(): { data: DataSet; needsSeedReceipts: Record<string, Receipt> | null } {
  const stored = load()
  if (stored) return { data: ensureWeeks(stored), needsSeedReceipts: null }
  const seed = buildSeed()
  return { data: ensureWeeks(seed.data), needsSeedReceipts: seed.receipts }
}

const boot = bootstrap()
persist(boot.data)
if (boot.needsSeedReceipts) {
  for (const [id, r] of Object.entries(boot.needsSeedReceipts)) void saveReceipt(id, r)
}

export const useStore = create<State>((set, get) => {
  /** Terapkan perubahan data + simpan ke localStorage. */
  const commit = (fn: (d: DataSet) => DataSet) => {
    const next = fn(get().data)
    persist(next)
    set({ data: next })
  }

  return {
    data: boot.data,
    weekId: currentWeekId(sortWeeks(boot.data.weeks), todayISO()),
    locked: boot.data.settings.pinEnabled && !!boot.data.settings.pinHash,
    toast: null,

    setWeekId: (id) => set({ weekId: id }),

    togglePay: (studentId, weekId) => {
      const { data } = get()
      const wk = data.weeks.find((w) => w.id === weekId)
      if (!wk) return
      const existing = data.payments.find((p) => p.studentId === studentId && p.weekId === weekId)
      const st = data.students.find((s) => s.id === studentId)
      if (existing) {
        commit((d) => ({ ...d, payments: d.payments.filter((p) => p.id !== existing.id) }))
        get().showToast(`Setoran ${st?.name ?? ''} dibatalkan`, {
          tone: 'warn',
          undo: () => commit((d) => ({ ...d, payments: [...d.payments, existing] })),
        })
      } else {
        if (wk.isHoliday) return
        const pay = {
          id: uid(),
          studentId,
          weekId,
          amount: wk.amount,
          paidAt: new Date().toISOString(),
        }
        commit((d) => ({ ...d, payments: [...d.payments, pay] }))
      }
    },

    payWeeks: (studentId, count) => {
      const { data } = get()
      const st = data.students.find((s) => s.id === studentId)
      if (!st) return { paid: 0, until: null }
      const idx = indexPayments(data.payments)
      const plan = planPayment(st, sortWeeks(data.weeks), idx, count, data.settings.weeklyAmount)
      if (!plan.targets.length) return { paid: 0, until: null }
      const now = new Date().toISOString()
      const payments = plan.targets.map((w) => ({
        id: uid(),
        studentId,
        weekId: w.id,
        amount: w.amount,
        paidAt: now,
      }))
      commit((d) => ({
        ...d,
        weeks: sortWeeks([...d.weeks, ...plan.created]),
        payments: [...d.payments, ...payments],
      }))
      return { paid: plan.targets.length, until: plan.targets[plan.targets.length - 1].id }
    },

    addNextWeek: () =>
      commit((d) => {
        const ws = sortWeeks(d.weeks)
        const last = ws[ws.length - 1]
        return { ...d, weeks: [...ws, makeWeek(last ? addDays(last.id, 7) : todayISO(), d.settings.weeklyAmount)] }
      }),

    setHoliday: (weekId, isHoliday, note = '') => {
      const { data } = get()
      const has = data.payments.some((p) => p.weekId === weekId)
      if (isHoliday && has) {
        // Pembayaran yang sudah masuk tetap tercatat; guru dapat membatalkannya manual.
        get().showToast('Minggu ini sudah ada setoran. Setoran tetap tercatat.', { tone: 'warn' })
      }
      commit((d) => ({
        ...d,
        weeks: d.weeks.map((w) => (w.id === weekId ? { ...w, isHoliday, note: isHoliday ? note : '' } : w)),
      }))
    },

    setWeekAmount: (weekId, amount) =>
      commit((d) => ({ ...d, weeks: d.weeks.map((w) => (w.id === weekId ? { ...w, amount } : w)) })),

    addStudent: (name, joinedWeek) =>
      commit((d) => {
        const maxAbsen = d.students.reduce((a, s) => Math.max(a, s.absen), 0)
        const st: Student = {
          id: uid(),
          absen: maxAbsen + 1,
          name: name.trim(),
          joinedWeek,
          isActive: true,
          leftWeek: null,
        }
        return { ...d, students: [...d.students, st] }
      }),

    updateStudent: (id, patch) =>
      commit((d) => ({ ...d, students: d.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) })),

    deactivateStudent: (id) => {
      const wk = get().weekId
      const prev = get().data.students.find((s) => s.id === id)
      commit((d) => ({
        ...d,
        students: d.students.map((s) => (s.id === id ? { ...s, isActive: false, leftWeek: wk } : s)),
      }))
      if (prev)
        get().showToast(`${prev.name} dinonaktifkan`, {
          tone: 'warn',
          undo: () =>
            commit((d) => ({ ...d, students: d.students.map((s) => (s.id === id ? { ...prev } : s)) })),
        })
    },

    reactivateStudent: (id) => {
      const cur = currentWeekId(sortWeeks(get().data.weeks), todayISO())
      commit((d) => ({
        ...d,
        students: d.students.map((s) =>
          s.id === id ? { ...s, isActive: true, leftWeek: null, joinedWeek: s.leftWeek && s.leftWeek > cur ? s.joinedWeek : cur } : s,
        ),
      }))
    },

    addExpense: async (e, receipt) => {
      const id = uid()
      if (receipt) await saveReceipt(id, receipt)
      commit((d) => ({
        ...d,
        expenses: [{ ...e, id, hasReceipt: !!receipt, createdAt: new Date().toISOString() }, ...d.expenses].sort(
          (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
        ),
      }))
    },

    updateExpense: async (id, e, receipt) => {
      // receipt: undefined = tidak berubah, null = hapus, Receipt = ganti
      if (receipt === null) await deleteReceipt(id)
      else if (receipt) await saveReceipt(id, receipt)
      commit((d) => ({
        ...d,
        expenses: d.expenses
          .map((x) =>
            x.id === id ? { ...x, ...e, hasReceipt: receipt === undefined ? x.hasReceipt : !!receipt } : x,
          )
          .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
      }))
    },

    removeExpense: (id) => {
      const target = get().data.expenses.find((x) => x.id === id)
      if (!target) return
      commit((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== id) }))
      // Foto baru dihapus permanen setelah toast "Urungkan" berakhir.
      let undone = false
      get().showToast('Pengeluaran dihapus', {
        tone: 'warn',
        undo: () => {
          undone = true
          commit((d) => ({
            ...d,
            expenses: [target, ...d.expenses].sort((a, b) => b.date.localeCompare(a.date)),
          }))
        },
      })
      setTimeout(() => {
        if (!undone) void deleteReceipt(id)
      }, 8000)
    },

    saveOpname: (r) => commit((d) => ({ ...d, opnames: [{ ...r, id: uid() }, ...d.opnames].slice(0, 30) })),

    updateSettings: (patch) => commit((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

    setPin: async (pin) => {
      if (pin === null) {
        commit((d) => ({ ...d, settings: { ...d.settings, pinEnabled: false, pinHash: null } }))
        set({ locked: false })
        return
      }
      const h = await hashPin(pin)
      commit((d) => ({ ...d, settings: { ...d.settings, pinEnabled: true, pinHash: h } }))
    },

    unlock: async (pin) => {
      const h = await hashPin(pin)
      if (h === get().data.settings.pinHash) {
        set({ locked: false })
        return true
      }
      return false
    },

    lock: () => {
      const s = get().data.settings
      if (s.pinEnabled && s.pinHash) set({ locked: true })
    },

    resetToSeed: async () => {
      await clearReceipts()
      const seed = buildSeed()
      for (const [id, r] of Object.entries(seed.receipts)) await saveReceipt(id, r)
      const d = ensureWeeks(seed.data)
      persist(d)
      set({ data: d, weekId: currentWeekId(sortWeeks(d.weeks), todayISO()), locked: false })
    },

    resetEmpty: async () => {
      await clearReceipts()
      const d = ensureWeeks(emptyDataSet())
      persist(d)
      set({ data: d, weekId: currentWeekId(sortWeeks(d.weeks), todayISO()), locked: false })
    },

    exportJSON: async () => {
      const { data } = get()
      const receipts = await allReceipts(data.expenses.filter((e) => e.hasReceipt).map((e) => e.id))
      return JSON.stringify(
        { app: 'kas-kelas-sd', version: 1, exportedAt: new Date().toISOString(), data, receipts },
        null,
        2,
      )
    },

    importJSON: async (text) => {
      try {
        const parsed = JSON.parse(text)
        const d = (parsed?.app === 'kas-kelas-sd' ? parsed.data : parsed) as DataSet
        if (
          !d ||
          !d.settings ||
          !Array.isArray(d.students) ||
          !Array.isArray(d.weeks) ||
          !Array.isArray(d.payments) ||
          !Array.isArray(d.expenses)
        )
          return { ok: false, message: 'Format file tidak dikenali.' }
        await clearReceipts()
        const receipts = (parsed.receipts ?? {}) as Record<string, Receipt>
        for (const [id, r] of Object.entries(receipts)) if (r?.full) await saveReceipt(id, r)
        const next = ensureWeeks({ ...emptyDataSet(), ...d, opnames: d.opnames ?? [] })
        persist(next)
        set({
          data: next,
          weekId: currentWeekId(sortWeeks(next.weeks), todayISO()),
          locked: next.settings.pinEnabled && !!next.settings.pinHash,
        })
        return {
          ok: true,
          message: `Berhasil impor ${next.students.length} siswa, ${next.payments.length} setoran, ${next.expenses.length} pengeluaran.`,
        }
      } catch {
        return { ok: false, message: 'File bukan JSON yang valid.' }
      }
    },

    showToast: (message, opts) => {
      if (toastTimer) clearTimeout(toastTimer)
      const id = ++toastSeq
      set({ toast: { id, message, undo: opts?.undo, tone: opts?.tone } })
      toastTimer = setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), opts?.undo ? 6000 : 2600)
    },

    dismissToast: () => set({ toast: null }),
  }
})

// Helper hooks
/** Daftar minggu terurut (di-memo agar referensi stabil; selector yang membuat array baru memicu loop di Zustand v5). */
export function useWeeks(): Week[] {
  const weeks = useStore((s) => s.data.weeks)
  return useMemo(() => sortWeeks(weeks), [weeks])
}
export { payKey }
export type { Week }
