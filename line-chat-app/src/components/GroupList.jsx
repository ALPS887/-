import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { getFirebaseInstances } from '../firebase';

function GroupList({ user, profile, onOpenChat }) {
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!user) return;

    const { db } = getFirebaseInstances();
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
    });

    return () => unsubscribe();
  }, [user]);

  const createGroup = async () => {
    if (!groupName.trim()) {
      alert('グループ名を入力してください');
      return;
    }

    const { db } = getFirebaseInstances();
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await addDoc(collection(db, 'groups'), {
        name: groupName.trim(),
        code,
        createdBy: user.uid,
        createdAt: new Date(),
        members: [user.uid]
      });

      alert(`グループを作成しました！\n招待コード: ${code}`);
      setGroupName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('グループ作成エラー:', error);
      alert('グループ作成に失敗しました');
    }
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) {
      alert('招待コードを入力してください');
      return;
    }

    const { db } = getFirebaseInstances();
    try {
      const q = query(
        collection(db, 'groups'),
        where('code', '==', joinCode.toUpperCase())
      );

      const snapshot = await new Promise((resolve) => {
        const unsubscribe = onSnapshot(q, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });

      if (snapshot.empty) {
        alert('グループが見つかりません');
        return;
      }

      const groupDoc = snapshot.docs[0];
      const groupData = groupDoc.data();

      if (groupData.members.includes(user.uid)) {
        alert('すでに参加しています');
        return;
      }

      await updateDoc(doc(db, 'groups', groupDoc.id), {
        members: arrayUnion(user.uid)
      });

      alert('グループに参加しました！');
      setJoinCode('');
      setShowJoinModal(false);
    } catch (error) {
      console.error('グループ参加エラー:', error);
      alert('グループ参加に失敗しました');
    }
  };

  return (
    <div className="lime-container">
      <div className="lime-logo">LIME</div>
      <div className="lime-card" style={{ maxWidth: '800px' }}>
        <div className="group-list-header">
          <h2>{profile?.name}さん</h2>
        </div>

        <div className="button-grid">
          <button className="lime-btn" onClick={() => setShowCreateModal(true)}>
            ➕ グループ作成
          </button>
          <button className="lime-btn lime-btn-secondary" onClick={() => setShowJoinModal(true)}>
            🔑 グループ参加
          </button>
        </div>

        <h3 className="mt-30 mb-15">あなたのグループ</h3>

        {groups.length === 0 ? (
          <p className="empty-message">
            グループがありません<br />
            まずはグループを作成または参加してください
          </p>
        ) : (
          <div className="group-list">
            {groups.map((group) => (
              <div
                key={group.id}
                className="group-card"
                onClick={() => onOpenChat(group.id)}
              >
                <div className="group-avatar">👥</div>
                <div className="group-info">
                  <div className="group-name">{group.name}</div>
                  <div className="group-meta">
                    {group.members?.length || 0}人のメンバー • コード: {group.code}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* グループ作成モーダル */}
      {showCreateModal && (
        <div className="lime-modal" onClick={() => setShowCreateModal(false)}>
          <div className="lime-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="lime-modal-header">
              <span>グループを作成</span>
              <button className="lime-modal-close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <input
              type="text"
              className="lime-input"
              placeholder="グループ名"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createGroup()}
            />
            <button className="lime-btn" onClick={createGroup}>
              作成
            </button>
          </div>
        </div>
      )}

      {/* グループ参加モーダル */}
      {showJoinModal && (
        <div className="lime-modal" onClick={() => setShowJoinModal(false)}>
          <div className="lime-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="lime-modal-header">
              <span>グループに参加</span>
              <button className="lime-modal-close" onClick={() => setShowJoinModal(false)}>
                ✕
              </button>
            </div>
            <input
              type="text"
              className="lime-input"
              placeholder="6桁の招待コード"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && joinGroup()}
              maxLength={6}
            />
            <button className="lime-btn" onClick={joinGroup}>
              参加
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupList;
