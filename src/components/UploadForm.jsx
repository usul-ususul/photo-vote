import { useState, useRef } from 'react';

export default function UploadForm({ onClose, onSuccess }) {
  const [files, setFiles] = useState([]); // { file, preview, title, id }
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0); // 已上传数量
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const idCounter = useRef(0);

  const processFiles = (selectedFiles) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
    const newFiles = [];
    setError('');

    for (const file of selectedFiles) {
      // 验证类型
      if (!allowed.includes(file.type)) {
        setError(`"${file.name}" 格式不支持，已跳过`);
        continue;
      }
      // 验证大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" 超过 10MB，已跳过`);
        continue;
      }

      const id = ++idCounter.current;
      const name = file.name.replace(/\.[^.]+$/, '');
      const reader = new FileReader();

      reader.onload = (e) => {
        setFiles(prev =>
          prev.map(f => f.id === id ? { ...f, preview: e.target.result } : f)
        );
      };
      reader.readAsDataURL(file);

      newFiles.push({
        id,
        file,
        preview: null,
        title: name,
      });
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      processFiles(Array.from(e.target.files));
      e.target.value = ''; // 重置 input 以允许重复选同一文件
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateTitle = (id, newTitle) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, title: newTitle } : f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('请至少选择一张照片');
      return;
    }

    setUploading(true);
    setError('');
    let successCount = 0;
    let failCount = 0;

    for (const [index, item] of files.entries()) {
      // 等待预览加载完成
      if (!item.preview) {
        await new Promise(resolve => {
          const check = () => {
            setFiles(prev => {
              const found = prev.find(f => f.id === item.id);
              if (found?.preview) {
                setTimeout(resolve, 50);
              } else {
                setTimeout(check, 100);
              }
              return prev;
            });
          };
          check();
        });
      }

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: (item.title || '未命名照片').trim(),
            imageData: item.preview,
          }),
        });

        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }

      setUploadCount(index + 1);
    }

    if (successCount > 0) {
      onSuccess();
    }

    if (failCount > 0) {
      setError(`${successCount} 张上传成功，${failCount} 张失败`);
    }

    setUploading(false);
  };

  const progress = files.length > 0 ? Math.round((uploadCount / files.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!uploading ? onClose : undefined}
      />

      {/* 弹窗 */}
      <div className="relative glass rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-bounce-in">
        {/* 关闭按钮 */}
        {!uploading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* 头部 */}
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
            <span>📤</span> 批量上传照片
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            已选择 <span className="text-purple-400 font-medium">{files.length}</span> 张照片
          </p>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 拖拽上传区域 */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
              uploading ? 'pointer-events-none opacity-50' : ''
            } ${
              dragOver
                ? 'border-pink-400 bg-pink-400/10'
                : 'border-white/10 hover:border-white/30 hover:bg-white/5'
            }`}
          >
            <div className="space-y-2">
              <span className="text-4xl">🖼️</span>
              <p className="text-gray-400 font-medium">拖拽多张照片到此处</p>
              <p className="text-sm text-gray-600">或点击选择文件（可多选）</p>
              <p className="text-xs text-gray-600">支持 JPG、PNG、GIF、WebP、BMP、SVG（每张最大 10MB）</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 已选文件列表 */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400">待上传列表</h3>
                {!uploading && (
                  <button
                    onClick={() => setFiles([])}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    清空全部
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {files.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    {/* 缩略图 */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                      {item.preview ? (
                        <img
                          src={item.preview}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* 标题输入 */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={item.title}
                        onChange={e => updateTitle(item.id, e.target.value)}
                        placeholder="照片标题"
                        maxLength={100}
                        disabled={uploading}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-400/50 transition-all disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{item.file.name}</p>
                    </div>

                    {/* 删除按钮 */}
                    {!uploading && (
                      <button
                        onClick={() => removeFile(item.id)}
                        className="flex-shrink-0 w-7 h-7 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400 text-sm transition-all"
                        title="移除此照片"
                      >
                        ✕
                      </button>
                    )}

                    {/* 上传中状态 */}
                    {uploading && uploadCount > files.indexOf(item) && (
                      <span className="flex-shrink-0 text-green-400">✅</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 上传进度条 */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">上传中...</span>
                <span className="text-purple-400 font-medium">{uploadCount}/{files.length}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 border-t border-white/5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || files.length === 0}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white font-semibold hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                上传中 ({uploadCount}/{files.length})
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                批量上传 ({files.length} 张)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
