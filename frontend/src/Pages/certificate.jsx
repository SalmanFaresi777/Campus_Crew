import logo from "../assets/img/campuscrew.png";

export default function Certificate({
  logoUrl,
  orgName,
  participantName,
  eventTitle
}) {
  return (
    <div className="w-full overflow-auto">
      <svg viewBox="0 0 1400 990" width="100%" height="auto">
        {/* ... paste the same SVG, but replace text nodes with props below ... */}
        {/* For brevity, only showing dynamic spots: */}

        {/* Header band + logo */}
        <defs>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F9E27D"/>
            <stop offset="50%" stopColor="#E2C15A"/>
            <stop offset="100%" stopColor="#CFA542"/>
          </linearGradient>
          <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#143f6b"/>
            <stop offset="100%" stopColor="#1b5e91"/>
          </linearGradient>
          <pattern id="watermark" patternUnits="userSpaceOnUse" width="600" height="300">
            <text x="0" y="200" fontSize="160" fontFamily="Georgia, 'Times New Roman', serif"
                  fill="rgba(0,0,0,0.04)" opacity="0.15" transform="rotate(-15)">
              CERTIFICATE
            </text>
          </pattern>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000" floodOpacity="0.15"/>
          </filter>
        </defs>

        <rect x="0" y="0" width="1400" height="990" fill="#f7f8fb"/>
        <rect x="0" y="0" width="1400" height="990" fill="url(#watermark)"/>
        <rect x="40" y="40" width="1320" height="910" fill="none" stroke="url(#gold)" strokeWidth="6" rx="18" ry="18"/>
        <rect x="56" y="56" width="1288" height="878" fill="none" stroke="#d9d9d9" strokeWidth="2" rx="14" ry="14"/>

        <g filter="url(#shadow)">
          <rect x="100" y="100" width="1200" height="790" fill="#ffffff" rx="16" ry="16" stroke="#eeeeee"/>
          <rect x="100" y="100" width="1200" height="120" fill="url(#band)" rx="16" ry="16"/>
          <g transform="translate(120,120)">
  <image href={logo} x="0" y="0" width="180" height="80" preserveAspectRatio="xMidYMid meet" />
</g>


          <text x="700" y="170" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="36" fill="#ffffff" letterSpacing="1.2">
            {orgName}
          </text>

          <text x="700" y="290" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="54" fill="#222" fontWeight="700" letterSpacing="1.2">
            CERTIFICATE OF PARTICIPATION
          </text>

          <text x="700" y="330" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="20" fill="#666">
            This is to certify that
          </text>

          <text x="700" y="405" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="48" fill="#143f6b" fontWeight="700">
            {participantName}
          </text>

          <text x="700" y="455" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="22" fill="#444">
            has successfully participated in
          </text>

          <text x="700" y="500" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="32" fill="#222" fontWeight="600">
            {eventTitle}
          </text>

          <text x="700" y="540" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="18" fill="#666">
            Held on {eventDate} at {eventLocation}
          </text>

          {/* Signatures */}
          <g transform="translate(260,650)">
            <line x1="-160" y1="100" x2="160" y2="100" stroke="#999" strokeWidth="2"/>
            <text x="0" y="95" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="16" fill="#333">
              {sigLeftName}
            </text>
            <text x="0" y="120" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="14" fill="#777">
              {sigLeftTitle}
            </text>
          </g>
          <g transform="translate(700,650)">
            <line x1="-160" y1="100" x2="160" y2="100" stroke="#999" strokeWidth="2"/>
            <text x="0" y="95" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="16" fill="#333">
              {sigCenterName}
            </text>
            <text x="0" y="120" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="14" fill="#777">
              {sigCenterTitle}
            </text>
          </g>

          {/* QR */}
          <g transform="translate(1140,765)">
            <rect x="-70" y="-70" width="140" height="140" rx="8" ry="8" fill="#f3f3f3" stroke="#ddd"/>
            {qrUrl && <image href={qrUrl} x="-70" y="-70" width="140" height="140"/>}
            <text x="0" y="88" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="12" fill="#999">
              Verification QR
            </text>
          </g>

          {/* Footer */}
          <text x="140" y="840" fontFamily="Georgia, 'Times New Roman', serif" fontSize="14" fill="#888">
            Issued on {issueDate} • Certificate ID: {certificateId}
          </text>
        </g>
      </svg>
    </div>
  );
}
