import { useEffect, useRef } from 'react';
import { TrackingState } from '../hooks/useHandTracking';
import { ThemeConfig } from './ThemeSelector';
import { FlowerEngine } from '../engine/FlowerEngine';
import { BackgroundShader } from './BackgroundShader';

interface CanvasContainerProps {
  trackingState?: TrackingState;
  theme: ThemeConfig;
  onInteractionUpdate?: (growth: number, wind: number) => void;
}

export function CanvasContainer({ trackingState, theme, onInteractionUpdate }: CanvasContainerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FlowerEngine>(new FlowerEngine());
  const requestRef = useRef<number>(0);
  const themeRef = useRef<ThemeConfig>(theme);
  const trackingRef = useRef<TrackingState | undefined>(trackingState);

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

    // Smooth values for gesture mapping
    let smoothedLeftOpenness = 0;
    let prevLeftOpennessRaw = 0;
    let smoothedRightVel = 0;
    
    let currentWindDirection = 1;

    const render = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const currentTracking = trackingRef.current;
      
      let targetNormalizedGrowth = 0.0;
      let targetNormalizedWind = 0.0;

      if (currentTracking) {
         // Left hand controls growth (Openness mapping)
         if (currentTracking.leftHand) {
            const rawOpenness = currentTracking.leftHand.openness;
            const openVel = rawOpenness - prevLeftOpennessRaw;
            prevLeftOpennessRaw = rawOpenness;

            // Dynamic interpolation based on gesture speed
            let interpSpeed = 0.05;
            if (openVel > 0.01) { // Opening quickly
                interpSpeed = 0.2 + (openVel * 5.0);
            } else if (openVel < -0.01) { // Closing quickly
                interpSpeed = 0.2 + (Math.abs(openVel) * 5.0);
            }

            smoothedLeftOpenness += (rawOpenness - smoothedLeftOpenness) * Math.min(interpSpeed, 1.0);
            targetNormalizedGrowth = Math.max(0, Math.min(1, smoothedLeftOpenness));
         } else {
            smoothedLeftOpenness += (0.0 - smoothedLeftOpenness) * 0.02;
            targetNormalizedGrowth = Math.max(0, Math.min(1, smoothedLeftOpenness));
         }

         // Right hand controls wind (Horizontal velocity)
         if (currentTracking.rightHand) {
            const rawVelX = currentTracking.rightHand.velocity.x;
            // Smooth the velocity to remove jitter
            smoothedRightVel += (rawVelX - smoothedRightVel) * 0.15;
            
            if (Math.abs(smoothedRightVel) > 0.001) {
               currentWindDirection = smoothedRightVel > 0 ? 1 : -1;
            }
            
            // Map velocity to 0-1 range. Typical max vel per frame is ~0.08
            targetNormalizedWind = Math.max(0, Math.min(1, Math.abs(smoothedRightVel) * 12.0));
         } else {
            smoothedRightVel += (0.0 - smoothedRightVel) * 0.03;
            targetNormalizedWind = Math.max(0, Math.min(1, Math.abs(smoothedRightVel) * 12.0));
         }
      }

      engineRef.current.growthSpeed = targetNormalizedGrowth * 0.05;
      engineRef.current.windStrength = targetNormalizedWind * 0.4;
      
      // Smoothly rotate wind direction
      engineRef.current.windDirection += (currentWindDirection - engineRef.current.windDirection) * 0.05;

      if (onInteractionUpdate) {
         onInteractionUpdate(
           engineRef.current.overallProgress, 
           targetNormalizedWind
         );
      }

      engineRef.current.update(time);
      engineRef.current.draw(ctx, themeRef.current, time);

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
      {/* Procedural WebGL Atmospheric Background */}
      <BackgroundShader theme={theme} />
      
      {/* Generative Artwork Layer (Transparent) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-10" />

      {/* Photographic Film Grain Overlay */}
      <div 
        className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay opacity-20"
        style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
           backgroundRepeat: 'repeat',
           backgroundSize: '150px 150px'
        }}
      />
      
      {/* Soft Optical Vignette / Emulsion Texture */}
      <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_150px_rgba(0,0,0,0.3)] mix-blend-multiply" />
    </div>
  );
}
