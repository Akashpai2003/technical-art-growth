import fs from 'fs';
const code = fs.readFileSync('src/engine/FlowerEngine.ts', 'utf8');

const regex = /  _updateBranch\(branch: Branch, time: number\) \{[\s\S]*?  \}/;

const newCode = `  _updateBranch(branch: Branch, time: number) {
    if (branch.children.length === 0 && branch.depth < GROWTH_PARAMS.maxDepth && !branch.isFlower) {
      const depthRatio = branch.depth / GROWTH_PARAMS.maxDepth;
      
      let maxSplits = 3;
      if (depthRatio > 0.7) maxSplits = 2;
      
      const splits = 1 + Math.floor(Math.random() * maxSplits);
      const spread = GROWTH_PARAMS.branchAngle + (Math.random() * 0.4 - 0.2);
      
      for (let i = 0; i < splits; i++) {
         const pos = 0.4 + Math.random() * 0.6;
         const len = GROWTH_PARAMS.branchLength * (0.6 + Math.random() * 0.6) * Math.pow(0.85, branch.depth);
         const angleOffset = (Math.random() - 0.5) * spread * 2.5;
         
         branch.children.push({
             id: Math.random().toString(),
             angle: branch.angle + angleOffset,
             length: len,
             depth: branch.depth + 1,
             progress: 0,
             children: [],
             isFlower: false,
             flowerProgress: 0,
             curvature: (Math.random() - 0.5) * 0.6,
             flowerSizeMult: 1,
             thicknessMult: 0.6 + Math.random() * 0.5,
             parentPos: pos
         });
      }

      let flowerChance = 0;
      if (depthRatio >= 0.8) flowerChance = GROWTH_PARAMS.flowerDensity * 1.5;
      else if (depthRatio >= 0.5) flowerChance = GROWTH_PARAMS.flowerDensity * 0.5;
      
      const isTerminal = branch.depth >= GROWTH_PARAMS.maxDepth - 1;
      
      if (isTerminal || Math.random() < flowerChance) {
         const numFlowers = 2 + Math.floor(Math.random() * 5);
         for (let i = 0; i < numFlowers; i++) {
            branch.children.push({
               id: Math.random().toString(),
               angle: branch.angle + (Math.random() - 0.5) * 1.5,
               length: 0,
               depth: branch.depth + 1,
               progress: 1,
               children: [],
               isFlower: true,
               flowerProgress: 0,
               curvature: 0,
               flowerSizeMult: 0.6 + Math.random() * 0.8,
               thicknessMult: 1,
               parentPos: 0.8 + Math.random() * 0.2
            });
         }
      }
    }

    if (branch.progress < 1 && !branch.isFlower) {
      branch.progress += this.growthSpeed;
      if (branch.progress > 1) branch.progress = 1;
    }

    if (branch.isFlower && branch.progress >= 1) {
       if (branch.flowerProgress < 1) {
          let seed = branch.angle * 1000;
          let randomBloomMult = 0.5 + Math.abs(seed % 100) / 100;
          branch.flowerProgress += this.growthSpeed * 1.5 * randomBloomMult;
          if (branch.flowerProgress > 1) branch.flowerProgress = 1;
       }
    }

    for (const child of branch.children) {
      if (branch.progress >= child.parentPos) {
         this._updateBranch(child, time);
      }
    }
  }`;

const result = code.replace(regex, newCode);
fs.writeFileSync('src/engine/FlowerEngine.ts', result);
console.log('done');
