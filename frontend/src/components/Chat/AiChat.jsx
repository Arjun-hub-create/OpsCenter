import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from '../../api'
import './AiChat.css'

const PROMPTS = [
  'Show shift II failures this week',
  'Which machine has most errors?',
  'Summarize today\'s production',
  'List all anomaly flags',
  'What is the average quantity per shift?',
]

function Message({ msg }) {
  return (
    <div className={`chat-msg ${msg.role}`}>
      <div className="chat-msg-label">
        {msg.role === 'user' ? '> USER' : '⬡ OPSCENTER·AI'}
      </div>
      <div className="chat-msg-text">{msg.text}</div>
      <div className="chat-msg-time">{msg.time}</div>
    </div>
  )
}

export default function AiChat({ recordCount }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'OpsCenter AI online. I have access to your manufacturing records. How can I assist?',
      time: new Date().toLocaleTimeString(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg) return
    setInput('')
    setMessages(p => [...p, { role: 'user', text: msg, time: new Date().toLocaleTimeString() }])
    setLoading(true)
    try {
      const data = await sendChatMessage(msg)
      setMessages(p => [...p, { role: 'ai', text: data.response, time: new Date().toLocaleTimeString() }])
    } catch (e) {
      setMessages(p => [...p, { role: 'ai', text: `Error: ${e.message}`, time: new Date().toLocaleTimeString() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-chat">
      <div className="chat-messages scroll-area">
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {loading && (
          <div className="chat-msg ai">
            <div className="chat-msg-label">⬡ OPSCENTER·AI</div>
            <div className="chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-prompts">
        {PROMPTS.map((p, i) => (
          <button key={i} className="chip" onClick={() => send(p)}>{p}</button>
        ))}
      </div>

      <div className="chat-input-row">
        <span className="chat-cursor-icon">›</span>
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Query manufacturing records..."
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>
          SEND
        </button>
      </div>
    </div>
  )
}
