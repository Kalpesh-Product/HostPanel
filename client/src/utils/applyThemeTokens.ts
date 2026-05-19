import { THEME_TOKENS } from "../constants/themeTokens";

export const applyThemeTokens = (themeId: string): Record<string, string> => {
  const token = THEME_TOKENS[themeId] || THEME_TOKENS["co-working-default"];

  return {
    "--primary-color": token.primaryColor,
    "--accent-color": token.accentColor,
    "--bg-color": token.bgColor,
    "--text-color": token.textColor,
    "--border-radius":
      token.borderRadius === "pill"
        ? "999px"
        : token.borderRadius === "rounded"
          ? "8px"
          : "2px",
  };
};

export const getThemeStyleString = (themeId: string): string => {
  const vars = applyThemeTokens(themeId);
  const lines = Object.entries(vars).map(([key, value]) => `${key}: ${value};`);
  return `:root { ${lines.join(" ")} }`;
};
