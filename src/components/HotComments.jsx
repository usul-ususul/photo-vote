import { useState, useEffect } from 'react';

export default function HotComments({ socket, onPhotoClick }) {
  const [comments, setComments] = useState([]);

  const fetchHot = async () => {
    try {
      const res = await fetch('/api/comments/hot?limit=5');
      const data = await res.json();
      if (data.success) setComments(data.data);
    } catch {
      // 静默处理
    }
  };

  useEffect(() => {
    fetchHot();
  }, []);

  // 实时更新
  useEffect(() => {
    const handler = ({ photoId, comment }) => {
      // 获取热评时附带的照片信息需要从 API 获取
      // 简化处理：直接重新获取热评列表
      fetchHot();
    };
    socket.on('newComment', handler);
    return () => socket.off('newComment', handler);
  }, [socket]);

  if (comments.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">💬</span>
        <h2 className="text-lg font-bold text-gray-200">最新评论</h2>
      </div>

      <div className="space-y-3">
        {comments.map(c => (
          <button
            key={c.id}
            onClick={() => onPhotoClick(c.photo_id)}
            className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-start gap-2">
              {/* 头像 */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                {c.author.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-400">{c.author}</span>
                  <span className="text-xs text-gray-600">
                    {c.created_at ? new Date(c.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5 truncate">{c.content}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  在 <span className="text-pink-400 group-hover:underline">{c.photo_title}</span>
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
