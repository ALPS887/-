import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc } from 'firebase/firestore';
import { getFirebaseInstances } from '../firebase';

function Chat({ user, profile, groupId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [groupInfo, setGroupInfo] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!groupId) return;

    loadGroupInfo();
    loadMessages();
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadGroupInfo = async () => {
    const { db } = getFirebaseInstances();
    try {
      const docRef = doc(db, 'groups', groupId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setGroupInfo({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error('グループ情報取得エラー:', error);
    }
  };

  const loadMessages = () => {
    const { db } = getFirebaseInstances();
    const q = query(
      collection(db, 'groups', groupId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!inputText.trim()) return;

    const { db } = getFirebaseInstances();
    try {
      await addDoc(collection(db, 'groups', groupId, 'messages'), {
        text: inputText.trim(),
        userId: user.uid,
        userName: profile.name,
        userAvatar: profile.avatar,
        timestamp: new Date()
      });

      setInputText('');
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      alert('メッセージ送信に失敗しました');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      {/* ヘッダー */}
      <div className="chat-header">
        <button className="header-back-btn" onClick={onBack}>
          ←
        </button>
        <div className="chat-header-avatar">👥</div>
        <div className="chat-header-info">
          <div className="chat-header-name">{groupInfo?.name || 'チャット'}</div>
          <div className="chat-header-meta">
            {groupInfo?.members?.length || 0}人のメンバー
          </div>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat-message">
            まだメッセージがありません<br />
            最初のメッセージを送信してみましょう！
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.userId === user.uid ? 'message-own' : 'message-other'}`}
            >
              {msg.userId !== user.uid && (
                <div className="message-avatar">{msg.userAvatar || '👤'}</div>
              )}
              <div className="message-content">
                {msg.userId !== user.uid && (
                  <div className="message-sender">{msg.userName}</div>
                )}
                <div className="message-bubble">{msg.text}</div>
                <div className="message-time">{formatTime(msg.timestamp)}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <form className="input-container" onSubmit={sendMessage}>
        <div className="input-wrapper">
          <input
            type="text"
            className="message-input"
            placeholder="メッセージを入力..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>
        <button type="submit" className="send-btn">
          ➤
        </button>
      </form>
    </div>
  );
}

export default Chat;
