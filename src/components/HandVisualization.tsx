import { useEffect, useRef } from 'react';
import { TrackingState, HandData } from '../hooks/useHandTracking';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
  [5, 9], [9, 10], [10, 11], [11, 12], // Middle finger
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring finger
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // Pinky and palm base
];

function drawHand(ctx: CanvasRenderingContext2D, hand: HandData | null, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  if (!hand) return;

  ctx.strokeStyle = '#F5F5F5';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const start = hand.landmarks[startIdx];
    const end = hand.landmarks[endIdx];
    
    const sx = start.x * width;
    const sy = start.y * height;
    const ex = end.x * width;
    const ey = end.y * height;

    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
  }
  ctx.stroke();

  ctx.fillStyle = '#0A0A0A';
  ctx.lineWidth = 1.5;
  for (const lm of hand.landmarks) {
    const x = lm.x * width;
    const y = lm.y * height;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
}

function HandPanel({ title, hand, detected, isTracking }: { title: string, hand: HandData | null, detected: boolean, isTracking: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 150;
    canvas.height = 150;
    
    drawHand(ctx, hand, canvas.width, canvas.height);
  }, [hand]);

  const statusText = !isTracking ? 'Waiting' : (detected ? 'Detected' : 'Not Detected');
  const statusColor = !isTracking ? 'bg-gray-500' : (detected ? 'bg-green-500' : 'bg-red-500');

  return (
    <div className="flex flex-col gap-3 w-[150px]">
      <div className="flex items-center px-1">
        <span className="text-[14px] text-[var(--color-text)] tracking-wide">{title}</span>
      </div>
      <div className="w-[150px] h-[150px] border border-[var(--color-border)] flex flex-col p-0 rounded-none overflow-hidden relative">
        <div className="flex-1 w-full bg-[var(--color-base)] relative">
          <canvas 
            ref={canvasRef}
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>
      </div>
      <div className="flex items-center text-[14px] px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className={detected ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}>
            {statusText}
          </span>
        </div>
      </div>
    </div>
  );
}

export function HandVisualization({ trackingState }: { trackingState: TrackingState }) {
  return (
    <div className="flex gap-4">
      <HandPanel 
        title="Left hand" 
        hand={trackingState.leftHand} 
        detected={trackingState.leftHandDetected} 
        isTracking={trackingState.isTracking} 
      />
      <HandPanel 
        title="Right hand" 
        hand={trackingState.rightHand} 
        detected={trackingState.rightHandDetected} 
        isTracking={trackingState.isTracking} 
      />
    </div>
  );
}
