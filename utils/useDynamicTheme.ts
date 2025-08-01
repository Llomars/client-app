// app/utils/useDynamicTheme.ts

export default function useDynamicTheme() {
  const localHour = new Date().getUTCHours() + 4; // UTC+4 pour La Réunion
  const hour = localHour >= 24 ? localHour - 24 : localHour;

  let theme = "light";
  if (hour >= 21 || hour < 6) {
    theme = "dark";
  } else if (hour >= 18) {
    theme = "twilight";
  }

  return {
    isDark: theme === "dark",
    isTwilight: theme === "twilight",
    theme,
  };
}
