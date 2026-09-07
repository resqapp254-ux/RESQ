import '../styles/resq-design-system.css'

export const metadata = {
  title: 'RESQ Admin',
  description: 'RESQ Emergency Response — Admin Dashboard'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
