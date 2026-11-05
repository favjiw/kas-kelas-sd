import type { Expense, Payment, Student, Week } from './types'
import { addDays, mondayOf } from './format'

export type PaymentIndex = Map<string, Payment>
export type CellStatus = 'paid' | 'unpaid' | 'holiday' | 'na'

export const MAX_PREPAY_WEEKS = 52

export const payKey = (studentId: string, weekId: string) => `${studentId}|${weekId}`

export function indexPayments(payments: Payment[]): PaymentIndex {
  const m: PaymentIndex = new Map()
  for (const p of payments) m.set(payKey(p.studentId, p.weekId), p)
  return m
}

export const sortWeeks = (weeks: Week[]) => [...weeks].sort((a, b) => a.id.localeCompare(b.id))
export const sortStudents = (students: Student[]) => [...students].sort((a, b) => a.absen - b.absen)

export function makeWeek(id: string, amount: number): Week {
  return { id, amount, isHoliday: false, note: '' }
}

/** Nomor minggu (1-based) berdasarkan urutan minggu. `weeks` harus sudah terurut. */
export function weekNumber(weeks: Week[], weekId: string): number {
  return weeks.findIndex((w) => w.id === weekId) + 1
}

/** Id minggu yang memuat `todayIso` (atau minggu terdekat jika di luar jangkauan). */
export function currentWeekId(weeks: Week[], todayIso: string): string {
  const cur = weeks.find((w) => w.id <= todayIso && todayIso <= addDays(w.id, 6))
  if (cur) return cur.id
  if (weeks.length === 0) return mondayOf(todayIso)
  return todayIso < weeks[0].id ? weeks[0].id : weeks[weeks.length - 1].id
}

/** Minggu-minggu baru yang perlu ditambahkan agar minggu terakhir memuat `untilIso`. */
export function weeksToAppend(weeks: Week[], untilIso: string, amount: number): Week[] {
  const out: Week[] = []
  let last = weeks.length ? weeks[weeks.length - 1].id : null
  if (last === null) {
    last = mondayOf(untilIso)
    out.push(makeWeek(last, amount))
  }
  let guard = 0
  while (addDays(last, 6) < untilIso && guard++ < 200) {
    last = addDays(last, 7)
    out.push(makeWeek(last, amount))
  }
  return out
}

/** Apakah siswa wajib kas di minggu ini? (bukan libur, sudah bergabung, belum keluar) */
export function isObligated(st: Student, wk: Week): boolean {
  if (wk.isHoliday) return false
  if (wk.id < st.joinedWeek) return false
  if (st.leftWeek && wk.id >= st.leftWeek) return false
  return true
}

export function cellStatus(st: Student, wk: Week, idx: PaymentIndex): CellStatus {
  if (idx.has(payKey(st.id, wk.id))) return 'paid'
  if (wk.isHoliday) return 'holiday'
  return isObligated(st, wk) ? 'unpaid' : 'na'
}

/** Semua minggu wajib yang belum dibayar (termasuk minggu depan yang sudah ada). */
export function unpaidWeeks(st: Student, weeks: Week[], idx: PaymentIndex): Week[] {
  return weeks.filter((w) => isObligated(st, w) && !idx.has(payKey(st.id, w.id)))
}

/** Tunggakan = minggu wajib yang belum dibayar sampai dengan minggu berjalan. */
export function arrearsWeeks(st: Student, weeks: Week[], idx: PaymentIndex, curId: string): Week[] {
  return unpaidWeeks(st, weeks, idx).filter((w) => w.id <= curId)
}

export const sumAmount = (ws: Week[]) => ws.reduce((a, w) => a + w.amount, 0)

/** Siswa yang tampil di daftar suatu minggu: wajib kas di minggu itu, atau sudah punya pembayaran. */
export function studentsInWeek(students: Student[], wk: Week, idx: PaymentIndex): Student[] {
  return sortStudents(students.filter((s) => isObligated(s, wk) || idx.has(payKey(s.id, wk.id))))
}

export interface WeekStats {
  list: Student[]
  paidCount: number
  total: number
  collected: number
  target: number
}

export function weekStats(wk: Week, students: Student[], payments: Payment[], idx: PaymentIndex): WeekStats {
  const list = studentsInWeek(students, wk, idx)
  const paidCount = list.filter((s) => idx.has(payKey(s.id, wk.id))).length
  const collected = payments.filter((p) => p.weekId === wk.id).reduce((a, p) => a + p.amount, 0)
  const target = wk.isHoliday ? 0 : list.filter((s) => isObligated(s, wk)).length * wk.amount
  return { list, paidCount, total: list.length, collected, target }
}

/** Minggu terakhir (setelah minggu berjalan) yang sudah dibayar di muka, jika ada. */
export function prepaidUntil(st: Student, weeks: Week[], idx: PaymentIndex, curId: string): Week | null {
  let last: Week | null = null
  for (const w of weeks) if (w.id > curId && idx.has(payKey(st.id, w.id))) last = w
  return last
}

export interface PaymentPlan {
  /** Minggu yang akan dilunasi (urut, melompati minggu libur). */
  targets: Week[]
  /** Minggu baru yang belum ada dan harus dibuat. */
  created: Week[]
}

/**
 * Alokasikan `count` minggu pembayaran: dimulai dari tunggakan paling lama,
 * melompati minggu libur & minggu yang sudah lunas. Minggu di masa depan dibuat otomatis.
 */
export function planPayment(
  st: Student,
  weeks: Week[],
  idx: PaymentIndex,
  count: number,
  newWeekAmount: number,
): PaymentPlan {
  const targets: Week[] = []
  const all = [...weeks]
  const created: Week[] = []
  const want = Math.min(Math.max(0, Math.floor(count)), MAX_PREPAY_WEEKS)
  let i = 0
  while (targets.length < want && i < 600) {
    if (i >= all.length) {
      const nw = makeWeek(addDays(all[all.length - 1].id, 7), newWeekAmount)
      all.push(nw)
      created.push(nw)
    }
    const w = all[i++]
    if (st.leftWeek && w.id >= st.leftWeek) break
    if (isObligated(st, w) && !idx.has(payKey(st.id, w.id))) targets.push(w)
  }
  const lastId = targets.length ? targets[targets.length - 1].id : ''
  return { targets, created: created.filter((w) => w.id <= lastId) }
}

export interface Arrear {
  student: Student
  weeks: Week[]
  amount: number
}

export function allArrears(students: Student[], weeks: Week[], idx: PaymentIndex, curId: string): Arrear[] {
  const out: Arrear[] = []
  for (const s of students) {
    if (!s.isActive) continue
    const ws = arrearsWeeks(s, weeks, idx, curId)
    if (ws.length) out.push({ student: s, weeks: ws, amount: sumAmount(ws) })
  }
  return out.sort((a, b) => b.amount - a.amount || a.student.absen - b.student.absen)
}

export function totals(payments: Payment[], expenses: Expense[], opening: number) {
  const income = payments.reduce((a, p) => a + p.amount, 0)
  const expense = expenses.reduce((a, e) => a + e.amount, 0)
  return { income, expense, opening, balance: opening + income - expense }
}

export type OpnameStatus = 'cocok' | 'kurang' | 'lebih'

export function opnameStatus(physical: number, system: number): OpnameStatus {
  if (physical === system) return 'cocok'
  return physical < system ? 'kurang' : 'lebih'
}

export function opnameTotal(counts: Record<string, number>): number {
  return Object.entries(counts).reduce((a, [k, v]) => a + Number(k) * (v || 0), 0)
}
