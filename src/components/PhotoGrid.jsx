import PhotoCard from './PhotoCard';

export default function PhotoGrid({ photos, votedIds, onVote, onPhotoClick, isAdmin, adminToken, onAdminDeletePhoto }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          className="animate-slide-up"
          style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
        >
          <PhotoCard
            photo={photo}
            hasVoted={votedIds.has(photo.id)}
            onVote={onVote}
            onPhotoClick={onPhotoClick}
            isAdmin={isAdmin}
            adminToken={adminToken}
            onAdminDeletePhoto={onAdminDeletePhoto}
          />
        </div>
      ))}
    </div>
  );
}
