import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase設定を保存・取得
export const saveFirebaseConfig = (config) => {
  localStorage.setItem('firebaseConfig', JSON.stringify(config));
};

export const getFirebaseConfig = () => {
  const saved = localStorage.getItem('firebaseConfig');
  return saved ? JSON.parse(saved) : null;
};

// Firebase初期化
let app = null;
let auth = null;
let db = null;
let storage = null;

export const initializeFirebase = (config) => {
  try {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    saveFirebaseConfig(config);
    return { app, auth, db, storage };
  } catch (error) {
    console.error('Firebase初期化エラー:', error);
    throw error;
  }
};

export const getFirebaseInstances = () => {
  return { app, auth, db, storage };
};

export { auth, db, storage };
