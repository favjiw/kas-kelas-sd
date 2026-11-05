import { useRef, useState } from 'react'
import { Delete, Lock, School } from 'lucide-react'
import { useStore } from '../lib/store'

export function PinPad({
  title,
  subtitle,
  onComplete,
  error,
  onCancel,
}: {
  title: string
  subtitle?: string
  onComplete: (pin: string) => void | Promise<void>
  error?: string
  onCancel?: () => void
}) {
  const [pin, setPin] = useState('')
  const busy = useRef(false)

  const press = (d: string) => {
    if (busy.current) return
    const next = (pin + d).slice(0, 6)
    setPin(next)
    if (next.length === 6) {
      busy.current = true
      Promise.resolve(onComplete(next)).finally(() => {
        setTimeout(() => {
          setPin('')
          busy.current = false
        }, 250)
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xs flex-col items-center">
      <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-1 text-center text-sm text-slate-500">{subtitle}</p>}
      <div className="my-6 flex gap-3" aria-label={`${pin.length} dari 6 digit`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={`size-4 rounded-full border-2 transition ${
              i < pin.length ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
            }`}
          />
        ))}
      </div>
      <p className={`mb-3 h-5 text-sm font-medium text-rose-600 ${error ? '' : 'invisible'}`}>{error || '.'}</p>
      <div className="grid w-full grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-16 rounded-2xl bg-white text-2xl font-bold text-slate-900 shadow-sm ring-1 ring-slate-200 active:bg-emerald-50"
          >
            {d}
          </button>
        ))}
        {onCancel ? (
          <button onClick={onCancel} className="h-16 rounded-2xl text-sm font-semibold text-slate-500 active:bg-slate-100">
            Batal
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={() => press('0')}
          className="h-16 rounded-2xl bg-white text-2xl font-bold text-slate-900 shadow-sm ring-1 ring-slate-200 active:bg-emerald-50"
        >
          0
        </button>
        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          aria-label="Hapus"
          className="grid h-16 place-items-center rounded-2xl text-slate-600 active:bg-slate-100"
        >
          <Delete size={26} />
        </button>
      </div>
    </div>
  )
}

export function LockScreen() {
  const unlock = useStore((s) => s.unlock)
  const className = useStore((s) => s.data.settings.className)
  const [error, setError] = useState('')
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-6">
      <div className="mb-6 grid size-20 place-items-center rounded-3xl bg-emerald-600 text-white shadow-lg">
        <School size={40} />
      </div>
      <div className="mb-1 flex items-center gap-2 text-emerald-700">
        <Lock size={16} />
        <span className="text-sm font-semibold">Aplikasi terkunci</span>
      </div>
      <PinPad
        title={`Kas ${className}`}
        subtitle="Masukkan PIN 6 digit"
        error={error}
        onComplete={async (pin) => {
          const ok = await unlock(pin)
          setError(ok ? '' : 'PIN salah, coba lagi')
        }}
      />
    </div>
  )
}
