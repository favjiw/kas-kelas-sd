import { useEffect, type ReactNode } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { useStore } from '../lib/store'

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Tutup" className="sheet-backdrop absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="sheet-panel relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl">
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300" />
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-slate-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Toaster() {
  const toast = useStore((s) => s.toast)
  const dismiss = useStore((s) => s.dismissToast)
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4">
      <div
        key={toast.id}
        className="toast-in pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 py-2.5 pl-4 pr-2 text-sm text-white shadow-xl"
      >
        {toast.tone === 'warn' ? (
          <AlertTriangle size={18} className="shrink-0 text-amber-300" />
        ) : (
          <Check size={18} className="shrink-0 text-emerald-300" />
        )}
        <span className="min-w-0 flex-1">{toast.message}</span>
        {toast.undo && (
          <button
            onClick={() => {
              toast.undo?.()
              dismiss()
            }}
            className="rounded-xl bg-white/15 px-3 py-2 font-semibold text-emerald-200 active:bg-white/25"
          >
            Urungkan
          </button>
        )}
      </div>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100'

export function PrimaryButton({
  children,
  onClick,
  disabled,
  tone = 'emerald',
  type = 'button',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  tone?: 'emerald' | 'rose' | 'slate' | 'amber'
  type?: 'button' | 'submit'
  className?: string
}) {
  const tones = {
    emerald: 'bg-emerald-600 text-white active:bg-emerald-700',
    rose: 'bg-rose-600 text-white active:bg-rose-700',
    slate: 'bg-slate-100 text-slate-800 active:bg-slate-200',
    amber: 'bg-amber-500 text-white active:bg-amber-600',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-13 min-h-13 w-full items-center justify-center gap-2 rounded-2xl px-4 text-base font-bold transition disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>{children}</div>
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-1">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{children}</h3>
      {right}
    </div>
  )
}

export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-emerald-700/20 bg-emerald-600 pt-[env(safe-area-inset-top)] text-white shadow-sm">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm text-emerald-100">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}

export function Empty({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-slate-500">
      <div className="grid size-16 place-items-center rounded-full bg-slate-100 text-slate-400">{icon}</div>
      <p className="font-semibold text-slate-700">{title}</p>
      {text && <p className="text-sm">{text}</p>}
    </div>
  )
}
