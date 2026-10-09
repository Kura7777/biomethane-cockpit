export interface PlantDrawerTheme {
  bg: string;
  bgHeader: string;
  bgCard: string;
  bgCardSubtle: string;
  bgSunken: string;
  border: string;
  borderLight: string;
  textMain: string;
  textSecondary: string;
  textMuted: string;
  btnBg: string;
  btnBorder: string;
  btnText: string;
}

export function getPlantDrawerTheme(isDark: boolean): PlantDrawerTheme {
  return {
    bg: isDark ? '#0f172a' : '#ffffff',
    bgHeader: isDark ? '#1e293b' : '#f8fafc',
    bgCard: isDark ? '#0f172a' : '#ffffff',
    bgCardSubtle: isDark ? '#1e293b' : '#f8fafc',
    bgSunken: isDark ? '#020617' : '#f1f5f9',
    border: isDark ? '#334155' : '#e2e8f0',
    borderLight: isDark ? '#1e293b' : '#e2e8f0',
    textMain: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? '#cbd5e1' : '#334155',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    btnBg: isDark ? '#1e293b' : '#f1f5f9',
    btnBorder: isDark ? '#334155' : '#cbd5e1',
    btnText: isDark ? '#94a3b8' : '#475569',
  };
}
