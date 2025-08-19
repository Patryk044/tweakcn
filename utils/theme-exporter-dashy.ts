type ColorValue = string;

class DashyColorExporter {
  private toHex(color: string): string {
    if (!color) return '#000000';
    if (color.startsWith('#')) return color;
    if (color.startsWith('rgb(')) {
      const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!m) return '#000000';
      const [r,g,b] = m.slice(1).map(Number);
      return '#' + [r,g,b].map(c=>c.toString(16).padStart(2,'0')).join('');
    }
    if (color.startsWith('hsl(')) {
      const m = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
      if (!m) return '#000000';
      let [h,s,l] = m.slice(1).map(Number);
      h/=360; s/=100; l/=100;
      const hue2rgb=(p:number,q:number,t:number)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
      let r:number,g:number,b:number;
      if (s===0){r=g=b=l;} else {const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);} 
      return '#' + [r,g,b].map(c=>Math.round(c*255).toString(16).padStart(2,'0')).join('');
    }
    if (color.match(/^\d+\s+\d+%\s+\d+%$/)) {
      return this.toHex('hsl(' + color.replace(/\s+/g, ', ') + ')');
    }
    return '#000000';
  }

  private map(colors: Record<string, ColorValue>) {
    // Enhanced mapping for Dashy CSS variables with comprehensive coverage
    const out: Record<string,string> = {};
    
    console.log('Mapping colors for Dashy:', colors); // Debug log
    
    // Primary colors
    if (colors.primary) {
      const primary = this.toHex(colors.primary);
      out['primary'] = primary;
      out['heading-text-color'] = primary;
      out['nav-link-text-color'] = primary;
      out['item-text-color'] = primary;
      out['nav-link-text-color-hover'] = primary;
      out['settings-text-color'] = primary;
      out['config-settings-color'] = primary;
      out['widget-text-color'] = primary;
      out['interactive-editor-color'] = primary;
      out['cloud-backup-color'] = primary;
      out['search-label-color'] = primary;
      out['footer-text-color-link'] = primary;
      out['context-menu-color'] = primary;
      out['side-bar-color'] = primary;
      out['side-bar-item-color'] = primary;
      out['minimal-view-title-color'] = primary;
      out['minimal-view-settings-color'] = primary;
      out['minimal-view-section-heading-color'] = primary;
      out['minimal-view-search-color'] = primary;
      out['minimal-view-group-color'] = primary;
      out['login-form-color'] = primary;
      out['about-page-accent'] = primary;
      out['scroll-bar-color'] = primary;
      out['loading-screen-color'] = primary;
      out['status-check-tooltip-color'] = primary;
      out['welcome-popup-text-color'] = primary;
      out['description-tooltip-color'] = primary;
      out['progress-bar'] = primary;
    }

    // Background colors
    if (colors.background) {
      const bg = this.toHex(colors.background);
      out['background'] = bg;
      out['background-darker'] = this.darkenColor(bg, 0.15);
      out['settings-background'] = bg;
      out['interactive-editor-background'] = bg;
      out['workspace-web-content-background'] = bg;
      out['minimal-view-background-color'] = bg;
      out['login-form-background'] = bg;
      out['about-page-background'] = bg;
      out['loading-screen-background'] = bg;
    }

    // Surface/Card colors
    if (colors.card || colors.surface) {
      const surface = this.toHex(colors.card || colors.surface);
      out['item-background'] = this.addAlpha(surface, '33'); // semi-transparent
      out['item-background-hover'] = this.addAlpha(surface, '4d'); // slightly more opaque on hover
      out['item-group-background'] = this.addAlpha(surface, 'cc'); 
      out['nav-link-background-color'] = this.addAlpha(surface, '33');
      out['nav-link-background-color-hover'] = this.addAlpha(surface, '4d');
      out['search-container-background'] = surface;
      out['search-field-background'] = surface;
      out['config-settings-background'] = surface;
      out['widget-background-color'] = surface;
      out['interactive-editor-background-darker'] = surface;
      out['cloud-backup-background'] = surface;
      out['footer-background'] = surface;
      out['context-menu-background'] = surface;
      out['side-bar-background'] = surface;
      out['side-bar-background-lighter'] = this.lightenColor(surface, 0.1);
      out['side-bar-item-background'] = surface;
      out['minimal-view-section-heading-background'] = surface;
      out['minimal-view-search-background'] = surface;
      out['minimal-view-group-background'] = surface;
      out['login-form-background-secondary'] = surface;
      out['status-check-tooltip-background'] = surface;
      out['welcome-popup-background'] = surface;
      out['description-tooltip-background'] = surface;
    }

    // Text colors
    if (colors.foreground) {
      const text = this.toHex(colors.foreground);
      out['item-group-heading-text-color'] = colors.card ? this.toHex(colors.card) : text;
      out['item-group-heading-text-color-hover'] = colors.background ? this.toHex(colors.background) : text;
    }

    // Muted/secondary colors  
    if (colors['muted-foreground'] || colors.muted) {
      const muted = this.toHex(colors['muted-foreground'] || colors.muted);
      out['medium-grey'] = muted;
      out['footer-text-color'] = muted;
      out['context-menu-secondary-color'] = colors.card ? this.toHex(colors.card) : muted;
    }

    // Border colors
    if (colors.border) {
      const border = this.toHex(colors.border);
      out['nav-link-border-color'] = 'transparent';
      out['nav-link-border-color-hover'] = colors.primary ? this.toHex(colors.primary) : border;
    }

    // Accent colors for highlights
    if (colors.accent) {
      const accent = this.toHex(colors.accent);
      out['widget-accent-color'] = colors.background ? this.toHex(colors.background) : accent;
      out['highlight-color'] = colors.background ? this.toHex(colors.background) : accent;
      out['highlight-background'] = colors.primary ? this.toHex(colors.primary) : accent;
    }

    // Action colors
    if (colors.destructive) {
      out['error'] = this.toHex(colors.destructive);
      out['danger'] = this.toHex(colors.destructive);
    }

    // Fixed base colors
    out['white'] = '#ffffff';
    out['black'] = '#000000';
    out['info'] = '#04e4f4';
    out['success'] = '#20e253';
    out['warning'] = '#f6f000';
    out['neutral'] = '#272f4d';

    // Transparent overlays
    out['transparent-70'] = '#000000b3';
    out['transparent-50'] = '#00000080';
    out['transparent-30'] = '#0000004d';
    out['transparent-white-70'] = '#ffffffb3';
    out['transparent-white-50'] = '#ffffff80';
    out['transparent-white-30'] = '#ffffff4d';
    out['transparent-white-10'] = '#ffffff0f';

    // Additional widget configurations
    out['widget-base-background'] = 'transparent';
    out['scroll-bar-background'] = colors.card ? this.toHex(colors.card) : out['background-darker'];
    out['toast-background'] = colors.primary ? this.toHex(colors.primary) : out['primary'];
    out['toast-color'] = colors.background ? this.toHex(colors.background) : out['background'];

    // Shadow configurations
    out['nav-link-shadow'] = '1px 1px 2px #232323';
    out['nav-link-shadow-hover'] = '1px 1px 2px #232323';

    console.log('Enhanced mapped colors for Dashy:', out); // Debug log
    return out;
  }

  private addAlpha(hex: string, alpha: string): string {
    // Add alpha channel to hex color
    return hex + alpha;
  }

  private darkenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  private lightenColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  generateDashyCSS(light: Record<string,string>, dark?: Record<string,string>, options?: { darkModeStrategy?: 'media' | 'class' }) {
    const strategy = options?.darkModeStrategy || 'media';
    const lightMap = this.map(light);
    
    let css = `/* Auto-generated Tweakcn theme for Dashy */\n`;
    css += `/* Generated at: ${new Date().toISOString()} */\n`;
    css += `/* Theme integration with TweakCN color system */\n\n`;
    
    // Base theme variables with tweakcn-theme data attribute
    css += `html[data-theme='tweakcn-theme'], :root {\n`;
    for (const [k,v] of Object.entries(lightMap)) {
      css += `  --${k}: ${v};\n`;
    }
    
    // Enhanced Dashy-specific improvements
    if (lightMap['primary']) {
      css += `  --item-hover-shadow: 0 4px 12px ${lightMap['primary']}40;\n`;
      css += `  --config-settings-color: ${lightMap['primary']};\n`;
      css += `  --item-group-outer-background: ${lightMap['primary']};\n`;
    }
    
    // Enhanced shadows and effects
    css += `  --item-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);\n`;
    css += `  --item-hover-transform: translateY(-2px);\n`;
    css += `  --transition-duration: 0.2s;\n`;
    css += `  --border-radius-base: 8px;\n`;
    css += `}\n\n`;
    
    // Dark mode support with enhanced strategy handling
    if (dark) {
      const darkMap = this.map(dark);
      
      if (strategy === 'media') {
        css += `@media (prefers-color-scheme: dark) {\n`;
        css += `  html[data-theme='tweakcn-theme'], :root {\n`;
        for (const [k,v] of Object.entries(darkMap)) {
          css += `    --${k}: ${v};\n`;
        }
        if (darkMap['primary']) {
          css += `    --item-hover-shadow: 0 4px 12px ${darkMap['primary']}60;\n`;
          css += `    --config-settings-color: ${darkMap['primary']};\n`;
          css += `    --item-group-outer-background: ${darkMap['primary']};\n`;
        }
        css += `    --item-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);\n`;
        css += `  }\n`;
        css += `}\n\n`;
      } else if (strategy === 'class') {
        css += `.dark, html[data-theme='tweakcn-theme'].dark {\n`;
        for (const [k,v] of Object.entries(darkMap)) {
          css += `  --${k}: ${v};\n`;
        }
        if (darkMap['primary']) {
          css += `  --item-hover-shadow: 0 4px 12px ${darkMap['primary']}60;\n`;
          css += `  --config-settings-color: ${darkMap['primary']};\n`;
          css += `  --item-group-outer-background: ${darkMap['primary']};\n`;
        }
        css += `  --item-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);\n`;
        css += `}\n\n`;
      }
    }

    // Enhanced component styling with improved integration
    css += `/* Enhanced component styling for TweakCN integration */\n`;
    css += `.item {\n`;
    css += `  transition: transform var(--transition-duration), box-shadow var(--transition-duration);\n`;
    css += `  border-radius: var(--border-radius-base);\n`;
    css += `}\n\n`;
    
    css += `.item:hover {\n`;
    css += `  transform: var(--item-hover-transform);\n`;
    css += `  box-shadow: var(--item-hover-shadow);\n`;
    css += `}\n\n`;

    css += `.section {\n`;
    css += `  border-radius: var(--border-radius-base);\n`;
    css += `  box-shadow: var(--item-shadow);\n`;
    css += `}\n\n`;

    // Force override for important Dashy components
    css += `/* Force important component overrides */\n`;
    css += `.config-container, .settings-container {\n`;
    css += `  background-color: var(--config-settings-background) !important;\n`;
    css += `  color: var(--config-settings-color) !important;\n`;
    css += `}\n\n`;

    css += `.search-container {\n`;
    css += `  background-color: var(--search-container-background) !important;\n`;
    css += `}\n\n`;

    css += `.nav-link {\n`;
    css += `  background-color: var(--nav-link-background-color) !important;\n`;
    css += `  color: var(--nav-link-text-color) !important;\n`;
    css += `  border-color: var(--nav-link-border-color) !important;\n`;
    css += `  transition: all var(--transition-duration) ease;\n`;
    css += `}\n\n`;

    css += `.nav-link:hover {\n`;
    css += `  background-color: var(--nav-link-background-color-hover) !important;\n`;
    css += `  color: var(--nav-link-text-color-hover) !important;\n`;
    css += `  border-color: var(--nav-link-border-color-hover) !important;\n`;
    css += `}\n\n`;

    return css;
  }
  generateDashyYAML(light: Record<string,string>, dark?: Record<string,string>) {
    const lightMap = this.map(light);
    const lines: string[] = [];
    lines.push('# Auto-generated TweakCN theme configuration for Dashy');
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push('# This configuration integrates TweakCN color system with Dashy');
    lines.push('');
    lines.push('appConfig:');
    lines.push('  theme: tweakcn-theme');
    lines.push('  cssThemes:');
    lines.push('    - tweakcn-theme');
    lines.push('  customColors:');
    
    // Add color mappings to YAML
    Object.entries(lightMap).forEach(([key, value]) => {
      lines.push(`    ${key}: "${value}"`);
    });
    
    lines.push('  customCss: |');
    
    // Add the CSS as customCss in YAML with proper indentation
    const css = this.generateDashyCSS(light, dark);
    css.split('\n').forEach(line => {
      if (line.trim()) {
        lines.push(`    ${line}`);
      } else {
        lines.push('');
      }
    });

    lines.push('');
    lines.push('# Additional Dashy configuration for enhanced theme integration');
    lines.push('sections:');
    lines.push('  - name: "TweakCN Theme Integration"');
    lines.push('    displayData:');
    lines.push('      showAtAllTimes: false');
    lines.push('      color: "var(--primary)"');
    lines.push('    items: []');
    
    return lines.join('\n') + '\n';
  }

  generateUserDefinedThemesSCSS(light: Record<string,string>, dark?: Record<string,string>): string {
    const lightMap = this.map(light);
    const darkMap = dark ? this.map(dark) : null;

    let scss = `// Auto-generated TweakCN theme for Dashy\n`;
    scss += `// Generated at: ${new Date().toISOString()}\n`;
    scss += `// Theme integration with TweakCN color system\n\n`;

    scss += `html[data-theme='tweakcn-theme'] {\n`;
    
    // CSS variables for light theme
    for (const [key, value] of Object.entries(lightMap)) {
      scss += `  --${key}: ${value};\n`;
    }

    scss += `\n  // Custom layout and UI enhancements\n`;
    scss += `  iframe {\n`;
    scss += `    height: calc(100dvh - 20px) !important;\n`;
    scss += `    width: calc(100% - 60px) !important;\n`;
    scss += `    overflow: hidden !important;\n`;
    scss += `  }\n\n`;

    scss += `  header {\n`;
    scss += `    height: 0px;\n`;
    scss += `  }\n\n`;

    scss += `  .side-bar {\n`;
    scss += `    width: 40px;\n`;
    scss += `  }\n\n`;

    scss += `  .switch-view-buttons {\n`;
    scss += `    display: none;\n`;
    scss += `  }\n\n`;

    scss += `  .workspace-container {\n`;
    scss += `    background-color: var(--background) !important;\n`;
    scss += `  }\n\n`;

    scss += `  .draggable-item,\n`;
    scss += `  .item-group {\n`;
    scss += `    user-select: none !important;\n`;
    scss += `    -webkit-user-drag: none !important;\n`;
    scss += `    pointer-events: auto !important;\n`;
    scss += `  }\n\n`;

    scss += `  .show-hide-container {\n`;
    scss += `    display: none !important;\n`;
    scss += `  }\n\n`;

    scss += `  .svg-inline--fa {\n`;
    scss += `    display: none !important;\n`;
    scss += `  }\n\n`;

    // Enhanced component styling
    scss += `  // Enhanced component styling\n`;
    scss += `  .item {\n`;
    scss += `    transition: transform var(--transition-duration), box-shadow var(--transition-duration);\n`;
    scss += `    border-radius: var(--border-radius-base);\n`;
    scss += `  }\n\n`;
    
    scss += `  .item:hover {\n`;
    scss += `    transform: var(--item-hover-transform);\n`;
    scss += `    box-shadow: var(--item-hover-shadow);\n`;
    scss += `  }\n\n`;

    scss += `  .section {\n`;
    scss += `    border-radius: var(--border-radius-base);\n`;
    scss += `    box-shadow: var(--item-shadow);\n`;
    scss += `  }\n\n`;

    // Force important component overrides
    scss += `  // Force important component overrides\n`;
    scss += `  .config-container, .settings-container {\n`;
    scss += `    background-color: var(--config-settings-background) !important;\n`;
    scss += `    color: var(--config-settings-color) !important;\n`;
    scss += `  }\n\n`;

    scss += `  .search-container {\n`;
    scss += `    background-color: var(--search-container-background) !important;\n`;
    scss += `  }\n\n`;

    scss += `  .nav-link {\n`;
    scss += `    background-color: var(--nav-link-background-color) !important;\n`;
    scss += `    color: var(--nav-link-text-color) !important;\n`;
    scss += `    border-color: var(--nav-link-border-color) !important;\n`;
    scss += `    transition: all var(--transition-duration) ease;\n`;
    scss += `  }\n\n`;

    scss += `  .nav-link:hover {\n`;
    scss += `    background-color: var(--nav-link-background-color-hover) !important;\n`;
    scss += `    color: var(--nav-link-text-color-hover) !important;\n`;
    scss += `    border-color: var(--nav-link-border-color-hover) !important;\n`;
    scss += `  }\n`;

    scss += `}\n\n`;

    // Dark theme if provided
    if (darkMap) {
      scss += `@media (prefers-color-scheme: dark) {\n`;
      scss += `  html[data-theme='tweakcn-theme'] {\n`;
      
      for (const [key, value] of Object.entries(darkMap)) {
        scss += `    --${key}: ${value};\n`;
      }
      
      scss += `  }\n`;
      scss += `}\n\n`;
    }

    scss += `// For more info, see: https://github.com/Lissy93/dashy/blob/master/docs/theming.md\n`;

    return scss;
  }
}

export const dashyColorExporter = new DashyColorExporter();
