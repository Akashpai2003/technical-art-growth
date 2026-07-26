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
    <div className="relative w-screen h-screen overflow-hidden bg-[#060812] text-white ">
      {/* Canvas Layer */}
      <div className="absolute inset-0 z-0">
        {canvas}
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none p-8 flex flex-col justify-between">
        {/* Top Row */}
        <div className="flex justify-end items-start pointer-events-auto">
          <div>{topRight}</div>
        </div>

        {/* Middle Right */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-auto">
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
