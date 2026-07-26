import { ReactNode } from 'react';

interface PageLayoutProps {
  topRight: ReactNode;
  rightSidebar: ReactNode;
  bottomLeft: ReactNode;
  bottomCenter: ReactNode;
  canvas: ReactNode;
}

export function PageLayout({
  topRight,
  rightSidebar,
  bottomLeft,
  bottomCenter,
  canvas
}: PageLayoutProps) {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060812] text-white font-sans">
      {/* Canvas Layer */}
      <div className="absolute inset-0 z-0">
        {canvas}
      </div>

      {/* Film Grain Layer */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none opacity-[0.25] mix-blend-overlay" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} 
      />

      {/* UI Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none p-8 flex flex-col justify-between">
        {/* Top Row */}
        <div className="flex justify-end items-start pointer-events-auto">
          <div>{topRight}</div>
        </div>

        {/* Middle Right - shifted down for spacing */}
        <div className="absolute right-8 top-[65%] -translate-y-1/2 pointer-events-auto">
          {rightSidebar}
        </div>

        {/* Bottom Row */}
        <div className="flex justify-between items-end pointer-events-auto w-full relative">
          <div className="flex flex-col gap-6">
            {bottomLeft}
          </div>
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
            {bottomCenter}
          </div>
        </div>
      </div>
    </div>
  );
}
