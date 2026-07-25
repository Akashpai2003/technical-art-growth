import { ThemeButton } from './ThemeButton';

export interface ThemeConfig {
  name: string;
  background: string; // Used for UI backgrounds if needed
  tree: string; // Tree
  leaves: string; // Leaves
  flowers: string; // Flowers
  backgroundColor: string; // Shader bg
  fogColor: string; // Shader fog
  hazeIntensity: number;
  ditherColor: string;
  glowColor: string;
}

export const THEMES: ThemeConfig[] = [
  { name: "Moon Bloom", background: "#060812", tree: "#f6f4ff", leaves: "#cdd1db", flowers: "#ffffff", backgroundColor: "#060812", fogColor: "#141b2d", hazeIntensity: 0.85, ditherColor: "#1a233a", glowColor: "#d8d6ff" },
  { name: "Lavender Mist", background: "#0f1020", tree: "#f1e9ff", leaves: "#d2c9e6", flowers: "#fff8ff", backgroundColor: "#0f1020", fogColor: "#2a2f48", hazeIntensity: 0.9, ditherColor: "#353a5c", glowColor: "#c9b6ff" },
  { name: "Ocean Dream", background: "#05121c", tree: "#dff9ff", leaves: "#a5d2e6", flowers: "#ffffff", backgroundColor: "#05121c", fogColor: "#123449", hazeIntensity: 0.85, ditherColor: "#17435e", glowColor: "#8fdfff" },
  { name: "Forest Spirit", background: "#07120c", tree: "#dfffdc", leaves: "#9fcc9f", flowers: "#ffffff", backgroundColor: "#07120c", fogColor: "#163022", hazeIntensity: 0.9, ditherColor: "#1d402d", glowColor: "#9dffb8" },
  { name: "Amber Glow", background: "#140d06", tree: "#fff4d2", leaves: "#cca15a", flowers: "#fffef7", backgroundColor: "#140d06", fogColor: "#312012", hazeIntensity: 0.8, ditherColor: "#422c19", glowColor: "#ffd68a" }
];

interface ThemeSelectorProps {
  activeTheme: ThemeConfig;
  onSelectTheme: (theme: ThemeConfig) => void;
}

export function ThemeSelector({ activeTheme, onSelectTheme }: ThemeSelectorProps) {
  return (
    <div className="flex items-end gap-6">
      <div className="flex flex-col gap-4">
        {THEMES.map(theme => (
          <div key={theme.name} onClick={() => onSelectTheme(theme)}>
            <ThemeButton color1={theme.tree} color2={theme.flowers} isActive={theme.name === activeTheme.name} />
          </div>
        ))}
      </div>
    </div>
  );
}
