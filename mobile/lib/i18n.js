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
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
  { code: 'so', label: 'Soomaali', flag: '🇸🇴' },
  { code: 'ha', label: 'Hausa', flag: '🇳🇬' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' }
]

const translations = {
  en: {
    appName: 'RESQ',
    tagline: 'Emergency response, fast.',
    chooseLanguage: 'Choose your language',
    dataConsentTitle: 'Before you continue',
    dataConsentBody:
      'RESQ collects your location, contact details, and emergency reports to route help to you and to your institution’s responders. We only use this data to operate the emergency service: never sold, never used for advertising. You can review what’s stored by contacting your institution admin.',
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
      'RESQ hukusanya eneo lako, maelezo ya mawasiliano, na taarifa za dharura ili kuelekeza msaada kwako na kwa waitikiaji wa taasisi yako. Tunatumia data hii tu kuendesha huduma ya dharura, haiuzwi kamwe, wala kutumika kwa matangazo.',
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
      "RESQ collecte votre position, vos coordonnées et vos signalements d'urgence pour orienter l'aide vers vous et vers les intervenants de votre institution. Ces données ne servent qu'à faire fonctionner le service d'urgence, jamais vendues, jamais utilisées à des fins publicitaires.",
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
      'RESQ 会收集您的位置、联系方式和紧急报告，以便将帮助发送给您和您所在机构的响应人员。这些数据仅用于运营紧急服务，绝不出售，也绝不用于广告。',
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
  },
  es: {
    appName: 'RESQ',
    tagline: 'Respuesta a emergencias, rápida.',
    chooseLanguage: 'Elige tu idioma',
    dataConsentTitle: 'Antes de continuar',
    dataConsentBody:
      'RESQ recopila tu ubicación, datos de contacto e informes de emergencia para dirigir la ayuda hacia ti y hacia los respondedores de tu institución. Solo usamos estos datos para operar el servicio de emergencia: nunca se venden ni se usan para publicidad. Puedes revisar lo que se almacena contactando al administrador de tu institución.',
    dataConsentAccept: 'Entendido, continuar',
    signIn: 'Iniciar sesión',
    signUp: 'Crear cuenta',
    forgotPassword: 'Olvidé mi contraseña',
    email: 'Correo electrónico',
    password: 'Contraseña',
    fullName: 'Nombre completo',
    phoneNumber: 'Número de teléfono',
    logIn: 'Iniciar sesión',
    loggingIn: 'Iniciando sesión...',
    createAccount: 'Crear cuenta',
    creatingAccount: 'Creando cuenta...',
    sendResetLink: 'Enviar enlace',
    sending: 'Enviando...',
    newHere: '¿Nuevo aquí? Crea una cuenta',
    alreadyHaveAccount: '¿Ya tienes una cuenta? Inicia sesión',
    forgotLink: '¿Olvidaste tu contraseña?'
  },
  pt: {
    appName: 'RESQ',
    tagline: 'Resposta a emergências, rápida.',
    chooseLanguage: 'Escolha seu idioma',
    dataConsentTitle: 'Antes de continuar',
    dataConsentBody:
      'O RESQ coleta sua localização, dados de contato e relatórios de emergência para direcionar ajuda até você e até os respondentes da sua instituição. Usamos esses dados apenas para operar o serviço de emergência: nunca vendidos, nunca usados para publicidade. Você pode revisar o que é armazenado entrando em contato com o administrador da sua instituição.',
    dataConsentAccept: 'Entendi, continuar',
    signIn: 'Entrar',
    signUp: 'Criar conta',
    forgotPassword: 'Esqueci a senha',
    email: 'E-mail',
    password: 'Senha',
    fullName: 'Nome completo',
    phoneNumber: 'Número de telefone',
    logIn: 'Entrar',
    loggingIn: 'Entrando...',
    createAccount: 'Criar conta',
    creatingAccount: 'Criando conta...',
    sendResetLink: 'Enviar link',
    sending: 'Enviando...',
    newHere: 'Novo por aqui? Crie uma conta',
    alreadyHaveAccount: 'Já tem uma conta? Entrar',
    forgotLink: 'Esqueceu a senha?'
  },
  ar: {
    appName: 'RESQ',
    tagline: 'استجابة سريعة للطوارئ.',
    chooseLanguage: 'اختر لغتك',
    dataConsentTitle: 'قبل المتابعة',
    dataConsentBody:
      'يجمع RESQ موقعك وبيانات الاتصال وتقارير الطوارئ لتوجيه المساعدة إليك وإلى المستجيبين في مؤسستك. نستخدم هذه البيانات فقط لتشغيل خدمة الطوارئ، ولا تُباع أبدًا ولا تُستخدم للإعلانات. يمكنك مراجعة ما يتم تخزينه بالتواصل مع مسؤول مؤسستك.',
    dataConsentAccept: 'فهمت، متابعة',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    forgotPassword: 'نسيت كلمة المرور',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    fullName: 'الاسم الكامل',
    phoneNumber: 'رقم الهاتف',
    logIn: 'تسجيل الدخول',
    loggingIn: 'جارٍ تسجيل الدخول...',
    createAccount: 'إنشاء حساب',
    creatingAccount: 'جارٍ إنشاء الحساب...',
    sendResetLink: 'إرسال الرابط',
    sending: 'جارٍ الإرسال...',
    newHere: 'جديد هنا؟ أنشئ حسابًا',
    alreadyHaveAccount: 'هل لديك حساب بالفعل؟ سجّل الدخول',
    forgotLink: 'نسيت كلمة المرور؟'
  },
  hi: {
    appName: 'RESQ',
    tagline: 'तेज़ आपातकालीन सहायता।',
    chooseLanguage: 'अपनी भाषा चुनें',
    dataConsentTitle: 'जारी रखने से पहले',
    dataConsentBody:
      'RESQ आपकी सहायता के लिए आपका स्थान, संपर्क विवरण और आपातकालीन रिपोर्ट एकत्र करता है ताकि आपकी और आपकी संस्था के उत्तरदाताओं तक मदद पहुंचाई जा सके। हम इस डेटा का उपयोग केवल आपातकालीन सेवा चलाने के लिए करते हैं, इसे कभी बेचा या विज्ञापन के लिए उपयोग नहीं किया जाता। आप अपनी संस्था के प्रशासक से संपर्क करके देख सकते हैं कि क्या संग्रहीत है।',
    dataConsentAccept: 'समझ गया, जारी रखें',
    signIn: 'साइन इन करें',
    signUp: 'खाता बनाएं',
    forgotPassword: 'पासवर्ड भूल गए',
    email: 'ईमेल',
    password: 'पासवर्ड',
    fullName: 'पूरा नाम',
    phoneNumber: 'फ़ोन नंबर',
    logIn: 'लॉग इन करें',
    loggingIn: 'लॉग इन हो रहा है...',
    createAccount: 'खाता बनाएं',
    creatingAccount: 'खाता बनाया जा रहा है...',
    sendResetLink: 'लिंक भेजें',
    sending: 'भेजा जा रहा है...',
    newHere: 'नए हैं? खाता बनाएं',
    alreadyHaveAccount: 'पहले से खाता है? लॉग इन करें',
    forgotLink: 'पासवर्ड भूल गए?'
  },
  am: {
    appName: 'RESQ',
    tagline: 'ፈጣን የአደጋ ጊዜ ምላሽ።',
    chooseLanguage: 'ቋንቋዎን ይምረጡ',
    dataConsentTitle: 'ከመቀጠልዎ በፊት',
    dataConsentBody:
      'RESQ የእርስዎን አካባቢ፣ የመገናኛ ዝርዝሮች እና የአደጋ ሪፖርቶች ወደ እርስዎ እና ወደ ተቋምዎ ምላሽ ሰጪዎች እርዳታ ለመምራት ይሰበስባል። ይህን መረጃ የአደጋ ጊዜ አገልግሎትን ለማንቀሳቀስ ብቻ እንጠቀማለን፤ በፍጹም አንሸጥም ወይም ለማስታወቂያ አንጠቀምም። የተከማቸውን በተቋምዎ አስተዳዳሪ በኩል መገምገም ይችላሉ።',
    dataConsentAccept: 'ገባኝ፣ ቀጥል',
    signIn: 'ግባ',
    signUp: 'መለያ ፍጠር',
    forgotPassword: 'የይለፍ ቃል ረሱ',
    email: 'ኢሜይል',
    password: 'የይለፍ ቃል',
    fullName: 'ሙሉ ስም',
    phoneNumber: 'ስልክ ቁጥር',
    logIn: 'ግባ',
    loggingIn: 'በመግባት ላይ...',
    createAccount: 'መለያ ፍጠር',
    creatingAccount: 'መለያ በመፍጠር ላይ...',
    sendResetLink: 'ማገናኛ ላክ',
    sending: 'በመላክ ላይ...',
    newHere: 'አዲስ ነዎት? መለያ ይፍጠሩ',
    alreadyHaveAccount: 'መለያ አለዎት? ይግቡ',
    forgotLink: 'የይለፍ ቃል ረሱ?'
  },
  so: {
    appName: 'RESQ',
    tagline: 'Jawaab celin degdeg ah, degdeg.',
    chooseLanguage: 'Dooro luqaddaada',
    dataConsentTitle: 'Ka hor inta aadan sii socon',
    dataConsentBody:
      "RESQ waxay ururisaa goobtaada, faahfaahinta xiriirka, iyo warbixinnada degdegga si loo geeyo caawimaad adiga iyo jawaab-celiyeyaasha hay'addaada. Xogtan waxaan u isticmaalnaa kaliya inaan maamulno adeegga degdegga ah, marnaba lama iibiyo mana loo isticmaalo xayeysiin. Waxaad la xiriiri kartaa maamulaha hay'addaada si aad u eegto waxa la kaydiyay.",
    dataConsentAccept: 'Waan fahmay, sii soco',
    signIn: 'Gal',
    signUp: 'Samee akoon',
    forgotPassword: 'Illoobay furaha sirta ah',
    email: 'Iimaylka',
    password: 'Furaha sirta ah',
    fullName: 'Magaca oo dhan',
    phoneNumber: 'Lambarka taleefanka',
    logIn: 'Gal',
    loggingIn: 'Waa la galayaa...',
    createAccount: 'Samee akoon',
    creatingAccount: 'Akoon ayaa la samaynayaa...',
    sendResetLink: 'Dir xiriirka',
    sending: 'Waa la dirayaa...',
    newHere: 'Cusub halkan? Samee akoon',
    alreadyHaveAccount: 'Akoon ma leedahay hore? Gal',
    forgotLink: 'Ma illowday furahaaga sirta ah?'
  },
  ha: {
    appName: 'RESQ',
    tagline: 'Amsa gaggawa, cikin sauri.',
    chooseLanguage: 'Zaɓi yarenka',
    dataConsentTitle: 'Kafin ka ci gaba',
    dataConsentBody:
      'RESQ tana tattara wurin da kake, bayanan tuntuɓar ka, da rahotannin gaggawa domin isar da taimako gare ka da kuma masu ba da amsa na cibiyarka. Muna amfani da wannan bayanin ne kawai don gudanar da sabis na gaggawa, ba a taɓa sayar da shi ba ko amfani da shi don talla. Za ka iya duba abin da ake ajiyewa ta hanyar tuntuɓar mai gudanar da cibiyarka.',
    dataConsentAccept: 'Na gane, ci gaba',
    signIn: 'Shiga',
    signUp: 'Ƙirƙiri asusu',
    forgotPassword: 'Na manta kalmar sirri',
    email: 'Imel',
    password: 'Kalmar sirri',
    fullName: 'Cikakken suna',
    phoneNumber: 'Lambar waya',
    logIn: 'Shiga',
    loggingIn: 'Ana shiga...',
    createAccount: 'Ƙirƙiri asusu',
    creatingAccount: 'Ana ƙirƙirar asusu...',
    sendResetLink: 'Aika hanyar haɗi',
    sending: 'Ana turawa...',
    newHere: 'Sabo ne a nan? Ƙirƙiri asusu',
    alreadyHaveAccount: 'Kana da asusu tuni? Shiga',
    forgotLink: 'Ka manta kalmar sirri?'
  },
  ru: {
    appName: 'RESQ',
    tagline: 'Быстрое реагирование на чрезвычайные ситуации.',
    chooseLanguage: 'Выберите язык',
    dataConsentTitle: 'Прежде чем продолжить',
    dataConsentBody:
      'RESQ собирает ваше местоположение, контактные данные и отчёты о чрезвычайных ситуациях, чтобы направить помощь к вам и к респондентам вашего учреждения. Мы используем эти данные только для работы службы экстренной помощи, никогда не продаём их и не используем для рекламы. Вы можете узнать, что хранится, обратившись к администратору вашего учреждения.',
    dataConsentAccept: 'Понятно, продолжить',
    signIn: 'Войти',
    signUp: 'Создать аккаунт',
    forgotPassword: 'Забыли пароль',
    email: 'Электронная почта',
    password: 'Пароль',
    fullName: 'Полное имя',
    phoneNumber: 'Номер телефона',
    logIn: 'Войти',
    loggingIn: 'Вход...',
    createAccount: 'Создать аккаунт',
    creatingAccount: 'Создание аккаунта...',
    sendResetLink: 'Отправить ссылку',
    sending: 'Отправка...',
    newHere: 'Впервые здесь? Создать аккаунт',
    alreadyHaveAccount: 'Уже есть аккаунт? Войти',
    forgotLink: 'Забыли пароль?'
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
