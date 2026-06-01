import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PhotoGrid from './components/PhotoGrid';
import Leaderboard from './components/Leaderboard';
import UploadForm from './components/UploadForm';
import PhotoDetail from './components/PhotoDetail';
import HotComments from './components/HotComments';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import Settings, { getBackgroundClass } from './components/Settings';
import ImageLightbox from './components/ImageLightbox';

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
  const [lightboxPhoto, setLightboxPhoto] = useState(null); // 大图查看
  const [commentPhoto, setCommentPhoto] = useState(null); // 评论弹窗

  // ===== 管理员状态 =====
  const [adminToken, setAdminToken] = useState(() => {
    // 从 sessionStorage 恢复管理员会话
    return sessionStorage.getItem('adminToken') || null;
  });
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const isAdmin = !!adminToken;

  // ===== 页面背景设置 =====
  const [bgSetting, setBgSetting] = useState(() => {
    return localStorage.getItem('bgSetting') || 'default';
  });
  const [showSettings, setShowSettings] = useState(false);

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

    // 验证已存储的管理员 token
    if (adminToken) {
      checkAdminToken(adminToken).then(valid => {
        if (!valid) {
          setAdminToken(null);
          sessionStorage.removeItem('adminToken');
        }
      });
    }
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

    socket.on('photoDeleted', ({ photoId }) => {
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    });

    socket.on('commentDeleted', ({ commentId }) => {
      // 如果详情弹窗打开，评论删除由子组件处理
    });

    return () => {
      socket.off('voteUpdate');
      socket.off('leaderboardUpdate');
      socket.off('newPhoto');
      socket.off('photoDeleted');
      socket.off('commentDeleted');
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

  // 点击照片→查看大图
  const handlePhotoClick = (photo) => {
    setLightboxPhoto(photo);
  };

  // 点击评论按钮→打开评论
  const handleCommentClick = async (photo) => {
    try {
      const res = await fetch(`/api/photos/${photo.id}`);
      const data = await res.json();
      if (data.success) setCommentPhoto(data.data);
    } catch {
      setCommentPhoto(photo);
    }
  };

  // 从热评跳转到评论
  const handleHotPhotoClick = async (photoId) => {
    try {
      const res = await fetch(`/api/photos/${photoId}`);
      const data = await res.json();
      if (data.success) setCommentPhoto(data.data);
    } catch {
      // 静默处理
    }
  };

  // ===== 管理员操作 =====

  // 验证管理员 token 有效性
  const checkAdminToken = async (token) => {
    try {
      const res = await fetch('/api/admin/check', {
        headers: { 'x-admin-token': token },
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // 管理员登录
  const handleAdminLogin = async (token) => {
    setAdminToken(token);
    sessionStorage.setItem('adminToken', token);
    setShowAdminLogin(false);
  };

  // 管理员登出
  const handleAdminLogout = () => {
    setAdminToken(null);
    sessionStorage.removeItem('adminToken');
    setShowAdminPanel(false);
  };

  // 管理员删除照片
  const handleAdminDeletePhoto = async (photoId) => {
    if (!adminToken) return { success: false, message: '无权限' };
    try {
      const res = await fetch(`/api/admin/photos/${photoId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken },
      });
      const data = await res.json();
      if (data.success) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      }
      return data;
    } catch (err) {
      return { success: false, message: '网络错误' };
    }
  };

  // 管理员删除评论
  const handleAdminDeleteComment = async (commentId) => {
    if (!adminToken) return { success: false, message: '无权限' };
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken },
      });
      return await res.json();
    } catch {
      return { success: false, message: '网络错误' };
    }
  };

  return (
    <div className={`min-h-screen ${getBackgroundClass(bgSetting)}`}>
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
            {/* 管理员按钮 */}
            {isAdmin ? (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-white text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-orange-500/25"
                title="管理面板"
              >
                🛡️ 管理
              </button>
            ) : (
              <button
                onClick={() => setShowAdminLogin(true)}
                className="flex items-center gap-1.5 px-3 py-2 glass border border-white/10 rounded-lg text-gray-400 text-sm hover:text-white hover:bg-white/10 transition-all"
                title="管理员登录"
              >
                🔒
              </button>
            )}
            {/* 设置按钮 */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 px-3 py-2 glass border border-white/10 rounded-lg text-gray-400 text-sm hover:text-white hover:bg-white/10 transition-all"
              title="页面设置"
            >
              ⚙️
            </button>
            {/* 刷新按钮 */}
            <button
              onClick={() => {
                fetchPhotos();
                fetchLeaderboard();
                fetchMyVotes();
              }}
              className="flex items-center gap-1.5 px-3 py-2 glass border border-white/10 rounded-lg text-gray-400 text-sm hover:text-white hover:bg-white/10 transition-all"
              title="刷新数据"
            >
              🔄
            </button>
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
              <PhotoGrid
                photos={photos}
                votedIds={votedIds}
                onVote={handleVote}
                onPhotoClick={handlePhotoClick}
                onCommentClick={handleCommentClick}
                isAdmin={isAdmin}
                adminToken={adminToken}
                onAdminDeletePhoto={handleAdminDeletePhoto}
              />
            )}
          </div>

          {/* 排行榜侧边栏 */}
          <aside className="lg:w-80 flex-shrink-0 space-y-6">
            <Leaderboard leaderboard={leaderboard} />
            <HotComments socket={socket} onPhotoClick={handleHotPhotoClick} />
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

      {/* 大图查看 */}
      {lightboxPhoto && (
        <ImageLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
        />
      )}

      {/* 评论弹窗 */}
      {commentPhoto && (
        <PhotoDetail
          photo={commentPhoto}
          socket={socket}
          onClose={() => setCommentPhoto(null)}
          isAdmin={isAdmin}
          adminToken={adminToken}
          onAdminDeleteComment={handleAdminDeleteComment}
        />
      )}

      {/* 管理员登录弹窗 */}
      {showAdminLogin && (
        <AdminLogin
          onLogin={handleAdminLogin}
          onClose={() => setShowAdminLogin(false)}
        />
      )}

      {/* 管理面板弹窗 */}
      {showAdminPanel && (
        <AdminPanel
          token={adminToken}
          onLogout={handleAdminLogout}
          onClose={() => setShowAdminPanel(false)}
        />
      )}

      {/* 设置弹窗 */}
      {showSettings && (
        <Settings
          currentBg={bgSetting}
          onChange={(bgId) => {
            setBgSetting(bgId);
            localStorage.setItem('bgSetting', bgId);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* 页脚 */}
      <footer className="border-t border-white/5 py-6 text-center text-gray-600 text-sm">
        Made with ❤️ — PhotoVote 2026
      </footer>
    </div>
  );
}
