import { useEffect, useRef } from 'react';
import { TrackingState } from '../hooks/useHandTracking';
import { ThemeConfig } from './ThemeSelector';
import { FlowerEngine } from '../engine/FlowerEngine';
import { BackgroundShader } from './BackgroundShader';

export interface Metrics {
  branches: number;
  leaves: number;
  flowers: number;
}

interface CanvasContainerProps {
  trackingState?: TrackingState;
  theme: ThemeConfig;
  onInteractionUpdate?: (growth: number, bend: number) => void;
  onMetricsUpdate?: (metrics: Metrics) => void;
}

export function CanvasContainer({ trackingState, theme, onInteractionUpdate, onMetricsUpdate }: CanvasContainerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FlowerEngine>(new FlowerEngine());
  const requestRef = useRef<number>(0);
  const themeRef = useRef<ThemeConfig>(theme);
  const trackingRef = useRef<TrackingState | undefined>(trackingState);
  const lastMetricUpdateRef = useRef<number>(0);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    trackingRef.current = trackingState;
  }, [trackingState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      engineRef.current.init(canvas.width, canvas.height);
    };
    
    window.addEventListener('resize', resize);
    resize();

    let smoothedLeftOpenness = 0;
    let smoothedTargetBend = 0;

    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const currentTracking = trackingRef.current;
      
      let targetNormalizedGrowth = 0.0;
      let targetBend = 0.0;

      if (currentTracking) {
         if (currentTracking.leftHand && currentTracking.leftHandDetected) {
            const rawOpenness = currentTracking.leftHand.openness;
            smoothedLeftOpenness += (rawOpenness - smoothedLeftOpenness) * 0.4;
            let targetSize = (smoothedLeftOpenness - 0.1) * 1.25;
            targetNormalizedGrowth = Math.max(0, Math.min(1, targetSize));
         } else {
            smoothedLeftOpenness = 0; 
            targetNormalizedGrowth = 0;
         }

         if (currentTracking.rightHand && currentTracking.rightHandDetected) {
            const rawOpenness = currentTracking.rightHand.openness;
            let desiredBend = (rawOpenness - 0.5) * 2.0; 
            desiredBend = Math.max(-0.2, Math.min(0.2, desiredBend));
            
            smoothedTargetBend += (desiredBend - smoothedTargetBend) * 0.15;
            targetBend = smoothedTargetBend;
         } else {
            smoothedTargetBend += (0.0 - smoothedTargetBend) * 0.1;
            targetBend = smoothedTargetBend;
         }
      } else {
         smoothedLeftOpenness = 0;
         targetNormalizedGrowth = 0;
      }

      engineRef.current.targetTreeSize = targetNormalizedGrowth;
      engineRef.current.targetBend = targetBend;

      if (onInteractionUpdate) {
         onInteractionUpdate(targetNormalizedGrowth, targetBend); 
      }

      engineRef.current.update(time);
      engineRef.current.draw(ctx, themeRef.current, time);
      
      if (onMetricsUpdate && time - lastMetricUpdateRef.current > 150) {
          onMetricsUpdate({ ...engineRef.current.metrics });
          lastMetricUpdateRef.current = time;
      }
      
      requestRef.current = requestAnimationFrame(render);
    };
    
    requestRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <BackgroundShader theme={theme} />
      <div className="absolute inset-0 z-10" style={{ filter: 'contrast(1.3) brightness(1.1) saturate(1.1) drop-shadow(0 0 15px rgba(255,255,255,0.2))' }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" style={{ backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)' }} />
      </div>
      
      {/* Low frequency paper mottling */}
      <div 
        className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay opacity-30"
        style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='mottleFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.01' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23mottleFilter)'/%3E%3C/svg%3E")`,
           backgroundRepeat: 'repeat',
           backgroundSize: '400px 400px'
        }}
      />
      
      {/* Fine Watercolor Grain */}
      <div 
        className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay opacity-40"
        style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
           backgroundRepeat: 'repeat',
           backgroundSize: '150px 150px'
        }}
      />
      
      {/* Screen Blend / Halation Bleed Layer */}
      <div className="pointer-events-none absolute inset-0 z-20 mix-blend-screen opacity-35" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />
      
      {/* Heavy Vignette for Cyanotype punch */}
      <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_250px_rgba(0,0,0,0.85)] mix-blend-multiply" />
      <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.45)_100%)] mix-blend-multiply" />
      
      <div className="pointer-events-none absolute inset-0 z-20 mix-blend-screen opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent" />
    </div>
  );
}
