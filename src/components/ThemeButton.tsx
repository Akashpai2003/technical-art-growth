interface ThemeButtonProps {
  isActive?: boolean;
  color1: string;
  color2: string;
}

export function ThemeButton({ isActive, color1, color2 }: ThemeButtonProps) {
  return (
    <button 
      className={`w-10 h-10 rounded-full border ${isActive ? 'border-[var(--color-text)]' : 'border-transparent'} overflow-hidden flex p-0 m-0 cursor-pointer hover:opacity-80 transition-opacity`}
      aria-label="Select theme"
    >
      <div className="flex-1 h-full" style={{ backgroundColor: color1 }}></div>
      <div className="flex-1 h-full" style={{ backgroundColor: color2 }}></div>
    </button>
  );
}
