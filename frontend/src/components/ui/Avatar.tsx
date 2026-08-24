interface AvatarProps {
  avatarUrl: string | null;
  fallbackText: string;
  size?: number;
  positionX?: number;
  positionY?: number;
}

// No more letter-in-a-circle fallback — every user gets a real default
// avatar image whenever avatarUrl is null (either they never uploaded
// one, or they used "Eliminar avatar" to go back to the default).
export function Avatar({
  avatarUrl,
  fallbackText,
  size = 96,
  positionX = 50,
  positionY = 50,
}: AvatarProps) {
  const style = {
    width: size,
    height: size,
    objectPosition: `${positionX}% ${positionY}%`,
  };
  return (
    <img
      src={avatarUrl ?? '/default-avatar.png'}
      alt={fallbackText}
      style={style}
      className="rounded-full object-cover border-2 border-gold-500"
    />
  );
}
