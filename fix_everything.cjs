const fs = require('fs');

// 1. Update FlowerEngine.ts
const engineCode = `import { ThemeConfig } from '../components/ThemeSelector';

export const GROWTH_PARAMS = {
  maxDepth: 8,
  flowerDensity: 0.8,
  flowerScale: 1.2,
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
      length: this.canvasHeight * 0.4, 
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
    if (depthRatio > 0.7) maxSplits = 1;
    const splits = maxSplits;
    const spread = GROWTH_PARAMS.branchAngle + (Math.random() * 0.2 - 0.1);
    
    for (let i = 0; i < splits; i++) {
        const pos = 0.4 + Math.random() * 0.6; 
        const len = this.canvasHeight * 0.25 * (0.7 + Math.random() * 0.5) * Math.pow(0.85, branch.depth);
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
    if (depthRatio >= 0.8) flowerChance = GROWTH_PARAMS.flowerDensity * 2.0;
    else if (depthRatio >= 0.6) flowerChance = GROWTH_PARAMS.flowerDensity * 1.0;
    
    const isTerminal = branch.depth >= GROWTH_PARAMS.maxDepth - 1;
    if (isTerminal || Math.random() < flowerChance) {
         const numFlowers = 1 + Math.floor(Math.random() * 2);
         for (let i = 0; i < numFlowers; i++) {
            branch.children.push({
               id: Math.random().toString(),
               angle: branch.angle + (Math.random() - 0.5) * 1.5,
               length: 0,
               depth: branch.depth + 1,
               progress: 0,
               children: [],
               isFlower: true,
               flowerProgress: 0,
               curvature: 0,
               flowerSizeMult: 0.8 + Math.random() * 0.6,
               thicknessMult: 1,
               parentPos: 0.8 + Math.random() * 0.2
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
    
    const springStrength = 0.04;
    const damping = 0.85;
    
    const force = (this.targetBend - this.currentBend) * springStrength;
    this.bendVelocity += force;
    this.bendVelocity *= damping;
    this.currentBend += this.bendVelocity;

    const leafForce = (this.currentBend - this.leafBend) * 0.08;
    this.leafBendVelocity += leafForce;
    this.leafBendVelocity *= 0.82;
    this.leafBend += this.leafBendVelocity;
    
    const flowerForce = (this.leafBend - this.flowerBend) * 0.06;
    this.flowerBendVelocity += flowerForce;
    this.flowerBendVelocity *= 0.78;
    this.flowerBend += this.flowerBendVelocity;

    const prog = this.getTreeProgress(this.root);
    this.currentTreeSize = prog.current / prog.max;
    
    const diff = this.targetTreeSize - this.currentTreeSize;
    const growthSpeed = diff * (diff < 0 ? 0.8 : 0.2); 
    
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
                 branch.progress += Math.max(speed, -branch.progress);
             } else {
                 branch.flowerProgress += Math.max(speed * 2.0, -branch.flowerProgress);
             }
         }
     }
  }

  _updateParticles(time: number) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          if (p.grounded) continue;
          
          p.vy += 0.08; 
          p.vx += (this.currentBend * 0.5) + Math.sin(time * 0.002 + p.y * 0.01) * 0.2; 
          p.vx *= 0.98; 
          p.vy *= 0.98;
          
          p.x += p.vx;
          p.y += p.vy;
          p.angle += p.va;
          
          if (p.y > this.canvasHeight - 10) {
              p.y = this.canvasHeight - 10 + Math.random() * 5;
              p.grounded = true;
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
    
    const treeBreathe = Math.sin(time * 0.0005) * 0.02;
    const bend = this.currentBend + treeBreathe;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    this._drawBranch(ctx, this.root, this.canvasWidth / 2, this.canvasHeight, bend, theme, bend, time);
    this._drawFlowers(ctx, this.root, this.canvasWidth / 2, this.canvasHeight, bend, theme, bend, time);
    this._drawParticles(ctx, theme);
    
    ctx.filter = 'none';
  }

  _drawBranch(ctx: CanvasRenderingContext2D, branch: Branch, startX: number, startY: number, accumulatedBend: number, theme: ThemeConfig, baseBend: number, time: number) {
    if (branch.progress <= 0 || branch.isFlower) return;
    
    this.metrics.branches++;
    
    const currentBend = baseBend * (1 + branch.depth * 0.6);
    const finalAngle = branch.angle + currentBend;
    const currentLength = branch.length * branch.progress;
    const endX = startX + Math.cos(finalAngle) * currentLength;
    const endY = startY + Math.sin(finalAngle) * currentLength;
    
    const cpX = startX + Math.cos(finalAngle + branch.curvature) * currentLength * 0.5;
    const cpY = startY + Math.sin(finalAngle + branch.curvature) * currentLength * 0.5;
    
    const depthRatio = branch.depth / GROWTH_PARAMS.maxDepth;
    
    const startWidth = Math.max(0.5, (GROWTH_PARAMS.maxDepth - branch.depth + 1) * 0.8 * branch.thicknessMult);
    const endWidth = Math.max(0.2, (GROWTH_PARAMS.maxDepth - branch.depth) * 0.8 * branch.thicknessMult);

    const hash = parseInt(branch.id.substring(2, 6)) % 10;
    if (hash > 7 && branch.depth > 3) {
        ctx.filter = 'blur(2px)';
    } else if (hash > 5 && branch.depth > 3) {
        ctx.filter = 'blur(1px)';
    } else {
        ctx.filter = 'none';
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0; 
    
    const segments = Math.max(4, Math.floor(currentLength / 15));
    let prevP = { x: startX, y: startY };
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const p = this.getPointOnQuad(t, startX, startY, cpX, cpY, endX, endY);
        
        const wiggle = Math.sin(p.y * 0.05 + time * 0.002) * (1 - depthRatio) * 1.5;
        p.x += wiggle;

        ctx.beginPath();
        ctx.moveTo(prevP.x, prevP.y);
        ctx.lineTo(p.x, p.y);
        ctx.lineWidth = startWidth + (endWidth - startWidth) * t;
        ctx.strokeStyle = theme.tree;
        ctx.stroke();
        
        if (ctx.lineWidth > 2) {
            ctx.beginPath();
            ctx.moveTo(prevP.x, prevP.y);
            ctx.lineTo(p.x, p.y);
            ctx.lineWidth = ctx.lineWidth * 0.3;
            ctx.strokeStyle = theme.leaves;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
        
        prevP = p;
    }

    if (depthRatio > 0.2 && branch.progress > 0.1) {
       let seed = Math.abs(branch.angle * 1000 + branch.depth * 100);
       const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
       
       let leafBaseCount = 0;
       if (depthRatio > 0.6) leafBaseCount = 8;
       else if (depthRatio > 0.3) leafBaseCount = 5;
       else leafBaseCount = 2;
       
       const leafCount = leafBaseCount + Math.floor(random() * 5);
       
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
             const extraSway = (this.leafBend - this.currentBend) * 2.5;
             const leafAngle = finalAngle + baseOffset + extraSway;
             
             const leafScale = Math.min(1, (branch.progress - t) * 3.0);
             
             const windEffect = Math.abs(this.targetBend);
             if (windEffect > 0.2 && Math.random() < 0.05 * windEffect && this.particles.length < 800) {
                 this.particles.push({
                     x: lx, y: ly,
                     vx: (this.targetBend * 10) + (Math.random() - 0.5) * 3,
                     vy: Math.random() * 2,
                     angle: leafAngle,
                     va: (Math.random() - 0.5) * 0.2,
                     size: leafScale * (0.8 + Math.random() * 0.4),
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
             const leafW = 5 + random() * 6;
             const leafL = 12 + random() * 12;
             ctx.quadraticCurveTo(leafW, -leafW * 0.5, leafL, 0);
             ctx.quadraticCurveTo(leafW, leafW * 0.5, 0, 0);
             
             ctx.fillStyle = theme.leaves;
             ctx.scale(leafScale, leafScale);
             
             ctx.globalCompositeOperation = 'source-over';
             ctx.globalAlpha = 0.9;
             ctx.fill();
             
             ctx.globalCompositeOperation = 'screen';
             ctx.globalAlpha = 0.2;
             ctx.fill();
             
             ctx.restore();
          }
       }
    }
    
    ctx.filter = 'none';
    
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
    
    const currentBend = baseBend * (1 + branch.depth * 0.6);
    const finalAngle = branch.angle + currentBend;
    const currentLength = branch.length * branch.progress;
    const endX = startX + Math.cos(finalAngle) * currentLength;
    const endY = startY + Math.sin(finalAngle) * currentLength;

    if (branch.isFlower && branch.flowerProgress > 0) {
      this.metrics.flowers++;
      
      const scale = branch.flowerProgress * GROWTH_PARAMS.flowerScale * branch.flowerSizeMult;
      const flowerRadius = 8 * scale; 
      
      const windEffect = Math.abs(this.targetBend);
      if (windEffect > 0.3 && Math.random() < 0.02 * windEffect && this.particles.length < 800) {
          this.particles.push({
              x: startX, y: startY,
              vx: (this.targetBend * 8) + (Math.random() - 0.5) * 2,
              vy: Math.random() * 2,
              angle: finalAngle,
              va: (Math.random() - 0.5) * 0.4,
              size: scale,
              color: theme.flowers,
              type: 'flower',
              grounded: false
          });
      }

      ctx.save();
      ctx.translate(startX, startY);
      
      const breathe = 1 + Math.sin(time * 0.0015 + startX * 0.1) * 0.08;
      ctx.scale(breathe, breathe);
      ctx.globalCompositeOperation = 'screen';
      
      const glowStretch = 1.0 + Math.abs(this.bendVelocity) * 2.0;
      const glowShift = this.bendVelocity * 20.0;
      
      ctx.save();
      ctx.translate(glowShift, 0);
      ctx.scale(glowStretch, 1.0);
      
      ctx.beginPath();
      ctx.arc(0, 0, flowerRadius * 3.0, 0, Math.PI * 2);
      ctx.fillStyle = theme.glowColor;
      ctx.globalAlpha = 0.2;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(0, 0, flowerRadius * 1.5, 0, Math.PI * 2);
      ctx.globalAlpha = 0.5;
      ctx.fill();
      
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.9;
      
      ctx.fillStyle = theme.flowers;
      const numPetals = 6;
      const flowerSway = (this.flowerBend - this.currentBend) * 2.0;
      for (let i = 0; i < numPetals; i++) {
         ctx.save();
         ctx.rotate((Math.PI * 2 / numPetals) * i + finalAngle + flowerSway);
         ctx.beginPath();
         ctx.moveTo(0, 0);
         ctx.quadraticCurveTo(flowerRadius * 1.5, flowerRadius * 0.8, flowerRadius * 2.5, 0);
         ctx.quadraticCurveTo(flowerRadius * 1.5, -flowerRadius * 0.8, 0, 0);
         ctx.fill();
         ctx.restore();
      }
      
      ctx.beginPath();
      ctx.arc(0, 0, flowerRadius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = theme.tree;
      ctx.globalAlpha = 1.0;
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
          ctx.globalAlpha = p.grounded ? 0.3 : 0.8;
          ctx.fillStyle = p.color;
          
          if (p.type === 'leaf') {
             ctx.beginPath();
             ctx.moveTo(0, 0);
             ctx.quadraticCurveTo(5, -2.5, 10, 0);
             ctx.quadraticCurveTo(5, 2.5, 0, 0);
             ctx.fill();
          } else {
             const flowerRadius = 5;
             const numPetals = 5;
             for (let i = 0; i < numPetals; i++) {
                 ctx.save();
                 ctx.rotate((Math.PI * 2 / numPetals) * i);
                 ctx.beginPath();
                 ctx.moveTo(0, 0);
                 ctx.quadraticCurveTo(flowerRadius * 1.5, flowerRadius * 0.8, flowerRadius * 2.5, 0);
                 ctx.quadraticCurveTo(flowerRadius * 1.5, -flowerRadius * 0.8, 0, 0);
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

// 2. Update CanvasContainer.tsx
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
         if (currentTracking.leftHand) {
            const rawOpenness = currentTracking.leftHand.openness;
            smoothedLeftOpenness += (rawOpenness - smoothedLeftOpenness) * 0.3; // responsive sync
            let targetSize = (smoothedLeftOpenness - 0.1) * 1.25;
            targetNormalizedGrowth = Math.max(0, Math.min(1, targetSize));
         } else {
            smoothedLeftOpenness += (0.0 - smoothedLeftOpenness) * 0.15; // fast collapse when hand removed
            targetNormalizedGrowth = Math.max(0, smoothedLeftOpenness);
         }

         if (currentTracking.rightHand) {
            const rawOpenness = currentTracking.rightHand.openness;
            // 0 -> -1 (left), 1 -> 1 (right)
            let desiredBend = (rawOpenness - 0.5) * 2.0; 
            // limit bend amount
            desiredBend = Math.max(-0.6, Math.min(0.6, desiredBend));
            
            smoothedTargetBend += (desiredBend - smoothedTargetBend) * 0.15;
            targetBend = smoothedTargetBend;
         } else {
            smoothedTargetBend += (0.0 - smoothedTargetBend) * 0.05;
            targetBend = smoothedTargetBend;
         }
      }

      engineRef.current.targetTreeSize = targetNormalizedGrowth;
      engineRef.current.targetBend = targetBend * 0.5;

      if (onInteractionUpdate) {
         onInteractionUpdate(targetNormalizedGrowth, targetBend); // pass raw target for UI sync
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
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-10" />
      <div 
        className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay opacity-20"
        style={{
           backgroundImage: \`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")\`,
           backgroundRepeat: 'repeat',
           backgroundSize: '150px 150px'
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_150px_rgba(0,0,0,0.3)] mix-blend-multiply" />
    </div>
  );
}
`;
fs.writeFileSync('src/components/CanvasContainer.tsx', canvasCode);

// 3. Update App.tsx
const appCode = `import { useState } from 'react';
import { PageLayout } from './components/PageLayout';
import { CanvasContainer, Metrics } from './components/CanvasContainer';
import { InformationPanel } from './components/InformationPanel';
import { ThemeSelector, THEMES } from './components/ThemeSelector';
import { HandVisualization } from './components/HandVisualization';
import { useHandTracking } from './hooks/useHandTracking';

export default function App() {
  const trackingState = useHandTracking();
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [growthValue, setGrowthValue] = useState(0);
  const [bendValue, setBendValue] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>({ branches: 0, leaves: 0, flowers: 0 });

  const normalizedGrowth = Math.min(Math.max(growthValue / 0.05, 0), 1.0);
  const normalizedBend = Math.max(Math.min(bendValue, 1.0), -1.0);
  
  const bendWidth = Math.abs(normalizedBend) * 50;
  const bendLeft = normalizedBend < 0 ? 50 - bendWidth : 50;

  const bottomLeft = (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <div className={"w-2 h-2 rounded-full " + (trackingState.isTracking ? 'bg-green-500' : 'bg-red-500')} />
        <span className="text-white text-sm tracking-wide">
          {trackingState.isTracking ? 'camera connected' : 'camera disconnected'}
        </span>
      </div>
      
      <div className="flex gap-8">
         <div className="flex flex-col gap-2 w-32">
            <span className="text-white text-sm tracking-wide">growth</span>
            <div className="w-full h-[1px] bg-white/30 relative">
               <div className="absolute left-0 top-0 bottom-0 bg-white" style={{width: (normalizedGrowth * 100) + '%'}} />
            </div>
         </div>
         <div className="flex flex-col gap-2 w-32">
            <span className="text-white text-sm tracking-wide">wind</span>
            <div className="w-full h-[1px] bg-white/30 relative">
               <div className="absolute left-0 top-0 bottom-0 bg-white" style={{left: bendLeft + '%', width: bendWidth + '%'}} />
            </div>
         </div>
      </div>
      
      <div className="mt-2">
        <HandVisualization trackingState={trackingState} />
      </div>
    </div>
  );

  return (
    <PageLayout
      canvas={
        <CanvasContainer 
          trackingState={trackingState} 
          theme={activeTheme} 
          onInteractionUpdate={(g, b) => { setGrowthValue(g); setBendValue(b); }}
          onMetricsUpdate={setMetrics}
        />
      }
      topRight={<InformationPanel trackingState={trackingState} metrics={metrics} />}
      rightSidebar={<ThemeSelector activeTheme={activeTheme} onSelectTheme={setActiveTheme} />}
      bottomLeft={bottomLeft}
      bottomCenter={null}
    />
  );
}
`;
fs.writeFileSync('src/App.tsx', appCode);

// 4. Update InformationPanel.tsx
const infoCode = `import { TrackingState } from '../hooks/useHandTracking';
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
`;
fs.writeFileSync('src/components/InformationPanel.tsx', infoCode);

// 5. Update HandVisualization.tsx for white fill with 10% opacity
const handCode = `import { useEffect, useRef } from 'react';
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
`;
fs.writeFileSync('src/components/HandVisualization.tsx', handCode);

