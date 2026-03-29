import React, { useState } from 'react'

const CYBER_THREATS = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Phishing Emails',
    description:
      'Scammers send deceptive emails that appear to be from reputable CFD brokers or financial institutions, urging recipients to click on malicious links or provide sensitive financial information.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: 'Fake Websites',
    description:
      'They create fraudulent CFD trading platforms that closely mimic legitimate ones, tricking traders into depositing funds or sharing personal and financial information.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Account Takeover',
    description:
      'Cybercriminals use stolen credentials or social engineering to gain unauthorized access to your trading account and siphon funds.',
  },
]

const TRADING_SCAMS = [
  {
    title: 'False Promises',
    description:
      'Scammers may promise unrealistic returns on CFD investments, luring traders with the prospect of high profits and minimal risk.',
  },
  {
    title: 'Impersonation',
    description:
      'Scammers may impersonate well-known CFD providers, using similar logos and branding to deceive potential traders.',
  },
  {
    title: 'Unregistered Brokers',
    description:
      'Some scammers pose as unregistered brokers, operating without the necessary licenses or regulatory approvals, attracting traders with enticing offers.',
  },
  {
    title: 'Social Media Scams',
    description:
      'They use social media platforms to promote fake CFD trading opportunities, often targeting inexperienced traders with promises of quick riches.',
  },
  {
    title: 'Pressure Sales Tactics',
    description:
      'Scammers employ high-pressure tactics, encouraging traders to make quick decisions or deposits without proper research.',
  },
  {
    title: 'Misleading Information',
    description:
      'They provide false or misleading information about CFD products, making them appear less risky or more lucrative than they are.',
  },
  {
    title: 'Inadequate Risk Disclosure',
    description:
      'Some scams involve unregistered or unregulated CFD products, making it difficult for traders to seek recourse in case of issues.',
  },
  {
    title: 'Investment Clubs',
    description:
      'Scammers promote fraudulent investment clubs, asking traders to pool their money into a collective fund, which they later abscond with.',
  },
]

const PROTECT_STEPS = [
  {
    title: 'Verify Website Authenticity',
    description: 'Always check the URL when visiting your broker\'s website. Look for HTTPS and ensure the domain is exactly correct.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Use Strong Passwords & 2FA',
    description: 'Use a unique, strong password for your trading account and enable Two-Factor Authentication for an extra layer of security.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
  {
    title: 'Use Your Secure Client Area',
    description: 'Always manage your funds and account settings through the official secure client portal to avoid phishing traps.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    title: 'Be Wary of Attachments & Links',
    description: 'Never click unsolicited links or download attachments claiming to be from your broker without verifying the source.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    title: 'Educate Yourself',
    description: 'Stay informed about the latest scam techniques. Knowledge is your best defence against fraud.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
  {
    title: 'Avoid Unsolicited Offers',
    description: 'Legitimate brokers do not cold-call or send unsolicited messages promising guaranteed profits or exclusive deals.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  {
    title: 'Trust Your Instincts',
    description: 'If an offer seems too good to be true, it almost certainly is. Step back, research, and consult a trusted source before acting.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
]

type Tab = 'threats' | 'scams' | 'protect'

export default function TradingScamsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('threats')

  const TABS: { id: Tab; label: string }[] = [
    { id: 'threats', label: 'Cybersecurity Threats' },
    { id: 'scams',   label: 'Trading Scams' },
    { id: 'protect', label: 'How to Protect Yourself' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Hero */}
      <div className="rounded-2xl p-6"
           style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(12,24,41,1) 60%)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={1.8}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h1 className="text-text-primary text-2xl font-bold">Securing Your Information for Safer Trading</h1>
            <p className="text-text-muted text-sm mt-1.5 leading-relaxed">
              How to spot common trading scams and ways to keep your information safe. Scams are intricately designed to
              deceive, and each day, scammers devise new methods to gain access to your personal information for their financial gain.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all"
            style={activeTab === tab.id
              ? { background: '#0c1829', color: '#e2eaf0', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }
              : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Cybersecurity Threats */}
      {activeTab === 'threats' && (
        <div className="space-y-4">
          <p className="text-text-muted text-sm">Common cybersecurity threats targeting traders:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CYBER_THREATS.map(threat => (
              <div key={threat.title}
                   className="rounded-xl p-5 flex flex-col gap-3"
                   style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="p-2.5 rounded-lg w-fit" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
                  {threat.icon}
                </div>
                <h3 className="text-text-primary font-semibold">{threat.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{threat.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Trading Scams */}
      {activeTab === 'scams' && (
        <div className="space-y-3">
          <p className="text-text-muted text-sm">Common trading scam techniques used to deceive investors:</p>
          {TRADING_SCAMS.map((scam, i) => (
            <div key={scam.title}
                 className="flex gap-4 px-4 py-3.5 rounded-xl"
                 style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                   style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                {i + 1}
              </div>
              <div>
                <h3 className="text-text-primary font-semibold text-sm">{scam.title}</h3>
                <p className="text-text-muted text-xs mt-1 leading-relaxed">{scam.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Protect Yourself */}
      {activeTab === 'protect' && (
        <div className="space-y-3">
          <p className="text-text-muted text-sm">Steps to protect yourself against cybercrime and trading scams:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROTECT_STEPS.map((step, i) => (
              <div key={step.title}
                   className="flex gap-3 px-4 py-3.5 rounded-xl"
                   style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="p-2 rounded-lg shrink-0 h-fit" style={{ background: 'rgba(14,165,233,0.08)', color: '#38bdf8' }}>
                  {step.icon}
                </div>
                <div>
                  <h3 className="text-text-primary font-semibold text-sm">{step.title}</h3>
                  <p className="text-text-muted text-xs mt-1 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help banner */}
      <div className="rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
           style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <h3 className="text-text-primary font-semibold">We are here to help</h3>
          <p className="text-text-muted text-sm mt-0.5">
            If you suspect you have fallen victim to a trading scam, contact us immediately.
          </p>
        </div>
        <a
          href="mailto:report-scams@icmarkets.com"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(239,68,68,0.18)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(239,68,68,0.1)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Report a Scam
        </a>
      </div>
    </div>
  )
}
