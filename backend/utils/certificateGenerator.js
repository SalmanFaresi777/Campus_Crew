const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');

// Build SVG string for certificate (mirrors frontend design)
function buildCertificateSVG({
  userName,
  eventTitle,
  eventDate,
  issueDate,
  certId,
  eventLocation = '',
  orgName = 'CampusCrew',
  sigLeftName = 'Organizer',
  sigLeftTitle = 'Organizer',
  sigCenterName = 'Coordinator',
  sigCenterTitle = 'Coordinator',
  logoUrl = null,
  logoData = null,
  logoBg = false,
  qrDataUrl = null
}) {
  const esc = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<?xml version="1.0" standalone="yes"?>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 990" width="1400" height="990">
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#F9E27D"/>
        <stop offset="50%" stop-color="#E2C15A"/>
        <stop offset="100%" stop-color="#CFA542"/>
      </linearGradient>
      <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#143f6b"/>
        <stop offset="100%" stop-color="#1b5e91"/>
      </linearGradient>
      <pattern id="watermark" patternUnits="userSpaceOnUse" width="600" height="300">
        <text x="0" y="200" font-size="160" font-family="Georgia, 'Times New Roman', serif" fill="rgba(0,0,0,0.04)" opacity="0.15" transform="rotate(-15)">CERTIFICATE</text>
      </pattern>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.15"/>
      </filter>
    </defs>
    <rect x="0" y="0" width="1400" height="990" fill="#f7f8fb"/>
    <rect x="0" y="0" width="1400" height="990" fill="url(#watermark)"/>
    <rect x="40" y="40" width="1320" height="910" fill="none" stroke="url(#gold)" stroke-width="6" rx="18" ry="18"/>
    <rect x="56" y="56" width="1288" height="878" fill="none" stroke="#d9d9d9" stroke-width="2" rx="14" ry="14"/>
    <g filter="url(#shadow)">
      <rect x="100" y="100" width="1200" height="790" fill="#ffffff" rx="16" ry="16" stroke="#eeeeee"/>
      <rect x="100" y="100" width="1200" height="120" fill="url(#band)" rx="16" ry="16"/>
      <g transform="translate(120,120)">
        ${logoBg ? '<rect x="0" y="0" width="180" height="80" rx="8" ry="8" fill="#ffffff" stroke="rgba(255,255,255,0.6)"/>' : ''}
        ${logoUrl || logoData ? `<image href="${logoData ? `data:image/png;base64,${logoData}` : esc(logoUrl)}" x="0" y="0" width="180" height="80" preserveAspectRatio="xMidYMid meet" />` : ''}
      </g>
      <text x="700" y="170" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="36" fill="#ffffff" letter-spacing="1.2">${esc(orgName)}</text>
      <text x="700" y="290" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="54" fill="#222" font-weight="700" letter-spacing="1.2">CERTIFICATE OF PARTICIPATION</text>
      <text x="700" y="330" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="20" fill="#666">This is to certify that</text>
      <text x="700" y="405" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="48" fill="#143f6b" font-weight="700">${esc(userName)}</text>
      <text x="700" y="455" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#444">has successfully participated in</text>
      <text x="700" y="500" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="32" fill="#222" font-weight="600">${esc(eventTitle)}</text>
      <text x="700" y="540" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="18" fill="#666">Held on ${esc(eventDate)}${eventLocation ? ' at ' + esc(eventLocation) : ''}</text>
      <g transform="translate(260,650)">
        <line x1="-160" y1="100" x2="160" y2="100" stroke="#999" stroke-width="2"/>
        <text x="0" y="95" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="16" fill="#333">${esc(sigLeftName)}</text>
        <text x="0" y="120" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="14" fill="#777">${esc(sigLeftTitle)}</text>
      </g>
      <g transform="translate(700,650)">
        <line x1="-160" y1="100" x2="160" y2="100" stroke="#999" stroke-width="2"/>
        <text x="0" y="95" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="16" fill="#333">${esc(sigCenterName)}</text>
        <text x="0" y="120" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="14" fill="#777">${esc(sigCenterTitle)}</text>
      </g>
      <g transform="translate(1140,765)">
        <rect x="-70" y="-70" width="140" height="140" rx="8" ry="8" fill="#f3f3f3" stroke="#ddd"/>
        ${qrDataUrl ? `<image href="${esc(qrDataUrl)}" x="-70" y="-70" width="140" height="140" />` : ''}
        <text x="0" y="88" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="12" fill="#999">Verification QR</text>
      </g>
      <text x="140" y="840" font-family="Georgia, 'Times New Roman', serif" font-size="14" fill="#888">Issued on ${esc(issueDate)} • Certificate ID: ${esc(certId)}</text>
    </g>
  </svg>`;
}

function generateCertificate(res, opts) {
  const doc = new PDFDocument({ size: [1400, 990], margin: 0 });
  doc.pipe(res);
  const svg = buildCertificateSVG(opts);
  SVGtoPDF(doc, svg, 0, 0);
  doc.end();
}

module.exports = { generateCertificate, buildCertificateSVG };
