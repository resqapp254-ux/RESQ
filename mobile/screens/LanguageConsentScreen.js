// screens/LanguageConsentScreen.js
// The very first screen anyone sees, exactly once — pick a language,
// accept how RESQ uses your data, then move on. Never shown again
// once accepted (tracked in AsyncStorage).

import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTranslation, LANGUAGES } from '../lib/i18n'

const CONSENT_KEY = 'resq-consent-accepted'

export default function LanguageConsentScreen({ navigation }) {
  const { t, language, setLanguage } = useTranslation()
  const [accepting, setAccepting] = useState(false)

  async function handleContinue() {
    setAccepting(true)
    await AsyncStorage.setItem(CONSENT_KEY, 'true')
    navigation.replace('Bootstrap')
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>{t('appName')}</Text>
      <Text style={styles.tagline}>{t('tagline')}</Text>

      <Text style={styles.sectionLabel}>{t('chooseLanguage')}</Text>
      <View style={styles.languageRow}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.languageChip, language === lang.code && styles.languageChipSelected]}
            onPress={() => setLanguage(lang.code)}
          >
            <Text style={styles.languageFlag}>{lang.flag}</Text>
            <Text style={[styles.languageLabel, language === lang.code && styles.languageLabelSelected]}>{lang.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.consentBox}>
        <Text style={styles.consentTitle}>{t('dataConsentTitle')}</Text>
        <Text style={styles.consentBody}>{t('dataConsentBody')}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={accepting} activeOpacity={0.85}>
        <Text style={styles.buttonText}>{t('dataConsentAccept')}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: '#05070d' },
  logo: { width: 80, height: 80, alignSelf: 'center', marginBottom: 12, borderRadius: 18 },
  title: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', color: '#f4f6fb', letterSpacing: 1 },
  tagline: { textAlign: 'center', marginBottom: 24, color: '#9aa4bf' },
  sectionLabel: { color: '#9aa4bf', fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  languageChipSelected: { borderColor: '#ff2b2b', backgroundColor: 'rgba(255,43,43,0.16)' },
  languageFlag: { fontSize: 16 },
  languageLabel: { color: '#9aa4bf', fontWeight: '600', fontSize: 13 },
  languageLabelSelected: { color: '#ff8080' },
  consentBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24
  },
  consentTitle: { color: '#f4f6fb', fontWeight: '700', fontSize: 15, marginBottom: 8 },
  consentBody: { color: '#9aa4bf', fontSize: 13, lineHeight: 19 },
  button: {
    backgroundColor: '#cc0000',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#cc0000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 }
})
