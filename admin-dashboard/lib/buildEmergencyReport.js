// lib/buildEmergencyReport.js
// Builds a self-contained, printable HTML report for one resolved
// emergency (or a weekly bundle of several). Downloadable as a file
// the institution admin keeps on their own device, per RESQ's data
// retention policy: institutions are the record-keepers for their
// own case history, not RESQ's servers. Opens in any browser and
// can be turned into a PDF from there (Ctrl/Cmd+P, Save as PDF).

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Not recorded'
}

function ratingStars(rating) {
  if (!rating) return 'Not rated'
  return '★'.repeat(rating) + '☆'.repeat(5 - rating) + ` (${rating}/5)`
}

function renderCase(emergency, messages) {
  const reporterName = emergency.reporter?.full_name || emergency.triggered_by_phone || 'Unknown (no app account)'
  const claimantName = emergency.claimant?.full_name || 'Unclaimed'
  const location = emergency.lat != null && emergency.lng != null
    ? `${emergency.lat.toFixed(6)}, ${emergency.lng.toFixed(6)}, <a href="https://www.google.com/maps?q=${emergency.lat},${emergency.lng}">view on map</a>`
    : 'Not available (reported without GPS, e.g. USSD/SMS)'

  const mediaRows = []
  if (emergency.photo_url) mediaRows.push(`<div class="media"><strong>Scene photo:</strong><br/><img src="${escapeHtml(emergency.photo_url)}" style="max-width:400px;border-radius:8px;margin-top:6px" /></div>`)
  if (emergency.video_url) mediaRows.push(`<div class="media"><strong>Scene video:</strong> <a href="${escapeHtml(emergency.video_url)}">${escapeHtml(emergency.video_url)}</a></div>`)

  const chatRows = (messages || []).map((m) => {
    let body = escapeHtml(m.message || '')
    if (m.media_type === 'photo' && m.media_url) body += `<br/><img src="${escapeHtml(m.media_url)}" style="max-width:300px;border-radius:8px;margin-top:4px" />`
    if (m.media_type === 'voice' && m.media_url) body += `<br/><a href="${escapeHtml(m.media_url)}">Voice note</a>`
    const who = m.sender_role === 'ai' || m.is_ai_generated ? 'AI advisor' : m.sender_role === 'responder' ? 'Responder' : 'Reporter'
    return `<tr><td>${escapeHtml(formatDate(m.created_at))}</td><td>${escapeHtml(who)}</td><td>${body}</td></tr>`
  }).join('')

  return `
  <section class="case">
    <h2>${escapeHtml((emergency.emergency_type || 'other').replace('_', ' ').toUpperCase())} · Case ${escapeHtml(emergency.id)}</h2>
    <table class="facts">
      <tr><th>Triggered by</th><td>${escapeHtml(reporterName)}</td></tr>
      <tr><th>Triggered via</th><td>${escapeHtml(emergency.triggered_via || 'app')}</td></tr>
      <tr><th>Handled by</th><td>${escapeHtml(claimantName)}</td></tr>
      <tr><th>Location</th><td>${location}</td></tr>
      <tr><th>Triggered at</th><td>${escapeHtml(formatDate(emergency.created_at))}</td></tr>
      <tr><th>Claimed at</th><td>${escapeHtml(formatDate(emergency.claimed_at))}</td></tr>
      <tr><th>Resolved at</th><td>${escapeHtml(formatDate(emergency.resolved_at))}</td></tr>
      <tr><th>Responder rating</th><td>${escapeHtml(ratingStars(emergency.rating))}</td></tr>
      ${emergency.rating_comment ? `<tr><th>Rating comment</th><td>${escapeHtml(emergency.rating_comment)}</td></tr>` : ''}
    </table>
    ${mediaRows.length ? `<h3>Media</h3>${mediaRows.join('')}` : ''}
    <h3>Chat history</h3>
    ${chatRows ? `<table class="chat"><thead><tr><th>Time</th><th>From</th><th>Message</th></tr></thead><tbody>${chatRows}</tbody></table>` : '<p class="muted">No chat messages were sent on this case.</p>'}
  </section>`
}

export function buildEmergencyReportHtml({ institutionName, emergency, messages }) {
  return wrapDocument(institutionName, `RESQ Case Report`, renderCase(emergency, messages))
}

export function buildWeeklyReportHtml({ institutionName, cases, rangeLabel }) {
  const body = cases.length
    ? cases.map((c) => renderCase(c.emergency, c.messages)).join('<hr/>')
    : '<p class="muted">No emergencies were resolved in this period.</p>'
  const summary = `<p class="muted">${cases.length} case${cases.length === 1 ? '' : 's'} resolved, ${rangeLabel}.</p>`
  return wrapDocument(institutionName, `RESQ Weekly Report`, summary + body)
}

function wrapDocument(institutionName, title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} · ${escapeHtml(institutionName)}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1a1a1a; max-width: 860px; margin: 32px auto; padding: 0 16px; line-height: 1.5; }
  h1 { font-size: 22px; }
  h2 { font-size: 17px; margin-top: 28px; border-bottom: 2px solid #cc0000; padding-bottom: 6px; }
  h3 { font-size: 14px; margin-top: 18px; color: #333; }
  table.facts { border-collapse: collapse; width: 100%; margin-top: 8px; }
  table.facts th { text-align: left; padding: 4px 12px 4px 0; color: #555; width: 160px; vertical-align: top; }
  table.facts td { padding: 4px 0; }
  table.chat { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 13px; }
  table.chat th, table.chat td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
  table.chat th { background: #f4f4f4; }
  .muted { color: #777; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #05070d; padding-bottom: 12px; }
  hr { border: none; border-top: 1px dashed #ccc; margin: 28px 0; }
  .media img { display: block; }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    <div><strong>${escapeHtml(institutionName)}</strong><br/><span class="muted">Generated ${escapeHtml(new Date().toLocaleString())}</span></div>
  </div>
  ${bodyHtml}
  <p class="muted" style="margin-top:40px">Generated by RESQ. This file is downloaded to your own device for your institution's own record-keeping; it is not retained on RESQ's servers beyond the underlying case data's normal retention period.</p>
</body>
</html>`
}

export function downloadHtmlFile(filename, html) {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
