import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseInstances } from '../firebase';

const AVATARS = ['👤', '😊', '😎', '🌟', '🎉', '💚', '🦁', '🐱'];

function ProfileSetup({ user, onComplete, onProfileExists }) {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👤');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingProfile();
  }, [user]);

  const checkExistingProfile = async () => {
    if (!user) return;

    const { db } = getFirebaseInstances();
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        onProfileExists(docSnap.data());
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('プロフィール確認エラー:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('名前を入力してください');
      return;
    }

    const { db } = getFirebaseInstances();
    try {
      const profileData = {
        name: name.trim(),
        avatar: selectedAvatar,
        userId: user.uid,
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), profileData);
      onComplete(profileData);
    } catch (error) {
      console.error('プロフィール保存エラー:', error);
      alert('プロフィール保存に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="lime-container">
        <div className="lime-logo">LIME</div>
        <div className="lime-subtitle">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="lime-container">
      <div className="lime-logo">LIME</div>
      <div className="lime-subtitle">プロフィール設定</div>
      <div className="lime-card">
        <h2 className="mb-20">あなたについて教えてください</h2>

        <div className="lime-avatar-large">{selectedAvatar}</div>

        <div className="lime-avatar-grid">
          {AVATARS.map((avatar) => (
            <div
              key={avatar}
              className={`lime-avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
              onClick={() => setSelectedAvatar(avatar)}
            >
              {avatar}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="lime-input"
            placeholder="名前を入力"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="lime-btn">
            完了
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileSetup;
