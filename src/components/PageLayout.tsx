import { ReactNode } from 'react';

interface PageLayoutProps {
  topLeft?: ReactNode;
  topRight?: ReactNode;
  rightSidebar?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
  bottomCenter?: ReactNode;
  canvas: ReactNode;
}

export function PageLayout({
  topLeft,
  topRight,
  rightSidebar,
  bottomLeft,
  bottomRight,
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
        <div className="flex justify-between items-start w-full relative">
          <div className="pointer-events-auto">{topLeft}</div>
          <div className="pointer-events-auto">{topRight}</div>
        </div>

        {/* Middle Right */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-auto">
          {rightSidebar}
        </div>

        {/* Bottom Row */}
        <div className="flex justify-between items-end w-full relative">
          <div className="flex flex-col gap-6 pointer-events-auto">
            {bottomLeft}
          </div>
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 pointer-events-auto">
            {bottomCenter}
          </div>
          <div className="pointer-events-auto">
            {bottomRight}
          </div>
        </div>
      </div>
    </div>
  );
}
