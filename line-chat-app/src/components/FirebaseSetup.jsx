import { useState } from 'react';

function FirebaseSetup({ onComplete }) {
  const [config, setConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  const handleChange = (e) => {
    setConfig({
      ...config,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!config.apiKey || !config.projectId) {
      alert('API KeyとProject IDは必須です');
      return;
    }

    onComplete(config);
  };

  return (
    <div className="lime-container">
      <div className="lime-logo">LIME</div>
      <div className="lime-subtitle">Firebase設定</div>
      <div className="lime-card">
        <h2 className="mb-20">接続設定</h2>
        <p className="lime-description mb-20">
          Firebaseプロジェクトの情報を入力してください
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="apiKey"
            className="lime-input"
            placeholder="API Key"
            value={config.apiKey}
            onChange={handleChange}
          />
          <input
            type="text"
            name="authDomain"
            className="lime-input"
            placeholder="Auth Domain (例: myapp.firebaseapp.com)"
            value={config.authDomain}
            onChange={handleChange}
          />
          <input
            type="text"
            name="projectId"
            className="lime-input"
            placeholder="Project ID"
            value={config.projectId}
            onChange={handleChange}
          />
          <input
            type="text"
            name="storageBucket"
            className="lime-input"
            placeholder="Storage Bucket (例: myapp.appspot.com)"
            value={config.storageBucket}
            onChange={handleChange}
          />
          <input
            type="text"
            name="messagingSenderId"
            className="lime-input"
            placeholder="Messaging Sender ID"
            value={config.messagingSenderId}
            onChange={handleChange}
          />
          <input
            type="text"
            name="appId"
            className="lime-input"
            placeholder="App ID"
            value={config.appId}
            onChange={handleChange}
          />
          <button type="submit" className="lime-btn">
            接続
          </button>
        </form>
      </div>
    </div>
  );
}

export default FirebaseSetup;
