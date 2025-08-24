type ColorValue = string;

class LiteLLMColorExporter {
  private hexToRgb(hex: string): string {
    if (!hex) return '0, 0, 0';
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return '0, 0, 0';
    
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  }

  private hslToHex(hsl: string): string {
    if (!hsl) return '#000000';
    
    // Parse HSL string like "38 92% 50%" or "hsl(38, 92%, 50%)"
    const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/) || hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return '#000000';
    
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    
    const r = f(0);
    const g = f(8);
    const b = f(4);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private hslToRgb(hsl: string): string {
    if (!hsl) return '0, 0, 0';
    
    const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/) || hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return '0, 0, 0';
    
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    
    return `${f(0)}, ${f(8)}, ${f(4)}`;
  }

  private toHslTriplet(color: string): string {
    if (!color) return '0 0% 0%';
    if (color.match(/^\d+\s+\d+%\s+\d+%$/)) return color;
    if (color.startsWith('hsl(')) {
      const m = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (m) return `${m[1]} ${m[2]}% ${m[3]}%`;
    }
    if (color.startsWith('#')) {
      const hex = color.replace('#','');
      if (hex.length===6){
        const r=parseInt(hex.slice(0,2),16)/255;
        const g=parseInt(hex.slice(2,4),16)/255;
        const b=parseInt(hex.slice(4,6),16)/255;
        const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0,s=0; const l=(max+min)/2; const d=max-min; if(d){s=l>0.5?d/(2-max-min):d/(max+min); switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;} h/=6;} return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;}
    }
    return '0 0% 0%';
  }

  generateLiteLLMCSS(colors: Record<string,string>, dark?: Record<string,string>) {
    // Convert HSL colors to hex for CSS variables
    const primary = colors.primary ? this.hslToHex(colors.primary) : '#f59e0b';
    const background = colors.background ? this.hslToHex(colors.background) : '#ffffff';
    const foreground = colors.foreground ? this.hslToHex(colors.foreground) : '#000000';
    const border = colors.border ? this.hslToHex(colors.border) : '#e5e7eb';
    const card = colors.card ? this.hslToHex(colors.card) : '#ffffff';
    const muted = colors.muted ? this.hslToHex(colors.muted) : '#f5f5f5';
    const accent = colors.accent ? this.hslToHex(colors.accent) : '#f5f5f5';
    const secondary = colors.secondary ? this.hslToHex(colors.secondary) : '#f5f5f5';

    // Generate complete globals.css file with Tailwind and custom variables
    let css = `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Auto-generated TweakCN theme for LiteLLM */
/* Generated at: ${new Date().toISOString()} */

:root {
  /* Shadcn/UI Variables from TweakCN JSON */
  --background: ${colors.background || '0 0% 100%'};
  --foreground: ${colors.foreground || '0 0% 15%'};
  --card: ${colors.card || '0 0% 100%'};
  --card-foreground: ${colors['card-foreground'] || '0 0% 15%'};
  --popover: ${colors.popover || '0 0% 100%'};
  --popover-foreground: ${colors['popover-foreground'] || '0 0% 15%'};
  --primary: ${colors.primary || '38 92% 50%'};
  --primary-foreground: ${colors['primary-foreground'] || '0 0% 0%'};
  --secondary: ${colors.secondary || '220 14% 96%'};
  --secondary-foreground: ${colors['secondary-foreground'] || '215 14% 34%'};
  --muted: ${colors.muted || '210 20% 98%'};
  --muted-foreground: ${colors['muted-foreground'] || '220 9% 46%'};
  --accent: ${colors.accent || '48 100% 96%'};
  --accent-foreground: ${colors['accent-foreground'] || '23 83% 31%'};
  --destructive: ${colors.destructive || '0 84% 60%'};
  --destructive-foreground: ${colors['destructive-foreground'] || '0 0% 100%'};
  --border: ${colors.border || '220 13% 91%'};
  --input: ${colors.input || '220 13% 91%'};
  --ring: ${colors.ring || '38 92% 50%'};
  --radius: ${colors.radius || '0.5rem'};

  /* Legacy LiteLLM Variables (for backward compatibility) */
  --foreground-rgb: ${this.hslToRgb(colors.foreground || '0 0% 15%')};
  --background-start-rgb: ${this.hslToRgb(colors.background || '0 0% 100%')};
  --background-end-rgb: ${this.hslToRgb(colors.background || '0 0% 100%')};
  --neutral-border: ${border};

  /* TweakCN Color Variables (hex format for compatibility) */
  --tweakcn-primary: ${primary};
  --tweakcn-background: ${background};
  --tweakcn-surface: ${muted};
  --tweakcn-border: ${border};
  --tweakcn-text: ${foreground};
  
  /* Primary color variations */
  --primary-50: ${primary}10;
  --primary-100: ${primary}20;
  --primary-500: ${primary};
  --primary-600: ${primary}dd;
  --primary-700: ${primary}bb;
}`;

    // Add dark theme if provided or use defaults
    if (dark || colors.background) {
      const darkBackground = dark?.background ? this.hslToHex(dark.background) : '#171717';
      const darkForeground = dark?.foreground ? this.hslToHex(dark.foreground) : '#ffffff';
      const darkBorder = dark?.border ? this.hslToHex(dark.border) : '#404040';
      
      css += `

/* Dark Theme */
@media (prefers-color-scheme: dark) {
  :root {
    --background: ${dark?.background || '0 0% 9%'};
    --foreground: ${dark?.foreground || '0 0% 98%'};
    --card: ${dark?.card || '0 0% 9%'};
    --card-foreground: ${dark?.['card-foreground'] || '0 0% 98%'};
    --popover: ${dark?.popover || '0 0% 9%'};
    --popover-foreground: ${dark?.['popover-foreground'] || '0 0% 98%'};
    --primary: ${dark?.primary || colors.primary || '38 92% 50%'};
    --primary-foreground: ${dark?.['primary-foreground'] || '0 0% 9%'};
    --secondary: ${dark?.secondary || '0 0% 15%'};
    --secondary-foreground: ${dark?.['secondary-foreground'] || '0 0% 98%'};
    --muted: ${dark?.muted || '0 0% 15%'};
    --muted-foreground: ${dark?.['muted-foreground'] || '0 0% 64%'};
    --accent: ${dark?.accent || '0 0% 15%'};
    --accent-foreground: ${dark?.['accent-foreground'] || '0 0% 98%'};
    --destructive: ${dark?.destructive || '0 62% 30%'};
    --destructive-foreground: ${dark?.['destructive-foreground'] || '0 85% 97%'};
    --border: ${dark?.border || '0 0% 15%'};
    --input: ${dark?.input || '0 0% 15%'};
    --ring: ${dark?.ring || colors.primary || '38 92% 50%'};

    /* Legacy variables for dark mode */
    --foreground-rgb: ${this.hslToRgb(dark?.foreground || '0 0% 98%')};
    --background-start-rgb: ${this.hslToRgb(dark?.background || '0 0% 9%')};
    --background-end-rgb: ${this.hslToRgb(dark?.background || '0 0% 9%')};
    --neutral-border: ${darkBorder};
  }
}

[data-theme="dark"] {
  --background: ${dark?.background || '0 0% 9%'};
  --foreground: ${dark?.foreground || '0 0% 98%'};
  --primary: ${dark?.primary || colors.primary || '38 92% 50%'};
  --foreground-rgb: ${this.hslToRgb(dark?.foreground || '0 0% 98%')};
  --background-start-rgb: ${this.hslToRgb(dark?.background || '0 0% 9%')};
  --background-end-rgb: ${this.hslToRgb(dark?.background || '0 0% 9%')};
  --neutral-border: ${darkBorder};
}`;
    }

    // Add original CSS content with enhanced styling
    css += `

/* Base Styles */
* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

/* Component Styling */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

.table-wrapper {
  overflow-x: scroll;
  margin: 0px 24px;
}

.custom-border {
  border: 1px solid hsl(var(--border));
}

/* Button Styles */
.btn-primary {
  background-color: hsl(var(--primary));
  border-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.btn-primary:hover {
  background-color: hsl(var(--primary) / 0.9);
  border-color: hsl(var(--primary) / 0.9);
}

.border-primary {
  border-color: hsl(var(--primary));
}

.text-primary {
  color: hsl(var(--primary));
}

.bg-primary {
  background-color: hsl(var(--primary));
}

/* Card Styles */
.card {
  background-color: hsl(var(--card));
  border-color: hsl(var(--border));
  color: hsl(var(--card-foreground));
}

/* Muted Elements */
.text-muted {
  color: hsl(var(--muted-foreground));
}

.bg-muted {
  background-color: hsl(var(--muted));
}

/* Accent Elements */
.bg-accent {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

/* Secondary Elements */
.bg-secondary {
  background-color: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
}
`;

    return css + '\n';
  }

  generateLiteLLMJson(light: Record<string,string>) {
    const mapped: Record<string,string> = {};
    for (const [k,v] of Object.entries(light)) mapped[k]=this.toHslTriplet(v);
    return JSON.stringify({ colors: mapped, generatedAt: new Date().toISOString() }, null, 2);
  }
}

export const litellmColorExporter = new LiteLLMColorExporter();

// Export function for API route
export async function exportToLiteLLM(colors: Record<string, string>) {
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path');
  
  try {
    // Read existing JSON colors if available
    const jsonPath = '/configs/tailwind-theme/litellm-ui-colors.json';
    let jsonColors: Record<string, string> = {};
    
    try {
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const parsedJson = JSON.parse(jsonContent);
      jsonColors = parsedJson.colors || {};
    } catch (e) {
      console.log('No existing JSON file found, using provided colors');
    }

    // Merge provided colors with JSON colors (JSON takes priority)
    const finalColors = { ...colors, ...jsonColors };
    
    // Generate CSS content with actual color values
    const cssContent = litellmColorExporter.generateLiteLLMCSS(finalColors);
    
    // Write to the volume mount location (inside container)
    const outputPath = '/configs/tailwind-theme/litellm-globals.css';
    await fs.writeFile(outputPath, cssContent, 'utf-8');
    
    return { success: true, path: outputPath, colorsUsed: finalColors };
  } catch (error) {
    console.error('Error in exportToLiteLLM:', error);
    throw error;
  }
}
