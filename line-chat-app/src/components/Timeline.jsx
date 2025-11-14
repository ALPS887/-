import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirebaseInstances } from '../firebase';

function Timeline({ user, profile, onBack }) {
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const { db } = getFirebaseInstances();
    const q = query(
      collection(db, 'timeline'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('画像は10MB以下にしてください');
        return;
      }
      setPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setPostImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createPost = async () => {
    if (!postText.trim() && !postImage) {
      alert('テキストまたは画像を入力してください');
      return;
    }

    setUploading(true);
    const { db, storage } = getFirebaseInstances();

    try {
      let imageUrl = null;

      if (postImage) {
        const imageRef = ref(storage, `timeline/${user.uid}/${Date.now()}_${postImage.name}`);
        await uploadBytes(imageRef, postImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, 'timeline'), {
        userId: user.uid,
        userName: profile?.name || '名無し',
        userAvatar: profile?.avatar || '👤',
        text: postText.trim(),
        imageUrl,
        likes: [],
        comments: [],
        timestamp: serverTimestamp()
      });

      setPostText('');
      removeImage();
    } catch (error) {
      console.error('投稿エラー:', error);
      alert('投稿に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const deletePost = async (postId) => {
    if (!confirm('この投稿を削除しますか？')) return;

    const { db } = getFirebaseInstances();
    try {
      await deleteDoc(doc(db, 'timeline', postId));
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const toggleLike = async (post) => {
    const { db } = getFirebaseInstances();
    const postRef = doc(db, 'timeline', post.id);

    try {
      if (post.likes?.includes(user.uid)) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('いいねエラー:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;

    return date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  };

  return (
    <div className="lime-container">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>
          ◀
        </button>
        <h2>タイムライン</h2>
        <div style={{ width: '40px' }}></div>
      </div>

      <div className="lime-card" style={{ maxWidth: '800px' }}>
        {/* 投稿作成フォーム */}
        <div className="timeline-post-form">
          <div className="timeline-post-header">
            <span className="post-avatar">{profile?.avatar || '👤'}</span>
            <span className="post-username">{profile?.name || '名無し'}</span>
          </div>

          <textarea
            className="timeline-textarea"
            placeholder="今何してる？"
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            rows={3}
            disabled={uploading}
          />

          {imagePreview && (
            <div className="timeline-image-preview">
              <img src={imagePreview} alt="プレビュー" />
              <button
                className="timeline-image-remove"
                onClick={removeImage}
                disabled={uploading}
              >
                ✕
              </button>
            </div>
          )}

          <div className="timeline-post-actions">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <button
              className="timeline-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              📷 画像
            </button>
            <button
              className="lime-btn"
              onClick={createPost}
              disabled={uploading || (!postText.trim() && !postImage)}
            >
              {uploading ? '投稿中...' : '投稿'}
            </button>
          </div>
        </div>

        {/* 投稿一覧 */}
        <div className="timeline-feed">
          {posts.length === 0 ? (
            <p className="empty-message">
              まだ投稿がありません<br />
              最初の投稿をしてみましょう！
            </p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="timeline-post">
                <div className="timeline-post-header">
                  <span className="post-avatar">{post.userAvatar}</span>
                  <div className="post-user-info">
                    <span className="post-username">{post.userName}</span>
                    <span className="post-timestamp">{formatTimestamp(post.timestamp)}</span>
                  </div>
                  {post.userId === user.uid && (
                    <button
                      className="post-delete-btn"
                      onClick={() => deletePost(post.id)}
                      title="削除"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {post.text && (
                  <div className="timeline-post-text">{post.text}</div>
                )}

                {post.imageUrl && (
                  <div className="timeline-post-image">
                    <img src={post.imageUrl} alt="投稿画像" />
                  </div>
                )}

                <div className="timeline-post-footer">
                  <button
                    className={`timeline-like-btn ${post.likes?.includes(user.uid) ? 'liked' : ''}`}
                    onClick={() => toggleLike(post)}
                  >
                    {post.likes?.includes(user.uid) ? '❤️' : '🤍'} {post.likes?.length || 0}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
