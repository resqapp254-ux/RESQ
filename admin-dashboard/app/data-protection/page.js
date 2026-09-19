// app/data-protection/page.js
import GlobeBackground from '../../components/GlobeBackground'

export const metadata = { title: 'Data Protection Agreement | RESQ' }

export default function DataProtectionPage() {
  return (
    <main className="resq-shell">
      <GlobeBackground />
      <div className="resq-content" style={{ padding: '48px 24px', maxWidth: 760, margin: '0 auto' }}>
        <div className="glass-card resq-fade-in">
          <h1 className="resq-h1" style={{ fontSize: 28 }}>Data Protection Agreement</h1>
          <p className="resq-subtle" style={{ marginTop: 4 }}>Last updated: {new Date().toLocaleDateString()}</p>

          <h2 style={{ marginTop: 28 }}>Purpose and roles</h2>
          <p className="resq-subtle">
            This agreement describes how RESQ handles personal data on behalf of the institutions (schools,
            workplaces, hospitals, police services, and other organizations) that use it, and complements our{' '}
            <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a> rather than replacing
            them. For an institution's own users and responders, that institution is the data controller — it
            decides who joins, what emergency types it handles, and how it follows up on cases — and RESQ acts as
            data processor, handling the data only to provide the service. For a general public account not
            connected to any institution, RESQ acts as controller for the account itself, and each responding
            institution becomes a joint controller only for the specific emergency routed to it.
          </p>

          <h2 style={{ marginTop: 20 }}>What this covers</h2>
          <p className="resq-subtle">
            Account details (name, email, phone), precise location captured at the moment of an emergency, the
            content of an emergency report (type, description, photos, video, voice notes, chat messages), and, if
            an institution requires them, an admission/work ID number or a responder's profile picture. Full detail
            on what is collected and why is in the <a href="/privacy">Privacy Policy</a>.
          </p>

          <h2 style={{ marginTop: 20 }}>How it's protected</h2>
          <ul className="resq-subtle">
            <li>All data in transit is encrypted (HTTPS/TLS) between the app, our servers, and our database provider.</li>
            <li>Every table is protected by row-level security scoped to the institution and role it belongs to — an
                institution can never see another institution's data, and a plain responder cannot see records
                outside their own institution.</li>
            <li>Access to raw production data is limited to the small set of server-side operations the app itself
                performs; there is no general-purpose admin panel that exposes data outside those operations.</li>
            <li>Chat message text for a resolved case is deleted once its weekly report has been emailed to the
                institution admin, since that report becomes the institution's own retained copy.</li>
          </ul>

          <h2 style={{ marginTop: 20 }}>Sub-processors</h2>
          <p className="resq-subtle">
            RESQ uses a small number of infrastructure providers to operate, listed with what each one is given in
            the <a href="/privacy">Privacy Policy</a>'s Third-Party Services section: Supabase (database, auth,
            storage — our database is hosted in the EU), Groq (AI safety guidance, given only an emergency type and
            channel, never personal details), Resend (transactional email), and Africa's Talking (SMS/USSD/voice for
            offline reporting). None of these providers are permitted to use RESQ's data for their own purposes.
          </p>

          <h2 style={{ marginTop: 20 }}>Institution responsibilities</h2>
          <p className="resq-subtle">
            As data controller for its own users and responders, an institution is responsible for: telling its
            users and responders how their data is used (this agreement and the Privacy Policy are written so an
            institution can point to them directly); keeping its own downloaded case reports and weekly reports
            secure once downloaded, since retention of those copies is the institution's responsibility from that
            point on; and promptly deactivating a responder's access (via its own dashboard) when that person leaves
            the organization.
          </p>

          <h2 style={{ marginTop: 20 }}>Data subject rights</h2>
          <p className="resq-subtle">
            A user or responder can review their own account details and delete their own account directly, from
            the app or dashboard, at any time — no admin needed. An institution admin's own account is managed
            through their institution or RESQ directly instead. Because an emergency's core record (type,
            timestamps, who handled it) is an institution's case history, deleting an account does not
            retroactively remove that institution's record of a past emergency — the same principle already
            described in the <a href="/privacy">Privacy Policy</a>'s Storage and Retention section.
          </p>

          <h2 style={{ marginTop: 20 }}>Breach notification</h2>
          <p className="resq-subtle">
            If RESQ becomes aware of a security incident affecting an institution's data, we will notify that
            institution's admin without undue delay once the incident is confirmed, with what is known at the time
            and what's being done about it.
          </p>

          <h2 style={{ marginTop: 20 }}>Changes</h2>
          <p className="resq-subtle">
            This agreement may be updated as RESQ's infrastructure or sub-processors change; material changes
            (a new sub-processor, a change in where data is hosted) will be reflected here with an updated date.
          </p>

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
