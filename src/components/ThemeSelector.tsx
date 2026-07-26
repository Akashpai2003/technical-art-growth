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
  { name: "Moon Bloom", background: "#060812", tree: "#f6f4ff", leaves: "#cdd1db", flowers: "#ffffff", backgroundColor: "#060812", fogColor: "#141b2d", hazeIntensity: 0.85, ditherColor: "#1a233a", glowColor: "#d8d6ff" },
  { name: "Lavender Mist", background: "#0f1020", tree: "#f1e9ff", leaves: "#d2c9e6", flowers: "#fff8ff", backgroundColor: "#0f1020", fogColor: "#2a2f48", hazeIntensity: 0.9, ditherColor: "#353a5c", glowColor: "#c9b6ff" },
  { name: "Ocean Dream", background: "#05121c", tree: "#dff9ff", leaves: "#a5d2e6", flowers: "#ffffff", backgroundColor: "#05121c", fogColor: "#123449", hazeIntensity: 0.85, ditherColor: "#17435e", glowColor: "#8fdfff" },
  { name: "Forest Spirit", background: "#07120c", tree: "#dfffdc", leaves: "#9fcc9f", flowers: "#ffffff", backgroundColor: "#07120c", fogColor: "#163022", hazeIntensity: 0.9, ditherColor: "#1d402d", glowColor: "#9dffb8" },
  { name: "Amber Glow", background: "#140d06", tree: "#fff4d2", leaves: "#cca15a", flowers: "#fffef7", backgroundColor: "#140d06", fogColor: "#312012", hazeIntensity: 0.8, ditherColor: "#422c19", glowColor: "#ffd68a" },
  { name: "Dusty Rose", background: "#1a1215", tree: "#ffe3ea", leaves: "#b39c9c", flowers: "#ffffff", backgroundColor: "#1a1215", fogColor: "#3d272d", hazeIntensity: 0.85, ditherColor: "#473037", glowColor: "#ffc2ce" },
  { name: "Golden Sunset", background: "#171206", tree: "#ffecd9", leaves: "#ccaa44", flowers: "#ffffff", backgroundColor: "#171206", fogColor: "#38250f", hazeIntensity: 0.85, ditherColor: "#4d3a1e", glowColor: "#ffb459" },
  { name: "Blossom Pink", background: "#1a0b12", tree: "#ffebf5", leaves: "#d1a3ba", flowers: "#ffffff", backgroundColor: "#1a0b12", fogColor: "#3d192a", hazeIntensity: 0.85, ditherColor: "#4f2338", glowColor: "#ff9bc7" }
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
          className={"w-6 h-6 rounded-full cursor-pointer transition-transform " + (theme.name === activeTheme.name ? 'scale-125 ring-2 ring-white/50 ring-offset-2 ring-offset-transparent' : 'opacity-70 hover:opacity-100')}
          style={{ backgroundColor: theme.glowColor }}
          title={theme.name}
        />
      ))}
    </div>
  );
}
