import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { initializeFirebase, getFirebaseConfig, getFirebaseInstances } from './firebase';
import FirebaseSetup from './components/FirebaseSetup';
import ProfileSetup from './components/ProfileSetup';
import GroupList from './components/GroupList';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [screen, setScreen] = useState('welcome');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    // 保存されたFirebase設定をチェック
    const savedConfig = getFirebaseConfig();
    if (savedConfig) {
      try {
        initializeFirebase(savedConfig);
        setFirebaseReady(true);
        setScreen('loading');
      } catch (error) {
        console.error('Firebase初期化失敗:', error);
        setScreen('firebaseSetup');
      }
    } else {
      setScreen('welcome');
    }
  }, []);

  useEffect(() => {
    if (!firebaseReady) return;

    const { auth } = getFirebaseInstances();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // プロフィールチェックは別のコンポーネントで行う
        setScreen('checkProfile');
      } else {
        // 匿名認証
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('認証エラー:', error);
        }
      }
    });

    return () => unsubscribe();
  }, [firebaseReady]);

  const handleFirebaseSetup = (config) => {
    try {
      initializeFirebase(config);
      setFirebaseReady(true);
      setScreen('loading');
    } catch (error) {
      alert('Firebase接続に失敗しました: ' + error.message);
    }
  };

  const handleProfileComplete = (profileData) => {
    setProfile(profileData);
    setScreen('groupList');
  };

  const openChat = (groupId) => {
    setCurrentGroupId(groupId);
    setScreen('chat');
  };

  const backToGroupList = () => {
    setCurrentGroupId(null);
    setScreen('groupList');
  };

  if (screen === 'welcome') {
    return (
      <div className="lime-container">
        <div className="lime-logo">LIME</div>
        <div className="lime-subtitle">シンプルで楽しいチャットアプリ</div>
        <div className="lime-card">
          <h2 className="text-center mb-30">ようこそ！</h2>
          <button className="lime-btn" onClick={() => setScreen('firebaseSetup')}>
            はじめる
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'firebaseSetup') {
    return <FirebaseSetup onComplete={handleFirebaseSetup} />;
  }

  if (screen === 'loading') {
    return (
      <div className="lime-container">
        <div className="lime-logo">LIME</div>
        <div className="lime-subtitle">読み込み中...</div>
      </div>
    );
  }

  if (screen === 'checkProfile') {
    return (
      <ProfileSetup
        user={user}
        onComplete={handleProfileComplete}
        onProfileExists={(existingProfile) => {
          setProfile(existingProfile);
          setScreen('groupList');
        }}
      />
    );
  }

  if (screen === 'groupList') {
    return (
      <GroupList
        user={user}
        profile={profile}
        onOpenChat={openChat}
      />
    );
  }

  if (screen === 'chat') {
    return (
      <Chat
        user={user}
        profile={profile}
        groupId={currentGroupId}
        onBack={backToGroupList}
      />
    );
  }

  return null;
}

export default App;
