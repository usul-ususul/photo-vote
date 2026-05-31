import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PhotoGrid from './components/PhotoGrid';
import Leaderboard from './components/Leaderboard';
import UploadForm from './components/UploadForm';

const socket = io('/', {
  transports: ['websocket', 'polling'],
});

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [votedIds, setVotedIds] = useState(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);

  // 加载照片数据
  const fetchPhotos = async (sort = sortBy) => {
    try {
      const res = await fetch(`/api/photos?sort=${sort}`);
      const data = await res.json();
      if (data.success) setPhotos(data.data);
    } catch (err) {
      console.error('加载照片失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 加载排行榜
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard?limit=10');
      const data = await res.json();
      if (data.success) setLeaderboard(data.data);
    } catch (err) {
      console.error('加载排行榜失败:', err);
    }
  };

  // 加载用户已投票记录
  const fetchMyVotes = async () => {
    try {
      const res = await fetch('/api/my-votes');
      const data = await res.json();
      if (data.success) setVotedIds(new Set(data.data));
    } catch (err) {
      console.error('加载投票记录失败:', err);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchPhotos();
    fetchLeaderboard();
    fetchMyVotes();
  }, []);

  // Socket.io 实时更新
  useEffect(() => {
    socket.on('voteUpdate', ({ photoId, voteCount }) => {
      setPhotos(prev =>
        prev.map(p => (p.id === photoId ? { ...p, vote_count: voteCount } : p))
      );
    });

    socket.on('leaderboardUpdate', (data) => {
      setLeaderboard(data);
    });

    socket.on('newPhoto', (photo) => {
      setPhotos(prev => [photo, ...prev]);
    });

    return () => {
      socket.off('voteUpdate');
      socket.off('leaderboardUpdate');
      socket.off('newPhoto');
    };
  }, []);

  // 投票处理
  const handleVote = async (photoId) => {
    try {
      const res = await fetch(`/api/photos/${photoId}/vote`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setVotedIds(prev => new Set([...prev, photoId]));
      }
      return data;
    } catch (err) {
      console.error('投票失败:', err);
      return { success: false, message: '网络错误' };
    }
  };

  // 切换排序
  const handleSortChange = (sort) => {
    setSortBy(sort);
    fetchPhotos(sort);
  };

  // 上传成功回调
  const handleUploadSuccess = () => {
    setShowUpload(false);
    fetchPhotos();
    fetchLeaderboard();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📸</span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              PhotoVote
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* 排序按钮 */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                onClick={() => handleSortChange('newest')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  sortBy === 'newest'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                最新
              </button>
              <button
                onClick={() => handleSortChange('votes')}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  sortBy === 'votes'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                最热
              </button>
            </div>
            {/* 上传按钮 */}
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg text-white font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg shadow-purple-500/25"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              上传照片
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 照片网格 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-200">
                {sortBy === 'votes' ? '🔥 热门照片' : '🆕 最新照片'}
              </h2>
              <span className="text-sm text-gray-500">{photos.length} 张照片</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-20">
                <span className="text-6xl">📷</span>
                <p className="mt-4 text-gray-400 text-lg">还没有照片，快来上传第一张吧！</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-4 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg text-white font-medium hover:from-pink-600 hover:to-purple-600 transition-all"
                >
                  上传照片
                </button>
              </div>
            ) : (
              <PhotoGrid photos={photos} votedIds={votedIds} onVote={handleVote} />
            )}
          </div>

          {/* 排行榜侧边栏 */}
          <aside className="lg:w-80 flex-shrink-0">
            <Leaderboard leaderboard={leaderboard} />
          </aside>
        </div>
      </main>

      {/* 上传弹窗 */}
      {showUpload && (
        <UploadForm
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* 页脚 */}
      <footer className="border-t border-white/5 py-6 text-center text-gray-600 text-sm">
        Made with ❤️ — PhotoVote 2026
      </footer>
    </div>
  );
}
