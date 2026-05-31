import { useState } from 'react';

export default function PhotoCard({ photo, hasVoted, onVote }) {
  const [voting, setVoting] = useState(false);
  const [localVoted, setLocalVoted] = useState(hasVoted);
  const [animate, setAnimate] = useState(false);
  const [showToast, setShowToast] = useState(null);

  const imageUrl = `/uploads/${photo.filename}`;

  const handleVote = async () => {
    if (localVoted || voting) return;

    setVoting(true);
    setAnimate(true);
    setTimeout(() => setAnimate(false), 300);

    const result = await onVote(photo.id);

    if (result.success) {
      setLocalVoted(true);
      showToastMessage('❤️ 投票成功！');
    } else {
      showToastMessage(result.message || '投票失败');
    }

    setVoting(false);
  };

  const showToastMessage = (msg) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2000);
  };

  return (
    <div className="group relative glass rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:-translate-y-1">
      {/* 图片容器 */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={photo.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />

        {/* 悬停遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* 投票数标签 */}
        <div className="absolute top-3 right-3 glass rounded-full px-3 py-1.5 flex items-center gap-1.5 text-sm">
          <span className={`transition-transform duration-300 ${animate ? 'scale-125' : ''}`}>
            ❤️
          </span>
          <span className="font-semibold text-white">{photo.vote_count}</span>
        </div>

        {/* Toast 提示 */}
        {showToast && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 animate-bounce-in">
            <div className="glass rounded-xl px-4 py-2 text-white font-medium shadow-xl whitespace-nowrap">
              {showToast}
            </div>
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="p-4 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-200 truncate">{photo.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {photo.created_at ? new Date(photo.created_at).toLocaleDateString('zh-CN') : ''}
          </p>
        </div>

        {/* 投票按钮 */}
        <button
          onClick={handleVote}
          disabled={localVoted || voting}
          className={`vote-btn flex-shrink-0 ml-3 w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
            localVoted
              ? 'bg-pink-500/20 text-pink-400 cursor-default shadow-inner shadow-pink-500/20'
              : 'glass hover:bg-pink-500/20 hover:text-pink-400 hover:shadow-lg hover:shadow-pink-500/20 active:scale-90'
          } disabled:opacity-60`}
          title={localVoted ? '已投票' : '投票'}
        >
          {localVoted ? (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
