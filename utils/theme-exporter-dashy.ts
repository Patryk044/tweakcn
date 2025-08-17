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
    // Basic mapping; Dashy uses CSS vars or theme YAML. We'll output CSS override.
    const allowed = ['background','foreground','primary','secondary','accent','muted','destructive','card','border','input','ring','primary-foreground','secondary-foreground','accent-foreground','muted-foreground','destructive-foreground','card-foreground'];
    const out: Record<string,string> = {};
    for (const k of allowed) if (colors[k]) out[k] = this.toHex(colors[k]);
    return out;
  }

  generateDashyCSS(light: Record<string,string>, dark?: Record<string,string>, options?: { darkModeStrategy?: 'media' | 'class' }) {
    const strategy = options?.darkModeStrategy || 'media';
    const lightMap = this.map(light);
    let css = `/* Auto-generated Dashy theme override */\n:root{\n`;
    for (const [k,v] of Object.entries(lightMap)) css += `  --${k}: ${v};\n`;
    css += `}\n`;
    if (dark) {
      const darkMap = this.map(dark);
      if (strategy === 'media') {
        css += `@media (prefers-color-scheme: dark){\n  :root{\n`;
        for (const [k,v] of Object.entries(darkMap)) css += `    --${k}: ${v};\n`;
        css += `  }\n}\n`;
      } else {
        css += `.dark{\n`;
        for (const [k,v] of Object.entries(darkMap)) css += `  --${k}: ${v};\n`;
        css += `}\n`;
      }
    }
    return css;
  }
  generateDashyYAML(light: Record<string,string>, dark?: Record<string,string>) {
    const lightMap = this.map(light);
    const lines: string[] = [];
    lines.push('# Auto-generated Dashy theme snippet');
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push('theme:');
    lines.push('  cssVariables:');
    Object.entries(lightMap).forEach(([k,v])=> lines.push(`    ${k}: \"${v}\"`));
    if (dark) {
      const darkMap = this.map(dark);
      lines.push('  darkCssVariables:');
      Object.entries(darkMap).forEach(([k,v])=> lines.push(`    ${k}: \"${v}\"`));
    }
    return lines.join('\n') + '\n';
  }
}

export const dashyColorExporter = new DashyColorExporter();
