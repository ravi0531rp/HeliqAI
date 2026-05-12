import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/useChatStore';

function Chatbot({ embedded = false }) {
  const isOpen = useChatStore((state) => state.isOpen);
  const messages = useChatStore((state) => state.messages);
  const isTyping = useChatStore((state) => state.isTyping);
  const openChat = useChatStore((state) => state.openChat);
  const closeChat = useChatStore((state) => state.closeChat);
  const toggleOpen = useChatStore((state) => state.toggleOpen);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const visibleMessages = messages.filter((message) => message.role !== 'tool' && !message.hidden);
  const renderedMessages = embedded ? visibleMessages.slice(-3) : visibleMessages;
  const showMessageHistory = !embedded || renderedMessages.length > 0 || isTyping;

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (embedded) {
      return undefined;
    }

    const handleToggle = () => toggleOpen();
    window.addEventListener('toggle-chat', handleToggle);
    return () => window.removeEventListener('toggle-chat', handleToggle);
  }, [embedded, toggleOpen]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!input.trim() || isTyping) {
      return;
    }

    sendMessage(input.trim());
    setInput('');
  };

  const wrapperClassName = embedded
    ? `chatbot-embedded ${isOpen ? 'open' : 'collapsed'}`
    : `chatbot-wrapper ${isOpen ? 'open' : ''}`;
  const toggleClassName = embedded ? 'chatbot-inline-toggle' : 'chatbot-toggle-button';
  const panelClassName = embedded
    ? `chatbot-panel chatbot-panel-embedded ${showMessageHistory ? 'has-history' : 'is-compact'}`
    : 'chatbot-panel panel';

  return (
    <div className={wrapperClassName}>
      {!isOpen && (
        <button className={toggleClassName} onClick={openChat} type="button">
          <span className="chatbot-toggle-badge">AI</span>
          Ask GlycoBot
        </button>
      )}

      {isOpen && (
        <div className={panelClassName}>
          <div className={`chatbot-header ${embedded ? 'chatbot-header-embedded' : ''}`}>
            <div>
              <div className="eyebrow">AI Assistant</div>
              {embedded ? (
                <p className="chatbot-inline-hint">
                  {showMessageHistory
                    ? 'Quick controls and short answers.'
                    : 'Type a command like `turn PRO on` or `select ATP`.'}
                </p>
              ) : (
                <>
                  <h3 className="chatbot-title">GlycoBot Local Guide</h3>
                  <p className="panel-subtitle chatbot-subtitle">
                    Ask about glycolysis or steer the scene.
                  </p>
                </>
              )}
            </div>
            <button className="chatbot-close" onClick={embedded ? closeChat : toggleOpen} type="button">
              ✕
            </button>
          </div>

          {showMessageHistory && (
            <div className={`chatbot-messages ${embedded ? 'chatbot-messages-embedded' : ''}`}>
              {!embedded && visibleMessages.length === 0 && (
              <div className="chatbot-empty-state ghost-text">
                Try `turn PRO on`, `turn it off`, `go to step 7`, or `select ATP`.
              </div>
              )}

              {renderedMessages.map((message, index) => (
                <div key={message.id || index} className={`chatbot-message ${message.role}`}>
                  <div className="message-bubble">{message.content}</div>
                </div>
              ))}

              {isTyping && (
                <div className="chatbot-message assistant typing">
                  <div className="message-bubble">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          <form className="chatbot-input-area" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={embedded ? 'Ask GlycoBot or steer the scene...' : 'Message GlycoBot...'}
              disabled={isTyping}
              className="chatbot-input"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className={`chatbot-send ${input.trim() && !isTyping ? 'active' : ''}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Chatbot;
