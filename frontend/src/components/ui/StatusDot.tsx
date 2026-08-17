interface StatusDotProps {
  isOnline: boolean;
}

export function StatusDot({ isOnline }: StatusDotProps) {
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-border-default'}`}
    />
  );
}
