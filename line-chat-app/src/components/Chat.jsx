import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  where,
  getDocs
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { getFirebaseInstances } from '../firebase';

function Chat({ user, profile, groupId, chatType = 'group', onBack }) {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [groupInfo, setGroupInfo] = useState(null);
  const [showStamps, setShowStamps] = useState(false);
  const [showActions, setShowActions] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(true);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Stamp/Sticker options
  const stamps = [
    '👍', '❤️', '😊', '😂', '😢', '😮', '🎉', '🔥',
    '👏', '🙏', '💪', '✨', '🌟', '💯', '🎈', '🎁'
  ];

  // Reaction options
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

  useEffect(() => {
    if (!groupId) return;

    loadGroupInfo();
    const unsubscribe = loadMessages();
    markMessagesAsRead();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Filter messages based on search query
    if (searchQuery.trim()) {
      const filtered = messages.filter(msg =>
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.userName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMessages(filtered);
    } else {
      setFilteredMessages(messages);
    }
  }, [searchQuery, messages]);

  useEffect(() => {
    // Extract pinned messages
    const pinned = messages.filter(msg => msg.isPinned);
    setPinnedMessages(pinned);
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
      console.error('Error loading group info:', error);
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
    }, (error) => {
      console.error('Error loading messages:', error);
    });

    return unsubscribe;
  };

  const markMessagesAsRead = async () => {
    const { db } = getFirebaseInstances();
    try {
      const q = query(
        collection(db, 'groups', groupId, 'messages'),
        where('readBy', 'not-in', [[user.uid]])
      );

      const snapshot = await getDocs(q);

      snapshot.forEach(async (messageDoc) => {
        const messageRef = doc(db, 'groups', groupId, 'messages', messageDoc.id);
        await updateDoc(messageRef, {
          readBy: arrayUnion({
            userId: user.uid,
            userName: profile.name,
            readAt: new Date()
          })
        });
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!inputText.trim() && !recordingBlob) return;

    const { db } = getFirebaseInstances();
    try {
      const messageData = {
        userId: user.uid,
        userName: profile.name,
        userAvatar: profile.avatar,
        timestamp: serverTimestamp(),
        readBy: [{
          userId: user.uid,
          userName: profile.name,
          readAt: new Date()
        }],
        reactions: [],
        isPinned: false,
        savedBy: []
      };

      if (recordingBlob) {
        // Upload voice message
        const voiceUrl = await uploadFile(recordingBlob, 'voice');
        messageData.type = 'voice';
        messageData.voiceUrl = voiceUrl;
        messageData.text = '[Voice Message]';
      } else {
        messageData.type = 'text';
        messageData.text = inputText.trim();
      }

      if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text,
          userName: replyTo.userName,
          type: replyTo.type
        };
      }

      if (editingMessage) {
        // Update existing message
        const messageRef = doc(db, 'groups', groupId, 'messages', editingMessage.id);
        await updateDoc(messageRef, {
          text: inputText.trim(),
          editedAt: serverTimestamp()
        });
        setEditingMessage(null);
      } else {
        // Create new message
        await addDoc(collection(db, 'groups', groupId, 'messages'), messageData);
      }

      setInputText('');
      setReplyTo(null);
      setRecordingBlob(null);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const sendStamp = async (stamp) => {
    const { db } = getFirebaseInstances();
    try {
      const messageData = {
        type: 'stamp',
        stamp: stamp,
        userId: user.uid,
        userName: profile.name,
        userAvatar: profile.avatar,
        timestamp: serverTimestamp(),
        readBy: [{
          userId: user.uid,
          userName: profile.name,
          readAt: new Date()
        }],
        reactions: [],
        isPinned: false,
        savedBy: []
      };

      if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text,
          userName: replyTo.userName,
          type: replyTo.type
        };
      }

      await addDoc(collection(db, 'groups', groupId, 'messages'), messageData);
      setShowStamps(false);
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending stamp:', error);
      alert('Failed to send stamp. Please try again.');
    }
  };

  const handleFileUpload = async (file, type = 'file') => {
    if (!file) return;

    setUploading(true);
    const { db } = getFirebaseInstances();

    try {
      const fileUrl = await uploadFile(file, type);

      const messageData = {
        type: type,
        userId: user.uid,
        userName: profile.name,
        userAvatar: profile.avatar,
        timestamp: serverTimestamp(),
        readBy: [{
          userId: user.uid,
          userName: profile.name,
          readAt: new Date()
        }],
        reactions: [],
        isPinned: false,
        savedBy: []
      };

      if (type === 'image') {
        messageData.imageUrl = fileUrl;
        messageData.text = '[Image]';
      } else {
        messageData.fileUrl = fileUrl;
        messageData.fileName = file.name;
        messageData.fileSize = file.size;
        messageData.text = `[File: ${file.name}]`;
      }

      if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text,
          userName: replyTo.userName,
          type: replyTo.type
        };
      }

      await addDoc(collection(db, 'groups', groupId, 'messages'), messageData);
      setReplyTo(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file, type) => {
    const { storage } = getFirebaseInstances();
    const timestamp = Date.now();
    const fileName = `${groupId}/${type}/${timestamp}_${file.name || 'voice.webm'}`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file, 'image');
    }
    e.target.value = '';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file, 'file');
    }
    e.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordingBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setRecordingBlob(null);
  };

  const shareLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { db } = getFirebaseInstances();
        try {
          const messageData = {
            type: 'location',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            text: `[Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}]`,
            userId: user.uid,
            userName: profile.name,
            userAvatar: profile.avatar,
            timestamp: serverTimestamp(),
            readBy: [{
              userId: user.uid,
              userName: profile.name,
              readAt: new Date()
            }],
            reactions: [],
            isPinned: false,
            savedBy: []
          };

          if (replyTo) {
            messageData.replyTo = {
              id: replyTo.id,
              text: replyTo.text,
              userName: replyTo.userName,
              type: replyTo.type
            };
          }

          await addDoc(collection(db, 'groups', groupId, 'messages'), messageData);
          setReplyTo(null);
        } catch (error) {
          console.error('Error sharing location:', error);
          alert('Failed to share location. Please try again.');
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Failed to get location. Please check permissions.');
      }
    );
  };

  const addReaction = async (messageId, emoji) => {
    const { db } = getFirebaseInstances();
    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
      const message = messages.find(m => m.id === messageId);

      if (!message) return;

      // Check if user already reacted with this emoji
      const existingReaction = message.reactions?.find(
        r => r.userId === user.uid && r.emoji === emoji
      );

      if (existingReaction) {
        // Remove reaction
        await updateDoc(messageRef, {
          reactions: arrayRemove(existingReaction)
        });
      } else {
        // Add reaction
        await updateDoc(messageRef, {
          reactions: arrayUnion({
            emoji: emoji,
            userId: user.uid,
            userName: profile.name,
            timestamp: new Date()
          })
        });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      alert('Failed to add reaction. Please try again.');
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    const { db } = getFirebaseInstances();
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'messages', messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message. Please try again.');
    }
  };

  const startEditMessage = (message) => {
    setEditingMessage(message);
    setInputText(message.text);
    setShowActions(null);
  };

  const pinMessage = async (messageId) => {
    const { db } = getFirebaseInstances();
    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
      const message = messages.find(m => m.id === messageId);

      await updateDoc(messageRef, {
        isPinned: !message.isPinned
      });
    } catch (error) {
      console.error('Error pinning message:', error);
      alert('Failed to pin message. Please try again.');
    }
  };

  const saveToKeep = async (messageId) => {
    const { db } = getFirebaseInstances();
    try {
      const messageRef = doc(db, 'groups', groupId, 'messages', messageId);
      const message = messages.find(m => m.id === messageId);

      const isSaved = message.savedBy?.some(s => s.userId === user.uid);

      if (isSaved) {
        // Remove from keep
        const savedEntry = message.savedBy.find(s => s.userId === user.uid);
        await updateDoc(messageRef, {
          savedBy: arrayRemove(savedEntry)
        });
        alert('Removed from Keep');
      } else {
        // Add to keep
        await updateDoc(messageRef, {
          savedBy: arrayUnion({
            userId: user.uid,
            userName: profile.name,
            savedAt: new Date()
          })
        });
        alert('Saved to Keep');
      }
    } catch (error) {
      console.error('Error saving to keep:', error);
      alert('Failed to save to keep. Please try again.');
    }
  };

  const replyToMessage = (message) => {
    setReplyTo(message);
    setShowActions(null);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderMessage = (msg) => {
    const isOwn = msg.userId === user.uid;
    const isSaved = msg.savedBy?.some(s => s.userId === user.uid);

    return (
      <div
        key={msg.id}
        className={`message ${isOwn ? 'message-own' : 'message-other'}`}
        onMouseEnter={() => setShowActions(msg.id)}
        onMouseLeave={() => setShowActions(null)}
      >
        {!isOwn && (
          <div className="message-avatar">{msg.userAvatar || '👤'}</div>
        )}

        <div className="message-content">
          {!isOwn && (
            <div className="message-sender">{msg.userName}</div>
          )}

          {/* Reply indicator */}
          {msg.replyTo && (
            <div className="message-reply-indicator">
              <div className="reply-line"></div>
              <div className="reply-content">
                <span className="reply-user">{msg.replyTo.userName}</span>
                <span className="reply-text">{msg.replyTo.text?.substring(0, 50)}</span>
              </div>
            </div>
          )}

          {/* Message bubble */}
          <div className="message-bubble">
            {msg.type === 'text' && msg.text}

            {msg.type === 'stamp' && (
              <div className="message-stamp">{msg.stamp}</div>
            )}

            {msg.type === 'image' && (
              <div className="message-image">
                <img src={msg.imageUrl} alt="Shared image" />
              </div>
            )}

            {msg.type === 'file' && (
              <div className="message-file">
                <div className="file-icon">📎</div>
                <div className="file-info">
                  <div className="file-name">{msg.fileName}</div>
                  <div className="file-size">{formatFileSize(msg.fileSize)}</div>
                </div>
                <a href={msg.fileUrl} download className="file-download">↓</a>
              </div>
            )}

            {msg.type === 'voice' && (
              <div className="message-voice">
                <audio controls src={msg.voiceUrl}>
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {msg.type === 'location' && (
              <div className="message-location">
                <div className="location-icon">📍</div>
                <div className="location-coords">
                  Lat: {msg.latitude?.toFixed(6)}<br/>
                  Lng: {msg.longitude?.toFixed(6)}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="location-link"
                >
                  Open Map
                </a>
              </div>
            )}

            {msg.editedAt && (
              <div className="message-edited">(edited)</div>
            )}

            {isSaved && (
              <div className="message-saved-badge">📌 Saved</div>
            )}
          </div>

          {/* Reactions */}
          {msg.reactions && msg.reactions.length > 0 && (
            <div className="message-reactions">
              {Object.entries(
                msg.reactions.reduce((acc, r) => {
                  acc[r.emoji] = acc[r.emoji] || [];
                  acc[r.emoji].push(r);
                  return acc;
                }, {})
              ).map(([emoji, reactions]) => (
                <button
                  key={emoji}
                  className={`reaction-badge ${
                    reactions.some(r => r.userId === user.uid) ? 'reaction-active' : ''
                  }`}
                  onClick={() => addReaction(msg.id, emoji)}
                  title={reactions.map(r => r.userName).join(', ')}
                >
                  {emoji} {reactions.length}
                </button>
              ))}
            </div>
          )}

          {/* Message time and read receipts */}
          <div className="message-meta">
            <div className="message-time">{formatTime(msg.timestamp)}</div>
            {isOwn && msg.readBy && msg.readBy.length > 1 && (
              <div className="message-read-receipt" title={
                msg.readBy
                  .filter(r => r.userId !== user.uid)
                  .map(r => r.userName)
                  .join(', ')
              }>
                ✓✓ Read by {msg.readBy.length - 1}
              </div>
            )}
          </div>

          {/* Message actions */}
          {showActions === msg.id && (
            <div className="message-actions">
              <button
                className="action-btn"
                onClick={() => replyToMessage(msg)}
                title="Reply"
              >
                ↩️
              </button>
              <button
                className="action-btn"
                onClick={() => setShowActions(msg.id + '-reactions')}
                title="React"
              >
                😊
              </button>
              {isOwn && (
                <>
                  <button
                    className="action-btn"
                    onClick={() => startEditMessage(msg)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => deleteMessage(msg.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </>
              )}
              <button
                className="action-btn"
                onClick={() => pinMessage(msg.id)}
                title={msg.isPinned ? 'Unpin' : 'Pin'}
              >
                {msg.isPinned ? '📌' : '📍'}
              </button>
              <button
                className="action-btn"
                onClick={() => saveToKeep(msg.id)}
                title={isSaved ? 'Remove from Keep' : 'Save to Keep'}
              >
                {isSaved ? '⭐' : '☆'}
              </button>
            </div>
          )}

          {/* Reaction picker */}
          {showActions === msg.id + '-reactions' && (
            <div className="reaction-picker">
              {reactionEmojis.map(emoji => (
                <button
                  key={emoji}
                  className="reaction-btn"
                  onClick={() => {
                    addReaction(msg.id, emoji);
                    setShowActions(null);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <button className="header-back-btn" onClick={onBack}>
          ←
        </button>
        <div className="chat-header-avatar">👥</div>
        <div className="chat-header-info">
          <div className="chat-header-name">{groupInfo?.name || 'Chat'}</div>
          <div className="chat-header-meta">
            {groupInfo?.members?.length || 0} members
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            className="header-action-btn"
            onClick={() => setShowSearch(!showSearch)}
            title="Search"
          >
            🔍
          </button>
          <button
            className="header-action-btn"
            onClick={() => setShowPinnedMessages(!showPinnedMessages)}
            title="Toggle pinned messages"
          >
            📌
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Pinned messages */}
      {showPinnedMessages && pinnedMessages.length > 0 && (
        <div className="pinned-messages">
          <div className="pinned-header">
            <span>📌 Pinned Messages</span>
            <button onClick={() => setShowPinnedMessages(false)}>✕</button>
          </div>
          <div className="pinned-list">
            {pinnedMessages.map(msg => (
              <div key={msg.id} className="pinned-item">
                <span className="pinned-user">{msg.userName}</span>
                <span className="pinned-text">{msg.text?.substring(0, 50)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="messages-container">
        {filteredMessages.length === 0 && !searchQuery ? (
          <div className="empty-chat-message">
            No messages yet<br />
            Send the first message!
          </div>
        ) : filteredMessages.length === 0 && searchQuery ? (
          <div className="empty-chat-message">
            No messages found matching "{searchQuery}"
          </div>
        ) : (
          filteredMessages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="reply-banner">
          <div className="reply-banner-content">
            <span className="reply-banner-label">Replying to {replyTo.userName}</span>
            <span className="reply-banner-text">{replyTo.text?.substring(0, 50)}</span>
          </div>
          <button
            className="reply-banner-close"
            onClick={() => setReplyTo(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Editing indicator */}
      {editingMessage && (
        <div className="edit-banner">
          <span className="edit-banner-label">Editing message</span>
          <button
            className="edit-banner-close"
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Recording indicator */}
      {(isRecording || recordingBlob) && (
        <div className="recording-banner">
          {isRecording ? (
            <>
              <span className="recording-indicator">🔴 Recording...</span>
              <button className="recording-btn" onClick={stopRecording}>
                Stop
              </button>
            </>
          ) : (
            <>
              <span className="recording-indicator">✓ Voice message ready</span>
              <button className="recording-btn" onClick={cancelRecording}>
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* Stamp picker */}
      {showStamps && (
        <div className="stamp-picker">
          <div className="stamp-picker-header">
            <span>Stamps</span>
            <button onClick={() => setShowStamps(false)}>✕</button>
          </div>
          <div className="stamp-grid">
            {stamps.map((stamp, index) => (
              <button
                key={index}
                className="stamp-btn"
                onClick={() => sendStamp(stamp)}
              >
                {stamp}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <form className="input-container" onSubmit={sendMessage}>
        <div className="input-actions">
          <button
            type="button"
            className="input-action-btn"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
            title="Send image"
          >
            🖼️
          </button>
          <button
            type="button"
            className="input-action-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Send file"
          >
            📎
          </button>
          <button
            type="button"
            className="input-action-btn"
            onClick={() => setShowStamps(!showStamps)}
            title="Send stamp"
          >
            😊
          </button>
          <button
            type="button"
            className="input-action-btn"
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop recording" : "Record voice"}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
          <button
            type="button"
            className="input-action-btn"
            onClick={shareLocation}
            title="Share location"
          >
            📍
          </button>
        </div>

        <div className="input-wrapper">
          <input
            type="text"
            className="message-input"
            placeholder={
              uploading ? "Uploading..." :
              editingMessage ? "Edit your message..." :
              "Type a message..."
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={uploading || isRecording || !!recordingBlob}
          />
        </div>

        <button
          type="submit"
          className="send-btn"
          disabled={uploading || (!inputText.trim() && !recordingBlob)}
        >
          {editingMessage ? '✓' : '➤'}
        </button>
      </form>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  );
}

export default Chat;
