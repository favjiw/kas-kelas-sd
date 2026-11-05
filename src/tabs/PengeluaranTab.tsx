import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImagePlus, Pencil, Plus, Receipt as ReceiptIcon, Trash2, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { compressImage, getReceipt } from '../lib/receipts'
import { digitsOnly, formatDate, formatDateLong, monthYear, num, rupiah, todayISO } from '../lib/format'
import { EXPENSE_CATEGORIES, categoryOf, type Expense, type ExpenseCategoryId, type Receipt } from '../lib/types'
import { Empty, Field, Header, inputCls, PrimaryButton, Sheet } from '../components/ui'

export function PengeluaranTab() {
  const expenses = useStore((s) => s.data.expenses)
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)
  const [preview, setPreview] = useState<Expense | null>(null)

  const total = expenses.reduce((a, e) => a + e.amount, 0)
  const groups = useMemo(() => {
    const m = new Map<string, Expense[]>()
    for (const e of expenses) {
      const k = e.date.slice(0, 7)
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [expenses])

  return (
    <>
      <Header title="Pengeluaran" subtitle={`Total keluar ${rupiah(total)}`} />
      <div className="mx-auto max-w-lg px-3 pb-32 pt-4">
        <button
          onClick={() => setEditing('new')}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-md active:bg-emerald-700"
        >
          <Plus size={22} strokeWidth={3} /> Catat Pengeluaran
        </button>

        {expenses.length === 0 ? (
          <Empty icon={<ReceiptIcon size={28} />} title="Belum ada pengeluaran" text="Catat pembelian kelas beserta foto notanya." />
        ) : (
          groups.map(([month, list]) => (
            <section key={month} className="mt-5">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{monthYear(`${month}-01`)}</h3>
                <span className="text-xs font-bold text-slate-500">{rupiah(list.reduce((a, e) => a + e.amount, 0))}</span>
              </div>
              <ul className="space-y-2">
                {list.map((e) => (
                  <ExpenseRow key={e.id} e={e} onEdit={() => setEditing(e)} onPreview={() => setPreview(e)} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <ExpenseForm editing={editing} onClose={() => setEditing(null)} />
      <ReceiptModal expense={preview} onClose={() => setPreview(null)} />
    </>
  )
}

function useReceipt(id: string, has: boolean): Receipt | null {
  const [r, setR] = useState<Receipt | null>(null)
  useEffect(() => {
    let alive = true
    if (!has) {
      setR(null)
      return
    }
    getReceipt(id).then((x) => alive && setR(x))
    return () => {
      alive = false
    }
  }, [id, has])
  return r
}

function ExpenseRow({ e, onEdit, onPreview }: { e: Expense; onEdit: () => void; onPreview: () => void }) {
  const cat = categoryOf(e.category)
  const receipt = useReceipt(e.id, e.hasReceipt)
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      {e.hasReceipt ? (
        <button
          onClick={onPreview}
          aria-label="Lihat foto nota"
          className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 active:opacity-70"
        >
          {receipt ? (
            <img src={receipt.thumb} alt="Nota" className="size-full object-cover" />
          ) : (
            <ReceiptIcon className="m-auto text-slate-400" size={22} />
          )}
          <span className="absolute bottom-0 right-0 rounded-tl-lg bg-emerald-600 p-0.5 text-white">
            <ReceiptIcon size={12} />
          </span>
        </button>
      ) : (
        <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-slate-50 text-2xl">{cat.emoji}</div>
      )}
      <button onClick={onEdit} className="min-w-0 flex-1 text-left active:opacity-70">
        <span className="block truncate text-base font-bold text-slate-900">{e.note || cat.label}</span>
        <span className="block text-xs text-slate-500">
          {cat.emoji} {cat.label} · {formatDate(e.date)}
        </span>
        <span className="mt-0.5 block text-base font-extrabold text-rose-600">−{rupiah(e.amount)}</span>
      </button>
      <button onClick={onEdit} aria-label="Ubah" className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-400 active:bg-slate-100">
        <Pencil size={18} />
      </button>
    </li>
  )
}

function ReceiptModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const receipt = useReceipt(expense?.id ?? '', !!expense?.hasReceipt)
  if (!expense) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label="Foto nota">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <div className="min-w-0">
          <p className="truncate font-bold">{expense.note || categoryOf(expense.category).label}</p>
          <p className="text-xs text-white/70">
            {formatDateLong(expense.date)} · {rupiah(expense.amount)}
          </p>
        </div>
        <button onClick={onClose} aria-label="Tutup" className="grid size-11 place-items-center rounded-full bg-white/15 active:bg-white/25">
          <X size={22} />
        </button>
      </div>
      <button className="flex min-h-0 flex-1 items-center justify-center p-3" onClick={onClose} aria-label="Tutup pratinjau">
        {receipt ? (
          <img src={receipt.full} alt="Foto nota" className="max-h-full max-w-full rounded-lg object-contain" />
        ) : (
          <p className="text-white/70">Foto tidak tersedia</p>
        )}
      </button>
    </div>
  )
}

function ExpenseForm({ editing, onClose }: { editing: Expense | 'new' | null; onClose: () => void }) {
  const open = editing !== null
  return (
    <Sheet open={open} onClose={onClose} title={editing === 'new' ? 'Catat Pengeluaran' : 'Ubah Pengeluaran'}>
      {open && <ExpenseFormBody key={editing === 'new' ? 'new' : editing.id} editing={editing} onClose={onClose} />}
    </Sheet>
  )
}

function ExpenseFormBody({ editing, onClose }: { editing: Expense | 'new'; onClose: () => void }) {
  const addExpense = useStore((s) => s.addExpense)
  const updateExpense = useStore((s) => s.updateExpense)
  const removeExpense = useStore((s) => s.removeExpense)
  const showToast = useStore((s) => s.showToast)
  const existing = editing === 'new' ? null : editing

  const [category, setCategory] = useState<ExpenseCategoryId>(existing?.category ?? 'alat-tulis')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [date, setDate] = useState(existing?.date ?? todayISO())
  const [note, setNote] = useState(existing?.note ?? '')
  const old = useReceipt(existing?.id ?? '', !!existing?.hasReceipt)
  // undefined = tidak berubah, null = dihapus, Receipt = baru
  const [receipt, setReceipt] = useState<Receipt | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)

  const shown = receipt === undefined ? old : receipt
  const amt = Number(digitsOnly(amount) || 0)
  const valid = amt > 0 && !!date

  const pick = async (f?: File | null) => {
    if (!f) return
    setBusy(true)
    try {
      setReceipt(await compressImage(f))
    } catch {
      showToast('Gagal membaca foto', { tone: 'warn' })
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!valid) return
    setBusy(true)
    const payload = { date, category, amount: amt, note: note.trim() }
    if (existing) await updateExpense(existing.id, payload, receipt)
    else await addExpense(payload, receipt ?? null)
    setBusy(false)
    showToast(existing ? 'Pengeluaran diperbarui' : `Pengeluaran ${rupiah(amt)} dicatat`)
    onClose()
  }

  return (
    <div className="space-y-4 pb-2">
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Kategori</span>
        <div className="grid grid-cols-2 gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex h-12 items-center gap-2 rounded-xl border px-3 text-left text-sm font-semibold ${
                category === c.id ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 active:bg-slate-50'
              }`}
            >
              <span className="text-lg">{c.emoji}</span>
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Field label="Nominal">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-500">Rp</span>
          <input
            inputMode="numeric"
            value={amt ? num(amt) : ''}
            onChange={(e) => setAmount(digitsOnly(e.target.value))}
            placeholder="0"
            className={`${inputCls} pl-11 text-lg font-bold`}
          />
        </div>
      </Field>

      <Field label="Tanggal">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </Field>

      <Field label="Keterangan">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. Spidol & kapur" className={inputCls} />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Foto nota</span>
        {shown ? (
          <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <img src={shown.full} alt="Nota" className="max-h-64 w-full bg-slate-100 object-contain" />
            <button
              onClick={() => setReceipt(null)}
              className="absolute right-2 top-2 flex h-10 items-center gap-1.5 rounded-full bg-rose-600 px-3 text-sm font-bold text-white shadow active:bg-rose-700"
            >
              <Trash2 size={16} /> Hapus foto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => camRef.current?.click()}
              className="flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 text-sm font-bold text-emerald-700 active:bg-emerald-100"
            >
              <Camera size={26} /> Foto Nota
            </button>
            <button
              onClick={() => galRef.current?.click()}
              className="flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-600 active:bg-slate-100"
            >
              <ImagePlus size={26} /> Dari Galeri
            </button>
          </div>
        )}
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={galRef} type="file" accept="image/*" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
        {busy && <p className="mt-1 text-xs text-slate-500">Memproses…</p>}
      </div>

      <PrimaryButton onClick={save} disabled={!valid || busy}>
        Simpan Pengeluaran
      </PrimaryButton>

      {existing &&
        (confirmDel ? (
          <div className="grid grid-cols-2 gap-2">
            <PrimaryButton tone="slate" onClick={() => setConfirmDel(false)}>
              Batal
            </PrimaryButton>
            <PrimaryButton
              tone="rose"
              onClick={() => {
                removeExpense(existing.id)
                onClose()
              }}
            >
              Ya, Hapus
            </PrimaryButton>
          </div>
        ) : (
          <button onClick={() => setConfirmDel(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-rose-600 active:bg-rose-50">
            <Trash2 size={18} /> Hapus pengeluaran ini
          </button>
        ))}
    </div>
  )
}
