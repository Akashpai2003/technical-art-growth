import { ThemeConfig } from '../components/ThemeSelector';

export const GROWTH_PARAMS = {
  branchLength: 95,
  branchAngle: 0.48,
  splitProbability: 0.85,
  flowerDensity: 0.65,
  flowerScale: 1.3,
  maxDepth: 8
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
}

export class FlowerEngine {
  root: Branch | null = null;
  canvasWidth: number = 0;
  canvasHeight: number = 0;
  
  // Dynamic parameters controlled by gestures
  growthSpeed: number = 0;
  windStrength: number = 0;
  windDirection: number = 1;
  
  // Overall stage of tree development (0.0 to 1.0)
  overallProgress: number = 0;

  init(w: number, h: number) {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.reset();
  }

  reset() {
    this.overallProgress = 0;
    this.root = {
      id: 'root',
      angle: -Math.PI / 2, // straight up
      length: GROWTH_PARAMS.branchLength * 1.6,
      depth: 0,
      progress: 0,
      children: [],
      isFlower: false,
      flowerProgress: 0,
      curvature: (Math.random() - 0.5) * 0.15,
      flowerSizeMult: 1,
      thicknessMult: 1.3
    };
  }

  update(time: number) {
    if (!this.root) return;

    // Advance overall progress when left hand is growing the plant
    if (this.growthSpeed > 0) {
      this.overallProgress = Math.min(1.0, this.overallProgress + this.growthSpeed * 0.08);
    }

    this._updateBranch(this.root, time);
  }

  _updateBranch(branch: Branch, time: number) {
    // Determine max allowed depth based on biological stage (0-15%, 15-35%, 35-60%, 60-80%, 80-100%)
    let maxAllowedDepth = 0;
    if (this.overallProgress < 0.15) {
      maxAllowedDepth = 0; // Seedling stage: trunk only
    } else if (this.overallProgress < 0.35) {
      maxAllowedDepth = 2; // Primary branch emergence
    } else if (this.overallProgress < 0.60) {
      maxAllowedDepth = 4; // Secondary branch expansion
    } else if (this.overallProgress < 0.80) {
      maxAllowedDepth = 6; // Canopy formation
    } else {
      maxAllowedDepth = GROWTH_PARAMS.maxDepth; // Full bloom maturity
    }

    // Individual branch growth speed
    if (branch.progress < 1) {
      const growthRate = Math.max(0.01, this.growthSpeed * 2.5);
      branch.progress += growthRate;
      if (branch.progress > 1) branch.progress = 1;
    } else {
      if (branch.isFlower) {
        if (branch.flowerProgress < 1) {
          let seed = branch.angle * 1000;
          let randomBloomMult = 0.6 + Math.abs(seed % 100) / 100;
          branch.flowerProgress += Math.max(0.01, this.growthSpeed * 2.0 * randomBloomMult);
          if (branch.flowerProgress > 1) branch.flowerProgress = 1;
        }
      } else {
        // Spawn children if branch is fully extended and max depth allows
        if (branch.children.length === 0 && branch.depth < maxAllowedDepth) {
          const depthRatio = branch.depth / GROWTH_PARAMS.maxDepth;
          let currentSplitProb = 0.5;
          
          if (branch.depth === 0) {
            currentSplitProb = 0.2; // Trunk focus
          } else if (depthRatio < 0.4) {
            currentSplitProb = 0.65;
          } else {
            currentSplitProb = 0.9; // Canopy density
          }
          
          const splits = Math.random() < currentSplitProb ? 2 : 1;
          
          // Flower clusters only begin after 70% overall progress
          const isTerminal = branch.depth >= maxAllowedDepth - 1 || branch.depth >= GROWTH_PARAMS.maxDepth - 1;
          const allowFlowers = this.overallProgress >= 0.70 && branch.depth >= 4;
          
          if (allowFlowers && (isTerminal || Math.random() < GROWTH_PARAMS.flowerDensity)) {
            // Dense Botanical Flower Cluster (3 to 6 flowers)
            const numFlowers = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < numFlowers; i++) {
              branch.children.push({
                id: Math.random().toString(),
                angle: branch.angle + (Math.random() - 0.5) * 1.4,
                length: 0,
                depth: branch.depth + 1,
                progress: 1,
                children: [],
                isFlower: true,
                flowerProgress: 0,
                curvature: 0,
                flowerSizeMult: 0.6 + Math.random() * 0.7,
                thicknessMult: 1
              });
            }
            // Add short leafy twig around flowers
            if (Math.random() < 0.7) {
              branch.children.push({
                id: Math.random().toString(),
                angle: branch.angle + (Math.random() - 0.5) * 0.6,
                length: GROWTH_PARAMS.branchLength * 0.35 * Math.pow(0.85, branch.depth),
                depth: branch.depth + 1,
                progress: 0,
                children: [],
                isFlower: false,
                flowerProgress: 0,
                curvature: (Math.random() - 0.5) * 0.4,
                flowerSizeMult: 1,
                thicknessMult: 0.5
              });
            }
          } else {
            // Structural Branches
            const spread = GROWTH_PARAMS.branchAngle + (Math.random() * 0.2 - 0.1);
            const len = GROWTH_PARAMS.branchLength * (0.7 + Math.random() * 0.4) * Math.pow(0.85, branch.depth);
            
            if (splits === 1) {
              const dir = Math.random() > 0.5 ? 1 : -1;
              branch.children.push({
                id: Math.random().toString(),
                angle: branch.angle + dir * spread * 0.4,
                length: len * 1.15,
                depth: branch.depth + 1,
                progress: 0,
                children: [],
                isFlower: false,
                flowerProgress: 0,
                curvature: (Math.random() - 0.5) * 0.4,
                flowerSizeMult: 1,
                thicknessMult: 0.8 + Math.random() * 0.3
              });
            } else {
              branch.children.push({
                id: Math.random().toString(),
                angle: branch.angle - spread + (Math.random() * 0.2 - 0.1),
                length: len,
                depth: branch.depth + 1,
                progress: 0,
                children: [],
                isFlower: false,
                flowerProgress: 0,
                curvature: (Math.random() - 0.5) * 0.3,
                flowerSizeMult: 1,
                thicknessMult: 0.7 + Math.random() * 0.3
              });
              branch.children.push({
                id: Math.random().toString(),
                angle: branch.angle + spread + (Math.random() * 0.2 - 0.1),
                length: len,
                depth: branch.depth + 1,
                progress: 0,
                children: [],
                isFlower: false,
                flowerProgress: 0,
                curvature: (Math.random() - 0.5) * 0.3,
                flowerSizeMult: 1,
                thicknessMult: 0.7 + Math.random() * 0.3
              });
            }
          }
        }
      }
    }
    
    for (const child of branch.children) {
      this._updateBranch(child, time);
    }
  }

  draw(ctx: CanvasRenderingContext2D, theme: ThemeConfig, time: number) {
    if (!this.root) return;
    
    // Subtle ambient breathing motion
    const treeBreathe = Math.sin(time * 0.0006) * 0.015;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 1. Draw structural branches and leaves
    this._drawBranch(ctx, this.root, this.canvasWidth / 2, this.canvasHeight, 0, theme, time, treeBreathe);
    
    // 2. Draw flowers overlay
    this._drawFlowers(ctx, this.root, this.canvasWidth / 2, this.canvasHeight, 0, theme, time, treeBreathe);
  }

  _drawBranch(
    ctx: CanvasRenderingContext2D, 
    branch: Branch, 
    startX: number, 
    startY: number, 
    accumulatedWind: number, 
    theme: ThemeConfig, 
    time: number,
    treeBreathe: number
  ) {
    if (branch.progress <= 0 || branch.isFlower) return;

    // Wind physics: normalized wind ratio (0.0 to 1.0) and direction
    const normWind = Math.min(1.0, this.windStrength / 0.4);
    const windDir = this.windDirection;
    const baseWindForce = normWind * windDir;

    // Per-depth flexibility: trunk is stable (0.03), canopy is highly flexible (0.35+)
    const depthRatio = branch.depth / GROWTH_PARAMS.maxDepth;
    const flexibility = 0.03 + Math.pow(depthRatio, 1.3) * 0.32;

    // Elastic spring damping propagation
    const phaseLag = branch.depth * 0.55;
    const springOsc = Math.sin(time * 0.005 - phaseLag) * normWind * 0.08 * flexibility;
    
    const localWindAngle = baseWindForce * flexibility + springOsc + treeBreathe;
    const currentAccumulatedWind = accumulatedWind + localWindAngle;
    const finalAngle = branch.angle + currentAccumulatedWind;

    const currentLength = branch.length * branch.progress;
    const endX = startX + Math.cos(finalAngle) * currentLength;
    const endY = startY + Math.sin(finalAngle) * currentLength;
    
    const cpX = startX + Math.cos(finalAngle + branch.curvature) * currentLength * 0.5;
    const cpY = startY + Math.sin(finalAngle + branch.curvature) * currentLength * 0.5;

    // Atmospheric depth mapping
    const opacity = Math.max(0.4, 1.0 - Math.pow(depthRatio, 1.5) * 0.55);
    const blurAmount = Math.pow(depthRatio, 2.5) * 5.0; 
    const baseWidth = Math.max(0.7, (GROWTH_PARAMS.maxDepth - branch.depth) * 1.6 * branch.thicknessMult);

    // 1. Volumetric Scatter Glow
    ctx.globalCompositeOperation = 'screen';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.strokeStyle = theme.glowColor;
    ctx.lineWidth = baseWidth * 5.5;
    ctx.globalAlpha = opacity * 0.15 * (1.0 - depthRatio * 0.4);
    ctx.filter = `blur(${blurAmount + 7}px)`;
    ctx.stroke();

    // 2. Focused Subsurface Glow
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.lineWidth = baseWidth * 2.3;
    ctx.globalAlpha = opacity * 0.25;
    ctx.filter = `blur(${blurAmount + 3}px)`;
    ctx.stroke();
    
    ctx.globalCompositeOperation = 'source-over';

    // 3. Main Botanical Branch
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.strokeStyle = theme.tree;
    ctx.lineWidth = baseWidth;
    ctx.globalAlpha = opacity * 0.95;
    ctx.filter = `blur(${blurAmount + 0.3}px)`;
    ctx.stroke();

    // -------------------------------------------------------------
    // Biological Leaf Generation Rules
    // -------------------------------------------------------------
    // Stage 1 (0-15%): No leaves
    // Stage 2 (15-35%): Individual leaves near newest growth
    // Stage 3 (35-60%): Small leaf clusters
    // Stage 4 (60-80%): Rich canopy foliage
    // Stage 5 (80-100%): Abundant botanical foliage
    if (this.overallProgress >= 0.15 && depthRatio > 0.15 && branch.progress > 0.15) {
       let seed = Math.abs(branch.angle * 1000 + branch.depth * 100);
       const random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
       
       let leafCount = 0;
       if (this.overallProgress < 0.35) {
          leafCount = 1 + Math.floor(random() * 2); // 1 to 2 individual leaves
       } else if (this.overallProgress < 0.60) {
          leafCount = 2 + Math.floor(random() * 3); // Small clusters
       } else if (this.overallProgress < 0.80) {
          leafCount = 4 + Math.floor(random() * 3); // Rich foliage
       } else {
          leafCount = 5 + Math.floor(random() * 4); // Abundant lush foliage
       }

       // Higher depth branches (younger branches) get more leaves than trunk/main boughs
       const depthFoliageMult = Math.min(1.5, Math.pow(depthRatio, 0.8) * 1.5);
       leafCount = Math.floor(leafCount * depthFoliageMult);

       for (let i = 0; i < leafCount; i++) {
          const t = 0.15 + random() * 0.75; // Position along branch
          if (branch.progress > t) {
             const lx = startX + (endX - startX) * t;
             const ly = startY + (endY - startY) * t;
             
             // Independent leaf flutter physics
             const leafFlutter = Math.sin(time * 0.012 + seed + i) * normWind * 0.35;
             const baseOffset = (random() > 0.5 ? 1 : -1) * (0.35 + random() * 0.6);
             const leafAngle = finalAngle + baseOffset + leafFlutter;
             
             ctx.save();
             ctx.translate(lx, ly);
             ctx.rotate(leafAngle);
             
             // Leaf shape
             ctx.beginPath();
             ctx.moveTo(0, 0);
             const leafW = 3.5 + random() * 4;
             const leafL = 7 + random() * 6;
             ctx.quadraticCurveTo(leafW, -leafW * 0.5, leafL, 0);
             ctx.quadraticCurveTo(leafW, leafW * 0.5, 0, 0);
             
             ctx.fillStyle = theme.leaves;
             const leafScale = Math.min(1, (branch.progress - t) * 3.0);
             ctx.scale(leafScale, leafScale);
             
             // Leaf core
             ctx.globalCompositeOperation = 'source-over';
             ctx.globalAlpha = Math.max(0.35, opacity * 0.88);
             ctx.filter = `blur(${blurAmount + 0.4}px)`;
             ctx.fill();
             
             // Leaf subsurface scatter
             ctx.globalCompositeOperation = 'screen';
             ctx.globalAlpha = Math.max(0.08, opacity * 0.22);
             ctx.filter = `blur(${blurAmount + 2.2}px)`;
             ctx.fill();
             
             ctx.restore();
          }
       }
    }
    
    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;

    if (branch.progress >= 1) {
       for (const child of branch.children) {
         this._drawBranch(ctx, child, endX, endY, currentAccumulatedWind, theme, time, treeBreathe);
       }
    }
  }
  
  _drawFlowers(
    ctx: CanvasRenderingContext2D, 
    branch: Branch, 
    startX: number, 
    startY: number, 
    accumulatedWind: number, 
    theme: ThemeConfig, 
    time: number,
    treeBreathe: number
  ) {
    if (branch.progress <= 0 || this.overallProgress < 0.70) return;

    // Wind physics for flowers
    const normWind = Math.min(1.0, this.windStrength / 0.4);
    const windDir = this.windDirection;
    const baseWindForce = normWind * windDir;

    const depthRatio = branch.depth / GROWTH_PARAMS.maxDepth;
    const flexibility = 0.03 + Math.pow(depthRatio, 1.3) * 0.32;
    const phaseLag = branch.depth * 0.55;
    
    // Delayed elastic flower sway
    const flowerLag = Math.sin(time * 0.006 - phaseLag) * normWind * 0.18;
    const localWindAngle = baseWindForce * flexibility + flowerLag + treeBreathe;
    const currentAccumulatedWind = accumulatedWind + localWindAngle;
    const finalAngle = branch.angle + currentAccumulatedWind;

    const currentLength = branch.length * branch.progress;
    const endX = startX + Math.cos(finalAngle) * currentLength;
    const endY = startY + Math.sin(finalAngle) * currentLength;

    if (branch.isFlower && branch.flowerProgress > 0) {
      // Bloom progress scales as overallProgress moves from 0.70 to 1.00
      const bloomStageFactor = Math.max(0, Math.min(1, (this.overallProgress - 0.70) / 0.30));
      const activeFlowerProgress = branch.flowerProgress * bloomStageFactor;

      if (activeFlowerProgress > 0) {
        const scale = activeFlowerProgress * GROWTH_PARAMS.flowerScale * branch.flowerSizeMult;
        const flowerRadius = 5.5 * scale;
        
        ctx.save();
        ctx.translate(startX, startY);
        
        // Gentle flower breathe pulse
        const breathe = 1 + Math.sin(time * 0.0018 + startX * 0.1) * 0.07;
        ctx.scale(breathe, breathe);

        const blurAmount = Math.pow(depthRatio, 2.5) * 5.0;
        const opacity = Math.max(0.4, 1.0 - Math.pow(depthRatio, 1.5) * 0.55);

        ctx.globalCompositeOperation = 'screen';
        
        // 1. Ethereal Scatter Halo
        ctx.beginPath();
        ctx.arc(0, 0, flowerRadius * 4.2, 0, Math.PI * 2);
        ctx.fillStyle = theme.glowColor;
        ctx.globalAlpha = opacity * 0.22;
        ctx.filter = `blur(${7 + blurAmount}px)`;
        ctx.fill();

        // 2. Focused Subsurface Bloom
        ctx.beginPath();
        ctx.arc(0, 0, flowerRadius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = theme.glowColor;
        ctx.globalAlpha = opacity * 0.42;
        ctx.filter = `blur(${3.5 + blurAmount}px)`;
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.max(0.5, opacity);
        ctx.filter = `blur(${blurAmount + 0.4}px)`;

        // 3. Multi-Petal Blossom
        ctx.fillStyle = theme.flowers;
        const numPetals = 5;
        for (let i = 0; i < numPetals; i++) {
           ctx.save();
           ctx.rotate((Math.PI * 2 / numPetals) * i + branch.angle);
           ctx.beginPath();
           ctx.moveTo(0, 0);
           ctx.quadraticCurveTo(flowerRadius * 1.5, flowerRadius * 0.8, flowerRadius * 2.5, 0);
           ctx.quadraticCurveTo(flowerRadius * 1.5, -flowerRadius * 0.8, 0, 0);
           ctx.fill();
           ctx.restore();
        }
        
        // 4. Center Core
        ctx.beginPath();
        ctx.arc(0, 0, flowerRadius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = theme.tree;
        ctx.globalAlpha = opacity * 0.95;
        ctx.fill();

        ctx.restore();
      }
    } else if (branch.progress >= 1 && !branch.isFlower) {
       for (const child of branch.children) {
         this._drawFlowers(ctx, child, endX, endY, currentAccumulatedWind, theme, time, treeBreathe);
       }
    }
  }
}
