import { ThemeButton } from './ThemeButton';

export interface ThemeConfig {
  name: string;
  background: string;
  tree: string;
  leaves: string;
  flowers: string;
  backgroundColor: string;
  fogColor: string;
  hazeIntensity: number;
  ditherColor: string;
  glowColor: string;
}

export const THEMES: ThemeConfig[] = [
  { name: "Blue", background: "#05121c", tree: "#dce6f0", leaves: "#a5d2e6", flowers: "#1d4ed8", backgroundColor: "#05121c", fogColor: "#123449", hazeIntensity: 0.85, ditherColor: "#17435e", glowColor: "#3b82f6" },
  { name: "Red", background: "#1a0b12", tree: "#ffebf5", leaves: "#ffb3b3", flowers: "#be185d", backgroundColor: "#1a0b12", fogColor: "#3d192a", hazeIntensity: 0.85, ditherColor: "#4f2338", glowColor: "#ef4444" },
  { name: "Yellow", background: "#171206", tree: "#ffecd9", leaves: "#ffea75", flowers: "#ca8a04", backgroundColor: "#171206", fogColor: "#38250f", hazeIntensity: 0.85, ditherColor: "#4d3a1e", glowColor: "#eab308" },
  { name: "Green", background: "#07120c", tree: "#dfffdc", leaves: "#9fcc9f", flowers: "#15803d", backgroundColor: "#07120c", fogColor: "#163022", hazeIntensity: 0.9, ditherColor: "#1d402d", glowColor: "#22c55e" }
];

interface ThemeSelectorProps {
  activeTheme: ThemeConfig;
  onSelectTheme: (theme: ThemeConfig) => void;
}

export function ThemeSelector({ activeTheme, onSelectTheme }: ThemeSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-4 pr-2">
      {THEMES.map(theme => (
        <button
          key={theme.name}
          onClick={() => onSelectTheme(theme)}
          className={"w-6 h-6 rounded-full cursor-pointer transition-all " + (theme.name === activeTheme.name ? 'scale-110 outline outline-2 outline-offset-4 outline-white/15' : 'opacity-70 hover:opacity-100')}
          style={{ backgroundColor: theme.glowColor }}
          title={theme.name}
        />
      ))}
    </div>
  );
}
