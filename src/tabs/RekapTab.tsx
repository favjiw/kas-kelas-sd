import { useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, Calculator, CircleCheck, Copy, MessageCircle, TriangleAlert, Wallet, Check } from 'lucide-react'
import { useStore, useWeeks } from '../lib/store'
import {
  allArrears,
  currentWeekId,
  indexPayments,
  isObligated,
  opnameStatus,
  opnameTotal,
  payKey,
  totals,
  weekNumber,
  weekStats,
} from '../lib/calc'
import { formatDate, rupiah, todayISO } from '../lib/format'
import { DENOMINATIONS } from '../lib/types'
import { buildWaSummary, copyText } from '../lib/wa'
import { Card, Empty, Header, PrimaryButton, SectionTitle } from '../components/ui'

export function RekapTab() {
  const data = useStore((s) => s.data)
  const weeks = useWeeks()
  const showToast = useStore((s) => s.showToast)
  const idx = useMemo(() => indexPayments(data.payments), [data.payments])
  const curId = currentWeekId(weeks, todayISO())
  const wk = weeks.find((w) => w.id === curId) ?? weeks[0]

  const t = useMemo(
    () => totals(data.payments, data.expenses, data.settings.openingBalance),
    [data.payments, data.expenses, data.settings.openingBalance],
  )
  const arrears = useMemo(
    () => allArrears(data.students, weeks, idx, curId),
    [data.students, weeks, idx, curId],
  )
  const totalArrears = arrears.reduce((a, r) => a + r.amount, 0)
  const stats = weekStats(wk, data.students, data.payments, idx)

  const [copied, setCopied] = useState(false)
  const copyWa = async () => {
    const unpaidNames = stats.list
      .filter((s) => isObligated(s, wk) && !idx.has(payKey(s.id, wk.id)))
      .map((s) => s.name.split(' ')[0] + (s.name.split(' ')[1] ? ` ${s.name.split(' ')[1][0]}.` : ''))
    const text = buildWaSummary({
      data,
      week: wk,
      weekNo: weekNumber(weeks, wk.id),
      collected: stats.collected,
      paidCount: stats.paidCount,
      total: stats.total,
      unpaidNames,
      income: t.income,
      expense: t.expense,
      balance: t.balance,
      arrears,
    })
    const ok = await copyText(text)
    setCopied(ok)
    showToast(ok ? 'Rekap disalin! Tempel di grup WhatsApp' : 'Gagal menyalin rekap', { tone: ok ? 'ok' : 'warn' })
    if (ok) setTimeout(() => setCopied(false), 3000)
  }

  return (
    <>
      <Header title="Rekap & Saldo" subtitle={`${data.settings.className} · ${data.settings.academicYear}`} />
      <div className="mx-auto max-w-lg px-3 pb-32 pt-4">
        {/* Kartu saldo */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-emerald-100">
            <Wallet size={18} />
            <span className="text-sm font-semibold">Saldo kas saat ini</span>
          </div>
          <p className="mt-1 text-4xl font-extrabold tracking-tight" data-testid="saldo">
            {rupiah(t.balance)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 p-3">
              <p className="flex items-center gap-1 text-xs font-semibold text-emerald-100">
                <ArrowDownCircle size={14} /> Masuk
              </p>
              <p className="text-lg font-extrabold">{rupiah(t.income + t.opening)}</p>
              {t.opening > 0 && <p className="text-[10px] text-emerald-100">termasuk saldo awal {rupiah(t.opening)}</p>}
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <p className="flex items-center gap-1 text-xs font-semibold text-rose-100">
                <ArrowUpCircle size={14} /> Keluar
              </p>
              <p className="text-lg font-extrabold">{rupiah(t.expense)}</p>
            </div>
          </div>
        </div>

        {/* WA */}
        <button
          onClick={copyWa}
          className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-base font-bold text-white shadow-md active:brightness-90"
        >
          {copied ? <Check size={22} strokeWidth={3} /> : <MessageCircle size={22} />}
          {copied ? 'Tersalin!' : 'Salin Rekap untuk WhatsApp'}
          {!copied && <Copy size={16} className="opacity-70" />}
        </button>

        <Opname system={t.balance} />

        <SectionTitle
          right={
            arrears.length > 0 && <span className="text-xs font-bold text-rose-600">Total {rupiah(totalArrears)}</span>
          }
        >
          Daftar Tunggakan
        </SectionTitle>
        {arrears.length === 0 ? (
          <Card>
            <Empty icon={<CircleCheck size={28} className="text-emerald-500" />} title="Tidak ada tunggakan 🎉" text="Semua siswa aktif sudah lunas sampai minggu ini." />
          </Card>
        ) : (
          <ul className="space-y-2">
            {arrears.map((a) => (
              <li key={a.student.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rose-100 text-sm font-bold text-rose-700">
                    {a.student.absen}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{a.student.name}</p>
                    <p className="text-xs text-slate-500">{a.weeks.length} minggu belum bayar</p>
                  </div>
                  <p className="font-extrabold text-rose-600">{rupiah(a.amount)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.weeks.slice(0, 12).map((w) => (
                    <span key={w.id} className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                      Mgg {weekNumber(weeks, w.id)} · {formatDate(w.id, false)}
                    </span>
                  ))}
                  {a.weeks.length > 12 && <span className="text-[10px] font-bold text-slate-400">+{a.weeks.length - 12}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}

        {data.opnames.length > 0 && (
          <>
            <SectionTitle>Riwayat Opname</SectionTitle>
            <ul className="space-y-1.5">
              {data.opnames.slice(0, 5).map((o) => {
                const st = opnameStatus(o.physical, o.system)
                return (
                  <li key={o.id} className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-sm shadow-sm ring-1 ring-slate-100">
                    <span className="text-slate-600">{formatDate(o.date)}</span>
                    <span className="font-semibold text-slate-800">{rupiah(o.physical)}</span>
                    <span className={`font-bold ${st === 'cocok' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {st === 'cocok' ? 'Cocok' : `${o.diff > 0 ? '+' : ''}${rupiah(o.diff)}`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </>
  )
}

function Opname({ system }: { system: number }) {
  const saveOpname = useStore((s) => s.saveOpname)
  const showToast = useStore((s) => s.showToast)
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({})

  const physical = opnameTotal(counts)
  const status = opnameStatus(physical, system)
  const diff = physical - system
  const touched = Object.values(counts).some((v) => v > 0)

  const set = (value: number, n: number) => setCounts((c) => ({ ...c, [value]: Math.max(0, Math.min(9999, n)) }))

  const tone =
    status === 'cocok'
      ? { box: 'bg-emerald-50 border-emerald-200 text-emerald-800', label: 'Cocok ✓', icon: <CircleCheck size={22} /> }
      : status === 'kurang'
        ? { box: 'bg-rose-50 border-rose-200 text-rose-800', label: 'Selisih Kurang', icon: <TriangleAlert size={22} /> }
        : { box: 'bg-amber-50 border-amber-200 text-amber-800', label: 'Selisih Lebih', icon: <TriangleAlert size={22} /> }

  return (
    <Card className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left" aria-expanded={open}>
        <span className="grid size-11 place-items-center rounded-xl bg-sky-100 text-sky-700">
          <Calculator size={22} />
        </span>
        <span className="flex-1">
          <span className="block font-bold text-slate-900">Kalkulator Kas Fisik (Cash Opname)</span>
          <span className="block text-xs text-slate-500">Hitung uang di amplop & cocokkan dengan saldo sistem</span>
        </span>
        <span className="text-sm font-bold text-sky-700">{open ? 'Tutup' : 'Buka'}</span>
      </button>

      {open && (
        <div className="mt-4">
          <ul className="space-y-1.5">
            {DENOMINATIONS.map((d) => {
              const n = counts[d.value] ?? 0
              return (
                <li key={d.value} className="flex items-center gap-2">
                  <span
                    className={`grid h-11 w-[5.5rem] shrink-0 place-items-center rounded-lg text-sm font-extrabold ${
                      d.coin ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {d.coin ? '🪙 ' : ''}
                    {d.label}
                  </span>
                  <button
                    aria-label={`Kurangi ${d.label}`}
                    onClick={() => set(d.value, n - 1)}
                    className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-xl font-bold active:bg-slate-200"
                  >
                    −
                  </button>
                  <input
                    inputMode="numeric"
                    aria-label={`Jumlah ${d.label}`}
                    value={n || ''}
                    placeholder="0"
                    onChange={(e) => set(d.value, Number(e.target.value.replace(/\D/g, '') || 0))}
                    className="h-11 w-14 min-w-0 rounded-lg border border-slate-200 text-center text-base font-bold focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100"
                  />
                  <button
                    aria-label={`Tambah ${d.label}`}
                    onClick={() => set(d.value, n + 1)}
                    className="grid size-11 shrink-0 place-items-center rounded-lg bg-sky-600 text-xl font-bold text-white active:bg-sky-700"
                  >
                    +
                  </button>
                  <span className="min-w-0 flex-1 text-right text-xs font-semibold text-slate-500">
                    {n ? rupiah(n * d.value) : ''}
                  </span>
                </li>
              )
            })}
          </ul>

          <dl className="mt-4 space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Uang fisik dihitung</dt>
              <dd className="font-extrabold text-slate-900">{rupiah(physical)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Saldo sistem</dt>
              <dd className="font-extrabold text-slate-900">{rupiah(system)}</dd>
            </div>
          </dl>

          {touched && (
            <div className={`mt-3 flex items-center gap-3 rounded-xl border p-3.5 ${tone.box}`} role="status">
              {tone.icon}
              <div className="flex-1">
                <p className="font-extrabold">{tone.label}</p>
                {status !== 'cocok' && (
                  <p className="text-sm">
                    {status === 'kurang' ? 'Uang fisik kurang' : 'Uang fisik lebih'} {rupiah(Math.abs(diff))} dari saldo sistem
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <PrimaryButton tone="slate" onClick={() => setCounts({})}>
              Reset
            </PrimaryButton>
            <PrimaryButton
              disabled={!touched}
              onClick={() => {
                saveOpname({ date: todayISO(), counts, physical, system, diff })
                showToast('Hasil opname disimpan')
              }}
            >
              Simpan Hasil
            </PrimaryButton>
          </div>
        </div>
      )}
    </Card>
  )
}
