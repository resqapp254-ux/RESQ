'use client'

import { useTranslation } from '../lib/i18n/LanguageContext'
import { LANGUAGES } from '../lib/i18n/translations'

export default function LanguageSwitcher({ style }) {
  const { language, setLanguage } = useTranslation()

  return (
    <select
      aria-label="Choose language"
      className="resq-input"
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 5,
        width: 'auto',
        padding: '8px 12px',
        fontSize: 13,
        ...style
      }}
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.label}
        </option>
      ))}
    </select>
  )
}
