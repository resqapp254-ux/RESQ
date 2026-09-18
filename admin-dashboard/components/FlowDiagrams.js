'use client'

// Two plain, static box-and-arrow diagrams — no external library, so
// nothing here can crash the way the earlier Leaflet map did. Built
// from the app's actual role/status model (see get_onboarding_status,
// serviceDispatch.js, and the emergencies.status enum), not a
// simplification of it.

const boxStyle = {
  border: '1px solid var(--resq-glass-border)',
  borderRadius: 10,
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)',
  fontSize: 13,
  lineHeight: 1.4,
  minWidth: 200
}

const laneLabelStyle = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  opacity: 0.6,
  marginBottom: 6
}

function Box({ title, children, accent }) {
  return (
    <div style={{ ...boxStyle, borderColor: accent || boxStyle.borderColor }}>
      <strong style={{ display: 'block', marginBottom: children ? 4 : 0 }}>{title}</strong>
      {children && <span className="resq-subtle" style={{ fontSize: 12 }}>{children}</span>}
    </div>
  )
}

function DownArrow() {
  return <div style={{ textAlign: 'center', fontSize: 18, opacity: 0.5, margin: '2px 0' }}>↓</div>
}

function RightArrow() {
  return <div style={{ fontSize: 18, opacity: 0.5, padding: '0 4px', alignSelf: 'center' }}>→</div>
}

export function ManagementFlowDiagram() {
  return (
    <div style={{ overflowX: 'auto', padding: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 720 }}>
        <Box title="🛡 Super Admin" accent="#ff2b2b">
          Creates institutions, sets subscription tier, issues the institution_admin's one-time verification code, can suspend/delete an institution, sees every institution's contacts, responders, and case counts.
        </Box>
        <DownArrow />
        <Box title="🏢 Institution Admin" accent="#e0b34d">
          Enters the verification code, signs the contract, then sets: enabled emergency types, identity requirements, and (if public) the institution's own coordinates.
        </Box>
        <DownArrow />
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={laneLabelStyle}>Internal team</div>
            <Box title="🧑‍⚕️ Internal Primary Responder(s)">
              Added directly by the institution admin. No coordinates — receives every emergency for the whole institution. Claims, responds, resolves.
            </Box>
          </div>
          <div>
            <div style={laneLabelStyle}>Partner units</div>
            <Box title="🏥 Partner Unit (hospital / police / fire / ...)" accent="#3fe08a">
              Institution admin registers the unit and creates its dashboard login.
            </Box>
            <DownArrow />
            <Box title="🔑 Unit Admin (Partner Primary Responder)" accent="#3fe08a">
              Logs in on its own, sets its <em>own</em> coordinates and handled emergency types — never set by the institution admin — then adds its own responders below.
            </Box>
            <DownArrow />
            <Box title="Unit's own Primary / Secondary Responders">
              Only receive emergencies matching this unit's type AND within its distance radius.
            </Box>
          </div>
          <div>
            <div style={laneLabelStyle}>Oversight, not response</div>
            <Box title="👁 Secondary Responder(s)">
              Added by institution admin or unit admin. Sees the live feed, every timestamp, and who claimed/should claim — cannot claim unless explicitly given full permission. Can chat with and call any primary responder in the institution directly.
            </Box>
          </div>
        </div>
        <DownArrow />
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Box title="🔒 Private institution users">
            Enter the institution's code once, then only see the emergency types that institution enabled.
          </Box>
          <Box title="🌐 Public users">
            No code — every trigger is routed to the nearest active public institution (single-entity or company) that handles that type.
          </Box>
        </div>
        <p className="resq-subtle" style={{ marginTop: 16, fontSize: 12, maxWidth: 600, textAlign: 'center' }}>
          A public institution is a <strong>single service</strong> when it only has internal responders serving the public directly,
          or a <strong>company</strong> when it also has its own partner units (each with their own unit admin) — same structure as
          above, just also marked visibility = public with its own coordinates.
        </p>
      </div>
    </div>
  )
}

export function EmergencyFlowDiagram() {
  return (
    <div style={{ overflowX: 'auto', padding: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 640 }}>
        <Box title="🆘 User triggers an emergency" accent="#ff2b2b">
          Picks a type (only types their institution/the public network enabled), location captured automatically.
        </Box>
        <DownArrow />
        <Box title="📍 Routing">
          Private user → their institution. Public user → nearest active public institution/company matching that type (50km radius, nearest wins).
        </Box>
        <DownArrow />
        <Box title="📣 Notify eligible responders">
          Internal primary responders (always) + any partner unit whose type and distance match, by <code>pickMatchingServices()</code>. Secondary responders are notified too, but flagged as view-only.
        </Box>
        <DownArrow />
        <Box title="🩺 AI safety advice sent to the user immediately">
          Independent of claiming — the user gets guidance while waiting.
        </Box>
        <DownArrow />
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Box title="Status: triggered" accent="#e0b34d">Unclaimed. Visible on every relevant dashboard, down to the responder app (siren).</Box>
          <RightArrow />
          <Box title="Secondary responder view">
            Sees it's unclaimed + who's eligible to claim, with tap-to-call. Chats with / calls that primary responder directly if they're slow to respond.
          </Box>
        </div>
        <DownArrow />
        <Box title="✋ A primary responder claims" accent="#3fe08a">Status → claimed. Claim timestamp recorded, single-claim lock prevents a second responder taking it.</Box>
        <DownArrow />
        <Box title="🚑 Status: in_progress">
          Chat (text/photo/voice) between user and responder, live location updates every ~15s, secondary responders keep watching.
        </Box>
        <DownArrow />
        <div style={{ display: 'flex', gap: 16 }}>
          <Box title="✅ Resolved" accent="#3fe08a">Responder marks resolved. User can rate. Counted in weekly report + case history.</Box>
          <Box title="✖ Cancelled">User/responder cancels — e.g. false alarm. No further action.</Box>
        </div>
      </div>
    </div>
  )
}
