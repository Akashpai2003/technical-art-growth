import { useState, useRef } from 'react';
import { PageLayout } from './components/PageLayout';
import { CanvasContainer } from './components/CanvasContainer';
import { InformationPanel } from './components/InformationPanel';
import { ThemeSelector, THEMES } from './components/ThemeSelector';
import { HandVisualization } from './components/HandVisualization';
import { useHandTracking } from './hooks/useHandTracking';

export default function App() {
  const trackingState = useHandTracking();
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [growthValue, setGrowthValue] = useState(0);
  const [windValue, setWindValue] = useState(0);

  const normalizedGrowth = growthValue;
  const normalizedWind = windValue;

  const indicators = (
    <div className="flex items-center gap-10">
      <div className="flex flex-col gap-2 w-[200px]">
        <div className="text-[14px] text-[var(--color-text)] tracking-wide">Growth</div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-[6px] bg-[var(--color-border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-400 transition-all duration-75 ease-out" 
              style={{ width: `${normalizedGrowth * 100}%` }}
            />
          </div>
          <div className="w-10 text-[14px] text-green-400">
            {Math.round(normalizedGrowth * 100)}%
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 w-[200px]">
        <div className="text-[14px] text-[var(--color-text)] tracking-wide">Wind</div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-[6px] bg-[var(--color-border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-400 transition-all duration-75 ease-out" 
              style={{ width: `${normalizedWind * 100}%` }}
            />
          </div>
          <div className="w-10 text-[14px] text-blue-400">
            {Math.round(normalizedWind * 100)}%
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      canvas={<CanvasContainer trackingState={trackingState} theme={activeTheme} onInteractionUpdate={(g, w) => { setGrowthValue(g); setWindValue(w); }} />}
      topLeft={indicators}
      topRight={<InformationPanel trackingState={trackingState} />}
      bottomLeft={<HandVisualization trackingState={trackingState} />}
      bottomCenter={null}
      rightSidebar={<ThemeSelector activeTheme={activeTheme} onSelectTheme={setActiveTheme} />}
    />
  );
}
