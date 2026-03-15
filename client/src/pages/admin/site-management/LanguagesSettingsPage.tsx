import React, { useState } from 'react'

interface Lang { code: string; name: string; flag: string; active: boolean; default: boolean; completion: number }

const langData: Lang[] = [
  { code: 'en', name: 'English',    flag: '🇺🇸', active: true,  default: true,  completion: 100 },
  { code: 'fr', name: 'French',     flag: '🇫🇷', active: true,  default: false, completion: 92 },
  { code: 'de', name: 'German',     flag: '🇩🇪', active: true,  default: false, completion: 88 },
  { code: 'es', name: 'Spanish',    flag: '🇪🇸', active: true,  default: false, completion: 95 },
  { code: 'zh', name: 'Chinese',    flag: '🇨🇳', active: true,  default: false, completion: 78 },
  { code: 'ar', name: 'Arabic',     flag: '🇸🇦', active: false, default: false, completion: 45 },
  { code: 'ja', name: 'Japanese',   flag: '🇯🇵', active: false, default: false, completion: 61 },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷', active: true,  default: false, completion: 83 },
]

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="relative rounded-full transition-colors"
      style={{ background: value ? 'linear-gradient(135deg,#0ea5e9,#0369a1)' : 'rgba(107,128,153,0.3)', width: '36px', height: '18px', minWidth: '36px' }}>
      <span className="absolute top-[2px] w-3.5 h-3.5 bg-white rounded-full shadow transition-transform"
        style={{ transform: value ? 'translateX(19px)' : 'translateX(2px)' }} />
    </button>
  )
}

export default function LanguagesSettingsPage() {
  const [langs, setLangs] = useState(langData)

  const toggle = (code: string, field: 'active') => {
    setLangs(prev => prev.map(l => l.code === code ? { ...l, [field]: !l[field] } : l))
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Language Settings</h1>
          <p className="text-xs text-text-secondary mt-0.5">Manage interface languages and translation coverage</p>
        </div>
        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}>
          + Add Language
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(56,189,248,0.06)' }}>
                {['Language', 'Code', 'Translation Coverage', 'Default', 'Active', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 font-semibold uppercase tracking-wider text-text-muted" style={{ fontSize: '10px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {langs.map(lang => (
                <tr key={lang.code}
                  style={{ borderBottom: '1px solid rgba(56,189,248,0.04)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.03)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{lang.flag}</span>
                      <span className="font-semibold text-text-primary">{lang.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono font-bold uppercase" style={{ color: '#38bdf8' }}>{lang.code}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="h-full rounded-full"
                          style={{ width: `${lang.completion}%`, background: lang.completion >= 90 ? '#00c878' : lang.completion >= 70 ? '#f59e0b' : '#ff3047' }} />
                      </div>
                      <span className="font-mono text-text-muted">{lang.completion}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {lang.default
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(0,200,120,0.1)', color: '#00c878' }}>Default</span>
                      : <button className="text-xs text-text-muted hover:text-brand-300 transition-colors">Set Default</button>
                    }
                  </td>
                  <td className="px-5 py-3">
                    <Toggle value={lang.active} onChange={() => toggle(lang.code, 'active')} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5">
                      <button className="px-2 py-1 rounded text-xs text-brand-300 hover:bg-brand-400/10 transition-colors">Edit</button>
                      <button className="px-2 py-1 rounded text-xs text-text-muted hover:bg-warning/10 hover:text-warning transition-colors">Export</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
