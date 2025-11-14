import { useState, useContext } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { getFirebaseInstances } from '../firebase';
import { AppContext } from '../App';

function Settings({ user, profile, onBack }) {
  const { darkMode, toggleDarkMode } = useContext(AppContext);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar || '👤');
  const [saving, setSaving] = useState(false);

  const avatars = [
    '👤', '😀', '😎', '🤓', '😊', '🥳', '🤗', '😇',
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🦁', '🐯', '🐨', '🐷', '🐸', '🐵', '🐔', '🐧',
    '🦄', '🐝', '🦋', '🐢', '🐙', '🦀', '🐠', '🐡'
  ];

  const handleSave = async () => {
    if (!name.trim()) {
      alert('名前を入力してください');
      return;
    }

    setSaving(true);
    const { db } = getFirebaseInstances();

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        avatar: selectedAvatar
      });

      alert('プロフィールを更新しました');
      setEditing(false);
      window.location.reload(); // プロフィールを反映
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setName(profile?.name || '');
    setSelectedAvatar(profile?.avatar || '👤');
    setEditing(false);
  };

  return (
    <div className="lime-container">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>
          ◀
        </button>
        <h2>設定</h2>
        <div style={{ width: '40px' }}></div>
      </div>

      <div className="lime-card" style={{ maxWidth: '600px' }}>
        {/* プロフィールセクション */}
        <div className="settings-section">
          <h3 className="settings-section-title">プロフィール</h3>

          {!editing ? (
            <div className="settings-profile-view">
              <div className="settings-profile-display">
                <span className="settings-avatar-large">{profile?.avatar || '👤'}</span>
                <div>
                  <div className="settings-name">{profile?.name || '名無し'}</div>
                  <div className="settings-uid">ID: {user?.uid.substring(0, 8)}...</div>
                </div>
              </div>
              <button className="lime-btn lime-btn-secondary" onClick={() => setEditing(true)}>
                編集
              </button>
            </div>
          ) : (
            <div className="settings-profile-edit">
              <div className="form-group">
                <label className="form-label">名前</label>
                <input
                  type="text"
                  className="lime-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="名前を入力"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">アバター</label>
                <div className="settings-avatar-current">
                  <span className="settings-avatar-large">{selectedAvatar}</span>
                </div>
                <div className="settings-avatar-grid">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar}
                      className={`settings-avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                      onClick={() => setSelectedAvatar(avatar)}
                      disabled={saving}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="button-grid">
                <button
                  className="lime-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  className="lime-btn lime-btn-secondary"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 表示設定 */}
        <div className="settings-section">
          <h3 className="settings-section-title">表示設定</h3>

          <div className="settings-option">
            <div className="settings-option-info">
              <div className="settings-option-label">ダークモード</div>
              <div className="settings-option-description">
                暗い背景で目に優しい表示
              </div>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={toggleDarkMode}
              />
              <span className="settings-toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* 通知設定 */}
        <div className="settings-section">
          <h3 className="settings-section-title">通知設定</h3>

          <div className="settings-option">
            <div className="settings-option-info">
              <div className="settings-option-label">メッセージ通知</div>
              <div className="settings-option-description">
                新しいメッセージの通知を受け取る
              </div>
            </div>
            <label className="settings-toggle">
              <input
                type="checkbox"
                defaultChecked={true}
                disabled
              />
              <span className="settings-toggle-slider"></span>
            </label>
          </div>

          <div className="settings-note">
            ※ 通知機能は今後実装予定です
          </div>
        </div>

        {/* アプリ情報 */}
        <div className="settings-section">
          <h3 className="settings-section-title">アプリ情報</h3>

          <div className="settings-info-item">
            <span className="settings-info-label">アプリ名</span>
            <span className="settings-info-value">LIME</span>
          </div>

          <div className="settings-info-item">
            <span className="settings-info-label">バージョン</span>
            <span className="settings-info-value">2.0.0</span>
          </div>

          <div className="settings-info-item">
            <span className="settings-info-label">開発</span>
            <span className="settings-info-value">Claude Code</span>
          </div>
        </div>

        {/* フッター */}
        <div className="settings-footer">
          <p>© 2024 LIME Chat App</p>
          <p>シンプルで楽しいチャットアプリ</p>
        </div>
      </div>
    </div>
  );
}

export default Settings;
