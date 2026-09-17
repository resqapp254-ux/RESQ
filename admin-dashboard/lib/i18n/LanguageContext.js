'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { translate, LANGUAGES } from './translations'

const RTL_LANGUAGES = ['ar']

const LanguageContext = createContext({ language: 'en', setLanguage: () => {}, t: (key) => key })

const STORAGE_KEY = 'resq-language'

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setLanguageState(saved)
      } else {
        const browserLang = (navigator.language || 'en').slice(0, 2)
        if (LANGUAGES.some((l) => l.code === browserLang)) setLanguageState(browserLang)
      }
    } catch {
      // localStorage unavailable, stay on English
    }
  }, [])

  useEffect(() => {
    try {
      document.documentElement.dir = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr'
      document.documentElement.lang = language
    } catch {
      // Non-fatal — direction only affects text alignment, not functionality
    }
  }, [language])

  function setLanguage(lang) {
    setLanguageState(lang)
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore, per-session only
    }
  }

  function t(key) {
    return translate(language, key)
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  return useContext(LanguageContext)
}
