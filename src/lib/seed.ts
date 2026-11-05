import type { DataSet, Expense, Payment, Receipt, Student, Week } from './types'
import { addDays, mondayOf, toISODate, uid } from './format'
import { makeWeek } from './calc'

/** PRNG deterministik supaya seed data selalu konsisten. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NAMES = [
  'Adit Pratama', 'Aisyah Putri', 'Alya Nurfadilah', 'Bagas Saputra', 'Bintang Ramadhan',
  'Budi Santoso', 'Cantika Dewi', 'Dafa Maulana', 'Dewi Lestari', 'Dimas Aryo',
  'Eka Putri Ananda', 'Farhan Hidayat', 'Fitri Handayani', 'Gita Permata', 'Hafiz Alfarizi',
  'Indah Cahyani', 'Joko Prasetyo', 'Kayla Zahra', 'Lintang Cahaya', 'Muhammad Rizky',
  'Nabila Azzahra', 'Putra Wijaya', 'Rafi Ahmad', 'Rina Wulandari', 'Salsabila Nur',
  'Siti Rahma', 'Tegar Mahendra', 'Wahyu Nugroho', 'Yusuf Ibrahim',
]

export const DEFAULT_SETTINGS = {
  className: 'Kelas 4B',
  schoolName: 'SD Negeri 1 Harapan Bangsa',
  teacherName: 'Bu Ratna',
  academicYear: '2026/2027',
  weeklyAmount: 2000,
  openingBalance: 0,
  pinEnabled: false,
  pinHash: null as string | null,
}

export function emptyDataSet(now = new Date()): DataSet {
  const cur = mondayOf(toISODate(now))
  return {
    settings: { ...DEFAULT_SETTINGS },
    students: [],
    weeks: [makeWeek(cur, DEFAULT_SETTINGS.weeklyAmount)],
    payments: [],
    expenses: [],
    opnames: [],
  }
}

export interface SeedResult {
  data: DataSet
  receipts: Record<string, Receipt>
}

/** Nota palsu (digambar di canvas) supaya demo punya contoh foto nota. */
function fakeReceipt(title: string, lines: [string, number][]): Receipt | null {
  try {
    const W = 600
    const H = 220 + lines.length * 44
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')
    if (!g) return null
    g.fillStyle = '#fffdf5'
    g.fillRect(0, 0, W, H)
    g.fillStyle = '#1f2937'
    g.font = 'bold 34px monospace'
    g.textAlign = 'center'
    g.fillText(title, W / 2, 56)
    g.font = '20px monospace'
    g.fillText('Jl. Merdeka No. 12', W / 2, 88)
    g.textAlign = 'left'
    g.strokeStyle = '#9ca3af'
    g.setLineDash([6, 6])
    g.beginPath()
    g.moveTo(24, 110)
    g.lineTo(W - 24, 110)
    g.stroke()
    let y = 150
    let total = 0
    g.font = '24px monospace'
    for (const [n, p] of lines) {
      g.textAlign = 'left'
      g.fillText(n, 28, y)
      g.textAlign = 'right'
      g.fillText(p.toLocaleString('id-ID'), W - 28, y)
      total += p
      y += 44
    }
    g.beginPath()
    g.moveTo(24, y - 22)
    g.lineTo(W - 24, y - 22)
    g.stroke()
    g.font = 'bold 28px monospace'
    g.textAlign = 'left'
    g.fillText('TOTAL', 28, y + 20)
    g.textAlign = 'right'
    g.fillText(total.toLocaleString('id-ID'), W - 28, y + 20)
    const full = c.toDataURL('image/jpeg', 0.8)
    const t = document.createElement('canvas')
    const r = 200 / Math.max(W, H)
    t.width = Math.round(W * r)
    t.height = Math.round(H * r)
    t.getContext('2d')?.drawImage(c, 0, 0, t.width, t.height)
    return { full, thumb: t.toDataURL('image/jpeg', 0.7) }
  } catch {
    return null
  }
}

/** Data contoh realistis: Kelas 4B, 29 siswa, 12 minggu (1 libur), beberapa pengeluaran. */
export function buildSeed(now = new Date()): SeedResult {
  const rand = rng(4242)
  const cur = mondayOf(toISODate(now))
  const PAST = 9
  const FUTURE = 2
  const firstWeek = addDays(cur, -PAST * 7)
  const amount = DEFAULT_SETTINGS.weeklyAmount

  const weeks: Week[] = []
  for (let i = -PAST; i <= FUTURE; i++) weeks.push(makeWeek(addDays(cur, i * 7), amount))
  const holidayIdx = 4
  weeks[holidayIdx].isHoliday = true
  weeks[holidayIdx].note = 'Libur tengah semester'

  const students: Student[] = NAMES.map((name, i) => ({
    id: `s${i + 1}`,
    absen: i + 1,
    name,
    joinedWeek: firstWeek,
    isActive: true,
    leftWeek: null,
  }))
  // Pindah masuk: tidak punya tunggakan sebelum bergabung.
  const joinIdx = (n: number) => weeks[n].id
  students[19].joinedWeek = joinIdx(6) // Muhammad Rizky
  students[23].joinedWeek = joinIdx(8) // Rina Wulandari
  // Pindah keluar: nonaktif, riwayat tetap ada.
  students[14].isActive = false // Hafiz Alfarizi
  students[14].leftWeek = joinIdx(7)

  // Profil kebiasaan bayar: lancar, kadang telat, sering telat, bayar di muka.
  const skip: Record<number, number[]> = {
    2: [PAST], 5: [PAST - 1, PAST], 8: [PAST], 11: [PAST - 3, PAST - 2, PAST - 1, PAST],
    16: [PAST, PAST - 1], 21: [PAST - 5, PAST], 26: [PAST], 6: [PAST - 2],
  }
  const prepaid: Record<number, number> = { 0: 2, 9: 1, 17: 2, 25: 1 }

  const payments: Payment[] = []
  students.forEach((st, si) => {
    weeks.forEach((wk, wi) => {
      if (wk.isHoliday) return
      if (wk.id < st.joinedWeek) return
      if (st.leftWeek && wk.id >= st.leftWeek) return
      const rel = wi - PAST // 0 = minggu berjalan
      let pay = false
      if (rel < 0) pay = !(skip[si] ?? []).includes(wi)
      else if (rel === 0) pay = rand() < 0.62 && !(skip[si] ?? []).includes(wi)
      else pay = rel <= (prepaid[si] ?? 0)
      if (!pay) return
      // Siswa yang melewatkan minggu di belakang tidak mungkin melunasi minggu setelahnya... tetap diizinkan.
      const day = addDays(wk.id, Math.floor(rand() * 4))
      payments.push({
        id: uid(),
        studentId: st.id,
        weekId: wk.id,
        amount: wk.amount,
        paidAt: `${day}T0${7 + Math.floor(rand() * 2)}:${String(10 + Math.floor(rand() * 40))}:00`,
      })
    })
  })

  const receipts: Record<string, Receipt> = {}
  const mkExpense = (
    dayOffset: number,
    category: Expense['category'],
    amountRp: number,
    note: string,
    receipt?: Receipt | null,
  ): Expense => {
    const id = uid()
    if (receipt) receipts[id] = receipt
    const date = addDays(firstWeek, dayOffset)
    return { id, date, category, amount: amountRp, note, hasReceipt: !!receipt, createdAt: `${date}T10:00:00` }
  }

  const expenses: Expense[] = [
    mkExpense(
      9, 'alat-tulis', 37500, 'Spidol, kapur, penghapus papan',
      fakeReceipt('TOKO ATK MAJU', [['Spidol board x3', 18000], ['Kapur tulis', 9500], ['Penghapus papan', 10000]]),
    ),
    mkExpense(16, 'kebersihan', 22000, 'Sapu, pel, pewangi lantai'),
    mkExpense(
      23, 'fotokopi', 30000, 'Fotokopi soal latihan UTS',
      fakeReceipt('FOTOKOPI BERKAH', [['Fotokopi 150 lbr', 30000]]),
    ),
    mkExpense(33, 'sosial', 50000, 'Jenguk teman yang sakit'),
    mkExpense(44, 'perlengkapan', 45000, 'Lakban, double tape, hiasan dinding kelas'),
    mkExpense(54, 'konsumsi', 35000, 'Snack lomba kebersihan kelas'),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const data: DataSet = {
    settings: { ...DEFAULT_SETTINGS, openingBalance: 25000 },
    students,
    weeks,
    payments,
    expenses,
    opnames: [],
  }
  return { data, receipts }
}
