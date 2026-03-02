import React, { useState, useEffect } from 'react';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import Loader from "../Components/loader";
import { Link } from 'react-router-dom';

const Illustration = () => (
  <svg
    viewBox="0 0 800 500"
    role="img"
    aria-labelledby="title desc"
    style={{ maxWidth: '920px', width: '100%', height: 'auto' }}
  >
    <title id="title">403 – Not authorized</title>
    <desc id="desc">A friendly padlock character with a smile, indicating access is restricted.</desc>
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--blob-a)" />
        <stop offset="100%" stopColor="var(--blob-b)" />
      </linearGradient>
      <style>
        {` :root { --bg: #f8fafc; --blob-a: #e2e8f0; --blob-b: #c7d2fe; --primary: #6366f1; --accent: #22c55e; --text: #0f172a; --muted: #64748b; }
        @media (prefers-color-scheme: dark) { :root { --bg: #0b1220; --blob-a: #111827; --blob-b: #1f2937; --primary: #818cf8; --accent: #34d399; --text: #e5e7eb; --muted: #94a3b8; } }
        .float { animation: float 4s ease-in-out infinite; transform-origin: center; }
        @keyframes float { 0%,100% { transform: translateY(0px);} 50% { transform: translateY(-8px);} }
        .blink { animation: blink 5s infinite; transform-origin: center; }
        @keyframes blink {0%,2%,60%,62%,100% { transform: scaleY(1);} 1%,61% { transform: scaleY(.05);} }`}
      </style>
    </defs>
    <rect width="100%" height="100%" fill="var(--bg)" />
    <g opacity="0.9">
      <path
        d="M120,320 C80,240 160,130 280,140 C360,145 380,80 470,90 C590,100 660,200 650,280 C640,360 560,420 460,430 C330,440 180,420 120,320 Z"
        fill="url(#bgGrad)" opacity="0.5"
      />
    </g>
    <ellipse cx="400" cy="390" rx="220" ry="24" fill="var(--blob-a)" opacity="0.5" />
    <g className="float">
      <path d="M330 198 a70 70 0 1 1 140 0 v32 h-26 v-32 a44 44 0 1 0 -88 0 v32 h-26 v-32z" fill="var(--blob-b)" stroke="var(--primary)" strokeWidth="6" />
      <rect x="300" y="230" rx="24" ry="24" width="200" height="150" fill="white" stroke="var(--primary)" strokeWidth="6" />
      <circle cx="360" cy="290" r="8" fill="var(--text)" className="blink" />
      <circle cx="440" cy="290" r="8" fill="var(--text)" className="blink" />
      <path d="M355 315 q45 26 90 0" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" />
      <g transform="translate(398 320)">
        <circle r="12" fill="var(--primary)" />
        <rect x="-4" y="8" width="8" height="22" rx="3" fill="var(--primary)" />
      </g>
    </g>
    <g transform="translate(510, 210)">
      <path d="M0 28 a28 28 0 0 1 28 -28 h140 a28 28 0 0 1 28 28 v22 a28 28 0 0 1 -28 28 h-88 l-22 22 -4 -22 h-26 a28 28 0 0 1 -28 -28z" fill="white" stroke="var(--blob-b)" strokeWidth="3" />
      <text x="24" y="36" fontSize="14" fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" fill="var(--muted)">Oops! Access denied</text>
    </g>
    <g textAnchor="middle">
      <text x="400" y="75" fontSize="64" fontWeight="700" fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" fill="var(--text)">403</text>
      <text x="400" y="100" fontSize="22" fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" fill="var(--muted)">Not authorized to view this page</text>
    </g>
    <g textAnchor="middle" fontFamily="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto">
      <text x="400" y="440" fontSize="15" fill="var(--muted)">If you think this is a mistake, try signing in with the right account or contact support.</text>
    </g>
  </svg>
);

function Forbidden() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Silevena' }}>
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <Header />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '2rem' }}>
        <Illustration />
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/" className="nav-button primary"><span className="btn-txt">Home</span></Link>
          <Link to="/upcoming-events" className="nav-button primary"><span className="btn-txt">Events</span></Link>
          <Link to="/login" className="nav-button primary"><span className="btn-txt">Switch Account</span></Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Forbidden;
