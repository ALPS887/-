import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: 'こんにちは！', sender: 'other', time: '10:30' },
    { id: 2, text: 'やあ、元気？', sender: 'me', time: '10:31' },
    { id: 3, text: '元気だよ！今日は天気がいいね', sender: 'other', time: '10:32' },
    { id: 4, text: 'そうだね！散歩でも行こうかな', sender: 'me', time: '10:33' },
  ])
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (inputText.trim() === '') return

    const now = new Date()
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

    const newMessage = {
      id: messages.length + 1,
      text: inputText,
      sender: 'me',
      time: time,
    }

    setMessages([...messages, newMessage])
    setInputText('')

    // 自動返信（デモ用）
    setTimeout(() => {
      const replyTime = `${now.getHours()}:${String(now.getMinutes() + 1).padStart(2, '0')}`
      const replies = [
        'いいね！',
        'そうだね',
        'わかった！',
        'ありがとう',
        '了解です',
        'なるほど',
      ]
      const randomReply = replies[Math.floor(Math.random() * replies.length)]

      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: randomReply,
          sender: 'other',
          time: replyTime,
        },
      ])
    }, 1000)
  }

  return (
    <div className="line-app">
      {/* ヘッダー */}
      <header className="line-header">
        <div className="header-left">
          <button className="back-button">←</button>
        </div>
        <div className="header-center">
          <div className="chat-name">友達</div>
        </div>
        <div className="header-right">
          <button className="menu-button">≡</button>
        </div>
      </header>

      {/* メッセージエリア */}
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-wrapper ${message.sender === 'me' ? 'message-me' : 'message-other'}`}
          >
            {message.sender === 'other' && (
              <div className="avatar">
                <div className="avatar-circle">👤</div>
              </div>
            )}
            <div className="message-content">
              <div className="message-bubble">
                {message.text}
              </div>
              <div className="message-time">{message.time}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <form className="input-container" onSubmit={handleSend}>
        <button type="button" className="add-button">+</button>
        <input
          type="text"
          className="message-input"
          placeholder="メッセージを入力"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="send-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    </div>
  )
}

export default App
