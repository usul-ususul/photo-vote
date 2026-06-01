export default function ImageLightbox({ photo, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-gray-400 hover:text-white hover:bg-black/70 transition-all"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {/* 图片 */}
      <img
        src={`/api/photo/${photo.id}/file`}
        alt={photo.title}
        className="relative z-10 max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
