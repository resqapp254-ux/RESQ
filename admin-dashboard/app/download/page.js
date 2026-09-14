// app/download/page.js
// General "get the app" landing page — for posters, business cards,
// or anywhere you want to point people at RESQ itself rather than
// a specific institution's join code.

'use client'

import GlobeBackground from '../../components/GlobeBackground'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useTranslation } from '../../lib/i18n/LanguageContext'

export default function DownloadPage() {
  const { t } = useTranslation()
  return (
    <main className="resq-shell">
      <GlobeBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 96, height: 96 }}>
              <img src="/icon.svg" alt="RESQ" width="96" height="96" />
            </div>
          </div>
          <h1 className="resq-h1">{t('getRESQ')}</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>{t('tagline')}</p>
          <div className="resq-success-box" style={{ textAlign: 'left', marginTop: 20 }}>
            <p><strong>{t('downloadAndroid')}</strong> {t('downloadSoonAndroid')}</p>
            <p style={{ marginTop: 8 }}><strong>{t('downloadIOS')}</strong> {t('downloadSoonIOS')}</p>
            <p className="resq-subtle" style={{ marginTop: 8 }}>In the meantime, ask your institution admin for the current testing link, or sign in at this same website from your phone or computer.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
