// app/privacy/page.js
import GlobeBackground from '../../components/GlobeBackground'

export const metadata = { title: 'Privacy Policy | RESQ' }

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
            video, and voice notes you choose to attach to an emergency report; messages you send in an emergency's
            chat; and, only if your institution requires them, an admission/work ID number and, for responders, a
            one-time profile picture.
          </p>

          <h2 style={{ marginTop: 20 }}>Why we collect it</h2>
          <p className="resq-subtle">
            Every piece of data above exists to route your emergency to the right responders and to let them reach
            you. We do not use it for advertising, and we do not sell it to any third party.
          </p>

          <h2 style={{ marginTop: 20 }}>Public vs. private accounts</h2>
          <p className="resq-subtle">
            If you connect to an institution by code (private mode), your emergencies route to that institution and
            can be switched between any institution you've joined at any time. If you use a general public account
            (no code), your location and the emergency type are used, at the moment you trigger, to find the nearest
            institution that has opted in to receiving public reports of that type; no institution sees your account
            until you actually trigger an emergency to it.
          </p>

          <h2 style={{ marginTop: 20 }}>Who can see it</h2>
          <p className="resq-subtle">
            An emergency you trigger, along with your name, phone number, and location, is visible to the responders
            and institution admin at the institution it was routed to; that is the entire purpose of the report.
            Your account details are never visible to another institution you haven't connected to or been routed
            to.
          </p>

          <h2 style={{ marginTop: 20 }}>Storage and retention</h2>
          <p className="resq-subtle">
            Data is stored with Supabase (Postgres) with row-level security restricting every table to the
            institution and role it belongs to. An emergency's core record (type, who triggered/handled it,
            location, every timestamp, and any rating) is retained indefinitely as the institution's case history.
            Chat message text for a resolved case is automatically deleted once that case's weekly report has been
            emailed to the institution admin (typically within a week of resolution), since the report itself
            becomes the institution's copy of that conversation. Institution admins can also download a full report
            of any case, or a bundle of everything resolved in the past week, at any time, and are expected to keep
            their own copies for follow-up and investigations.
          </p>
          <p className="resq-subtle">
            If an institution is deleted by RESQ, a full export of its data is downloaded by RESQ's administrators
            first, for record-keeping, before the institution and its associated accounts are permanently removed.
          </p>

          <h2 style={{ marginTop: 20 }}>Institution agreements</h2>
          <p className="resq-subtle">
            Every institution admin signs a one-time service agreement, including the name and contact details of
            the person accepting on the institution's behalf, before their institution goes live. RESQ's
            administrators keep these on file and can produce them on request.
          </p>

          <h2 style={{ marginTop: 20 }}>Your choices</h2>
          <p className="resq-subtle">
            You can review or delete your trusted contacts at any time from your dashboard, switch between a public
            and private account or between institutions you've joined, and ask your institution admin to deactivate
            your account. Location is only requested at the moment of an emergency trigger; RESQ does not track your
            location in the background otherwise.
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
