import { type ThemeStyleProps } from "@/types/theme";

type ColorValue = string;

export class OpenWebUIColorExporter {
  private convertToHex(color: ColorValue): string {
    if (!color || typeof color !== 'string') {
      return '#000000';
    }

    if (color.startsWith('#')) {
      return color;
    }

    if (color.startsWith('hsl(')) {
      return this.hslToHex(color);
    }

    if (color.startsWith('rgb(')) {
      return this.rgbToHex(color);
    }

    if (color.match(/^\d+\s+\d+%\s+\d+%$/)) {
      return this.hslToHex(`hsl(${color.replace(/\s+/g, ', ')})`);
    }

    return '#000000';
  }

  private hslToHex(hsl: string): string {
    const match = hsl.match(/hsl\((\d+),?\s*(\d+)%,?\s*(\d+)%\)/);
    if (!match) return '#000000';

    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private rgbToHex(rgb: string): string {
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#000000';

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    const toHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private mapColorsToOpenWebUI(colors: Record<string, ColorValue>): Record<string, string> {
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

      'sidebar': 'sidebar',
      'sidebar-foreground': 'sidebar-foreground',
      'sidebar-primary': 'sidebar-primary',
      'sidebar-primary-foreground': 'sidebar-primary-foreground',
      'sidebar-accent': 'sidebar-accent',
      'sidebar-accent-foreground': 'sidebar-accent-foreground',
      'sidebar-border': 'sidebar-border',
      'sidebar-ring': 'sidebar-ring',
      
      'chat-background': 'chat-background',
      'chat-foreground': 'chat-foreground',
      'chat-input-background': 'chat-input-background',
      'chat-input-border': 'chat-input-border',
      'chat-input-foreground': 'chat-input-foreground',
      'chat-bubble-user': 'chat-bubble-user',
      'chat-bubble-user-foreground': 'chat-bubble-user-foreground',
      'chat-bubble-assistant': 'chat-bubble-assistant',
      'chat-bubble-assistant-foreground': 'chat-bubble-assistant-foreground',
    };

    const openWebUIVars: Record<string, string> = {};
    
    for (const [tweakcnKey, openWebUIKey] of Object.entries(mappings)) {
      if (colors[tweakcnKey]) {
        openWebUIVars[openWebUIKey] = this.convertToHex(colors[tweakcnKey]);
      }
    }

    return openWebUIVars;
  }

  generateOpenWebUICSS(colors: Record<string, ColorValue>, darkColors?: Record<string, ColorValue>): string {
    const mappedColors = this.mapColorsToOpenWebUI(colors);
    
    let css = `/* Auto-generated CSS Override for OpenWebUI from TweakCN */\n`;
    css += `/* Generated at: ${new Date().toISOString()} */\n`;
    css += `/* Version: ${Date.now()} */\n\n`;
    
    css += `:root {\n`;
    
    for (const [key, value] of Object.entries(mappedColors)) {
      if (key.includes('spacing')) continue;
      css += `  --${key}: ${value};\n`;
    }
    
    css += `}\n\n`;
    
    if (darkColors && Object.keys(darkColors).length > 0) {
      const mappedDarkColors = this.mapColorsToOpenWebUI(darkColors);
      
      css += `.dark {\n`;
      
      for (const [key, value] of Object.entries(mappedDarkColors)) {
        if (key.includes('spacing')) continue;
        css += `  --${key}: ${value};\n`;
      }
      
      css += `}\n\n`;
    }
    
    
    return css;
  }

  async exportToOpenWebUICSS(
    colors: Record<string, ColorValue>,
    darkColors?: Record<string, ColorValue>,
    outputPath: string = '/app/theme/output/openwebui-override.css'
  ): Promise<boolean> {
    try {
      const css = this.generateOpenWebUICSS(colors, darkColors);
      
      if (typeof window === 'undefined') {
        const fs = await import('fs');
        const path = await import('path');
        
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, css, 'utf8');
        console.log('[OPENWEBUI-EXPORT] CSS saved to:', outputPath);
        
        // Also save to root theme directory for backward compatibility
        const rootPath = '/app/theme/openwebui-override.css';
        fs.writeFileSync(rootPath, css, 'utf8');
        console.log('[OPENWEBUI-EXPORT] CSS also saved to:', rootPath);
        
        const timestamp = Date.now();
        
        // Create signal files in both locations
        fs.writeFileSync('/app/theme/output/openwebui-theme-changed.signal', timestamp.toString());
        fs.writeFileSync('/app/theme/openwebui-theme-changed.signal', timestamp.toString());
        console.log('[OPENWEBUI-EXPORT] Theme change signals created');
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[OPENWEBUI-EXPORT] Export error:', error);
      return false;
    }
  }

  exportToTailwindConfig(
    colors: Record<string, ColorValue>,
    darkColors?: Record<string, ColorValue>
  ): string {
    const mappedColors = this.mapColorsToOpenWebUI(colors);
    
    const config = {
      theme: {
        extend: {
          colors: mappedColors,
          ...(darkColors && {
            dark: this.mapColorsToOpenWebUI(darkColors)
          })
        }
      }
    };
    
    return `// Auto-generated by tweakcn for OpenWebUI
// ${new Date().toISOString()}
module.exports = ${JSON.stringify(config, null, 2)};`;
  }
}

export const openWebUIColorExporter = new OpenWebUIColorExporter();
