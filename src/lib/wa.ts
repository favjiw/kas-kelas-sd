import type { Arrear } from './calc'
import { formatDate, formatWeekRange, rupiah, todayISO } from './format'
import type { DataSet, Week } from './types'
import { categoryOf } from './types'

interface WaInput {
  data: DataSet
  week: Week
  weekNo: number
  collected: number
  paidCount: number
  total: number
  unpaidNames: string[]
  income: number
  expense: number
  balance: number
  arrears: Arrear[]
}

/** Ringkasan rapi untuk dikirim ke WAG paguyuban orang tua. */
export function buildWaSummary(i: WaInput): string {
  const { settings } = i.data
  const L: string[] = []
  L.push(`📒 *LAPORAN KAS ${settings.className.toUpperCase()}*`)
  if (settings.schoolName) L.push(settings.schoolName)
  L.push(`🗓️ Per ${formatDate(todayISO())}`)
  L.push('')
  L.push(`*Minggu ke-${i.weekNo}* (${formatWeekRange(i.week.id)})`)
  if (i.week.isHoliday) {
    L.push(`🏖️ Libur${i.week.note ? ` – ${i.week.note}` : ''}. Tidak ada tarikan kas.`)
  } else {
    L.push(`✅ Sudah setor: ${i.paidCount} dari ${i.total} siswa`)
    L.push(`💵 Terkumpul minggu ini: ${rupiah(i.collected)}`)
    if (i.unpaidNames.length) {
      L.push(`⏳ Belum setor (${i.unpaidNames.length}): ${i.unpaidNames.join(', ')}`)
    } else {
      L.push('🎉 Semua siswa sudah setor!')
    }
  }
  L.push('')
  L.push('*💰 Saldo Kas*')
  L.push(`⬇️ Total masuk: ${rupiah(i.income + settings.openingBalance)}`)
  L.push(`⬆️ Total keluar: ${rupiah(i.expense)}`)
  L.push(`🏦 *Sisa saldo: ${rupiah(i.balance)}*`)

  const recent = i.data.expenses.slice(0, 5)
  if (recent.length) {
    L.push('')
    L.push('*🧾 Pengeluaran Terakhir*')
    for (const e of recent) {
      L.push(`• ${formatDate(e.date, false)} – ${e.note || categoryOf(e.category).label}: ${rupiah(e.amount)}`)
    }
  }

  if (i.arrears.length) {
    L.push('')
    L.push(`*📌 Tunggakan (${i.arrears.length} siswa)*`)
    for (const a of i.arrears.slice(0, 15)) {
      L.push(`• ${a.student.name} – ${a.weeks.length} minggu (${rupiah(a.amount)})`)
    }
    if (i.arrears.length > 15) L.push(`… dan ${i.arrears.length - 15} siswa lainnya`)
  }
  L.push('')
  L.push('Terima kasih Bapak/Ibu 🙏')
  L.push(`_${settings.teacherName ? `Bendahara: ${settings.teacherName}` : 'Bendahara Kelas'}_`)
  return L.join('\n')
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
