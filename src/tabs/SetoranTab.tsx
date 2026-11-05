import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ChevronDown, CalendarOff, Search, Users, PartyPopper, Plane } from 'lucide-react'
import { useStore, useWeeks } from '../lib/store'
import {
  arrearsWeeks,
  cellStatus,
  currentWeekId,
  indexPayments,
  isObligated,
  payKey,
  planPayment,
  prepaidUntil,
  sumAmount,
  weekNumber,
  weekStats,
} from '../lib/calc'
import { digitsOnly, formatDate, formatWeekRange, num, rupiah, todayISO } from '../lib/format'
import type { Student, Week } from '../lib/types'
import { Empty, Header, inputCls, PrimaryButton, Sheet } from '../components/ui'

type Filter = 'all' | 'unpaid'

export function SetoranTab() {
  const data = useStore((s) => s.data)
  const weekId = useStore((s) => s.weekId)
  const setWeekId = useStore((s) => s.setWeekId)
  const togglePay = useStore((s) => s.togglePay)
  const setHoliday = useStore((s) => s.setHoliday)
  const weeks = useWeeks()

  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [picker, setPicker] = useState(false)
  const [sheetStudentId, setSheetStudentId] = useState<string | null>(null)

  const idx = useMemo(() => indexPayments(data.payments), [data.payments])
  const todayWeek = currentWeekId(weeks, todayISO())
  const wk = weeks.find((w) => w.id === weekId) ?? weeks[0]
  const pos = weeks.findIndex((w) => w.id === wk.id)
  const stats = useMemo(() => weekStats(wk, data.students, data.payments, idx), [wk, data.students, data.payments, idx])

  const q = query.trim().toLowerCase()
  const visible = stats.list.filter((s) => {
    if (q && !s.name.toLowerCase().includes(q) && !String(s.absen).includes(q)) return false
    if (filter === 'unpaid') return !idx.has(payKey(s.id, wk.id))
    return true
  })
  const unpaidCount = stats.list.filter((s) => isObligated(s, wk) && !idx.has(payKey(s.id, wk.id))).length
  const pct = stats.target ? Math.min(100, Math.round((stats.collected / stats.target) * 100)) : wk.isHoliday ? 100 : 0
  const sheetStudent = data.students.find((s) => s.id === sheetStudentId) ?? null

  const isCurrent = wk.id === todayWeek
  const relLabel = isCurrent ? 'Minggu ini' : wk.id < todayWeek ? 'Sudah lewat' : 'Mendatang'

  return (
    <>
      <Header
        title={`Setoran Kas ${data.settings.className}`}
        subtitle={`${data.settings.weeklyAmount > 0 ? rupiah(data.settings.weeklyAmount) : 'Rp 0'} / minggu`}
      />

      {/* Selector minggu */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+4.1rem)] z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-2">
          <button
            aria-label="Minggu sebelumnya"
            disabled={pos <= 0}
            onClick={() => setWeekId(weeks[pos - 1].id)}
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200 disabled:opacity-30"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => setPicker(true)}
            className="flex min-w-0 flex-1 flex-col items-center rounded-xl px-2 py-1 active:bg-slate-100"
          >
            <span className="flex items-center gap-1 text-base font-extrabold text-slate-900">
              Minggu ke-{weekNumber(weeks, wk.id)} <ChevronDown size={16} className="text-slate-400" />
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              {formatWeekRange(wk.id, true)}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  wk.isHoliday
                    ? 'bg-amber-100 text-amber-700'
                    : isCurrent
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                {wk.isHoliday ? 'LIBUR' : relLabel}
              </span>
            </span>
          </button>
          <button
            aria-label="Minggu berikutnya"
            disabled={pos >= weeks.length - 1}
            onClick={() => setWeekId(weeks[pos + 1].id)}
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200 disabled:opacity-30"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {!wk.isHoliday && (
          <div className="mx-auto flex max-w-lg items-center gap-2 px-3 pb-2">
            <div className="flex flex-1 rounded-xl bg-slate-100 p-1">
              {(
                [
                  ['all', `Semua (${stats.list.length})`],
                  ['unpaid', `Belum Bayar (${unpaidCount})`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`h-10 flex-1 rounded-lg text-sm font-bold transition ${
                    filter === k ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-lg px-3 pb-44 pt-3">
        {wk.isHoliday ? (
          <HolidayBanner week={wk} onUndo={() => setHoliday(wk.id, false)} />
        ) : (
          <>
            {stats.list.length > 8 && (
              <div className="relative mb-3">
                <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama / no. absen"
                  inputMode="search"
                  className={`${inputCls} pl-10`}
                />
              </div>
            )}
            {stats.list.length === 0 ? (
              <Empty icon={<Users size={28} />} title="Belum ada siswa" text="Tambah siswa di tab Pengaturan." />
            ) : visible.length === 0 ? (
              filter === 'unpaid' && !q ? (
                <Empty icon={<PartyPopper size={28} />} title="Semua sudah setor! 🎉" text="Tidak ada siswa yang belum bayar minggu ini." />
              ) : (
                <Empty icon={<Search size={28} />} title="Tidak ditemukan" />
              )
            ) : (
              <ul className="space-y-2">
                {visible.map((s) => (
                  <StudentRow
                    key={s.id}
                    student={s}
                    week={wk}
                    paid={idx.has(payKey(s.id, wk.id))}
                    onToggle={() => togglePay(s.id, wk.id)}
                    onOpen={() => setSheetStudentId(s.id)}
                    weeks={weeks}
                    idx={idx}
                    todayWeek={todayWeek}
                  />
                ))}
              </ul>
            )}
            {!wk.isHoliday && (
              <button
                onClick={() => setHoliday(wk.id, true, 'Libur')}
                className="mx-auto mt-6 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-amber-700 active:bg-amber-50"
              >
                <CalendarOff size={18} /> Tandai minggu ini libur / bebas kas
              </button>
            )}
          </>
        )}
      </div>

      {/* Sticky footer total */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 py-2.5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Terkumpul minggu ini</p>
              <p className="text-2xl font-extrabold leading-tight text-emerald-700">{rupiah(stats.collected)}</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-bold text-slate-700">
                {stats.paidCount}/{stats.total} siswa
              </p>
              <p>{wk.isHoliday ? 'Libur · target Rp 0' : `Target ${rupiah(stats.target)}`}</p>
            </div>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <WeekPicker open={picker} onClose={() => setPicker(false)} />
      <PaySheet student={sheetStudent} weekId={wk.id} onClose={() => setSheetStudentId(null)} />
    </>
  )
}

function HolidayBanner({ week, onUndo }: { week: Week; onUndo: () => void }) {
  return (
    <div className="mt-2 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
      <div className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-amber-100 text-amber-600">
        <Plane size={30} />
      </div>
      <h2 className="text-lg font-extrabold text-amber-900">Minggu Libur / Bebas Kas</h2>
      {week.note && <p className="text-sm text-amber-800">{week.note}</p>}
      <p className="mx-auto mt-2 max-w-xs text-sm text-amber-800">
        Target Rp 0 dan tidak dihitung sebagai tunggakan. Pembayaran di muka akan melompati minggu ini.
      </p>
      <div className="mx-auto mt-4 max-w-xs">
        <PrimaryButton tone="amber" onClick={onUndo}>
          Batalkan Libur
        </PrimaryButton>
      </div>
    </div>
  )
}

function StudentRow({
  student: s,
  week,
  paid,
  onToggle,
  onOpen,
  weeks,
  idx,
  todayWeek,
}: {
  student: Student
  week: Week
  paid: boolean
  onToggle: () => void
  onOpen: () => void
  weeks: Week[]
  idx: ReturnType<typeof indexPayments>
  todayWeek: string
}) {
  const arrears = arrearsWeeks(s, weeks, idx, todayWeek)
  const ahead = prepaidUntil(s, weeks, idx, todayWeek)
  let sub: { text: string; cls: string } | null = null
  if (arrears.length) sub = { text: `Tunggak ${arrears.length} minggu · ${rupiah(sumAmount(arrears))}`, cls: 'text-rose-600' }
  else if (ahead) sub = { text: `Lunas di muka s/d ${formatDate(ahead.id, false)}`, cls: 'text-sky-600' }
  else if (week.id === s.joinedWeek && s.joinedWeek > weeks[0].id) sub = { text: 'Siswa baru (pindah masuk)', cls: 'text-violet-600' }
  if (!s.isActive) sub = { text: 'Pindah / nonaktif', cls: 'text-slate-400' }

  return (
    <li
      className={`flex items-center gap-1 rounded-2xl border bg-white pl-3 shadow-sm transition ${
        paid ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-100'
      }`}
    >
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left active:opacity-70">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
            paid ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {s.absen}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-bold text-slate-900">{s.name}</span>
          <span className={`block truncate text-xs font-medium ${sub?.cls ?? 'text-slate-400'}`}>
            {paid ? 'Sudah setor' : sub ? sub.text : 'Belum setor'}
            {paid && sub ? ` · ${sub.text}` : ''}
          </span>
        </span>
      </button>
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={paid}
        aria-label={`${paid ? 'Batalkan setoran' : 'Catat setoran'} ${s.name}`}
        className="grid size-[4.25rem] shrink-0 place-items-center self-stretch rounded-r-2xl active:bg-emerald-100/60"
      >
        <span
          className={`grid size-11 place-items-center rounded-xl border-2 transition ${
            paid ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'
          }`}
        >
          <Check size={26} strokeWidth={3.5} />
        </span>
      </button>
    </li>
  )
}

function WeekPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useStore((s) => s.data)
  const weeks = useWeeks()
  const weekId = useStore((s) => s.weekId)
  const setWeekId = useStore((s) => s.setWeekId)
  const addNextWeek = useStore((s) => s.addNextWeek)
  const idx = useMemo(() => indexPayments(data.payments), [data.payments])
  const today = currentWeekId(weeks, todayISO())
  return (
    <Sheet open={open} onClose={onClose} title="Pilih Minggu">
      <ul className="space-y-1.5 pb-2">
        {weeks.map((w, i) => {
          const st = weekStats(w, data.students, data.payments, idx)
          const active = w.id === weekId
          return (
            <li key={w.id}>
              <button
                onClick={() => {
                  setWeekId(w.id)
                  onClose()
                }}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                  active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white active:bg-slate-50'
                }`}
              >
                <span>
                  <span className="block font-bold text-slate-900">
                    Minggu ke-{i + 1}
                    {w.id === today && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">INI</span>}
                  </span>
                  <span className="text-xs text-slate-500">{formatWeekRange(w.id, true)}</span>
                </span>
                <span className="text-right text-sm">
                  {w.isHoliday ? (
                    <span className="font-bold text-amber-600">Libur</span>
                  ) : (
                    <>
                      <span className="block font-bold text-slate-800">{rupiah(st.collected)}</span>
                      <span className="text-xs text-slate-500">
                        {st.paidCount}/{st.total} siswa
                      </span>
                    </>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <button
        onClick={addNextWeek}
        className="mb-2 h-12 w-full rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-600 active:bg-slate-50"
      >
        + Tambah minggu berikutnya
      </button>
    </Sheet>
  )
}

const QUICK_WEEKS = [1, 2, 4, 8]

function PaySheet({ student, weekId, onClose }: { student: Student | null; weekId: string; onClose: () => void }) {
  return (
    <Sheet open={!!student} onClose={onClose} title={student ? student.name : ''}>
      {student && <PaySheetBody key={student.id} student={student} weekId={weekId} onClose={onClose} />}
    </Sheet>
  )
}

function PaySheetBody({ student, weekId, onClose }: { student: Student; weekId: string; onClose: () => void }) {
  const data = useStore((s) => s.data)
  const payWeeks = useStore((s) => s.payWeeks)
  const togglePay = useStore((s) => s.togglePay)
  const showToast = useStore((s) => s.showToast)
  const weeks = useWeeks()
  const idx = useMemo(() => indexPayments(data.payments), [data.payments])
  const today = currentWeekId(weeks, todayISO())
  const [count, setCount] = useState(1)
  const [cash, setCash] = useState('')

  const weekly = data.settings.weeklyAmount
  const plan = useMemo(
    () => planPayment(student, weeks, idx, count, weekly),
    [student, weeks, idx, count, weekly],
  )
  const total = sumAmount(plan.targets)
  const first = plan.targets[0]
  const last = plan.targets[plan.targets.length - 1]
  const skipped =
    first && last ? weeks.filter((w) => w.isHoliday && w.id > first.id && w.id < last.id).length : 0
  const arrears = arrearsWeeks(student, weeks, idx, today)
  const cashNum = Number(digitsOnly(cash) || 0)

  const setFromCash = (v: string) => {
    setCash(v)
    const n = Number(digitsOnly(v) || 0)
    // jumlah minggu terbanyak yang total tagihannya ≤ uang diterima
    const p = planPayment(student, weeks, idx, 52, weekly)
    let sum = 0
    let c = 0
    for (const w of p.targets) {
      if (sum + w.amount > n) break
      sum += w.amount
      c++
    }
    setCount(Math.max(c, 0))
  }
  const change = cash ? cashNum - total : 0
  const weekNow = weeks.find((w) => w.id === weekId)
  const paidThisWeek = idx.has(payKey(student.id, weekId))

  const submit = () => {
    const r = payWeeks(student.id, count)
    if (r.paid > 0) {
      showToast(`${student.name}: ${r.paid} minggu lunas (${rupiah(total)})`)
      onClose()
    }
  }

  return (
    <div className="pb-2">
      <div className="mb-4 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">No. absen {student.absen}</span>
        {arrears.length > 0 && (
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">
            Tunggak {arrears.length} mgg · {rupiah(sumAmount(arrears))}
          </span>
        )}
        {arrears.length === 0 && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Tidak ada tunggakan</span>}
        {student.joinedWeek > weeks[0].id && (
          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700">
            Masuk {formatWeekRange(student.joinedWeek)}
          </span>
        )}
      </div>

      {weekNow && !weekNow.isHoliday && isObligated(student, weekNow) || paidThisWeek ? (
        <button
          onClick={() => {
            togglePay(student.id, weekId)
            onClose()
          }}
          className={`mb-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold ${
            paidThisWeek ? 'bg-rose-50 text-rose-700 active:bg-rose-100' : 'bg-emerald-50 text-emerald-700 active:bg-emerald-100'
          }`}
        >
          {paidThisWeek ? 'Batalkan setoran minggu yang dipilih' : 'Catat hanya minggu yang dipilih'}
        </button>
      ) : null}

      <p className="mb-2 text-sm font-bold text-slate-700">Bayar berapa minggu?</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setCash('')
            setCount((c) => Math.max(1, c - 1))
          }}
          className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-3xl font-bold text-slate-700 active:bg-slate-200"
          aria-label="Kurangi"
        >
          −
        </button>
        <div className="flex-1 rounded-2xl bg-emerald-50 py-2 text-center">
          <span className="text-3xl font-extrabold text-emerald-700">{count}</span>
          <span className="ml-1.5 text-sm font-semibold text-emerald-700">minggu</span>
        </div>
        <button
          onClick={() => {
            setCash('')
            setCount((c) => Math.min(52, c + 1))
          }}
          className="grid size-14 place-items-center rounded-2xl bg-emerald-600 text-3xl font-bold text-white active:bg-emerald-700"
          aria-label="Tambah"
        >
          +
        </button>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {QUICK_WEEKS.map((n) => (
          <button
            key={n}
            onClick={() => {
              setCash('')
              setCount(n)
            }}
            className={`h-11 rounded-xl text-sm font-bold ${
              count === n && !cash ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 active:bg-slate-200'
            }`}
          >
            {n} mgg
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-bold text-slate-700">
          Atau: uang yang dibawa siswa
          <span className="ml-1 font-normal text-slate-400">(tanpa cicilan receh)</span>
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-500">Rp</span>
          <input
            inputMode="numeric"
            value={cash ? num(cashNum) : ''}
            onChange={(e) => setFromCash(e.target.value)}
            placeholder="mis. 10.000"
            className={`${inputCls} pl-11`}
          />
        </div>
        {cash && change > 0 && total > 0 && (
          <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Sisa uang {rupiah(change)} tidak cukup untuk 1 minggu penuh — kembalikan ke siswa.
          </p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
        {plan.targets.length === 0 ? (
          <p className="text-sm font-medium text-slate-500">Tidak ada minggu yang bisa dibayar.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Total bayar</span>
              <span className="text-xl font-extrabold text-slate-900">{rupiah(total)}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Mencakup {plan.targets.length} minggu: {formatWeekRange(first.id)}
              {plan.targets.length > 1 && ` → ${formatWeekRange(last.id)}`}
            </p>
            {skipped > 0 && (
              <p className="mt-1 text-xs font-semibold text-amber-700">
                {skipped} minggu libur dilompati otomatis.
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-1">
              {plan.targets.slice(0, 16).map((w) => (
                <span key={w.id} className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                  {formatDate(w.id, false)}
                </span>
              ))}
              {plan.targets.length > 16 && <span className="px-1 text-[10px] font-bold text-slate-400">+{plan.targets.length - 16}</span>}
            </div>
          </>
        )}
      </div>

      <div className="mt-4">
        <PrimaryButton onClick={submit} disabled={!plan.targets.length}>
          <Check size={20} strokeWidth={3} /> Catat Setoran {plan.targets.length ? rupiah(total) : ''}
        </PrimaryButton>
      </div>

      <HistoryStrip student={student} weeks={weeks} idx={idx} />
    </div>
  )
}

function HistoryStrip({ student, weeks, idx }: { student: Student; weeks: Week[]; idx: ReturnType<typeof indexPayments> }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-sm font-bold text-slate-700">Riwayat per minggu</p>
      <div className="flex flex-wrap gap-1.5">
        {weeks.map((w, i) => {
          const st = cellStatus(student, w, idx)
          const cls =
            st === 'paid'
              ? 'bg-emerald-600 text-white'
              : st === 'unpaid'
                ? 'bg-rose-100 text-rose-700'
                : st === 'holiday'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-300'
          return (
            <span key={w.id} title={formatWeekRange(w.id)} className={`grid size-9 place-items-center rounded-lg text-xs font-bold ${cls}`}>
              {i + 1}
            </span>
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>🟩 Lunas</span>
        <span>🟥 Belum</span>
        <span>🟨 Libur</span>
        <span>⬜ Belum wajib</span>
      </div>
    </div>
  )
}
