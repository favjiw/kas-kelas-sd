import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CalendarDays,
  CalendarOff,
  ChevronRight,
  Database,
  Download,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  School,
  ShieldCheck,
  Upload,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { useStore, useWeeks } from '../lib/store'
import { currentWeekId, indexPayments, sortStudents, weekNumber, weekStats } from '../lib/calc'
import { digitsOnly, formatWeekRange, num, rupiah, todayISO } from '../lib/format'
import type { Student } from '../lib/types'
import { Card, Field, Header, inputCls, PrimaryButton, SectionTitle, Sheet } from '../components/ui'
import { PinPad } from '../components/Lock'

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  sky: 'bg-sky-100 text-sky-700',
  amber: 'bg-amber-100 text-amber-700',
  violet: 'bg-violet-100 text-violet-700',
  slate: 'bg-slate-100 text-slate-700',
}

function Row({ icon, title, sub, onClick, tone = 'emerald' }: { icon: ReactNode; title: string; sub: string; onClick: () => void; tone?: string }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3.5 text-left last:border-0 active:bg-slate-50">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-slate-900">{title}</span>
        <span className="block truncate text-xs text-slate-500">{sub}</span>
      </span>
      <ChevronRight size={20} className="text-slate-300" />
    </button>
  )
}

type Panel = 'class' | 'amount' | 'students' | 'weeks' | 'pin' | 'data' | null

export function PengaturanTab() {
  const data = useStore((s) => s.data)
  const [panel, setPanel] = useState<Panel>(null)
  const active = data.students.filter((s) => s.isActive).length


  return (
    <>
      <Header title="Pengaturan" subtitle="Kelola kelas, siswa & data" />
      <div className="mx-auto max-w-lg px-3 pb-32 pt-2">
        <SectionTitle>Kelas</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <Row icon={<School size={22} />} title="Info Kelas" sub={`${data.settings.className} · ${data.settings.schoolName}`} onClick={() => setPanel('class')} />
          <Row icon={<Wallet size={22} />} title="Nominal Kas" sub={`${rupiah(data.settings.weeklyAmount)} per minggu`} onClick={() => setPanel('amount')} />
        </div>

        <SectionTitle>Data</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <Row icon={<Users size={22} />} title="Kelola Siswa" sub={`${active} aktif · ${data.students.length - active} nonaktif`} onClick={() => setPanel('students')} tone="sky" />
          <Row icon={<CalendarDays size={22} />} title="Kelola Minggu" sub={`${data.weeks.length} minggu · ${data.weeks.filter((w) => w.isHoliday).length} libur`} onClick={() => setPanel('weeks')} tone="amber" />
        </div>

        <SectionTitle>Keamanan & Cadangan</SectionTitle>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <Row icon={<Lock size={22} />} title="Kunci PIN 6 Digit" sub={data.settings.pinEnabled ? 'Aktif' : 'Nonaktif'} onClick={() => setPanel('pin')} tone="violet" />
          <Row icon={<Database size={22} />} title="Cadangan & Reset Data" sub="Export / Import JSON, data contoh" onClick={() => setPanel('data')} tone="slate" />
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Kas Kelas SD · data tersimpan di perangkat ini (offline).
          <br />
          Gunakan Export JSON secara berkala sebagai cadangan.
        </p>
      </div>

      {panel === 'class' && <ClassSheet open onClose={() => setPanel(null)} />}
      {panel === 'amount' && <AmountSheet open onClose={() => setPanel(null)} />}
      <StudentsSheet open={panel === 'students'} onClose={() => setPanel(null)} />
      <WeeksSheet open={panel === 'weeks'} onClose={() => setPanel(null)} />
      <PinSheet open={panel === 'pin'} onClose={() => setPanel(null)} />
      <DataSheet open={panel === 'data'} onClose={() => setPanel(null)} />
    </>
  )
}

function ClassSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore((x) => x.data.settings)
  const update = useStore((x) => x.updateSettings)
  const toast = useStore((x) => x.showToast)
  const [f, setF] = useState(s)
  return (
    <Sheet open={open} onClose={onClose} title="Info Kelas">
      {open && (
        <div className="space-y-3 pb-2" key="class-form">
          <Field label="Nama kelas"><input className={inputCls} value={f.className} onChange={(e) => setF({ ...f, className: e.target.value })} /></Field>
          <Field label="Nama sekolah"><input className={inputCls} value={f.schoolName} onChange={(e) => setF({ ...f, schoolName: e.target.value })} /></Field>
          <Field label="Wali kelas / bendahara"><input className={inputCls} value={f.teacherName} onChange={(e) => setF({ ...f, teacherName: e.target.value })} /></Field>
          <Field label="Tahun ajaran"><input className={inputCls} value={f.academicYear} onChange={(e) => setF({ ...f, academicYear: e.target.value })} /></Field>
          <Field label="Saldo awal kas" hint="Sisa kas periode sebelumnya (jika ada).">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-500">Rp</span>
              <input inputMode="numeric" className={`${inputCls} pl-11`} value={f.openingBalance ? num(f.openingBalance) : ''} placeholder="0" onChange={(e) => setF({ ...f, openingBalance: Number(digitsOnly(e.target.value) || 0) })} />
            </div>
          </Field>
          <PrimaryButton
            disabled={!f.className.trim()}
            onClick={() => {
              update({ ...f, className: f.className.trim() })
              toast('Info kelas disimpan')
              onClose()
            }}
          >
            Simpan
          </PrimaryButton>
        </div>
      )}
    </Sheet>
  )
}

function AmountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cur = useStore((x) => x.data.settings.weeklyAmount)
  const weeks = useWeeks()
  const update = useStore((x) => x.updateSettings)
  const setWeekAmount = useStore((x) => x.setWeekAmount)
  const toast = useStore((x) => x.showToast)
  const [v, setV] = useState(String(cur))
  const amt = Number(digitsOnly(v) || 0)
  const today = currentWeekId(weeks, todayISO())
  const apply = (scope: 'future' | 'all') => {
    update({ weeklyAmount: amt })
    // Minggu yang sudah punya setoran tidak diubah agar nominal historis tetap benar.
    const payments = useStore.getState().data.payments
    for (const w of weeks) {
      const hasPay = payments.some((p) => p.weekId === w.id)
      if (hasPay) continue
      if (scope === 'future' && w.id < today) continue
      setWeekAmount(w.id, amt)
    }
    toast(`Nominal kas ${rupiah(amt)} / minggu disimpan`)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Nominal Kas Mingguan">
      {open && (
        <div className="space-y-3 pb-2">
          <Field label="Nominal per minggu">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-500">Rp</span>
              <input inputMode="numeric" className={`${inputCls} pl-11 text-xl font-bold`} value={amt ? num(amt) : ''} placeholder="2.000" onChange={(e) => setV(digitsOnly(e.target.value))} />
            </div>
          </Field>
          <div className="grid grid-cols-4 gap-2">
            {[1000, 2000, 5000, 10000].map((n) => (
              <button key={n} onClick={() => setV(String(n))} className={`h-11 rounded-xl text-sm font-bold ${amt === n ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 active:bg-slate-200'}`}>
                {num(n)}
              </button>
            ))}
          </div>
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            Minggu yang sudah ada setoran tidak diubah, sehingga catatan lama tetap akurat.
          </p>
          <PrimaryButton disabled={amt <= 0} onClick={() => apply('future')}>Terapkan mulai minggu ini</PrimaryButton>
          <PrimaryButton tone="slate" disabled={amt <= 0} onClick={() => apply('all')}>Terapkan ke semua minggu tanpa setoran</PrimaryButton>
        </div>
      )}
    </Sheet>
  )
}

function StudentsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const students = useStore((x) => x.data.students)
  const weeks = useWeeks()
  const deactivate = useStore((x) => x.deactivateStudent)
  const reactivate = useStore((x) => x.reactivateStudent)
  const [edit, setEdit] = useState<Student | 'new' | null>(null)
  const list = sortStudents(students)
  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Kelola Siswa"
        footer={
          <PrimaryButton onClick={() => setEdit('new')}>
            <UserPlus size={20} /> Tambah Siswa
          </PrimaryButton>
        }
      >
        <ul className="space-y-1.5 pb-2">
          {list.map((s) => (
            <li key={s.id} className={`flex items-center gap-2 rounded-xl border p-2.5 ${s.isActive ? 'border-slate-100 bg-white' : 'border-dashed border-slate-200 bg-slate-50'}`}>
              <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${s.isActive ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-400'}`}>{s.absen}</span>
              <div className="min-w-0 flex-1">
                <p className={`truncate font-semibold ${s.isActive ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{s.name}</p>
                <p className="text-[11px] text-slate-500">
                  {s.isActive
                    ? s.joinedWeek > weeks[0].id
                      ? `Masuk minggu ke-${weekNumber(weeks, s.joinedWeek)} (${formatWeekRange(s.joinedWeek)})`
                      : 'Siswa sejak awal'
                    : `Pindah/nonaktif${s.leftWeek ? ` sejak minggu ke-${weekNumber(weeks, s.leftWeek)}` : ''}`}
                </p>
              </div>
              <button onClick={() => setEdit(s)} aria-label={`Ubah ${s.name}`} className="grid size-10 place-items-center rounded-lg text-slate-500 active:bg-slate-100">
                <Pencil size={18} />
              </button>
              {s.isActive ? (
                <button onClick={() => deactivate(s.id)} aria-label={`Nonaktifkan ${s.name}`} className="grid size-10 place-items-center rounded-lg text-rose-500 active:bg-rose-50">
                  <UserMinus size={18} />
                </button>
              ) : (
                <button onClick={() => reactivate(s.id)} className="h-10 rounded-lg px-2.5 text-xs font-bold text-emerald-700 active:bg-emerald-50">
                  Aktifkan
                </button>
              )}
            </li>
          ))}
        </ul>
      </Sheet>
      <StudentForm editing={edit} onClose={() => setEdit(null)} />
    </>
  )
}

function StudentForm({ editing, onClose }: { editing: Student | 'new' | null; onClose: () => void }) {
  const weeks = useWeeks()
  const add = useStore((x) => x.addStudent)
  const upd = useStore((x) => x.updateStudent)
  const toast = useStore((x) => x.showToast)
  const students = useStore((x) => x.data.students)
  const today = currentWeekId(weeks, todayISO())
  const ex = editing && editing !== 'new' ? editing : null
  const [name, setName] = useState(ex?.name ?? '')
  const [absen, setAbsen] = useState(String(ex?.absen ?? ''))
  const [joined, setJoined] = useState(ex?.joinedWeek ?? today)
  const dupAbsen = !!absen && students.some((s) => s.absen === Number(absen) && s.id !== ex?.id)

  return (
    <Sheet open={editing !== null} onClose={onClose} title={ex ? 'Ubah Siswa' : 'Tambah Siswa'}>
      {editing !== null && (
        <div className="space-y-3 pb-2" key={ex?.id ?? 'new'}>
          <Field label="Nama lengkap">
            <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Budi Santoso" />
          </Field>
          {ex && (
            <Field label="No. absen" hint={dupAbsen ? 'No. absen sudah dipakai siswa lain.' : undefined}>
              <input inputMode="numeric" className={inputCls} value={absen} onChange={(e) => setAbsen(digitsOnly(e.target.value))} />
            </Field>
          )}
          <Field label="Mulai wajib kas sejak minggu" hint="Siswa pindahan baru: pilih minggu bergabung. Tidak ada tunggakan sebelum minggu ini.">
            <select className={inputCls} value={joined} onChange={(e) => setJoined(e.target.value)}>
              {weeks.map((w, i) => (
                <option key={w.id} value={w.id}>
                  Minggu ke-{i + 1} · {formatWeekRange(w.id, true)}
                  {w.id === today ? ' (minggu ini)' : ''}
                </option>
              ))}
            </select>
          </Field>
          <PrimaryButton
            disabled={!name.trim() || (!!ex && (!absen || dupAbsen))}
            onClick={() => {
              if (ex) upd(ex.id, { name: name.trim(), absen: Number(absen), joinedWeek: joined })
              else add(name, joined)
              toast(ex ? 'Data siswa diperbarui' : `${name.trim()} ditambahkan`)
              onClose()
            }}
          >
            Simpan
          </PrimaryButton>
        </div>
      )}
    </Sheet>
  )
}

function WeeksSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useStore((x) => x.data)
  const weeks = useWeeks()
  const add = useStore((x) => x.addNextWeek)
  const setHoliday = useStore((x) => x.setHoliday)
  const idx = useMemo(() => indexPayments(data.payments), [data.payments])
  const today = currentWeekId(weeks, todayISO())
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [note, setNote] = useState('')
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Kelola Minggu"
      footer={
        <PrimaryButton onClick={add}>
          <Plus size={20} /> Tambah Minggu Berikutnya
        </PrimaryButton>
      }
    >
      <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        Minggu <b>libur</b> bernilai Rp 0, tidak dihitung tunggakan, dan dilompati saat siswa membayar di muka.
      </p>
      <ul className="space-y-1.5 pb-2">
        {weeks.map((w, i) => {
          const st = weekStats(w, data.students, data.payments, idx)
          return (
            <li key={w.id} className={`rounded-xl border p-3 ${w.isHoliday ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white'}`}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">
                    Minggu ke-{i + 1}
                    {w.id === today && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">INI</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatWeekRange(w.id, true)} · {w.isHoliday ? `Libur${w.note ? ` – ${w.note}` : ''}` : `${rupiah(w.amount)} · ${st.paidCount}/${st.total} setor`}
                  </p>
                </div>
                {w.isHoliday ? (
                  <button onClick={() => setHoliday(w.id, false)} className="h-11 rounded-xl bg-white px-3 text-sm font-bold text-amber-700 ring-1 ring-amber-300 active:bg-amber-100">
                    Batalkan
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setNoteFor(noteFor === w.id ? null : w.id)
                      setNote('')
                    }}
                    className="flex h-11 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700 active:bg-slate-200"
                  >
                    <CalendarOff size={16} /> Libur
                  </button>
                )}
              </div>
              {noteFor === w.id && (
                <div className="mt-2 flex gap-2">
                  <input autoFocus className={`${inputCls} h-11`} placeholder="Alasan (mis. Libur Lebaran)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <button
                    onClick={() => {
                      setHoliday(w.id, true, note.trim() || 'Libur')
                      setNoteFor(null)
                    }}
                    className="h-11 shrink-0 rounded-xl bg-amber-500 px-4 text-sm font-bold text-white active:bg-amber-600"
                  >
                    Tandai
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Sheet>
  )
}

function PinSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore((x) => x.data.settings)
  const setPin = useStore((x) => x.setPin)
  const unlock = useStore((x) => x.unlock)
  const lock = useStore((x) => x.lock)
  const toast = useStore((x) => x.showToast)
  const [step, setStep] = useState<'menu' | 'new' | 'confirm' | 'verify'>('menu')
  const [first, setFirst] = useState('')
  const [err, setErr] = useState('')
  const close = () => {
    setStep('menu')
    setFirst('')
    setErr('')
    onClose()
  }
  return (
    <Sheet open={open} onClose={close} title="Kunci PIN">
      {open && step === 'menu' && (
        <div className="space-y-3 pb-2">
          <div className={`flex items-center gap-3 rounded-2xl p-4 ${s.pinEnabled ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-50 text-slate-600'}`}>
            <ShieldCheck size={28} />
            <div>
              <p className="font-bold">{s.pinEnabled ? 'PIN aktif' : 'PIN nonaktif'}</p>
              <p className="text-xs">{s.pinEnabled ? 'Aplikasi meminta PIN setiap dibuka.' : 'Siapa pun yang memegang HP dapat membuka data kas.'}</p>
            </div>
          </div>
          {s.pinEnabled ? (
            <>
              <PrimaryButton onClick={() => { lock(); close() }}><Lock size={18} /> Kunci Sekarang</PrimaryButton>
              <PrimaryButton tone="slate" onClick={() => setStep('new')}>Ganti PIN</PrimaryButton>
              <PrimaryButton tone="rose" onClick={() => { setStep('verify'); setErr('') }}>Nonaktifkan PIN</PrimaryButton>
            </>
          ) : (
            <PrimaryButton onClick={() => setStep('new')}>Aktifkan PIN 6 Digit</PrimaryButton>
          )}
          <p className="text-xs text-slate-500">Jika PIN lupa, gunakan Reset Data di menu Cadangan (data akan terhapus), jadi simpan PIN dengan baik.</p>
        </div>
      )}
      {open && step === 'new' && (
        <div className="pb-4">
          <PinPad title="PIN baru" subtitle="Buat 6 digit angka" onCancel={() => setStep('menu')} onComplete={(p) => { setFirst(p); setStep('confirm'); setErr('') }} />
        </div>
      )}
      {open && step === 'confirm' && (
        <div className="pb-4">
          <PinPad
            title="Ulangi PIN"
            subtitle="Masukkan PIN yang sama"
            error={err}
            onCancel={() => { setStep('menu'); setErr('') }}
            onComplete={async (p) => {
              if (p !== first) { setErr('PIN tidak sama'); return }
              await setPin(p)
              toast('PIN diaktifkan')
              close()
            }}
          />
        </div>
      )}
      {open && step === 'verify' && (
        <div className="pb-4">
          <PinPad
            title="Konfirmasi PIN"
            subtitle="Masukkan PIN saat ini untuk menonaktifkan"
            error={err}
            onCancel={() => setStep('menu')}
            onComplete={async (p) => {
              // verifikasi tanpa mengubah state kunci: buka kunci selalu sudah terjadi
              const ok = await unlock(p)
              if (!ok) { setErr('PIN salah'); return }
              await setPin(null)
              toast('PIN dinonaktifkan')
              close()
            }}
          />
        </div>
      )}
    </Sheet>
  )
}

function DataSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const exportJSON = useStore((x) => x.exportJSON)
  const importJSON = useStore((x) => x.importJSON)
  const resetToSeed = useStore((x) => x.resetToSeed)
  const resetEmpty = useStore((x) => x.resetEmpty)
  const toast = useStore((x) => x.showToast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirm, setConfirm] = useState<'seed' | 'empty' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const doExport = async () => {
    const json = await exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kas-kelas-${todayISO()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    toast('Cadangan JSON diunduh')
  }

  const doImport = async (f?: File | null) => {
    if (!f) return
    const r = await importJSON(await f.text())
    setMsg({ ok: r.ok, text: r.message })
    if (r.ok) toast('Data berhasil diimpor')
  }

  return (
    <Sheet open={open} onClose={() => { setConfirm(null); setMsg(null); onClose() }} title="Cadangan & Reset">
      {open && (
        <div className="space-y-3 pb-2">
          <Card>
            <p className="font-bold text-slate-900">Export JSON</p>
            <p className="mb-3 text-xs text-slate-500">Unduh semua data (termasuk foto nota) sebagai file cadangan.</p>
            <PrimaryButton onClick={doExport}><Download size={20} /> Export Data</PrimaryButton>
          </Card>
          <Card>
            <p className="font-bold text-slate-900">Import JSON</p>
            <p className="mb-3 text-xs text-slate-500">Pulihkan dari file cadangan. Data saat ini akan <b>diganti</b>.</p>
            <PrimaryButton tone="slate" onClick={() => fileRef.current?.click()}><Upload size={20} /> Pilih File Cadangan</PrimaryButton>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = '' }} />
            {msg && <p className={`mt-2 text-sm font-semibold ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</p>}
          </Card>
          <Card>
            <p className="font-bold text-slate-900">Reset Data</p>
            <p className="mb-3 text-xs text-slate-500">Hapus semua data lokal. Pilih mulai dari kosong, atau muat data contoh Kelas 4B.</p>
            {confirm ? (
              <div className="space-y-2">
                <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                  Yakin? Semua data saat ini akan hilang{confirm === 'seed' ? ' dan diganti data contoh' : ''}.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <PrimaryButton tone="slate" onClick={() => setConfirm(null)}>Batal</PrimaryButton>
                  <PrimaryButton
                    tone="rose"
                    onClick={async () => {
                      if (confirm === 'seed') await resetToSeed()
                      else await resetEmpty()
                      toast(confirm === 'seed' ? 'Data contoh dimuat' : 'Data dikosongkan')
                      setConfirm(null)
                      onClose()
                    }}
                  >
                    Ya, Reset
                  </PrimaryButton>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <PrimaryButton tone="slate" onClick={() => setConfirm('seed')}><RotateCcw size={18} /> Muat Data Contoh (Kelas 4B)</PrimaryButton>
                <PrimaryButton tone="rose" onClick={() => setConfirm('empty')}>Kosongkan Semua Data</PrimaryButton>
              </div>
            )}
          </Card>
        </div>
      )}
    </Sheet>
  )
}
