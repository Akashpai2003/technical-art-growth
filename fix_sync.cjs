const fs = require('fs');

const engineCode = `import { ThemeConfig } from '../components/ThemeSelector';

export const GROWTH_PARAMS = {
  maxDepth: 7, 
  flowerDensity: 1.0, 
  flowerScale: 1.5, 
  branchAngle: 0.45,
};

export interface Branch {
  id: string;
  angle: number;
  length: number;
  depth: number;
  progress: number;
  children: Branch[];
  isFlower: boolean;
  flowerProgress: number;
  curvature: number;
  flowerSizeMult: number;
  thicknessMult: number;
  parentPos: number; 
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    va: number;
    size: number;
    color: string;
    type: 'leaf' | 'flower';
    grounded: boolean;
}

export class FlowerEngine {
  root: Branch | null = null;
  canvasWidth: number = 0;
  canvasHeight: number = 0;
  
  targetTreeSize: number = 0;
  currentTreeSize: number = 0;
  
  targetBend: number = 0; 
  currentBend: number = 0;
  bendVelocity: number = 0;
  
  leafBend: number = 0;
  leafBendVelocity: number = 0;
  
  flowerBend: number = 0;
  flowerBendVelocity: number = 0;
  
  particles: Particle[] = [];
  
  metrics = { branches: 0, leaves: 0, flowers: 0 };

  init(w: number, h: number) {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.reset();
  }

  reset() {
    this.root = {
      id: Math.random().toString(),
      angle: -Math.PI / 2, 
      length: this.canvasHeight * 0.28, 
      depth: 0,
      progress: 0,
      children: [],
      isFlower: false,
      flowerProgress: 0,
      curvature: 0,
      flowerSizeMult: 1,
      thicknessMult: 1.5,
      parentPos: 1
    };
    this.particles = [];
    this.preGenerate(this.root);
  }

  preGenerate(branch: Branch) {
    if (branch.depth >= GROWTH_PARAMS.maxDepth) return;
    if (branch.isFlower) return;
    
    const depthRatio = branch.depth / GROWTH_PARAMS.maxDepth;
    let maxSplits = 2;
    if (depthRatio > 0.6) maxSplits = 1;
    const splits = maxSplits;
    const spread = GROWTH_PARAMS.branchAngle + (Math.random() * 0.2 - 0.1);
    
    for (let i = 0; i < splits; i++) {
        const pos = 0.4 + Math.random() * 0.6; 
        const len = this.canvasHeight * 0.22 * (0.6 + Math.random() * 0.5) * Math.pow(0.8, branch.depth);
        let angleOffset = 0;
        if (splits === 2) {
             angleOffset = i === 0 ? -spread : spread;
             angleOffset += (Math.random() - 0.5) * 0.2;
        } else {
             angleOffset = (Math.random() - 0.5) * spread * 2.0;
        }
        
        const child: Branch = {
             id: Math.random().toString(),
             angle: branch.angle + angleOffset,
             length: len,
             depth: branch.depth + 1,
             progress: 0,
             children: [],
             isFlower: false,
             flowerProgress: 0,
             curvature: (Math.random() - 0.5) * 0.4, 
             flowerSizeMult: 1,
             thicknessMult: 0.7 + Math.random() * 0.4,
             parentPos: pos
        };
        branch.children.push(child);
        this.preGenerate(child);
    }
    
    let flowerChance = 0;
    if (depthRatio >= 0.7) flowerChance = GROWTH_PARAMS.flowerDensity * 3.0; 
    else if (depthRatio >= 0.5) flowerChance = GROWTH_PARAMS.flowerDensity * 1.5;
    
    const isTerminal = branch.depth >= GROWTH_PARAMS.maxDepth - 1;
    if (isTerminal || Math.random() < flowerChance) {
         const numFlowers = 1 + Math.floor(Math.random() * 3);
         for (let i = 0; i < numFlowers; i++) {
            branch.children.push({
               id: Math.random().toString(),
               angle: branch.angle + (Math.random() - 0.5) * 2.0,
               length: 0,
               depth: branch.depth + 1,
               progress: 0,
               children: [],
               isFlower: true,
               flowerProgress: 0,
               curvature: 0,
               flowerSizeMult: 0.8 + Math.random() * 0.6,
               thicknessMult: 1,
               parentPos: 0.7 + Math.random() * 0.3
            });
         }
    }
  }

  getTreeProgress(branch: Branch): { current: number, max: number } {
     let current = branch.isFlower ? branch.flowerProgress : branch.progress;
     let max = 1;
     for (const child of branch.children) {
         const childProg = this.getTreeProgress(child);
         current += childProg.current;
         max += childProg.max;
     }
     return { current, max };
  }

  update(time: number) {
    if (!this.root) return;
    
    const springStrength = 0.08; 
    const damping = 0.8;
    
    const force = (this.targetBend - this.currentBend) * springStrength;
    this.bendVelocity += force;
    this.bendVelocity *= damping;
    this.currentBend += this.bendVelocity;

    const leafForce = (this.currentBend - this.leafBend) * 0.1;
    this.leafBendVelocity += leafForce;
    this.leafBendVelocity *= 0.8;
    this.leafBend += this.leafBendVelocity;
    
    const flowerForce = (this.leafBend - this.flowerBend) * 0.08;
    this.flowerBendVelocity += flowerForce;
    this.flowerBendVelocity *= 0.75;
    this.flowerBend += this.flowerBendVelocity;

    const prog = this.getTreeProgress(this.root);
    this.currentTreeSize = prog.current / prog.max;
    
    const diff = this.targetTreeSize - this.currentTreeSize;
    const growthSpeed = diff * (diff < 0 ? 0.95 : 0.6); 
    
    if (Math.abs(growthSpeed) > 0.001) {
        this._updateBranchState(this.root, growthSpeed);
    }
    
    this._updateParticles(time);
  }
  
  _updateBranchState(branch: Branch, speed: number) {
     if (speed > 0) {
         if (!branch.isFlower) {
             if (branch.progress < 1) {
                 branch.progress += Math.min(speed, 1 - branch.progress);
             }
         } else {
             if (branch.flowerProgress < 1) {
                 branch.flowerProgress += Math.min(speed * 2.0, 1 - branch.flowerProgress);
             }
         }
         
         for (const child of branch.children) {
             if (branch.progress >= child.parentPos) {
                 this._updateBranchState(child, speed);
             }
         }
     } else if (speed < 0) {
         let canShrinkSelf = true;
         for (const child of branch.children) {
             if (child.progress > 0 || child.flowerProgress > 0) {
                 this._updateBranchState(child, speed);
                 canShrinkSelf = false;
             }
         }
         
         if (canShrinkSelf) {
             if (!branch.isFlower) {
                 branch.progress += Math.max(speed * 1.5, -branch.progress); 
             } else {
                 branch.flowerProgress += Math.max(speed * 3.0, -branch.flowerProgress); 
             }
         }
     }
  }

  _updateParticles(time: number) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          if (p.grounded) continue;
          
          p.vy += 0.05; 
          p.vx += (this.currentBend * 0.8) + Math.sin(time * 0.005 + p.y * 0.02) * 0.15; 
          p.vx *= 0.98; 
          p.vy *= 0.98;
          
          p.x += p.vx;
          p.y += p.vy;
          p.angle += p.va;
          
          if (p.y > this.canvasHeight - 10) {
              p.y = this.canvasHeight - 10 + Math.random() * 8;
              p.grounded = true; 
              p.vx = 0;
              p.vy = 0;
          }
      }
      
      if (this.particles.length > 300) {
          const groundedCount = this.particles.filter(p => p.grounded).length;
          if (groundedCount > 200) {
              const idx = this.particles.findIndex(p => p.grounded);
              if (idx !== -1) {
                  this.particles.splice(idx, 1);
              }
          }
      }
  }

  getPointOnQuad(t: number, p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number) {
      const inv = 1 - t;
      return {
          x: inv * inv * p0x + 2 * inv * t * p1x + t * t * p2x,
          y: inv * inv * p0y + 2 * inv * t * p1y + t * t * p2y
      };
  }

  draw(ctx: CanvasRenderingContext2D, theme: ThemeConfig, time: number) {
    if (!this.root) return;
    
    this.metrics = { branches: 0, leaves: 0, flowers: 0 };
    
    const treeBreathe = Math.abs(this.currentBend) > 0.01 ? Math.sin(time * 0.0005) * 0.01 : 0;
    const bend = this.currentBend + treeBreathe;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    this._drawBranch(ctx, this.root, this.canvasWidth / 2, this.canvasHeight, bend, theme, bend, time);
    this._drawFlowers(ctx, this.root, this.canvasWidth / 2, this.canvasHeight, bend, theme, bend, time);
    this._drawParticles(ctx, theme);
  }

  _drawBranch(ctx: CanvasRenderingContext2D, branch: Branch, startX: number, startY: number, accumulatedBend: number, theme: ThemeConfig, baseBend: number, time: number) {
    if (branch.progress <= 0 || branch.isFlower) return;
    
    this.metrics.branches++;
    
    const currentBend = baseBend * (1 + branch.depth * 0.5);
    const finalAngle = branch.angle + currentBend;
    const currentLength = branch.length * branch.progress;
    const endX = startX + Math.cos(finalAngle) * currentLength;
    const endY = startY + Math.sin(finalAngle) * currentLength;
    
    const cpX = startX + Math.cos(finalAngle + branch.curvature) * currentLength * 0.5;
    const cpY = startY + Math.sin(finalAngle + branch.curvature) * currentLength * 0.5;
    
    const depthRatio = branch.depth / GROWTH_PARAMS.maxDepth;
    
    const startWidth = Math.max(0.8, (GROWTH_PARAMS.maxDepth - branch.depth + 1) * 1.2 * branch.thicknessMult);
    const endWidth = Math.max(0.3, (GROWTH_PARAMS.maxDepth - branch.depth) * 1.2 * branch.thicknessMult);

    ctx.globalCompositeOperation = 'source-over';
    
    const segments = Math.max(3, Math.floor(currentLength / 20));
    let prevP = { x: startX, y: startY };
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const p = this.getPointOnQuad(t, startX, startY, cpX, cpY, endX, endY);
        
        let wiggle = 0;
        if (Math.abs(baseBend) > 0.05) {
            wiggle = Math.sin(p.y * 0.05 + time * 0.005) * (1 - depthRatio) * Math.abs(baseBend) * 3.0;
        }
        p.x += wiggle;

        ctx.beginPath();
        ctx.moveTo(prevP.x, prevP.y);
        ctx.lineTo(p.x, p.y);
        ctx.lineWidth = startWidth + (endWidth - startWidth) * t;
        
        ctx.strokeStyle = depthRatio > 0.6 ? theme.leaves : theme.tree;
        ctx.globalAlpha = depthRatio > 0.6 ? 0.8 : 1.0;
        
        ctx.stroke();
        prevP = p;
    }
    ctx.globalAlpha = 1.0;

    if (depthRatio > 0.1 && branch.progress > 0.1) {
       let seed = Math.abs(branch.angle * 1000 + branch.depth * 100);
       const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
       
       let leafBaseCount = 0;
       if (depthRatio > 0.5) leafBaseCount = 12;
       else if (depthRatio > 0.2) leafBaseCount = 8;
       else leafBaseCount = 3;
       
       const leafCount = leafBaseCount + Math.floor(random() * 6);
       
       for (let i = 0; i < leafCount; i++) {
          const t = 0.1 + random() * 0.8; 
          if (branch.progress > t) {
             this.metrics.leaves++;
             
             const fullLength = branch.length;
             const fullEndX = startX + Math.cos(finalAngle) * fullLength;
             const fullEndY = startY + Math.sin(finalAngle) * fullLength;
             const lx = startX + (fullEndX - startX) * t;
             const ly = startY + (fullEndY - startY) * t;
             
             const baseOffset = (random() > 0.5 ? 1 : -1) * (0.4 + random() * 0.6);
             const extraSway = (this.leafBend - this.currentBend) * 2.0;
             const leafAngle = finalAngle + baseOffset + extraSway;
             
             const leafScale = Math.min(1, (branch.progress - t) * 4.0); 
             
             const windEffect = Math.abs(this.targetBend);
             if (windEffect > 0.3 && Math.random() < 0.08 * windEffect && this.particles.length < 400) {
                 this.particles.push({
                     x: lx, y: ly,
                     vx: (this.targetBend * 15) + (Math.random() - 0.5) * 4,
                     vy: Math.random() * 3,
                     angle: leafAngle,
                     va: (Math.random() - 0.5) * 0.3,
                     size: leafScale * (0.9 + Math.random() * 0.5),
                     color: theme.leaves,
                     type: 'leaf',
                     grounded: false
                 });
             }

             ctx.save();
             ctx.translate(lx, ly);
             ctx.rotate(leafAngle);
             
             ctx.beginPath();
             ctx.moveTo(0, 0);
             const leafW = 6 + random() * 6; 
             const leafL = 16 + random() * 10; 
             ctx.quadraticCurveTo(leafW, -leafW * 0.5, leafL, 0);
             ctx.quadraticCurveTo(leafW, leafW * 0.5, 0, 0);
             
             ctx.fillStyle = theme.leaves;
             ctx.scale(leafScale, leafScale);
             
             ctx.globalAlpha = 0.95;
             ctx.fill();
             
             ctx.globalCompositeOperation = 'screen';
             ctx.globalAlpha = 0.15;
             ctx.fill();
             
             ctx.restore();
          }
       }
    }
    
    for (const child of branch.children) {
      if (branch.progress >= child.parentPos || child.progress > 0) {
        const fullLength = branch.length;
        const fullEndX = startX + Math.cos(finalAngle) * fullLength;
        const fullEndY = startY + Math.sin(finalAngle) * fullLength;
        const fullCpX = startX + Math.cos(finalAngle + branch.curvature) * fullLength * 0.5;
        const fullCpY = startY + Math.sin(finalAngle + branch.curvature) * fullLength * 0.5;
        
        const sproutPt = this.getPointOnQuad(child.parentPos, startX, startY, fullCpX, fullCpY, fullEndX, fullEndY);
        this._drawBranch(ctx, child, sproutPt.x, sproutPt.y, accumulatedBend + currentBend, theme, baseBend, time);
      }
    }
  }
  
  _drawFlowers(ctx: CanvasRenderingContext2D, branch: Branch, startX: number, startY: number, accumulatedBend: number, theme: ThemeConfig, baseBend: number, time: number) {
    if (branch.progress <= 0) return;
    
    const currentBend = baseBend * (1 + branch.depth * 0.5);
    const finalAngle = branch.angle + currentBend;
    const currentLength = branch.length * branch.progress;
    const endX = startX + Math.cos(finalAngle) * currentLength;
    const endY = startY + Math.sin(finalAngle) * currentLength;

    if (branch.isFlower && branch.flowerProgress > 0) {
      this.metrics.flowers++;
      
      const scale = branch.flowerProgress * GROWTH_PARAMS.flowerScale * branch.flowerSizeMult;
      const flowerRadius = 10 * scale; 
      
      const windEffect = Math.abs(this.targetBend);
      if (windEffect > 0.4 && Math.random() < 0.03 * windEffect && this.particles.length < 400) {
          this.particles.push({
              x: startX, y: startY,
              vx: (this.targetBend * 12) + (Math.random() - 0.5) * 3,
              vy: Math.random() * 3,
              angle: finalAngle,
              va: (Math.random() - 0.5) * 0.5,
              size: scale,
              color: theme.flowers,
              type: 'flower',
              grounded: false
          });
      }

      ctx.save();
      ctx.translate(startX, startY);
      
      const breathe = Math.abs(baseBend) > 0.05 ? 1 + Math.sin(time * 0.003 + startX * 0.1) * 0.05 : 1;
      ctx.scale(breathe, breathe);
      
      ctx.globalCompositeOperation = 'screen';
      ctx.beginPath();
      ctx.arc(0, 0, flowerRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = theme.glowColor;
      ctx.globalAlpha = 0.4;
      ctx.fill();
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      
      ctx.fillStyle = theme.flowers;
      const numPetals = 6;
      const flowerSway = (this.flowerBend - this.currentBend) * 1.5;
      for (let i = 0; i < numPetals; i++) {
         ctx.save();
         ctx.rotate((Math.PI * 2 / numPetals) * i + finalAngle + flowerSway);
         ctx.beginPath();
         ctx.moveTo(0, 0);
         ctx.quadraticCurveTo(flowerRadius * 1.8, flowerRadius * 1.0, flowerRadius * 2.8, 0);
         ctx.quadraticCurveTo(flowerRadius * 1.8, -flowerRadius * 1.0, 0, 0);
         ctx.fill();
         
         ctx.beginPath();
         ctx.moveTo(0, 0);
         ctx.lineTo(flowerRadius * 1.5, 0);
         ctx.strokeStyle = theme.glowColor;
         ctx.lineWidth = 1;
         ctx.globalAlpha = 0.5;
         ctx.stroke();
         
         ctx.restore();
      }
      
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(0, 0, flowerRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = theme.tree;
      ctx.fill();
      ctx.restore();
    } else if (!branch.isFlower) {
       for (const child of branch.children) {
         if (branch.progress >= child.parentPos || child.progress > 0 || child.flowerProgress > 0) {
           const fullLength = branch.length;
           const fullEndX = startX + Math.cos(finalAngle) * fullLength;
           const fullEndY = startY + Math.sin(finalAngle) * fullLength;
           const fullCpX = startX + Math.cos(finalAngle + branch.curvature) * fullLength * 0.5;
           const fullCpY = startY + Math.sin(finalAngle + branch.curvature) * fullLength * 0.5;
           
           const sproutPt = this.getPointOnQuad(child.parentPos, startX, startY, fullCpX, fullCpY, fullEndX, fullEndY);
           this._drawFlowers(ctx, child, sproutPt.x, sproutPt.y, accumulatedBend + currentBend, theme, baseBend, time);
         }
       }
    }
  }

  _drawParticles(ctx: CanvasRenderingContext2D, theme: ThemeConfig) {
      ctx.globalCompositeOperation = 'source-over';
      for (const p of this.particles) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.scale(p.size, p.size);
          ctx.globalAlpha = p.grounded ? 0.15 : 0.9;
          ctx.fillStyle = p.color;
          
          if (p.type === 'leaf') {
             ctx.beginPath();
             ctx.moveTo(0, 0);
             ctx.quadraticCurveTo(6, -3, 16, 0);
             ctx.quadraticCurveTo(6, 3, 0, 0);
             ctx.fill();
          } else {
             const flowerRadius = 8;
             const numPetals = 6;
             for (let i = 0; i < numPetals; i++) {
                 ctx.save();
                 ctx.rotate((Math.PI * 2 / numPetals) * i);
                 ctx.beginPath();
                 ctx.moveTo(0, 0);
                 ctx.quadraticCurveTo(flowerRadius * 1.8, flowerRadius * 1.0, flowerRadius * 2.8, 0);
                 ctx.quadraticCurveTo(flowerRadius * 1.8, -flowerRadius * 1.0, 0, 0);
                 ctx.fill();
                 ctx.restore();
             }
          }
          ctx.restore();
      }
  }
}
`;
fs.writeFileSync('src/engine/FlowerEngine.ts', engineCode);

const canvasCode = `import { useEffect, useRef } from 'react';
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
           backgroundImage: \`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")\`,
           backgroundRepeat: 'repeat',
           backgroundSize: '150px 150px'
        }}
      />
      
      <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_150px_rgba(0,0,0,0.5)] mix-blend-multiply" />
      
      <div className="pointer-events-none absolute inset-0 z-20 mix-blend-screen opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
    </div>
  );
}
`;
fs.writeFileSync('src/components/CanvasContainer.tsx', canvasCode);
