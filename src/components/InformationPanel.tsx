import { TrackingState } from '../hooks/useHandTracking';
import { Metrics } from './CanvasContainer';

export function InformationPanel({ trackingState, metrics }: { trackingState: TrackingState, metrics: Metrics }) {
  return (
    <div className="flex flex-col items-end gap-3">
      <button className="w-10 h-10 border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors cursor-pointer p-0 m-0 bg-white/10">
        <span className="text-sm font-serif italic">i</span>
      </button>
      
      <div className="flex flex-col items-end gap-1 text-white/60 text-[11px] font-mono tracking-wide mt-2">
         <div className="flex justify-between w-24">
            <span>branches</span>
            <span className="text-white">{metrics.branches}</span>
         </div>
         <div className="flex justify-between w-24">
            <span>leaves</span>
            <span className="text-white">{metrics.leaves}</span>
         </div>
         <div className="flex justify-between w-24">
            <span>flowers</span>
            <span className="text-white">{metrics.flowers}</span>
         </div>
         <div className="flex justify-between w-24 mt-2 pt-2 border-t border-white/20">
            <span>fps</span>
            <span className="text-white">{trackingState.fps}</span>
         </div>
      </div>
    </div>
  );
}
