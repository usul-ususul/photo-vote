import { useState, useEffect, useRef } from 'react';

export default function PhotoDetail({ photo, socket, onClose }) {
  const [comments, setComments] = useState([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const listRef = useRef(null);

  const imageUrl = `/api/photo/${photo.id}/file`;

  // 加载评论
  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/photos/${photo.id}/comments`);
      const data = await res.json();
      if (data.success) setComments(data.data);
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [photo.id]);

  // 实时接收新评论
  useEffect(() => {
    const handler = ({ photoId, comment }) => {
      if (photoId === photo.id) {
        setComments(prev => [comment, ...prev]);
      }
    };
    socket.on('newComment', handler);
    return () => socket.off('newComment', handler);
  }, [photo.id, socket]);

  // 发送评论
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch(`/api/photos/${photo.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: author.trim() || '匿名', content: content.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setContent('');
        // 评论已通过 socket 添加，无需重复
      } else {
        setError(data.message);
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative glass rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-bounce-in overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-gray-400 hover:text-white hover:bg-black/60 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 图片区域 */}
        <div className="relative bg-gray-900 flex-shrink-0" style={{ maxHeight: '45vh' }}>
          <img
            src={imageUrl}
            alt={photo.title}
            className="w-full object-contain"
            style={{ maxHeight: '45vh' }}
          />
        </div>

        {/* 信息栏 */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-200">{photo.title}</h2>
            <p className="text-xs text-gray-500">
              {photo.created_at ? new Date(photo.created_at).toLocaleDateString('zh-CN') : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-pink-400">
            <span>❤️</span>
            <span className="font-semibold">{photo.vote_count}</span>
          </div>
        </div>

        {/* 评论区域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 评论列表 */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-3 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">暂无评论，快来抢沙发吧 🛋️</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  {/* 头像 */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.author.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-300">{c.author}</span>
                      <span className="text-xs text-gray-600">
                        {c.created_at ? new Date(c.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5 break-words">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 评论输入框 */}
          <form onSubmit={handleSubmit} className="px-6 py-3 border-t border-white/5 space-y-2">
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="昵称（选填）"
                maxLength={20}
                className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/50 transition-all"
              />
              <input
                type="text"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="说点什么..."
                maxLength={500}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/50 transition-all"
              />
              <button
                type="submit"
                disabled={sending || !content.trim()}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg text-white text-sm font-medium hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {sending ? '发送中' : '发送'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
