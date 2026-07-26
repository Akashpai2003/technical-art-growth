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
            desiredBend = Math.max(-0.5, Math.min(0.5, desiredBend));
            
            smoothedTargetBend += (desiredBend - smoothedTargetBend) * 0.2;
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
      engineRef.current.targetBend = targetBend * 0.5;

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
      <div className="absolute inset-0 z-10" style={{ filter: 'contrast(1.1) brightness(1.05) saturate(1.1)' }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
      </div>
      
      <div 
        className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay opacity-30"
        style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
           backgroundRepeat: 'repeat',
           backgroundSize: '150px 150px'
        }}
      />
      
      <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_150px_rgba(0,0,0,0.5)] mix-blend-multiply" />
      
      <div className="pointer-events-none absolute inset-0 z-20 mix-blend-screen opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
    </div>
  );
}
