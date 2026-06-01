import { useState, useEffect } from 'react';

export default function CommentCenter({ socket, isAdmin, adminToken, onAdminDeleteComment, onClose }) {
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingIds, setDeletingIds] = useState(new Set());

  // 加载照片列表
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/photos?sort=votes');
        const data = await res.json();
        if (data.success) setPhotos(data.data);
      } catch { /* */ }
      finally { setLoading(false); }
    })();
  }, []);

  // 选中照片后加载评论
  const selectPhoto = async (photo) => {
    setSelected(photo);
    setCommentLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/photos/${photo.id}/comments`);
      const data = await res.json();
      if (data.success) setComments(data.data);
    } catch { /* */ }
    finally { setCommentLoading(false); }
  };

  // socket 实时更新
  useEffect(() => {
    const newHandler = ({ photoId, comment }) => {
      if (selected && photoId === selected.id) {
        setComments(prev => [comment, ...prev]);
      }
    };
    const deleteHandler = ({ commentId }) => {
      if (selected) setComments(prev => prev.filter(c => c.id !== commentId));
    };
    socket.on('newComment', newHandler);
    socket.on('commentDeleted', deleteHandler);
    return () => {
      socket.off('newComment', newHandler);
      socket.off('commentDeleted', deleteHandler);
    };
  }, [selected, socket]);

  // 发评论
  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending || !selected) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/photos/${selected.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: author.trim() || '匿名', content: content.trim() }),
      });
      const data = await res.json();
      if (data.success) setContent('');
      else setError(data.message);
    } catch { setError('网络错误'); }
    finally { setSending(false); }
  };

  // 管理员删评论
  const handleDelete = async (commentId) => {
    if (deletingIds.has(commentId)) return;
    setDeletingIds(prev => new Set([...prev, commentId]));
    try {
      await onAdminDeleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* */ }
    finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(commentId); return n; });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl animate-bounce-in">
        {/* 头部 */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
            <span>💬</span> 评论中心
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white transition-all">✕</button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* 左侧：照片列表 */}
          <div className="w-64 border-r border-white/5 flex flex-col">
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-xs text-gray-500">选择照片查看评论</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>
              ) : photos.length === 0 ? (
                <p className="text-center text-gray-600 text-xs py-8">暂无照片</p>
              ) : (
                photos.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPhoto(p)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 ${
                      selected?.id === p.id ? 'bg-indigo-500/10 border-l-2 border-l-indigo-400' : ''
                    }`}
                  >
                    <img src={`/api/photo/${p.id}/file`} alt={p.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-gray-800" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-300 truncate">{p.title}</p>
                      <p className="text-xs text-gray-600">❤️ {p.vote_count} 票</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 右侧：评论区 */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-600">
                <div className="text-center">
                  <span className="text-5xl">💬</span>
                  <p className="mt-3">选择左侧照片查看评论</p>
                </div>
              </div>
            ) : (
              <>
                {/* 选中照片信息 */}
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                  <img src={`/api/photo/${selected.id}/file`} alt={selected.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-gray-800" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{selected.title}</p>
                    <p className="text-xs text-gray-500">❤️ {selected.vote_count} 票</p>
                  </div>
                </div>

                {/* 评论列表 */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {commentLoading ? (
                    <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>
                  ) : comments.length === 0 ? (
                    <p className="text-center text-gray-600 text-sm py-8">暂无评论</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="flex gap-3 group">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{c.author.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-300">{c.author}</span>
                            <span className="text-xs text-gray-600">{c.created_at ? new Date(c.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                          <p className="text-sm text-gray-400 mt-0.5 break-words">{c.content}</p>
                        </div>
                        {isAdmin && (
                          <button onClick={() => handleDelete(c.id)} disabled={deletingIds.has(c.id)} className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50" title="删除">
                            {deletingIds.has(c.id) ? <div className="w-3 h-3 border border-red-300 border-t-transparent rounded-full animate-spin" /> : '🗑️'}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* 发评论 */}
                <form onSubmit={handleSend} className="px-4 py-3 border-t border-white/5 space-y-2">
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  <div className="flex gap-2">
                    <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="昵称" maxLength={20} className="w-20 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/50 transition-all" />
                    <input type="text" value={content} onChange={e => setContent(e.target.value)} placeholder="写评论..." maxLength={500} className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/50 transition-all" />
                    <button type="submit" disabled={sending || !content.trim()} className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg text-white text-sm font-medium hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 flex-shrink-0">
                      {sending ? '...' : '发送'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
