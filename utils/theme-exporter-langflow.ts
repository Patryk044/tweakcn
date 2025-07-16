import { type ThemeStyleProps, type ThemeStyles } from "@/types/theme";

type ColorValue = string;

export class LangflowColorExporter {
  private convertToLangflowHSL(color: ColorValue): string {
    if (!color || typeof color !== 'string') {
      return '0 0% 0%';
    }

    if (color.match(/^\d+\s+\d+%\s+\d+%$/)) {
      return color;
    }

    if (color.startsWith('hsl(')) {
      // Support for the legacy format: hsl(120, 100%, 50%)
      const legacyMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (legacyMatch) {
        return `${legacyMatch[1]} ${legacyMatch[2]}% ${legacyMatch[3]}%`;
      }
      
      // Support for the modern format: hsl(120 100% 50%)
      const modernMatch = color.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
      if (modernMatch) {
        return `${modernMatch[1]} ${modernMatch[2]}% ${modernMatch[3]}%`;
      }
    }

    if (color.startsWith('rgb(')) {
      return this.rgbToHsl(color);
    }

    if (color.startsWith('#')) {
      return this.hexToHsl(color);
    }

    return '0 0% 0%';
  }

  private rgbToHsl(rgb: string): string {
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '0 0% 0%';

    const [, r, g, b] = match.map(Number);
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const diff = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
      
      switch (max) {
        case rNorm:
          h = (gNorm - bNorm) / diff + (gNorm < bNorm ? 6 : 0);
          break;
        case gNorm:
          h = (bNorm - rNorm) / diff + 2;
          break;
        case bNorm:
          h = (rNorm - gNorm) / diff + 4;
          break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  private hexToHsl(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '0 0% 0%';

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
      
      switch (max) {
        case r:
          h = (g - b) / diff + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / diff + 2;
          break;
        case b:
          h = (r - g) / diff + 4;
          break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  private mapColorsToLangflow(colors: Record<string, ColorValue>): Record<string, string> {
    const mappings: Record<string, string> = {
      'background': 'background',
      'foreground': 'foreground',
      'primary': 'primary',
      'secondary': 'secondary',
      'accent': 'accent',
      'muted': 'muted',
        'destructive': 'destructive',
      
      'card': 'card',
      'popover': 'popover',
      'border': 'border',
      'input': 'input',
      'ring': 'ring',
      
      'primary-foreground': 'primary-foreground',
      'secondary-foreground': 'secondary-foreground',
      'accent-foreground': 'accent-foreground',
      'muted-foreground': 'muted-foreground',
      'destructive-foreground': 'destructive-foreground',
      'card-foreground': 'card-foreground',
      'popover-foreground': 'popover-foreground',
    };

    const langflowVars: Record<string, string> = {};
    
    for (const [tweakcnKey, langflowKey] of Object.entries(mappings)) {
      if (colors[tweakcnKey]) {
        langflowVars[langflowKey] = this.convertToLangflowHSL(colors[tweakcnKey]);
      }
    }

    return langflowVars;
  }

  generateLangflowCSS(colors: Record<string, ColorValue>, darkColors?: Record<string, ColorValue>): string {
    const mappedColors = this.mapColorsToLangflow(colors);
    
    let css = `/* Auto-generated CSS Override from Tweakcn */\n`;
    css += `/* Generated at: ${new Date().toISOString()} */\n\n`;
    
    // Light mode variables
    css += `:root {\n`;
    
    for (const [key, value] of Object.entries(mappedColors)) {
      if (key.includes('spacing')) continue;
      css += `  --${key}: ${value};\n`;
    }
    
    css += `\n  /* Langflow specific component variables */\n`;
    css += `  --sidebar-background: var(--background);\n`;
    css += `  --sidebar-foreground: var(--foreground);\n`;
    css += `  --sidebar-primary: var(--primary);\n`;
    css += `  --sidebar-primary-foreground: var(--primary-foreground);\n`;
    css += `  --sidebar-accent: var(--accent);\n`;
    css += `  --sidebar-accent-foreground: var(--accent-foreground);\n`;
    css += `  --sidebar-border: var(--border);\n`;
    css += `  --sidebar-ring: var(--ring);\n`;
    
    css += `\n  /* Node editor variables */\n`;
    css += `  --node-background: var(--card);\n`;
    css += `  --node-border: var(--border);\n`;
    css += `  --node-foreground: var(--card-foreground);\n`;
    css += `  --node-header: var(--muted);\n`;
    css += `  --connection-stroke: var(--ring);\n`;
    css += `  --digital-orchid: var(--primary-foreground);\n`;
    css += `  --plasma-purple: var(--primary);\n`;
    
    css += `}\n\n`;
    
    // Dark mode support with explicit data-theme attribute
    if (darkColors) {
      const mappedDarkColors = this.mapColorsToLangflow(darkColors);
      
      css += `[data-theme="dark"] {\n`;
      
      for (const [key, value] of Object.entries(mappedDarkColors)) {
        if (key.includes('spacing')) continue;
        css += `  --${key}: ${value};\n`;
      }
      
      css += `}\n\n`;
      
      // Media query for system dark mode preference
      css += `@media (prefers-color-scheme: dark) {\n`;
      css += `  :root {\n`;
      
      for (const [key, value] of Object.entries(mappedDarkColors)) {
        if (key.includes('spacing')) continue;
        css += `    --${key}: ${value};\n`;
      }
      
      css += `  }\n`;
      css += `}\n\n`;
    }
    
    return css;
  }

  async exportToLangflowCSS(
    colors: Record<string, ColorValue>,
    darkColors?: Record<string, ColorValue>,
    outputPath: string = '/app/theme/langflow-theme.css'
  ): Promise<boolean> {
    try {
      const css = this.generateLangflowCSS(colors, darkColors);
      
      if (typeof window === 'undefined') {
        const fs = await import('fs');
        fs.writeFileSync(outputPath, css, 'utf8');
        console.log('[LANGFLOW-EXPORT] CSS zapisany do:', outputPath);
        
        const timestamp = Date.now();
        fs.writeFileSync('/app/theme/theme-changed.signal', timestamp.toString());
        console.log('[LANGFLOW-EXPORT] Sygnał zmiany utworzony');
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[LANGFLOW-EXPORT] Błąd eksportu CSS:', error);
      return false;
    }
  }


  exportToTailwindConfig(
    colors: Record<string, ColorValue>,
    darkColors?: Record<string, ColorValue>
  ): string {
    const mappedColors = this.mapColorsToLangflow(colors);
    
    const config = {
      theme: {
        extend: {
          colors: mappedColors,
          ...(darkColors && {
            dark: this.mapColorsToLangflow(darkColors)
          })
        }
      }
    };
    
    return `// Auto-generated by tweakcn for Langflow
// ${new Date().toISOString()}
module.exports = ${JSON.stringify(config, null, 2)};`;
  }

  public generateCss(theme: ThemeStyles): string {
    const { light: colors, dark: darkColors } = theme;
    let css = ":root {\n";

    for (const [key, value] of Object.entries(colors)) {
      if (key.includes('spacing')) continue;
      if (key !== 'radius') {
        css += `  --${key}: ${this.convertToLangflowHSL(value as ColorValue)};\n`;
      }
    }

    // Add border radius if present in colors
    if (colors['radius']) {
      css += `  --radius: ${colors['radius']};\n`;
    }
    css += "}\n";

    if (darkColors) {
      css += "\n.dark {\n";
      for (const [key, value] of Object.entries(darkColors)) {
        if (key.includes('spacing')) continue;
        if (key !== 'radius') {
          css += `  --${key}: ${this.convertToLangflowHSL(value as ColorValue)};\n`;
        }
      }

      // Add border radius if present in darkColors
      if (darkColors['radius']) {
        css += `  --radius: ${darkColors['radius']};\n`;
      }
      css += "}\n";
    }

    return css;
  }
}

export const langflowColorExporter = new LangflowColorExporter();
