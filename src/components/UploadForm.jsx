import { useState, useRef } from 'react';

export default function UploadForm({ onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imageData, setImageData] = useState(null); // Base64 图片数据
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const processFile = (selected) => {
    // 验证文件类型
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
    if (!allowed.includes(selected.type)) {
      setError('只支持 JPG、PNG、GIF、WebP、BMP、SVG 格式的图片');
      return;
    }

    // 验证文件大小 (10MB)
    if (selected.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB');
      return;
    }

    setError('');
    setFile(selected);

    // 读取文件为 Base64 data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setPreview(base64);
      setImageData(base64);
    };
    reader.readAsDataURL(selected);

    // 自动填充标题
    if (!title) {
      const name = selected.name.replace(/\.[^.]+$/, '');
      setTitle(name);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) processFile(dropped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageData) {
      setError('请选择一张照片');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || '未命名照片',
          imageData: imageData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || '上传失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative glass rounded-2xl w-full max-w-md p-6 shadow-2xl animate-bounce-in">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-200 mb-6 flex items-center gap-2">
          <span>📤</span> 上传照片
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 拖拽上传区域 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              dragOver
                ? 'border-pink-400 bg-pink-400/10'
                : preview
                  ? 'border-white/20 bg-white/5'
                  : 'border-white/10 hover:border-white/30 hover:bg-white/5'
            }`}
          >
            {preview ? (
              <div className="space-y-3">
                <img
                  src={preview}
                  alt="预览"
                  className="max-h-48 mx-auto rounded-lg object-contain"
                />
                <p className="text-sm text-gray-400">点击更换照片</p>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-5xl">🖼️</span>
                <p className="text-gray-400 font-medium">拖拽照片到此处</p>
                <p className="text-sm text-gray-600">或点击选择文件</p>
                <p className="text-xs text-gray-600">支持 JPG、PNG、GIF、WebP、BMP、SVG（最大 10MB）</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 标题输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              照片标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给照片取个名字吧..."
              maxLength={100}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/20 transition-all"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={uploading || !imageData}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-semibold hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                确认上传
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
