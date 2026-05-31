import { useState, useEffect } from 'react';

function getRankBadge(rank) {
  if (rank === 1) return { emoji: '🥇', className: 'rank-1' };
  if (rank === 2) return { emoji: '🥈', className: 'rank-2' };
  if (rank === 3) return { emoji: '🥉', className: 'rank-3' };
  return { emoji: rank, className: 'rank-other' };
}

export default function Leaderboard({ leaderboard }) {
  const [prevCounts, setPrevCounts] = useState({});

  // 检测票数变化，触发动画
  useEffect(() => {
    const newCounts = {};
    leaderboard.forEach(p => {
      newCounts[p.id] = p.vote_count;
    });
    setPrevCounts(newCounts);
  }, [leaderboard]);

  return (
    <div className="glass rounded-2xl p-5 sticky top-24">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl">🏆</span>
        <h2 className="text-lg font-bold text-gray-200">排行榜</h2>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl">🤷</span>
          <p className="mt-2 text-sm">还没有投票数据</p>
          <p className="text-xs text-gray-600">快去为喜欢的照片投票吧！</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((photo, index) => {
            const rank = index + 1;
            const badge = getRankBadge(rank);
            const progressPercent = leaderboard[0]?.vote_count > 0
              ? (photo.vote_count / leaderboard[0].vote_count) * 100
              : 0;

            return (
              <div
                key={photo.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                {/* 排名 */}
                <div className={`rank-badge flex-shrink-0 ${badge.className}`}>
                  {badge.emoji}
                </div>

                {/* 缩略图 */}
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* 标题和进度条 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-300 truncate">
                    {photo.title}
                  </p>
                  <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* 票数 */}
                <div className="flex-shrink-0 text-right">
                  <span className="text-sm font-bold text-pink-400 tabular-nums">
                    {photo.vote_count}
                  </span>
                  <span className="text-xs text-gray-500 ml-0.5">票</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 底部装饰 */}
      <div className="mt-4 pt-4 border-t border-white/5 text-center">
        <p className="text-xs text-gray-600">
          数据实时更新中
          <span className="inline-block ml-1 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        </p>
      </div>
    </div>
  );
}
