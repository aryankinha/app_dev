import { useState, useRef, useEffect } from 'react';
import './App.css';

const BOTS = [
  {
    id: 'claude',
    name: 'Claude',
    company: 'Anthropic',
    avatar: '🟣',
    color: '#a855f7',
    prompt: 'You are Claude, an AI assistant developed by Anthropic. You are thoughtful, articulate, honest, and analytical with a warm, intellectual tone.',
    welcome: "Hello! I'm Claude. How can I help you think through something today?"
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    company: 'OpenAI',
    avatar: '🟢',
    color: '#10b981',
    prompt: 'You are ChatGPT, an AI assistant developed by OpenAI. You are direct, structured, practical, and highly capable with organized responses.',
    welcome: "Hi! I'm ChatGPT. What would you like to work on or learn about?"
  },
  {
    id: 'gemini',
    name: 'Gemini',
    company: 'Google',
    avatar: '🔵',
    color: '#3b82f6',
    prompt: 'You are Gemini, an AI assistant developed by Google. You are creative, insightful, fast, adaptive, and knowledgeable across broad domains.',
    welcome: "Hey there! I'm Gemini. What exciting ideas or questions do you have?"
  }
];

export default function App() {
  const [selectedBotId, setSelectedBotId] = useState('claude');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const modelName = import.meta.env.VITE_GROQ_MODEL || 'qwen/qwen3.6-27b';

  // Independent conversation history for each bot
  const [conversations, setConversations] = useState({
    claude: [{ role: 'assistant', content: BOTS[0].welcome }],
    chatgpt: [{ role: 'assistant', content: BOTS[1].welcome }],
    gemini: [{ role: 'assistant', content: BOTS[2].welcome }]
  });

  const messagesEndRef = useRef(null);
  const activeBot = BOTS.find(b => b.id === selectedBotId) || BOTS[0];
  const currentMessages = conversations[selectedBotId] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, loading]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    const userText = input.trim();
    if (!userText || loading) return;

    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      setError('Please add your GROQ_API_KEY to the .env file.');
      return;
    }

    setError('');
    setInput('');

    const newMessages = [...currentMessages, { role: 'user', content: userText }];
    setConversations(prev => ({ ...prev, [selectedBotId]: newMessages }));
    setLoading(true);

    try {
      // Filter out greeting so LLM receives clean conversation turns
      const apiHistory = newMessages
        .filter((_, idx) => idx > 0 || newMessages[0].role === 'user')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: activeBot.prompt },
            ...apiHistory,
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Groq API error (${res.status})`);
      }

      const data = await res.json();
      let content = data.choices?.[0]?.message?.content || 'No response from model.';
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (content.startsWith('<think>')) {
        content = content.replace(/<think>[\s\S]*/, '').trim();
      }

      setConversations(prev => ({
        ...prev,
        [selectedBotId]: [...newMessages, { role: 'assistant', content }]
      }));
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setConversations(prev => ({
      ...prev,
      [selectedBotId]: [{ role: 'assistant', content: activeBot.welcome }]
    }));
    setError('');
  };

  return (
    <div className="app-container">
      {/* Sidebar with Bot Personas */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>AI Personas</h2>
          <span className="powered-tag">Groq</span>
        </div>

        <nav className="bot-list">
          {BOTS.map(bot => (
            <button
              key={bot.id}
              className={`bot-item ${bot.id === selectedBotId ? 'active' : ''}`}
              style={{ '--bot-color': bot.color }}
              onClick={() => {
                setSelectedBotId(bot.id);
                setError('');
              }}
            >
              <span className="bot-avatar">{bot.avatar}</span>
              <div className="bot-details">
                <span className="bot-name">{bot.name}</span>
                <span className="bot-sub">{bot.company}</span>
              </div>
            </button>
          ))}
        </nav>

        <button className="clear-btn" onClick={clearChat} title="Reset this chat">
          Clear Conversation
        </button>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-window">
        <header className="chat-header" style={{ borderBottomColor: activeBot.color }}>
          <div className="active-bot-info">
            <span className="bot-avatar">{activeBot.avatar}</span>
            <div>
              <h3>{activeBot.name}</h3>
              <p>{activeBot.company} • {modelName}</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        <div className="messages-container">
          {currentMessages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="msg-avatar">{activeBot.avatar}</div>
              )}
              <div
                className="message-bubble"
                style={msg.role === 'assistant' ? { borderLeftColor: activeBot.color } : {}}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant">
              <div className="msg-avatar">{activeBot.avatar}</div>
              <div className="message-bubble loading-bubble">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form className="input-bar" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder={`Message ${activeBot.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{ backgroundColor: activeBot.color }}
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
