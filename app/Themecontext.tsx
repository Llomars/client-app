import React, { createContext, useContext } from "react";

const getTheme = () => {
  const localHour = new Date().getUTCHours() + 4; // UTC+4 pour La Réunion
  const hour = localHour >= 24 ? localHour - 24 : localHour;
  if (hour >= 21 || hour < 6) return "dark";
  if (hour >= 18) return "twilight";
  return "light";
};

const ThemeContext = createContext(getTheme());

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = getTheme();
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};
