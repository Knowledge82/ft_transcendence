import { useRef, useState } from 'react';

interface AvatarPositionEditorProps {
  imageUrl: string;
  initialPositionX?: number;
  initialPositionY?: number;
  onConfirm: (positionX: number, positionY: number) => void;
  onCancel: () => void;
}

// Lets the user pick the focal point of a freshly uploaded avatar by
// dragging a dot over the full (uncropped) image. The dot's position,
// as a 0-100 percentage of the frame, maps directly to CSS object-position
// in the Avatar component — no conversion needed on either end.
export function AvatarPositionEditor({
  imageUrl,
  initialPositionX = 50,
  initialPositionY = 50,
  onConfirm,
  onCancel,
}: AvatarPositionEditorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [positionX, setPositionX] = useState(initialPositionX);
  const [positionY, setPositionY] = useState(initialPositionY);
  const [isDragging, setIsDragging] = useState(false);

  function updatePositionFromPointer(clientX: number, clientY: number) {
    const frame = frameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;

    setPositionX(Math.max(0, Math.min(100, rawX)));
    setPositionY(Math.max(0, Math.min(100, rawY)));
  }

  function handlePointerDown(event: React.MouseEvent | React.TouchEvent) {
    setIsDragging(true);
    const point = 'touches' in event ? event.touches[0] : event;
    updatePositionFromPointer(point.clientX, point.clientY);
  }

  function handlePointerMove(event: React.MouseEvent | React.TouchEvent) {
    if (!isDragging) return;
    const point = 'touches' in event ? event.touches[0] : event;
    updatePositionFromPointer(point.clientX, point.clientY);
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  return (
    <div className="fixed inset-0 bg-ink-950/80 flex items-center justify-center z-50 px-4">
      <div className="bg-ink-900 rounded-lg p-6 max-w-sm w-full">
        <div
          ref={frameRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="relative inline-block max-h-[60vh] rounded-md overflow-hidden cursor-crosshair select-none"
        >
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="max-h-[60vh] w-auto block pointer-events-none"
          />
          <div
            className="absolute w-6 h-6 rounded-full bg-gold-500 border-2 border-cream-50 shadow-lg -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${positionX}%`, top: `${positionY}%` }}
          />
        </div>

        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={onCancel}
            aria-label="Cancelar"
            className="w-12 h-12 rounded-full bg-ink-800 border border-error-500 text-error-500 text-lg flex items-center justify-center hover:bg-error-500/10"
          >
            ✕
          </button>
          <button
            onClick={() => onConfirm(Math.round(positionX), Math.round(positionY))}
            aria-label="Confirmar"
            className="w-12 h-12 rounded-full bg-gold-500 text-gold-on text-lg flex items-center justify-center hover:bg-gold-400"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}