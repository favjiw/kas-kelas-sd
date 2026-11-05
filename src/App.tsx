import { useState } from 'react'
import { BarChart3, Banknote, Receipt, Settings } from 'lucide-react'
import { useStore } from './lib/store'
import { LockScreen } from './components/Lock'
import { Toaster } from './components/ui'
import { SetoranTab } from './tabs/SetoranTab'
import { PengeluaranTab } from './tabs/PengeluaranTab'
import { RekapTab } from './tabs/RekapTab'
import { PengaturanTab } from './tabs/PengaturanTab'

type Tab = 'setoran' | 'pengeluaran' | 'rekap' | 'pengaturan'

const TABS: { id: Tab; label: string; icon: typeof Banknote }[] = [
  { id: 'setoran', label: 'Setoran', icon: Banknote },
  { id: 'pengeluaran', label: 'Pengeluaran', icon: Receipt },
  { id: 'rekap', label: 'Rekap', icon: BarChart3 },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('setoran')
  const locked = useStore((s) => s.locked)

  if (locked) return <LockScreen />

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <main>
        {tab === 'setoran' && <SetoranTab />}
        {tab === 'pengeluaran' && <PengeluaranTab />}
        {tab === 'rekap' && <RekapTab />}
        {tab === 'pengaturan' && <PengaturanTab />}
      </main>

      <Toaster />

      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map(({ id, label, icon: Icon }) => {
            const on = tab === id
            return (
              <li key={id}>
                <button
                  onClick={() => {
                    setTab(id)
                    window.scrollTo({ top: 0 })
                  }}
                  aria-current={on ? 'page' : undefined}
                  className={`flex h-[4.25rem] w-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition ${
                    on ? 'text-emerald-700' : 'text-slate-400 active:text-slate-600'
                  }`}
                >
                  <span className={`grid h-8 w-14 place-items-center rounded-full transition ${on ? 'bg-emerald-100' : ''}`}>
                    <Icon size={22} strokeWidth={on ? 2.6 : 2} />
                  </span>
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
