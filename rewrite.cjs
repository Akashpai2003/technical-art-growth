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
      length: this.canvasHeight * 0.30, // scale up slightly to hit 90% target overall
      depth: 0,
      progress: 0,
      children: [],
      isFlower: false,
      flowerProgress: 0,
      curvature: (Math.random() - 0.5) * 0.1,
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
    
    // Improve negative space: less splits as we go higher, vary splits randomly
    let maxSplits = 2;
    if (depthRatio > 0.7) maxSplits = 1;
    if (branch.depth > 2 && Math.random() > 0.8) maxSplits = 1; // randomly drop branches to create negative space
    
    const splits = maxSplits;
    const spread = GROWTH_PARAMS.branchAngle + (Math.random() * 0.2 - 0.1);
    
    for (let i = 0; i < splits; i++) {
        // Space out major branches
        const pos = branch.depth === 0 
           ? 0.5 + Math.random() * 0.4 
           : 0.3 + Math.random() * 0.6; 
           
        const len = this.canvasHeight * 0.18 * (0.6 + Math.random() * 0.6) * Math.pow(0.85, branch.depth);
        
        let angleOffset = 0;
        if (splits === 2) {
             angleOffset = i === 0 ? -spread : spread;
             angleOffset += (Math.random() - 0.5) * 0.3;
        } else {
             angleOffset = (Math.random() - 0.5) * spread * 1.5;
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
             curvature: (Math.random() - 0.5) * 0.5, 
             flowerSizeMult: 1,
             thicknessMult: 0.7 + Math.random() * 0.3,
             parentPos: pos
        };
        branch.children.push(child);
        this.preGenerate(child);
    }
    
    // Flowers primarily near mature branch tips
    let flowerChance = 0;
    if (depthRatio >= 0.8) flowerChance = GROWTH_PARAMS.flowerDensity * 3.0; 
    else if (depthRatio >= 0.6) flowerChance = GROWTH_PARAMS.flowerDensity * 0.5;
    
    const isTerminal = branch.depth >= GROWTH_PARAMS.maxDepth - 1;
    if (isTerminal || Math.random() < flowerChance) {
         const numFlowers = 1 + Math.floor(Math.random() * 2);
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
    
    // When target size is exactly 0 and diff is very small, force to 0 to ensure clean disappearance
    if (this.targetTreeSize === 0 && this.currentTreeSize < 0.01) {
        this.bendVelocity = 0;
        this.currentBend = 0;
        this._forceZero(this.root);
    } else if (Math.abs(growthSpeed) > 0.001) {
        this._updateBranchState(this.root, growthSpeed);
    }
    
    this._updateParticles(time);
  }
  
  _forceZero(branch: Branch) {
     branch.progress = 0;
     branch.flowerProgress = 0;
     for (const child of branch.children) {
         this._forceZero(child);
     }
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
      if (this.targetTreeSize === 0 && this.currentTreeSize < 0.05) {
          // Rapidly clear particles when tree is gone
          this.particles = [];
          return;
      }
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
    if (!this.root || this.currentTreeSize === 0) return;
    
    this.metrics = { branches: 0, leaves: 0, flowers: 0 };
    
    const treeBreathe = Math.abs(this.currentBend) > 0.01 ? Math.sin(time * 0.0005) * 0.01 : 0;
    const bend = this.currentBend + treeBreathe;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Use layered alpha compositing and blend modes for dreamy look
    // Branches
    this._drawBranch(ctx, this.root, this.canvasWidth / 2, this.canvasHeight, bend, theme, bend, time);
    // Flowers on top
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
    
    const startWidth = Math.max(0.6, (GROWTH_PARAMS.maxDepth - branch.depth + 1) * 1.4 * branch.thicknessMult);
    const endWidth = Math.max(0.2, (GROWTH_PARAMS.maxDepth - branch.depth) * 1.4 * branch.thicknessMult);

    const segments = Math.max(3, Math.floor(currentLength / 15));
    
    // Draw trunk/branches with a watercolor pigment edge simulation
    // We do multiple passes with decreasing width and varying alpha
    for (let pass = 0; pass < 3; pass++) {
        let prevP = { x: startX, y: startY };
        ctx.beginPath();
        ctx.moveTo(prevP.x, prevP.y);
        
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const p = this.getPointOnQuad(t, startX, startY, cpX, cpY, endX, endY);
            
            let wiggle = 0;
            // Add subtle procedural noise to line boundaries for handmade feel
            if (pass === 0) {
                 wiggle = (Math.sin(p.x * 0.1 + time * 0.001) + Math.cos(p.y * 0.1)) * 1.5;
            }
            if (Math.abs(baseBend) > 0.05) {
                wiggle += Math.sin(p.y * 0.05 + time * 0.005) * (1 - depthRatio) * Math.abs(baseBend) * 2.0;
            }
            p.x += wiggle;

            ctx.lineTo(p.x, p.y);
            const currentWidth = startWidth + (endWidth - startWidth) * t;
            
            if (pass === 0) {
                // Wide, very transparent bleed pass
                ctx.lineWidth = currentWidth * 2.5;
                ctx.globalAlpha = 0.08;
                ctx.strokeStyle = theme.tree;
                ctx.globalCompositeOperation = 'screen';
            } else if (pass === 1) {
                // Medium pass
                ctx.lineWidth = currentWidth * 1.5;
                ctx.globalAlpha = 0.15;
                ctx.strokeStyle = depthRatio > 0.6 ? theme.leaves : theme.tree;
                ctx.globalCompositeOperation = 'source-over';
            } else {
                // Core sharp pass
                ctx.lineWidth = currentWidth * 0.8;
                ctx.globalAlpha = 0.85;
                ctx.strokeStyle = depthRatio > 0.6 ? theme.leaves : theme.tree;
                ctx.globalCompositeOperation = 'multiply';
            }
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            prevP = p;
        }
    }
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;

    // Draw Leaves
    if (depthRatio > 0.1 && branch.progress > 0.1) {
       let seed = Math.abs(branch.angle * 1000 + branch.depth * 100);
       const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
       
       let leafBaseCount = 0;
       if (depthRatio > 0.5) leafBaseCount = 10;
       else if (depthRatio > 0.2) leafBaseCount = 6;
       else leafBaseCount = 2;
       
       const leafCount = leafBaseCount + Math.floor(random() * 5);
       
       for (let i = 0; i < leafCount; i++) {
          const t = 0.1 + random() * 0.8; 
          if (branch.progress > t) {
             this.metrics.leaves++;
             
             const fullLength = branch.length;
             const fullEndX = startX + Math.cos(finalAngle) * fullLength;
             const fullEndY = startY + Math.sin(finalAngle) * fullLength;
             const fullCpX = startX + Math.cos(finalAngle + branch.curvature) * fullLength * 0.5;
             const fullCpY = startY + Math.sin(finalAngle + branch.curvature) * fullLength * 0.5;
             
             const leafPt = this.getPointOnQuad(t, startX, startY, fullCpX, fullCpY, fullEndX, fullEndY);
             const lx = leafPt.x;
             const ly = leafPt.y;
             
             const baseOffset = (random() > 0.5 ? 1 : -1) * (0.3 + random() * 0.8);
             const extraSway = (this.leafBend - this.currentBend) * 1.5;
             // Randomize leaf rotation naturally
             const leafAngle = finalAngle + baseOffset + extraSway + (random() - 0.5) * 0.5;
             
             // Leaf size variation
             const leafScaleBase = 0.7 + random() * 0.6;
             const ageScale = Math.min(1, (branch.progress - t) * 5.0);
             const leafScale = leafScaleBase * ageScale;
             
             const windEffect = Math.abs(this.targetBend);
             if (windEffect > 0.3 && Math.random() < 0.08 * windEffect && this.particles.length < 300) {
                 this.particles.push({
                     x: lx, y: ly,
                     vx: (this.targetBend * 12) + (Math.random() - 0.5) * 3,
                     vy: Math.random() * 2 + 1,
                     angle: leafAngle,
                     va: (Math.random() - 0.5) * 0.3,
                     size: leafScale * (0.8 + Math.random() * 0.4),
                     color: theme.leaves,
                     type: 'leaf',
                     grounded: false
                 });
             }

             ctx.save();
             ctx.translate(lx, ly);
             ctx.rotate(leafAngle);
             
             // Leaf shape
             ctx.beginPath();
             ctx.moveTo(0, 0);
             const leafW = 5 + random() * 5; 
             const leafL = 14 + random() * 12; 
             ctx.quadraticCurveTo(leafW, -leafW * 0.4, leafL, 0);
             ctx.quadraticCurveTo(leafW, leafW * 0.4, 0, 0);
             
             ctx.scale(leafScale, leafScale);
             
             // Watercolor leaf rendering
             // Base pigment
             ctx.globalCompositeOperation = 'multiply';
             ctx.fillStyle = theme.leaves;
             ctx.globalAlpha = 0.6 + random() * 0.3;
             ctx.fill();
             
             // Ink outline / pooling at edge
             ctx.globalCompositeOperation = 'source-over';
             ctx.lineWidth = 1.5;
             ctx.strokeStyle = theme.leaves;
             ctx.globalAlpha = 0.4;
             ctx.stroke();
             
             // Bright center diffusion
             ctx.globalCompositeOperation = 'screen';
             ctx.fillStyle = theme.glowColor;
             ctx.globalAlpha = 0.15;
             ctx.fill();
             
             ctx.restore();
          }
       }
    }
    
    // Draw children
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
      const flowerRadius = 8 * scale; 
      
      const windEffect = Math.abs(this.targetBend);
      if (windEffect > 0.4 && Math.random() < 0.03 * windEffect && this.particles.length < 300) {
          this.particles.push({
              x: startX, y: startY,
              vx: (this.targetBend * 10) + (Math.random() - 0.5) * 2,
              vy: Math.random() * 2 + 1,
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
      
      const breathe = Math.abs(baseBend) > 0.05 ? 1 + Math.sin(time * 0.003 + startX * 0.1) * 0.05 : 1;
      ctx.scale(breathe, breathe);
      
      // Ethereal luminous bloom (additive blending without blur)
      ctx.globalCompositeOperation = 'screen';
      
      // Outer soft glow using low opacity circles
      for (let g = 1; g <= 3; g++) {
          ctx.beginPath();
          ctx.arc(0, 0, flowerRadius * (1 + g * 0.6), 0, Math.PI * 2);
          ctx.fillStyle = theme.glowColor;
          ctx.globalAlpha = 0.1 / g;
          ctx.fill();
      }
      
      // Base petals (soft multiply for color density)
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = theme.flowers;
      ctx.globalAlpha = 0.6;
      const numPetals = 6;
      const flowerSway = (this.flowerBend - this.currentBend) * 1.5;
      
      for (let i = 0; i < numPetals; i++) {
         ctx.save();
         ctx.rotate((Math.PI * 2 / numPetals) * i + finalAngle + flowerSway);
         ctx.beginPath();
         ctx.moveTo(0, 0);
         ctx.quadraticCurveTo(flowerRadius * 1.5, flowerRadius * 1.2, flowerRadius * 2.5, 0);
         ctx.quadraticCurveTo(flowerRadius * 1.5, -flowerRadius * 1.2, 0, 0);
         ctx.fill();
         ctx.restore();
      }
      
      // Highlight petals (screen for luminosity)
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = theme.glowColor;
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < numPetals; i++) {
         ctx.save();
         ctx.rotate((Math.PI * 2 / numPetals) * i + finalAngle + flowerSway);
         ctx.beginPath();
         ctx.moveTo(0, 0);
         ctx.quadraticCurveTo(flowerRadius * 1.0, flowerRadius * 0.6, flowerRadius * 1.8, 0);
         ctx.quadraticCurveTo(flowerRadius * 1.0, -flowerRadius * 0.6, 0, 0);
         ctx.fill();
         
         // delicate stamen line
         ctx.beginPath();
         ctx.moveTo(0, 0);
         ctx.lineTo(flowerRadius * 1.6, 0);
         ctx.strokeStyle = theme.glowColor;
         ctx.lineWidth = 1;
         ctx.globalAlpha = 0.6;
         ctx.stroke();
         ctx.restore();
      }
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, flowerRadius * 0.4, 0, Math.PI * 2);
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
      for (const p of this.particles) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.scale(p.size, p.size);
          
          if (p.type === 'leaf') {
             ctx.globalCompositeOperation = 'multiply';
             ctx.globalAlpha = p.grounded ? 0.2 : 0.7;
             ctx.fillStyle = theme.leaves;
             ctx.beginPath();
             ctx.moveTo(0, 0);
             ctx.quadraticCurveTo(5, -2, 14, 0);
             ctx.quadraticCurveTo(5, 2, 0, 0);
             ctx.fill();
          } else {
             ctx.globalCompositeOperation = 'screen';
             ctx.globalAlpha = p.grounded ? 0.15 : 0.6;
             ctx.fillStyle = theme.flowers;
             const flowerRadius = 6;
             const numPetals = 6;
             for (let i = 0; i < numPetals; i++) {
                 ctx.save();
                 ctx.rotate((Math.PI * 2 / numPetals) * i);
                 ctx.beginPath();
                 ctx.moveTo(0, 0);
                 ctx.quadraticCurveTo(flowerRadius * 1.5, flowerRadius * 1.0, flowerRadius * 2.2, 0);
                 ctx.quadraticCurveTo(flowerRadius * 1.5, -flowerRadius * 1.0, 0, 0);
                 ctx.fill();
                 ctx.restore();
             }
          }
          ctx.restore();
      }
  }
}
`
fs.writeFileSync('src/engine/FlowerEngine.ts', engineCode);
