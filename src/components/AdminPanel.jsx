import { useState, useEffect } from 'react';

export default function AdminPanel({ token, onLogout, onClose }) {
  const [tab, setTab] = useState('overview'); // 'overview' | 'review'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [actionIds, setActionIds] = useState(new Set()); // 正在处理中的照片 ID
  const [maintenance, setMaintenance] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [maintError, setMaintError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {
      // 静默
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    setPendingLoading(true);
    try {
      const res = await fetch('/api/admin/photos/pending', {
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (data.success) setPending(data.data);
    } catch {
      // 静默
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchPending();
    fetchMaintenance();
  }, [token]);

  // 获取维护模式状态
  const fetchMaintenance = async () => {
    try {
      const res = await fetch('/api/admin/maintenance', {
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (data.success) setMaintenance(data.data.enabled);
    } catch {
      // 静默
    }
  };

  // 切换维护模式
  const toggleMaintenance = async () => {
    if (togglingMaintenance) return;
    setTogglingMaintenance(true);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ enabled: !maintenance }),
      });
      const data = await res.json();
      if (data.success) {
        setMaintenance(data.data.enabled);
        setMaintError('');
      } else if (res.status === 401) {
        setMaintError('登录已过期，请重新登录');
        onLogout();
      } else {
        setMaintError(data.message || '操作失败');
      }
    } catch {
      setMaintError('网络错误，请重试');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  // 审核通过
  const handleApprove = async (photoId) => {
    if (actionIds.has(photoId)) return;
    setActionIds(prev => new Set([...prev, photoId]));
    try {
      const res = await fetch(`/api/admin/photos/${photoId}/approve`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (data.success) {
        setPending(prev => prev.filter(p => p.id !== photoId));
        // 更新计数
        fetchStats();
      }
    } finally {
      setActionIds(prev => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  };

  // 拒绝
  const handleReject = async (photoId) => {
    if (actionIds.has(photoId)) return;
    setActionIds(prev => new Set([...prev, photoId]));
    try {
      const res = await fetch(`/api/admin/photos/${photoId}/reject`, {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
      const data = await res.json();
      if (data.success) {
        setPending(prev => prev.filter(p => p.id !== photoId));
        fetchStats();
      }
    } finally {
      setActionIds(prev => {
        const next = new Set(prev);
        next.delete(photoId);
        return next;
      });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'x-admin-token': token },
      });
    } catch {
      // 即使失败也清理本地
    }
    onLogout();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 面板 */}
      <div className="relative glass rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-bounce-in">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 头部 */}
        <div className="px-6 pt-6 pb-3 text-center border-b border-white/5">
          <span className="text-3xl">🛡️</span>
          <h2 className="text-lg font-bold text-gray-200 mt-2">管理面板</h2>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-white/5 px-6">
          <button
            onClick={() => setTab('overview')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === 'overview'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            📊 概览
          </button>
          <button
            onClick={() => { setTab('review'); fetchPending(); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 relative ${
              tab === 'review'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            📋 审核
            {pending.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                {pending.length}
              </span>
            )}
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'overview' ? (
            <>
              {/* 统计数据 */}
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <StatCard icon="📸" label="已发布" value={stats.totalPhotos} color="from-pink-400 to-purple-400" />
                  <StatCard
                    icon="⏳"
                    label="待审核"
                    value={stats.pendingPhotos}
                    color="from-yellow-400 to-orange-400"
                    highlight
                    onClick={() => { setTab('review'); fetchPending(); }}
                  />
                  <StatCard icon="💬" label="评论总数" value={stats.totalComments} color="from-blue-400 to-cyan-400" />
                  <StatCard icon="❤️" label="累计票数" value={stats.totalVoteSum} color="from-orange-400 to-red-400" />
                </div>
              ) : null}

              {/* 维护模式开关 */}
              <div className={`rounded-xl p-4 mb-4 border transition-colors ${maintenance ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <span>{maintenance ? '🔧' : '🌐'}</span>
                      <span className={maintenance ? 'text-red-300' : 'text-green-300'}>
                        {maintenance ? '网站已关闭' : '网站开放中'}
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {maintenance ? '仅管理员可以访问网站' : '所有人都可以正常访问'}
                    </p>
                  </div>
                  <button
                    onClick={toggleMaintenance}
                    disabled={togglingMaintenance}
                    className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                      maintenance ? 'bg-red-500' : 'bg-green-500'
                    } disabled:opacity-50`}
                  >
                    <span
                      className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                        maintenance ? 'translate-x-[22px]' : 'translate-x-[2px]'
                      }`}
                    />
                  </button>
                </div>
                {maintError && (
                  <p className="text-xs text-red-400 mt-2">{maintError}</p>
                )}
                {togglingMaintenance && (
                  <div className="flex justify-center mt-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* 操作说明 */}
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-4">
                <h3 className="text-sm font-medium text-indigo-300 mb-2">🛠️ 管理操作</h3>
                <ul className="text-xs text-gray-400 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                    切换到 <span className="text-yellow-400 font-mono">📋 审核</span> 标签审核待发布照片
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    照片卡片左上角 <span className="text-red-400 font-mono">✕</span> 可删除照片
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    评论旁 <span className="text-red-400 font-mono">🗑️</span> 按钮可删除评论
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* 审核列表 */}
              {pendingLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pending.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl">🎉</span>
                  <p className="text-gray-400 mt-2">暂无待审核照片</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pending.map(item => (
                    <div
                      key={item.id}
                      className="rounded-xl bg-white/5 border border-white/5 overflow-hidden"
                    >
                      {/* 缩略图 */}
                      <div className="aspect-[4/3] bg-gray-900">
                        <img
                          src={`/api/photo/${item.id}/file`}
                          alt={item.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {/* 信息与操作 */}
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-200 truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.created_at ? new Date(item.created_at).toLocaleString('zh-CN') : ''}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={actionIds.has(item.id)}
                            className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {actionIds.has(item.id) ? (
                              <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              '✅'
                            )}
                            通过
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            disabled={actionIds.has(item.id)}
                            className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {actionIds.has(item.id) ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              '❌'
                            )}
                            拒绝
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-white/5 flex gap-3">
          <button
            onClick={handleLogout}
            className="flex-1 py-2.5 glass border border-white/10 rounded-xl text-gray-400 font-medium hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            退出管理
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-white font-medium hover:from-purple-600 hover:to-indigo-600 transition-all text-sm"
          >
            关闭面板
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, highlight, onClick }) {
  return (
    <div
      className={`glass rounded-xl p-4 text-center ${highlight ? 'border border-yellow-500/30 cursor-pointer hover:bg-yellow-500/5 transition-all' : ''} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <span className="text-2xl">{icon}</span>
      <p className={`text-2xl font-bold mt-1 bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
