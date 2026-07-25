import { TrackingState } from '../hooks/useHandTracking';

export function InformationPanel({ trackingState }: { trackingState: TrackingState }) {
  const { isTracking, leftHandDetected, rightHandDetected, confidence, fps } = trackingState;
  
  return (
    <div className="flex flex-col items-end gap-4">
      <div className="flex items-center gap-4">
        {/* Tracking status visual indicator */}
        <div className="w-64 h-12 border border-[var(--color-border)] bg-transparent rounded-none flex items-center px-4 justify-between text-[16px] text-[var(--color-text)]">
          <span>Status</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={isTracking ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}>
              {isTracking ? 'Active' : 'Initializing...'}
            </span>
          </div>
        </div>
        {/* Info button */}
        <button className="w-12 h-12 border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors rounded-none cursor-pointer p-0 m-0">
          <span className="text-[16px]">i</span>
        </button>
      </div>
      <div className="text-right">
        <div className="whitespace-pre-line text-[14px] leading-[1.8] text-[var(--color-text)] m-0 p-0 flex flex-col items-end w-full">
          <div className="flex justify-between w-48">
            <span className="text-[var(--color-text-muted)]">FPS</span>
            <span className="text-right">{fps}</span>
          </div>
          <div className="flex justify-between w-48">
            <span className="text-[var(--color-text-muted)]">Confidence</span>
            <span className="text-right">{(confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
