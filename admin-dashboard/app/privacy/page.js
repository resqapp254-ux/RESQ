// app/privacy/page.js
import GlobeBackground from '../../components/GlobeBackground'

export const metadata = { title: 'Privacy Policy — RESQ' }

export default function PrivacyPage() {
  return (
    <main className="resq-shell">
      <GlobeBackground />
      <div className="resq-content" style={{ padding: '48px 24px', maxWidth: 760, margin: '0 auto' }}>
        <div className="glass-card resq-fade-in">
          <h1 className="resq-h1" style={{ fontSize: 28 }}>Privacy Policy</h1>
          <p className="resq-subtle" style={{ marginTop: 4 }}>Last updated: {new Date().toLocaleDateString()}</p>

          <h2 style={{ marginTop: 28 }}>What we collect</h2>
          <p className="resq-subtle">
            To connect you with help, RESQ collects: your name, email, and phone number (at signup); your precise
            location, only at the moment you trigger an emergency or while one is active; the details, photos,
            video, and voice notes you choose to attach to an emergency report; and messages you send in an
            emergency's chat.
          </p>

          <h2 style={{ marginTop: 20 }}>Why we collect it</h2>
          <p className="resq-subtle">
            Every piece of data above exists to route your emergency to the right responders at your institution and
            to let them reach you. We do not use it for advertising, and we do not sell it to any third party.
          </p>

          <h2 style={{ marginTop: 20 }}>Who can see it</h2>
          <p className="resq-subtle">
            An emergency you trigger, along with your name, phone number, and location, is visible to the
            responders and institution admin at the institution you're connected to — that is the entire purpose of
            the report. Your account details are never visible to another institution.
          </p>

          <h2 style={{ marginTop: 20 }}>Storage and retention</h2>
          <p className="resq-subtle">
            Data is stored with Supabase (Postgres) with row-level security restricting every table to the
            institution and role it belongs to. Emergency records are retained so institutions can review resolved
            cases; you can ask your institution admin to have your account data removed.
          </p>

          <h2 style={{ marginTop: 20 }}>Your choices</h2>
          <p className="resq-subtle">
            You can review or delete your trusted contacts at any time from your dashboard, and you can ask your
            institution admin to deactivate your account. Location is only requested at the moment of an emergency
            trigger — RESQ does not track your location in the background otherwise.
          </p>

          <h2 style={{ marginTop: 20 }}>Contact</h2>
          <p className="resq-subtle">
            Questions about this policy can be directed to your institution admin, or to us directly:
            <br />
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
