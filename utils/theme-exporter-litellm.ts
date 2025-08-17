type ColorValue = string;

class LiteLLMColorExporter {
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
  generateLiteLLMCSS(light: Record<string,string>, dark?: Record<string,string>) {
    const toVars = (obj: Record<string,string>) => Object.entries(obj).map(([k,v])=>`  --${k}: ${this.toHslTriplet(v)};`).join('\n');
    let css = `/* Auto-generated LiteLLM override */\n:root{\n${toVars(light)}\n}\n`;
    if (dark) css += `\n[data-theme="dark"]{\n${toVars(dark)}\n}\n`;
    return css;
  }
  generateLiteLLMJson(light: Record<string,string>) {
    const mapped: Record<string,string> = {};
    for (const [k,v] of Object.entries(light)) mapped[k]=this.toHslTriplet(v);
    return JSON.stringify({ colors: mapped, generatedAt: new Date().toISOString() }, null, 2);
  }
}
export const litellmColorExporter = new LiteLLMColorExporter();
