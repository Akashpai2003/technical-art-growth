import { useState } from 'react';
import { PageLayout } from './components/PageLayout';
import { CanvasContainer, Metrics } from './components/CanvasContainer';
import { InfoButton, StatsPanel } from './components/InformationPanel';
import { ThemeSelector, THEMES } from './components/ThemeSelector';
import { HandVisualization } from './components/HandVisualization';
import { useHandTracking } from './hooks/useHandTracking';
import { IntroScreen } from './components/IntroScreen';

export default function App() {
  const trackingState = useHandTracking();
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);
  const [growthValue, setGrowthValue] = useState(0);
  const [bendValue, setBendValue] = useState(0);
  const [metrics, setMetrics] = useState<Metrics>({ branches: 0, leaves: 0, flowers: 0 });
  const [showIntro, setShowIntro] = useState(true);

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
      
      <div className="flex flex-col gap-6">
         <div className="flex flex-col gap-2 w-32">
            <span className="text-white text-sm tracking-wide">growth</span>
            <div className="w-full h-[3px] bg-white/30 relative">
               <div className="absolute left-0 top-0 bottom-0 bg-white" style={{width: (normalizedGrowth * 100) + '%'}} />
            </div>
         </div>
         <div className="flex flex-col gap-2 w-32">
            <span className="text-white text-sm tracking-wide">wind</span>
            <div className="w-full h-[3px] bg-white/30 relative">
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
    <>
      {showIntro && <IntroScreen onStart={() => setShowIntro(false)} />}
      <PageLayout
        canvas={
          <CanvasContainer 
            trackingState={trackingState} 
            theme={activeTheme} 
            onInteractionUpdate={(g, b) => { setGrowthValue(g); setBendValue(b); }}
            onMetricsUpdate={setMetrics}
          />
        }
        topLeft={
          <StatsPanel trackingState={trackingState} metrics={metrics} />
        }
        topRight={
          <InfoButton />
        }
        rightSidebar={null}
        bottomLeft={bottomLeft}
        bottomRight={
          <ThemeSelector activeTheme={activeTheme} onSelectTheme={setActiveTheme} />
        }
        bottomCenter={null}
      />
    </>
  );
}
