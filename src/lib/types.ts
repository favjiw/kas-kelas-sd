export interface Settings {
  className: string
  schoolName: string
  teacherName: string
  academicYear: string
  /** Nominal kas default per minggu (dipakai untuk minggu baru). */
  weeklyAmount: number
  /** Saldo awal kas (mis. sisa semester lalu). */
  openingBalance: number
  pinEnabled: boolean
  pinHash: string | null
}

export interface Student {
  id: string
  absen: number
  name: string
  /** id minggu (tanggal Senin) saat siswa mulai wajib kas. */
  joinedWeek: string
  isActive: boolean
  /** id minggu pertama siswa TIDAK lagi wajib kas (pindah keluar). */
  leftWeek: string | null
}

export interface Week {
  /** Tanggal Senin minggu tersebut, format YYYY-MM-DD. Sekaligus id. */
  id: string
  amount: number
  isHoliday: boolean
  note: string
}

export interface Payment {
  id: string
  studentId: string
  weekId: string
  amount: number
  paidAt: string
}

export type ExpenseCategoryId =
  | 'alat-tulis'
  | 'kebersihan'
  | 'fotokopi'
  | 'konsumsi'
  | 'sosial'
  | 'perlengkapan'
  | 'lainnya'

export interface Expense {
  id: string
  date: string
  category: ExpenseCategoryId
  amount: number
  note: string
  hasReceipt: boolean
  createdAt: string
}

export interface OpnameRecord {
  id: string
  date: string
  counts: Record<string, number>
  physical: number
  system: number
  diff: number
}

export interface DataSet {
  settings: Settings
  students: Student[]
  weeks: Week[]
  payments: Payment[]
  expenses: Expense[]
  opnames: OpnameRecord[]
}

export interface Receipt {
  full: string
  thumb: string
}

export const EXPENSE_CATEGORIES: { id: ExpenseCategoryId; label: string; emoji: string }[] = [
  { id: 'alat-tulis', label: 'Alat Tulis', emoji: '✏️' },
  { id: 'kebersihan', label: 'Kebersihan', emoji: '🧹' },
  { id: 'fotokopi', label: 'Fotokopi & Cetak', emoji: '🖨️' },
  { id: 'konsumsi', label: 'Konsumsi & Acara', emoji: '🍪' },
  { id: 'sosial', label: 'Sosial & Hadiah', emoji: '🎁' },
  { id: 'perlengkapan', label: 'Perlengkapan Kelas', emoji: '🪑' },
  { id: 'lainnya', label: 'Lainnya', emoji: '📦' },
]

export const categoryOf = (id: string) =>
  EXPENSE_CATEGORIES.find((c) => c.id === id) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]

export const DENOMINATIONS: { value: number; label: string; coin?: boolean }[] = [
  { value: 100000, label: '100.000' },
  { value: 50000, label: '50.000' },
  { value: 20000, label: '20.000' },
  { value: 10000, label: '10.000' },
  { value: 5000, label: '5.000' },
  { value: 2000, label: '2.000' },
  { value: 1000, label: '1.000' },
  { value: 500, label: '500', coin: true },
  { value: 200, label: '200', coin: true },
  { value: 100, label: '100', coin: true },
]
