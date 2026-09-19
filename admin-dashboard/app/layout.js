import '../styles/resq-design-system.css'
import '../styles/tailwind.css'
import { LanguageProvider } from '../lib/i18n/LanguageContext'
import ConsentBanner from '../components/ConsentBanner'

export const metadata = {
  title: 'RESQ Admin',
  description: 'RESQ Emergency Response Admin Dashboard'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
          <ConsentBanner />
        </LanguageProvider>
      </body>
    </html>
  )
}
