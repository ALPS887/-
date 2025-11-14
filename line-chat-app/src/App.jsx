import { useState, useEffect, createContext } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase, getFirebaseConfig, getFirebaseInstances } from './firebase';
import FirebaseSetup from './components/FirebaseSetup';
import ProfileSetup from './components/ProfileSetup';
import GroupList from './components/GroupList';
import Chat from './components/Chat';
import Timeline from './components/Timeline';
import Keep from './components/Keep';
import Settings from './components/Settings';
import './App.css';

// グローバルコンテキスト
export const AppContext = createContext();

function App() {
  const [screen, setScreen] = useState('welcome');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentChatType, setCurrentChatType] = useState('group'); // 'group' or 'direct'
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({});

  // ダークモードの初期化
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.body.classList.add('dark-mode');
    }
  }, []);

  useEffect(() => {
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

    const { auth, db } = getFirebaseInstances();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // オンライン状態を更新
        if (db) {
          const userRef = doc(db, 'users', currentUser.uid);
          try {
            await updateDoc(userRef, {
              online: true,
              lastSeen: serverTimestamp()
            });
          } catch (error) {
            // ユーザードキュメントがまだ存在しない場合は無視
          }
        }
        setScreen('checkProfile');
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('認証エラー:', error);
        }
      }
    });

    // アプリ終了時にオフライン状態を設定
    const handleBeforeUnload = async () => {
      if (user && db) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          online: false,
          lastSeen: serverTimestamp()
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [firebaseReady, user]);

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

  const openChat = (groupId, chatType = 'group') => {
    setCurrentGroupId(groupId);
    setCurrentChatType(chatType);
    setScreen('chat');
  };

  const openTimeline = () => {
    setScreen('timeline');
  };

  const openKeep = () => {
    setScreen('keep');
  };

  const openSettings = () => {
    setScreen('settings');
  };

  const backToGroupList = () => {
    setCurrentGroupId(null);
    setScreen('groupList');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    if (newDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  const contextValue = {
    user,
    profile,
    darkMode,
    toggleDarkMode,
    notificationSettings,
    setNotificationSettings,
    openTimeline,
    openKeep,
    openSettings,
    openChat,
    backToGroupList
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

  return (
    <AppContext.Provider value={contextValue}>
      {screen === 'groupList' && (
        <GroupList
          user={user}
          profile={profile}
          onOpenChat={openChat}
          onOpenTimeline={openTimeline}
          onOpenKeep={openKeep}
          onOpenSettings={openSettings}
        />
      )}

      {screen === 'chat' && (
        <Chat
          user={user}
          profile={profile}
          groupId={currentGroupId}
          chatType={currentChatType}
          onBack={backToGroupList}
        />
      )}

      {screen === 'timeline' && (
        <Timeline
          user={user}
          profile={profile}
          onBack={backToGroupList}
        />
      )}

      {screen === 'keep' && (
        <Keep
          user={user}
          profile={profile}
          onBack={backToGroupList}
        />
      )}

      {screen === 'settings' && (
        <Settings
          user={user}
          profile={profile}
          onBack={backToGroupList}
        />
      )}
    </AppContext.Provider>
  );
}

export default App;
