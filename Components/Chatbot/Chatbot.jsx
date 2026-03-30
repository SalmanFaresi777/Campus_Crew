import React from 'react';
import './ChatbotButton.css';

const Chatbot = ({ onClose }) => {
  return (
    <div className="chatbot-panel">
      <div className="chatbot-header">
        <h2>CampusCrew Chat</h2>
        <button
          className="chatbot-close-btn"
          type="button"
          onClick={onClose}
          aria-label="Close chat"
        >
          ×
        </button>
      </div>
      <div className="chatbot-body">
        <p>
          Hi there! Send us a message and we will respond as soon as possible.
        </p>
      </div>
      <div className="chatbot-footer">
        <button className="chatbot-action" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
