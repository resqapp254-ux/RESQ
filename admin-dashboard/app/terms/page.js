// app/terms/page.js
import GlobeBackground from '../../components/GlobeBackground'

export const metadata = { title: 'Terms of Service — RESQ' }

export default function TermsPage() {
  return (
    <main className="resq-shell">
      <GlobeBackground />
      <div className="resq-content" style={{ padding: '48px 24px', maxWidth: 760, margin: '0 auto' }}>
        <div className="glass-card resq-fade-in">
          <h1 className="resq-h1" style={{ fontSize: 28 }}>Terms of Service</h1>
          <p className="resq-subtle" style={{ marginTop: 4 }}>Last updated: {new Date().toLocaleDateString()}</p>

          <h2 style={{ marginTop: 28 }}>What RESQ is</h2>
          <p className="resq-subtle">
            RESQ routes emergency reports from a user to the responders of the institution they're connected to
            (a school, workplace, or community organization). RESQ is a routing and coordination tool — it does not
            replace, and is not a substitute for, contacting national emergency services (police, ambulance, fire)
            directly when they are available and appropriate.
          </p>

          <h2 style={{ marginTop: 20 }}>Accounts and roles</h2>
          <p className="resq-subtle">
            Institutions are created only by RESQ super admins. Institution admins manage their own responders and
            settings. Users connect to one institution via a code provided by that institution. Misrepresenting your
            role, impersonating another person, or submitting false emergency reports is prohibited and may result
            in account suspension.
          </p>

          <h2 style={{ marginTop: 20 }}>Responder conduct</h2>
          <p className="resq-subtle">
            Responders are expected to act in good faith when claiming and resolving emergencies. Users may report a
            responder's conduct to their institution admin from the app; institution admins are responsible for
            reviewing those reports.
          </p>

          <h2 style={{ marginTop: 20 }}>Content you submit</h2>
          <p className="resq-subtle">
            Photos, video, voice notes, and messages you attach to an emergency are shared with that institution's
            responders and admin for the purpose of resolving the emergency, as described in our{' '}
            <a href="/privacy">Privacy Policy</a>.
          </p>

          <h2 style={{ marginTop: 20 }}>Availability</h2>
          <p className="resq-subtle">
            RESQ is provided on an "as available" basis. Network, device, or third-party service (SMS, push
            notification, email) outages can delay or prevent delivery of an alert — RESQ does not guarantee
            uninterrupted service and is not a replacement for direct emergency calls where those are available.
          </p>

          <h2 style={{ marginTop: 20 }}>Changes</h2>
          <p className="resq-subtle">These terms may be updated as RESQ's features change; continued use after an update constitutes acceptance.</p>

          <h2 style={{ marginTop: 20 }}>Contact</h2>
          <p className="resq-subtle">
            <strong style={{ color: 'var(--resq-text-primary)' }}>RESQ App 254</strong>
            <br />
            Kisumu, Kenya
            <br />
            Email: <a href="mailto:resqapp254@gmail.com">resqapp254@gmail.com</a>
            <br />
            Phone: <a href="tel:+254794698660">+254 794 698 660</a>
          </p>
        </div>
      </div>
    </main>
  )
}
