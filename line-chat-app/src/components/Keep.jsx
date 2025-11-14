import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { getFirebaseInstances } from '../firebase';

function Keep({ user, profile, onBack }) {
  const [savedMessages, setSavedMessages] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'text', 'image', 'file', 'voice', 'location', 'stamp'

  useEffect(() => {
    if (!user) return;

    const { db } = getFirebaseInstances();

    // ユーザーが参加している全グループを取得
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(groupsQuery, (groupsSnapshot) => {
      const allMessages = [];

      groupsSnapshot.forEach((groupDoc) => {
        const messagesQuery = query(
          collection(db, 'groups', groupDoc.id, 'messages'),
          where('savedBy', 'array-contains', user.uid)
        );

        onSnapshot(messagesQuery, (messagesSnapshot) => {
          const messages = messagesSnapshot.docs.map((doc) => ({
            id: doc.id,
            groupId: groupDoc.id,
            groupName: groupDoc.data().name,
            ...doc.data()
          }));

          // 既存のこのグループのメッセージを削除
          const otherGroupMessages = allMessages.filter(m => m.groupId !== groupDoc.id);
          // 新しいメッセージを追加
          const updatedMessages = [...otherGroupMessages, ...messages];
          // タイムスタンプでソート
          updatedMessages.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return b.timestamp.toMillis() - a.timestamp.toMillis();
          });

          setSavedMessages(updatedMessages);
        });
      });
    });

    return () => unsubscribe();
  }, [user]);

  const unsaveMessage = async (message) => {
    if (!confirm('Keepから削除しますか？')) return;

    const { db } = getFirebaseInstances();
    const messageRef = doc(db, 'groups', message.groupId, 'messages', message.id);

    try {
      await updateDoc(messageRef, {
        savedBy: arrayRemove(user.uid)
      });
    } catch (error) {
      console.error('Keep削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredMessages = savedMessages.filter((msg) => {
    if (filter === 'all') return true;
    return msg.type === filter;
  });

  const renderMessageContent = (message) => {
    switch (message.type) {
      case 'stamp':
        return <div className="keep-stamp">{message.text}</div>;

      case 'image':
        return (
          <div className="keep-image-container">
            <img src={message.fileUrl} alt="画像" className="keep-image" />
            {message.text && <div className="keep-image-caption">{message.text}</div>}
          </div>
        );

      case 'file':
        return (
          <div className="keep-file">
            📎 <a href={message.fileUrl} target="_blank" rel="noopener noreferrer">
              {message.fileName}
            </a>
            {message.text && <div className="keep-file-caption">{message.text}</div>}
          </div>
        );

      case 'voice':
        return (
          <div className="keep-voice">
            🎤 音声メッセージ
            <audio controls src={message.voiceUrl} className="keep-audio" />
          </div>
        );

      case 'location':
        return (
          <div className="keep-location">
            📍 <a href={message.locationUrl} target="_blank" rel="noopener noreferrer">
              位置情報を見る
            </a>
          </div>
        );

      default:
        return <div className="keep-text">{message.text}</div>;
    }
  };

  return (
    <div className="lime-container">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>
          ◀
        </button>
        <h2>Keep</h2>
        <div style={{ width: '40px' }}></div>
      </div>

      <div className="lime-card" style={{ maxWidth: '800px' }}>
        {/* フィルター */}
        <div className="keep-filters">
          <button
            className={`keep-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            すべて
          </button>
          <button
            className={`keep-filter-btn ${filter === 'text' ? 'active' : ''}`}
            onClick={() => setFilter('text')}
          >
            💬 テキスト
          </button>
          <button
            className={`keep-filter-btn ${filter === 'image' ? 'active' : ''}`}
            onClick={() => setFilter('image')}
          >
            🖼️ 画像
          </button>
          <button
            className={`keep-filter-btn ${filter === 'file' ? 'active' : ''}`}
            onClick={() => setFilter('file')}
          >
            📎 ファイル
          </button>
          <button
            className={`keep-filter-btn ${filter === 'voice' ? 'active' : ''}`}
            onClick={() => setFilter('voice')}
          >
            🎤 音声
          </button>
          <button
            className={`keep-filter-btn ${filter === 'location' ? 'active' : ''}`}
            onClick={() => setFilter('location')}
          >
            📍 位置
          </button>
          <button
            className={`keep-filter-btn ${filter === 'stamp' ? 'active' : ''}`}
            onClick={() => setFilter('stamp')}
          >
            😀 スタンプ
          </button>
        </div>

        {/* 保存メッセージ一覧 */}
        <div className="keep-messages">
          {filteredMessages.length === 0 ? (
            <p className="empty-message">
              {filter === 'all'
                ? 'Keepに保存されたメッセージはありません'
                : 'この種類の保存メッセージはありません'
              }
            </p>
          ) : (
            filteredMessages.map((message) => (
              <div key={`${message.groupId}-${message.id}`} className="keep-item">
                <div className="keep-item-header">
                  <div className="keep-item-info">
                    <span className="keep-avatar">{message.userAvatar}</span>
                    <div>
                      <div className="keep-username">{message.userName}</div>
                      <div className="keep-group-name">{message.groupName}</div>
                    </div>
                  </div>
                  <div className="keep-item-meta">
                    <span className="keep-timestamp">{formatTimestamp(message.timestamp)}</span>
                    <button
                      className="keep-delete-btn"
                      onClick={() => unsaveMessage(message)}
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="keep-content">
                  {message.replyTo && (
                    <div className="keep-reply-indicator">
                      返信: {message.replyTo.userName}さんのメッセージ
                    </div>
                  )}
                  {renderMessageContent(message)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Keep;
