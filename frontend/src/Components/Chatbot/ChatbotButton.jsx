/**
 * Chatbot Button Component
 * Floating button to open/close the chatbot
 */

import React, { useEffect, useRef, useState } from 'react';
import Chatbot from './Chatbot';
import './ChatbotButton.css';
// Use the provided Lottie JSON (kept filename as-is)
import aiRobotAnimation from '../AI Robot.json';

const ChatbotButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const lottieRef = useRef(null);
  const lottieInstanceRef = useRef(null);
  const [lottieReady, setLottieReady] = useState(false);

  // Load lottie-web from CDN once (no npm install needed)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.lottie) {
      setLottieReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lottie-web/build/player/lottie.min.js';
    script.async = true;
    script.onload = () => setLottieReady(true);
    script.onerror = () => setLottieReady(false);
    document.head.appendChild(script);
    return () => {
      // Leave script for reuse; no removal needed
    };
  }, []);

  // Initialize or destroy the animation when lottie is ready and button is visible
  useEffect(() => {
    // If chat is open, the button (and container) is not rendered
    if (isChatOpen) {
      if (lottieInstanceRef.current) {
        lottieInstanceRef.current.destroy();
        lottieInstanceRef.current = null;
      }
      return;
    }

    if (!lottieReady || !window.lottie) return;
    if (!lottieRef.current) return; // container not in DOM yet

    // Clean up any previous instance before re-init
    if (lottieInstanceRef.current) {
      lottieInstanceRef.current.destroy();
      lottieInstanceRef.current = null;
    }

    try {
      lottieInstanceRef.current = window.lottie.loadAnimation({
        container: lottieRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        // Use imported JSON object directly to avoid extra network fetch
        animationData: aiRobotAnimation,
      });
    } catch (_) {
      // ignore init errors; fallback UI will show
    }

    return () => {
      if (lottieInstanceRef.current) {
        lottieInstanceRef.current.destroy();
        lottieInstanceRef.current = null;
      }
    };
  }, [lottieReady, isChatOpen]);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <>
      {/* Floating chat button */}
      {!isChatOpen && (
        <button
          className="chatbot-floating-btn"
          onClick={toggleChat}
          aria-label="Open chat"
        >
          {/* Lottie animation container (fallback to '?' badge if not ready) */}
          <div className="chatbot-lottie" ref={lottieRef} aria-hidden="true" />
          <span className="chatbot-badge">?</span>
        </button>
      )}

      {/* Chat window */}
      {isChatOpen && (
        <div className="chatbot-overlay">
          <div className="chatbot-wrapper">
            <Chatbot onClose={toggleChat} />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotButton;
