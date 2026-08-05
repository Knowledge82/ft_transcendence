interface AvatarProps {
  avatarUrl: string | null;
  fallbackText: string;
  size?: number;
}

export function Avatar({ avatarUrl, fallbackText, size = 96 }: AvatarProps) {
  const style = { width: size, height: size };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="Avatar"
        style={style}
        className="rounded-full object-cover border-2 border-gold-500"
      />
    );
  }

  return (
    <div
      style={style}
      className="rounded-full bg-ink-800 border-2 border-gold-500 flex items-center justify-center text-cream-400"
    >
      <span style={{ fontSize: size * 0.4 }}>{fallbackText[0]?.toUpperCase() ?? '?'}</span>
    </div>
  );
}
