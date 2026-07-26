import { ThemeConfig } from '../components/ThemeSelector';

export const GROWTH_PARAMS = {
  maxDepth: 7, 
  flowerDensity: 0.8, 
  flowerScale: 1.2, 
  branchAngle: 0.4, 
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
    id: string;
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
    phase: number;
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
  detachedLeaves: Set<string> = new Set();
  
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
      length: this.canvasHeight * 0.22, // Slightly taller base trunk
      depth: 0,
      progress: 0,
      children: [],
      isFlower: false,
      flowerProgress: 0,
      curvature: (Math.random() - 0.5) * 0.1,
      flowerSizeMult: 1,
      thicknessMult: 1.0,
      parentPos: 1
    };
    this.particles = [];
    this.detachedLeaves.clear();
    this.preGenerate(this.root);
  }

  preGenerate(branch: Branch) {
    if (branch.depth >= GROWTH_PARAMS.maxDepth) return;
    if (branch.isFlower) return;
    if (this.metrics.branches > 120) return; // Hard cap on branches
    
    this.metrics.branches++;
    
    const depthRatio = branch.depth / GROWTH_PARAMS.maxDepth;
    
    // Controlled branching
    let maxSplits = 1 + (Math.random() > 0.3 ? 1 : 0);
    if (branch.depth === 0) maxSplits = 2 + (Math.random() > 0.3 ? 1 : 0);
    if (branch.depth > 3) maxSplits = Math.random() > 0.5 ? 1 : 0; 
    
    const splits = maxSplits;
    const spread = GROWTH_PARAMS.branchAngle + (1 - depthRatio) * 0.3;
    
    for (let i = 0; i < splits; i++) {
        // Distribute branching positions along the parent
        let pos = 1.0;
        if (splits === 1) pos = 0.6 + Math.random() * 0.4;
        else if (splits === 2) pos = 0.3 + i * 0.5 + Math.random() * 0.2;
        else if (splits === 3) pos = 0.2 + i * 0.3 + Math.random() * 0.2;
        else pos = 0.1 + i * 0.25 + Math.random() * 0.1;
           
        const len = this.canvasHeight * 0.28 * Math.pow(0.82, branch.depth) * (0.7 + Math.random() * 0.6);
        
        let angleOffset = 0;
        if (splits === 1) {
             angleOffset = (Math.random() - 0.5) * spread * 1.5;
        } else if (splits === 2) {
             angleOffset = i === 0 ? -spread : spread;
             angleOffset += (Math.random() - 0.5) * 0.4;
        } else {
             angleOffset = (i - (splits - 1) / 2) * spread;
             angleOffset += (Math.random() - 0.5) * 0.4;
        }
        
        let proposedAngle = branch.angle + angleOffset;
        let pullUp = 0.05 + (branch.depth * 0.05); // Gently guide upwards to reach target height
        let finalAngle = proposedAngle * (1 - pullUp) + (-Math.PI / 2) * pullUp;
        
        const child: Branch = {
             id: Math.random().toString(),
             angle: finalAngle,
             length: len,
             depth: branch.depth + 1,
             progress: 0,
             children: [],
             isFlower: false,
             flowerProgress: 0,
             curvature: (Math.random() - 0.5) * 0.3, 
             flowerSizeMult: 1,
             thicknessMult: branch.thicknessMult * (0.7 + Math.random() * 0.3),
             parentPos: pos
        };
        branch.children.push(child);
        this.preGenerate(child);
    }
    
    let flowerChance = 0.1;
    if (depthRatio >= 0.7) flowerChance = 0.8; 
    else if (depthRatio >= 0.4) flowerChance = 0.4;
    
    const isTerminal = branch.depth >= GROWTH_PARAMS.maxDepth - 1;
    if (isTerminal || Math.random() < flowerChance) {
         const numFlowers = isTerminal ? (3 + Math.floor(Math.random() * 3)) : (1 + Math.floor(Math.random() * 2));
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
               flowerSizeMult: 0.8 + Math.random() * 0.5,
               thicknessMult: 1,
               parentPos: 0.8 + Math.random() * 0.2
            });
         }
    }
  }

  getTreeProgress(branch: Branch, currentMetrics: { branches: number, leaves: number, flowers: number }): { current: number, max: number } {
     let current = branch.isFlower ? branch.flowerProgress : branch.progress;
     let max = 1;
     
     if (current > 0) {
        if (branch.isFlower) currentMetrics.flowers++;
        else currentMetrics.branches++;
     }

     for (const child of branch.children) {
         if (branch.progress >= child.parentPos) {
             const childProg = this.getTreeProgress(child, currentMetrics);
             current += childProg.current;
             max += childProg.max;
         } else {
             // Add max anyway to keep total consistent
             const childProg = this.getTreeProgress(child, { branches: 0, leaves: 0, flowers: 0 }); // dummy
             max += childProg.max;
         }
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

    let visibleMetrics = { branches: 0, leaves: 0, flowers: 0 };
    const prog = this.getTreeProgress(this.root, visibleMetrics);
    
    // Add detached particles to leaves count
    visibleMetrics.leaves += this.particles.filter(p => p.type === 'leaf').length;
    visibleMetrics.flowers += this.particles.filter(p => p.type === 'flower').length;
    
    // Approximate leaves attached based on visible branches (since leaf generation is per branch during render)
    // In preGenerate we don't store leaves in children, they are just rendered.
    // So we'll just report a rough number: e.g. 2 leaves per visible branch
    visibleMetrics.leaves += visibleMetrics.branches * 2;
    
    this.metrics = visibleMetrics;
    this.currentTreeSize = prog.current / prog.max;
    
    const diff = this.targetTreeSize - this.currentTreeSize;
    const growthSpeed = diff * (diff < 0 ? 0.95 : 0.6); 
    
    if (this.targetTreeSize === 0 && this.currentTreeSize < 0.005) {
        this.bendVelocity = 0;
        this.currentBend = 0;
        this.reset(); // Randomize tree structure on full collapse
        if (this.root) this._forceZero(this.root);
        this.particles = [];
        this.detachedLeaves.clear();
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
          this.particles = [];
          return;
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          if (p.grounded) continue;
          
          if (p.type === 'leaf') {
             p.vy += 0.06; 
             p.vx += (this.currentBend * 1.5) + Math.sin(time * 0.003 + p.phase) * 0.6; 
             p.vy *= 0.95; 
             p.vx *= 0.92;
             p.angle += p.va + Math.sin(time * 0.005 + p.phase) * 0.05;
          } else {
             p.vy += 0.04; 
             p.vx += (this.currentBend * 1.0) + Math.sin(time * 0.002 + p.phase) * 0.3; 
             p.vy *= 0.97; 
             p.vx *= 0.96;
             p.angle += p.va;
          }
          
          p.x += p.vx;
          p.y += p.vy;
          
          if (p.y > this.canvasHeight - 15) {
              const pileHeight = 5 + Math.sin(p.x * 0.05 + p.phase) * 10;
              p.y = this.canvasHeight - pileHeight;
              p.grounded = true; 
              p.vx = 0;
              p.vy = 0;
          }
      }
      
      if (this.particles.length > 500) {
          const groundedCount = this.particles.filter(p => p.grounded).length;
          if (groundedCount > 300) {
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
    if (!this.root || this.currentTreeSize <= 0.005) {
        this.metrics = { branches: 0, leaves: 0, flowers: 0 };
        return;
    }
    
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
    
    const maxBaseWidth = 14; 
    const startWidth = Math.max(0.5, maxBaseWidth * Math.pow(0.7, branch.depth) * branch.thicknessMult);
    const endWidth = Math.max(0.5, maxBaseWidth * Math.pow(0.7, branch.depth + 1) * branch.thicknessMult);

    const segments = Math.max(4, Math.floor(currentLength / 12));
    
    // Clean single pass drawing for branch
    let prevP = { x: startX, y: startY };
    
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const p = this.getPointOnQuad(t, startX, startY, cpX, cpY, endX, endY);
        
        // Slight natural wobble
        p.x += Math.sin(p.y * 0.05 + time * 0.005) * (1 - depthRatio) * Math.abs(baseBend) * 1.5;

        const currentWidth = startWidth + (endWidth - startWidth) * t;
        
        ctx.beginPath();
        ctx.moveTo(prevP.x, prevP.y);
        ctx.lineTo(p.x, p.y);
        ctx.lineWidth = currentWidth;
        ctx.strokeStyle = depthRatio > 0.6 ? theme.leaves : theme.tree;
        ctx.globalAlpha = 0.9;
        ctx.globalCompositeOperation = 'source-over';
        ctx.stroke();
        
        prevP = p;
    }

    // Draw Leaves
    if (depthRatio > 0.3 && branch.progress > 0.1) {
       let seed = Math.abs(branch.angle * 1000 + branch.depth * 100);
       const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
       
       let leafBaseCount = 0;
       if (depthRatio > 0.7) leafBaseCount = 10;
       else if (depthRatio > 0.4) leafBaseCount = 4;
       else leafBaseCount = 0;
       
       const leafCount = leafBaseCount + Math.floor(random() * 6);
       
         for (let i = 0; i < leafCount; i++) {
          const t = 0.1 + random() * 0.8; 
          const leafId = branch.id + '_leaf_' + i;
          
          if (branch.progress > t) {
             if (this.detachedLeaves.has(leafId)) continue;
             if (this.metrics.leaves > 1500) break; // Hard cap
             
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
             const leafAngle = finalAngle + baseOffset + extraSway + (random() - 0.5) * 0.4;
             
             const leafScaleBase = 0.5 + random() * 2.0;
             const ageScale = Math.min(1, (branch.progress - t) * 4.0);
             const leafScale = leafScaleBase * ageScale;
             
             const windEffect = Math.abs(this.targetBend);
             // Use random() which is seeded deterministically for this leaf
             const leafFallThreshold = 0.1 + random() * 0.3; // Requires high wind to fall, some never fall
             if (windEffect > leafFallThreshold && this.particles.length < 500) {
                 this.detachedLeaves.add(leafId);
                 this.particles.push({
                     id: leafId,
                     x: lx, y: ly,
                     vx: (this.targetBend * 5) + (Math.random() - 0.5) * 2,
                     vy: Math.random() * 1.5 + 0.5,
                     angle: leafAngle,
                     va: (Math.random() - 0.5) * 0.2,
                     size: leafScale * (0.9 + Math.random() * 0.5),
                     color: theme.leaves,
                     type: 'leaf',
                     grounded: false,
                     phase: Math.random() * Math.PI * 2
                 });
                 continue;
             }

             ctx.save();
             ctx.translate(lx, ly);
             ctx.rotate(leafAngle);
             ctx.scale(leafScale, leafScale);
             
             const leafW = 7 + random() * 4; 
             const leafL = 20 + random() * 10;
             
             // Base Watercolor Leaf
             ctx.beginPath();
             ctx.moveTo(0, 0);
             ctx.quadraticCurveTo(leafW, -leafW * 0.4, leafL, 0);
             ctx.quadraticCurveTo(leafW, leafW * 0.4, 0, 0);
             ctx.fillStyle = theme.leaves;
             ctx.globalAlpha = 0.85;
             ctx.fill();
             
             // Soft highlight / bleeding edge
             ctx.globalCompositeOperation = 'screen';
             ctx.fillStyle = theme.flowers; 
             ctx.globalAlpha = 0.35;
             ctx.beginPath();
             ctx.moveTo(0, 0);
             ctx.quadraticCurveTo(leafW * 0.5, -leafW * 0.2, leafL * 0.8, 0);
             ctx.quadraticCurveTo(leafW * 0.5, leafW * 0.2, 0, 0);
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
    if ((!branch.isFlower && branch.progress <= 0) || (branch.isFlower && branch.flowerProgress <= 0)) return;
    
    const currentBend = baseBend * (1 + branch.depth * 0.5);
    const finalAngle = branch.angle + currentBend;

    if (branch.isFlower && branch.flowerProgress > 0) {
      if (this.detachedLeaves.has(branch.id)) return;
      
      this.metrics.flowers++;
      
      const scale = branch.flowerProgress * GROWTH_PARAMS.flowerScale * branch.flowerSizeMult;
      const flowerRadius = 8 * scale; 
      
      const windEffect = Math.abs(this.targetBend);
      if (windEffect > 0.15 && Math.random() < 0.05 * windEffect && this.particles.length < 500) {
          this.detachedLeaves.add(branch.id);
          this.particles.push({
              id: branch.id,
              x: startX, y: startY,
              vx: (this.targetBend * 4) + (Math.random() - 0.5) * 2,
              vy: Math.random() * 1.5 + 0.5,
              angle: finalAngle,
              va: (Math.random() - 0.5) * 0.2,
              size: scale,
              color: theme.flowers,
              type: 'flower',
              grounded: false,
              phase: Math.random() * Math.PI * 2
          });
          return;
      }

      ctx.save();
      ctx.translate(startX, startY);
      
      // Watercolor glow for flower
      ctx.globalCompositeOperation = 'screen';
      ctx.shadowColor = theme.flowers;
      ctx.shadowBlur = 20 * scale;
      
      const breathe = Math.abs(baseBend) > 0.05 ? 1 + Math.sin(time * 0.003 + startX * 0.1) * 0.05 : 1;
      ctx.scale(breathe, breathe);
      
      const numPetals = 5;
      const flowerSway = (this.flowerBend - this.currentBend) * 1.5;
      
      for (let i = 0; i < numPetals; i++) {
         ctx.save();
         ctx.rotate((Math.PI * 2 / numPetals) * i + finalAngle + flowerSway);
         
         ctx.beginPath();
         ctx.moveTo(0, 0);
         ctx.quadraticCurveTo(flowerRadius * 1.2, flowerRadius * 0.8, flowerRadius * 2.2, 0);
         ctx.quadraticCurveTo(flowerRadius * 1.2, -flowerRadius * 0.8, 0, 0);
         ctx.fillStyle = theme.flowers;
         ctx.globalAlpha = 0.95;
         ctx.fill();
         
         ctx.restore();
      }
      
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(0, 0, flowerRadius * 0.3, 0, Math.PI * 2);
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
             ctx.globalAlpha = p.grounded ? 0.7 : 0.85;
             ctx.fillStyle = theme.leaves;
             const leafW = 7;
             const leafL = 20;
             ctx.beginPath();
             ctx.moveTo(0, 0);
             ctx.quadraticCurveTo(leafW, -leafW * 0.4, leafL, 0);
             ctx.quadraticCurveTo(leafW, leafW * 0.4, 0, 0);
             ctx.fill();
             
             // Soft highlight / bleeding edge
             ctx.globalCompositeOperation = 'screen';
             ctx.fillStyle = theme.flowers; 
             ctx.globalAlpha = p.grounded ? 0.2 : 0.35;
             ctx.beginPath();
             ctx.moveTo(0, 0);
             ctx.quadraticCurveTo(leafW * 0.5, -leafW * 0.2, leafL * 0.8, 0);
             ctx.quadraticCurveTo(leafW * 0.5, leafW * 0.2, 0, 0);
             ctx.fill();
          } else {
             ctx.globalAlpha = p.grounded ? 0.6 : 0.95;
             ctx.fillStyle = theme.flowers;
             const flowerRadius = 6;
             const numPetals = 5;
             for (let i = 0; i < numPetals; i++) {
                 ctx.save();
                 ctx.rotate((Math.PI * 2 / numPetals) * i);
                 ctx.beginPath();
                 ctx.moveTo(0, 0);
                 ctx.quadraticCurveTo(flowerRadius * 1.4, flowerRadius * 0.8, flowerRadius * 2.2, 0);
                 ctx.quadraticCurveTo(flowerRadius * 1.4, -flowerRadius * 0.8, 0, 0);
                 ctx.fill();
                 ctx.restore();
             }
          }
          ctx.restore();
      }
  }
}
