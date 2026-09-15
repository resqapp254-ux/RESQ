// lib/i18n.js
// Lightweight translation system, mirroring admin-dashboard's
// lib/i18n on the web so the two apps share the same languages and
// the same key names for the strings they have in common.

import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sw', label: 'Kiswahili', flag: '🇰🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' }
]

const translations = {
  en: {
    appName: 'RESQ',
    tagline: 'Emergency response, fast.',
    chooseLanguage: 'Choose your language',
    dataConsentTitle: 'Before you continue',
    dataConsentBody:
      'RESQ collects your location, contact details, and emergency reports to route help to you and to your institution’s responders. We only use this data to operate the emergency service — never sold, never used for advertising. You can review what’s stored by contacting your institution admin.',
    dataConsentAccept: 'I understand, continue',
    signIn: 'Sign In',
    signUp: 'Create Account',
    forgotPassword: 'Forgot Password',
    email: 'Email',
    password: 'Password',
    fullName: 'Full name',
    phoneNumber: 'Phone number',
    logIn: 'Log In',
    loggingIn: 'Logging in...',
    createAccount: 'Create Account',
    creatingAccount: 'Creating account...',
    sendResetLink: 'Send reset link',
    sending: 'Sending...',
    newHere: "New here? Create an account",
    alreadyHaveAccount: 'Already have an account? Log in',
    forgotLink: 'Forgot password?'
  },
  sw: {
    appName: 'RESQ',
    tagline: 'Msaada wa dharura, kwa haraka.',
    chooseLanguage: 'Chagua lugha yako',
    dataConsentTitle: 'Kabla ya kuendelea',
    dataConsentBody:
      'RESQ hukusanya eneo lako, maelezo ya mawasiliano, na taarifa za dharura ili kuelekeza msaada kwako na kwa waitikiaji wa taasisi yako. Tunatumia data hii tu kuendesha huduma ya dharura — haiuzwi kamwe, wala kutumika kwa matangazo.',
    dataConsentAccept: 'Nimeelewa, endelea',
    signIn: 'Ingia',
    signUp: 'Fungua Akaunti',
    forgotPassword: 'Umesahau Nenosiri',
    email: 'Barua pepe',
    password: 'Nenosiri',
    fullName: 'Jina kamili',
    phoneNumber: 'Nambari ya simu',
    logIn: 'Ingia',
    loggingIn: 'Inaingia...',
    createAccount: 'Fungua Akaunti',
    creatingAccount: 'Inafungua akaunti...',
    sendResetLink: 'Tuma kiungo',
    sending: 'Inatuma...',
    newHere: 'Mgeni hapa? Fungua akaunti',
    alreadyHaveAccount: 'Una akaunti tayari? Ingia',
    forgotLink: 'Umesahau nenosiri?'
  },
  fr: {
    appName: 'RESQ',
    tagline: "Intervention d'urgence, rapide.",
    chooseLanguage: 'Choisissez votre langue',
    dataConsentTitle: 'Avant de continuer',
    dataConsentBody:
      "RESQ collecte votre position, vos coordonnées et vos signalements d'urgence pour orienter l'aide vers vous et vers les intervenants de votre institution. Ces données ne servent qu'à faire fonctionner le service d'urgence — jamais vendues, jamais utilisées à des fins publicitaires.",
    dataConsentAccept: "J'ai compris, continuer",
    signIn: 'Connexion',
    signUp: 'Créer un compte',
    forgotPassword: 'Mot de passe oublié',
    email: 'E-mail',
    password: 'Mot de passe',
    fullName: 'Nom complet',
    phoneNumber: 'Numéro de téléphone',
    logIn: 'Se connecter',
    loggingIn: 'Connexion en cours...',
    createAccount: 'Créer un compte',
    creatingAccount: 'Création du compte...',
    sendResetLink: 'Envoyer le lien',
    sending: 'Envoi en cours...',
    newHere: 'Nouveau ici ? Créez un compte',
    alreadyHaveAccount: 'Vous avez déjà un compte ? Connectez-vous',
    forgotLink: 'Mot de passe oublié ?'
  },
  zh: {
    appName: 'RESQ',
    tagline: '快速紧急响应。',
    chooseLanguage: '选择您的语言',
    dataConsentTitle: '开始之前',
    dataConsentBody:
      'RESQ 会收集您的位置、联系方式和紧急报告，以便将帮助发送给您和您所在机构的响应人员。这些数据仅用于运营紧急服务——绝不出售，也绝不用于广告。',
    dataConsentAccept: '我已了解，继续',
    signIn: '登录',
    signUp: '创建账户',
    forgotPassword: '忘记密码',
    email: '电子邮箱',
    password: '密码',
    fullName: '姓名',
    phoneNumber: '电话号码',
    logIn: '登录',
    loggingIn: '正在登录...',
    createAccount: '创建账户',
    creatingAccount: '正在创建账户...',
    sendResetLink: '发送重置链接',
    sending: '发送中...',
    newHere: '首次使用？创建账户',
    alreadyHaveAccount: '已有账户？登录',
    forgotLink: '忘记密码？'
  }
}

function translate(language, key) {
  return translations[language]?.[key] ?? translations.en[key] ?? key
}

const LanguageContext = createContext({ language: 'en', setLanguage: () => {}, t: (key) => key })

const STORAGE_KEY = 'resq-language'

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setLanguageState(saved)
    })
  }, [])

  function setLanguage(lang) {
    setLanguageState(lang)
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {})
  }

  function t(key) {
    return translate(language, key)
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useTranslation() {
  return useContext(LanguageContext)
}
