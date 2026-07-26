import { useEffect, useRef } from 'react';
import { TrackingState, HandData } from '../hooks/useHandTracking';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
];

function drawHand(ctx: CanvasRenderingContext2D, hand: HandData | null, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  if (!hand) return;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
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

  ctx.fillStyle = 'white';
  for (const lm of hand.landmarks) {
    const x = lm.x * width;
    const y = lm.y * height;

    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function HandPanel({ title, hand, detected }: { title: string, hand: HandData | null, detected: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 112;
    canvas.height = 112;
    
    drawHand(ctx, hand, canvas.width, canvas.height);
  }, [hand]);

  const statusColor = detected ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="flex flex-col gap-2 w-28">
      <span className="text-white text-sm tracking-wide">{title}</span>
      <div className="w-28 h-28 border border-white/20 bg-white/10 relative flex items-center justify-center">
        <canvas 
          ref={canvasRef}
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className={"w-2 h-2 rounded-full " + statusColor} />
        <span className="text-white/70 text-sm tracking-wide">
          {detected ? 'detected' : 'not detected'}
        </span>
      </div>
    </div>
  );
}

export function HandVisualization({ trackingState }: { trackingState: TrackingState }) {
  return (
    <div className="flex gap-8">
      <HandPanel 
        title="left hand" 
        hand={trackingState.leftHand} 
        detected={trackingState.leftHandDetected} 
      />
      <HandPanel 
        title="right hand" 
        hand={trackingState.rightHand} 
        detected={trackingState.rightHandDetected} 
      />
    </div>
  );
}
