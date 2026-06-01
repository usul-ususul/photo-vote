import { useState, useEffect } from 'react';

const BACKGROUNDS = {
  // 渐变风格
  gradients: [
    { id: 'liquid', name: '💎 液态玻璃', preview: 'from-violet-950 via-fuchsia-950 to-cyan-950', className: 'liquid-glass bg-gradient-to-br from-violet-950 via-fuchsia-950 to-cyan-950', special: true },
    { id: 'default', name: '默认暗紫', preview: 'from-gray-950 via-gray-900 to-indigo-950', className: 'bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950' },
    { id: 'sunset', name: '日落暖橙', preview: 'from-rose-950 via-orange-950 to-amber-900', className: 'bg-gradient-to-br from-rose-950 via-orange-950 to-amber-900' },
    { id: 'ocean', name: '深海蔚蓝', preview: 'from-slate-950 via-blue-950 to-cyan-900', className: 'bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900' },
    { id: 'forest', name: '森林绿意', preview: 'from-emerald-950 via-green-900 to-teal-900', className: 'bg-gradient-to-br from-emerald-950 via-green-900 to-teal-900' },
    { id: 'aurora', name: '极光幻彩', preview: 'from-violet-950 via-fuchsia-900 to-cyan-900', className: 'bg-gradient-to-br from-violet-950 via-fuchsia-900 to-cyan-900' },
    { id: 'midnight', name: '午夜墨蓝', preview: 'from-gray-950 via-blue-950 to-slate-950', className: 'bg-gradient-to-br from-gray-950 via-blue-950 to-slate-950' },
    { id: 'cherry', name: '樱花粉紫', preview: 'from-pink-950 via-rose-900 to-purple-950', className: 'bg-gradient-to-br from-pink-950 via-rose-900 to-purple-950' },
    { id: 'golden', name: '金秋暖阳', preview: 'from-amber-950 via-yellow-900 to-orange-950', className: 'bg-gradient-to-br from-amber-950 via-yellow-900 to-orange-950' },
  ],
  // 纯色风格
  solids: [
    { id: 'solid-dark', name: '纯黑', color: '#0a0a0a', className: 'bg-[#0a0a0a]' },
    { id: 'solid-slate', name: '暗灰', color: '#1a1a2e', className: 'bg-[#1a1a2e]' },
    { id: 'solid-navy', name: '海军蓝', color: '#0f172a', className: 'bg-[#0f172a]' },
    { id: 'solid-cool', name: '冷灰', color: '#111827', className: 'bg-[#111827]' },
  ],
};

export default function Settings({ currentBg, onChange, onClose }) {
  const [selected, setSelected] = useState(currentBg || 'default');
  const [tab, setTab] = useState('gradients');

  useEffect(() => {
    setSelected(currentBg);
  }, [currentBg]);

  const handleSelect = async (bgId) => {
    setSelected(bgId);
    onChange(bgId);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 面板 */}
      <div className="relative glass rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl animate-bounce-in">
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
            <span>⚙️</span> 页面设置
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-white/5 px-6">
          <button
            onClick={() => setTab('gradients')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === 'gradients'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            🌈 渐变背景
          </button>
          <button
            onClick={() => setTab('solids')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === 'solids'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            🎨 纯色背景
          </button>
        </div>

        {/* 背景选项列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'gradients' ? (
            <div className="grid grid-cols-2 gap-3">
              {BACKGROUNDS.gradients.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => handleSelect(bg.id)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all p-3 ${
                    selected === bg.id
                      ? 'border-purple-400 shadow-lg shadow-purple-400/20'
                      : 'border-transparent hover:border-white/20'
                  }`}
                >
                  {/* 预览色块 */}
                  <div className={`w-full h-16 rounded-lg ${bg.preview}`} />
                  {/* 选中标记 */}
                  {selected === bg.id && (
                    <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-purple-400 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <p className="text-sm text-gray-300 mt-2 text-center">{bg.name}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {BACKGROUNDS.solids.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => handleSelect(bg.id)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all p-3 ${
                    selected === bg.id
                      ? 'border-purple-400 shadow-lg shadow-purple-400/20'
                      : 'border-transparent hover:border-white/20'
                  }`}
                >
                  {/* 预览色块 */}
                  <div
                    className="w-full h-16 rounded-lg border border-white/10"
                    style={{ backgroundColor: bg.color }}
                  />
                  {selected === bg.id && (
                    <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-purple-400 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <p className="text-sm text-gray-300 mt-2 text-center">{bg.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 根据背景 ID 获取对应的 className */
export function getBackgroundClass(bgId) {
  const all = [...BACKGROUNDS.gradients, ...BACKGROUNDS.solids];
  const found = all.find(b => b.id === bgId);
  return found?.className || BACKGROUNDS.gradients[0].className;
}
