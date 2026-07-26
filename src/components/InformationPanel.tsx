import { TrackingState } from '../hooks/useHandTracking';
import { Metrics } from './CanvasContainer';
import { Info, Hand, HandMetal } from 'lucide-react';

export function InfoButton() {
  return (
    <div className="flex flex-col items-end gap-3 font-sans">
      <div className="group relative flex flex-col items-end">
        <button className="text-white hover:text-white/80 transition-colors cursor-pointer z-10 relative p-1 mt-1">
          <Info className="w-6 h-6" />
        </button>
        <div className="absolute top-12 right-0 w-80 p-5 bg-black/80 border border-white/20 backdrop-blur-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity text-white/90 text-[13px] leading-relaxed z-50 rounded-sm shadow-xl">
          
          <div className="mb-4">
             <div className="flex items-center gap-2 mb-2 text-white/60 text-xs tracking-wider uppercase">
                <span>Left Hand</span>
             </div>
             <div className="flex items-start gap-3 mb-2">
               <Hand className="w-5 h-5 shrink-0 text-white mt-0.5" />
               <div>
                  <strong className="text-white block">Open palm</strong>
                  <span className="text-white/70 text-xs">Grow the plant</span>
               </div>
             </div>
             <div className="flex items-start gap-3">
               <HandMetal className="w-5 h-5 shrink-0 text-white mt-0.5" />
               <div>
                  <strong className="text-white block">Closed palm</strong>
                  <span className="text-white/70 text-xs">Collapse the plant</span>
               </div>
             </div>
          </div>

          <div>
             <div className="flex items-center gap-2 mb-2 text-white/60 text-xs tracking-wider uppercase">
                <span>Right Hand</span>
             </div>
             <div className="flex items-start gap-3 mb-2">
               <Hand className="w-5 h-5 shrink-0 text-white mt-0.5" />
               <div>
                  <strong className="text-white block">Open palm</strong>
                  <span className="text-white/70 text-xs">Tree leans toward the right</span>
               </div>
             </div>
             <div className="flex items-start gap-3">
               <HandMetal className="w-5 h-5 shrink-0 text-white mt-0.5" />
               <div>
                  <strong className="text-white block">Closed palm</strong>
                  <span className="text-white/70 text-xs">Tree leans toward the left</span>
               </div>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export function StatsPanel({ trackingState, metrics }: { trackingState: TrackingState, metrics: Metrics }) {
  return (
    <div className="flex flex-col items-start gap-1.5 text-white/70 text-[14px] tracking-wide font-sans">
       <div className="flex justify-between w-32">
          <span>branches</span>
          <span className="text-white font-medium">{metrics.branches}</span>
       </div>
       <div className="flex justify-between w-32">
          <span>leaves</span>
          <span className="text-white font-medium">{metrics.leaves}</span>
       </div>
       <div className="flex justify-between w-32">
          <span>flowers</span>
          <span className="text-white font-medium">{metrics.flowers}</span>
       </div>
       <div className="flex justify-between w-32 mt-2 pt-2 border-t border-white/20">
          <span>fps</span>
          <span className="text-white font-medium">{trackingState.fps}</span>
       </div>
    </div>
  );
}
