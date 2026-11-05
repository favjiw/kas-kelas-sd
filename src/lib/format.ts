const nf = new Intl.NumberFormat('id-ID')

export const num = (n: number) => nf.format(Math.round(n))
export const rupiah = (n: number) => `${n < 0 ? '-' : ''}Rp ${nf.format(Math.abs(Math.round(n)))}`

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const pad = (n: number) => String(n).padStart(2, '0')

/** Date lokal -> "YYYY-MM-DD" (tanpa pergeseran zona waktu). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export const todayISO = () => toISODate(new Date())

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Senin dari minggu yang memuat tanggal `iso`. */
export function mondayOf(iso: string): string {
  const d = parseISODate(iso)
  const dow = (d.getDay() + 6) % 7 // Senin = 0
  d.setDate(d.getDate() - dow)
  return toISODate(d)
}

export function formatDate(iso: string, withYear = true): string {
  const d = parseISODate(iso)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`
}

export function formatDateLong(iso: string): string {
  const d = parseISODate(iso)
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function monthYear(iso: string): string {
  const d = parseISODate(iso)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "2 – 8 Nov" atau "30 Nov – 6 Des" untuk minggu yang dimulai pada `startIso`. */
export function formatWeekRange(startIso: string, withYear = false): string {
  const a = parseISODate(startIso)
  const b = parseISODate(addDays(startIso, 6))
  const year = withYear ? ` ${b.getFullYear()}` : ''
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}${year}`
  }
  return `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}${year}`
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export const digitsOnly = (s: string) => s.replace(/\D/g, '')
