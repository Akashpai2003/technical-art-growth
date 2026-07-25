import { ReactNode } from 'react';

interface PageLayoutProps {
  topLeft: ReactNode;
  topRight: ReactNode;
  rightSidebar: ReactNode;
  bottomLeft: ReactNode;
  bottomCenter: ReactNode;
  canvas: ReactNode;
}

export function PageLayout({
  topLeft,
  topRight,
  rightSidebar,
  bottomLeft,
  bottomCenter,
  canvas
}: PageLayoutProps) {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[var(--color-base)] text-[var(--color-text)]">
      {/* Canvas Layer - Background */}
      <div className="absolute inset-0 z-0">
        {canvas}
      </div>

      {/* UI Layer - Foreground */}
      <div className="absolute inset-0 z-10 pointer-events-none p-10 flex flex-col justify-between">
        {/* Top Row */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="max-w-[300px]">{topLeft}</div>
          <div>{topRight}</div>
        </div>

        {/* Bottom Row */}
        <div className="flex justify-between items-end pointer-events-auto">
          <div className="flex items-end gap-10">
            {bottomLeft}
            <div className="mb-4 max-w-[250px]">{bottomCenter}</div>
          </div>
          <div>{rightSidebar}</div>
        </div>
      </div>
    </div>
  );
}
