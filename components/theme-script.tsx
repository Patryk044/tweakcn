"use client";

import { defaultDarkThemeStyles, defaultLightThemeStyles } from "@/config/theme";

export function ThemeScript() {
  const scriptContent = `
    (function() {
      const storageKey = "editor-storage";
      const root = document.documentElement;
      const defaultLightStyles = ${JSON.stringify(defaultLightThemeStyles)};
      const defaultDarkStyles = ${JSON.stringify(defaultDarkThemeStyles)};

      // Try to load shared theme colors
      let sharedThemeColors = {};
      try {
        // This will be set by the server during SSR if shared theme is available
        if (window.__SHARED_THEME_COLORS__) {
          sharedThemeColors = window.__SHARED_THEME_COLORS__;
          console.log('TweakCN: Loaded shared theme colors:', Object.keys(sharedThemeColors).length, 'colors');
        }
      } catch (e) {
        console.warn("Failed to load shared theme colors:", e);
      }

      let themeState = null;
      try {
        const persistedStateJSON = localStorage.getItem(storageKey);
        if (persistedStateJSON) {
          themeState = JSON.parse(persistedStateJSON)?.state?.themeState;
        }
      } catch (e) {
        console.warn("Theme initialization: Failed to read/parse localStorage:", e);
      }

      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const mode = themeState?.currentMode ?? (prefersDark ? "dark" : "light");

      const activeStyles =
        mode === "dark"
          ? themeState?.styles?.dark || defaultDarkStyles
          : themeState?.styles?.light || defaultLightStyles;

      // Merge shared theme colors into active styles if available
      const finalStyles = { ...activeStyles };
      Object.keys(sharedThemeColors).forEach(key => {
        if (sharedThemeColors[key]) {
          finalStyles[key] = sharedThemeColors[key];
        }
      });

      const stylesToApply = Object.keys(defaultLightStyles);

      for (const styleName of stylesToApply) {
        const value = finalStyles[styleName];
        if (value !== undefined) {
          // Ustaw zarówno standardowe zmienne jak i zmienne z przedrostkiem theme-
          root.style.setProperty(\`--\${styleName}\`, value);
          root.style.setProperty(\`--theme-\${styleName}\`, value);
        }
      }
      
      // Dodajemy specjalną funkcję do logowania wykrytych problemów z kolorami
      console.log('Applied theme styles:', 
        Object.entries(finalStyles)
          .filter(([k, v]) => typeof v === 'string')
          .map(([k, v]) => \`\${k}: \${v}\`)
          .join(', ')
      );
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: scriptContent }}
      suppressHydrationWarning
    />
  );
}
