function isValidColor(color: string): boolean {
  if (!color || typeof color !== 'string') return false;
  
  const trimmedColor = color.trim();
  if (!trimmedColor) return false;
  
  const colorPatterns = [
    /^#([0-9A-Fa-f]{3}){1,2}$/, // Hex colors (#fff, #ffffff)
    /^#([0-9A-Fa-f]{4}){1,2}$/, // Hex with alpha (#ffff, #ffffffff)
    /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/, // rgb(255, 255, 255)
    /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[0-9]*\.?[0-9]+\s*\)$/, // rgba(255, 255, 255, 0.5)
    /^hsl\(\s*\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%\s*\)$/, // hsl(120 50% 50%)
    /^hsl\(\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?%\s*,\s*\d+(\.\d+)?%\s*\)$/, // hsl(120, 50%, 50%)
    /^hsla\(\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?%\s*,\s*\d+(\.\d+)?%\s*,\s*[0-9]*\.?[0-9]+\s*\)$/, // hsla(120, 50%, 50%, 0.5)
    /^oklch\(\s*[0-9]*\.?[0-9]+\s+[0-9]*\.?[0-9]+\s+[0-9]*\.?[0-9]+\s*\)$/, // oklch(0.7 0.2 180)
    /^oklab\(\s*[0-9]*\.?[0-9]+\s+[0-9\-]*\.?[0-9]+\s+[0-9\-]*\.?[0-9]+\s*\)$/, // oklab(0.7 0.2 0.1)
  ];
  
  const isPatternMatch = colorPatterns.some(pattern => pattern.test(trimmedColor));
  if (isPatternMatch) return true;
  
  const namedColors = [
    'transparent', 'currentColor', 'inherit', 'initial', 'unset',
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
    'gray', 'grey', 'darkred', 'darkgreen', 'darkblue', 'lightgray', 'lightgrey'
  ];
  
  if (namedColors.includes(trimmedColor.toLowerCase())) return true;
  
  try {
    const testElement = document.createElement('div');
    testElement.style.color = trimmedColor;
    return testElement.style.color !== '';
  } catch {
    return false;
  }
}

function getFallbackColor(key: string): string {
  const fallbackMap: Record<string, string> = {
    'background': '#ffffff',
    'foreground': '#000000',
    'primary': '#3b82f6',
    'primary-foreground': '#ffffff',
    'secondary': '#f1f5f9',
    'secondary-foreground': '#0f172a',
    
    'muted': '#f8fafc',
    'muted-foreground': '#64748b',
    'accent': '#f1f5f9',
    'accent-foreground': '#0f172a',
    'destructive': '#ef4444',
    'destructive-foreground': '#ffffff',
    
    'border': '#e2e8f0',
    'input': '#e2e8f0',
    'ring': '#3b82f6',
    
    'card': '#ffffff',
    'card-foreground': '#000000',
    'popover': '#ffffff',
    'popover-foreground': '#000000',
    
    'chart-1': '#3b82f6',
    'chart-2': '#10b981',
    'chart-3': '#f59e0b',
    'chart-4': '#ef4444',
    'chart-5': '#8b5cf6',
    
    'sidebar': '#f8fafc',
    'sidebar-foreground': '#0f172a',
    'sidebar-primary': '#3b82f6',
    'sidebar-primary-foreground': '#ffffff',
    'sidebar-accent': '#f1f5f9',
    'sidebar-accent-foreground': '#0f172a',
    'sidebar-border': '#e2e8f0',
    'sidebar-ring': '#3b82f6',
  };
  
  return fallbackMap[key] || '#000000';
}
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyStyleToElement(
  element: HTMLElement,
  key: string,
  value: string
) {
  if (!element || !key || typeof key !== 'string') {
    console.warn('applyStyleToElement: Invalid element or key provided');
    return;
  }
  
  let sanitizedValue = value;
  if (!isValidColor(value)) {
    console.warn(`applyStyleToElement: Invalid color value "${value}" for key "${key}". Using fallback.`);
    sanitizedValue = getFallbackColor(key);
    
  if (!isValidColor(sanitizedValue)) {
      sanitizedValue = key.includes('foreground') ? '#000000' : '#ffffff';
    }
  }
  
  const currentStyle = element.getAttribute("style") || "";
  const escapedKey = escapeRegExp(key);
  
  const cleanedStyle = currentStyle
    .replace(new RegExp(`--${escapedKey}:\\s*[^;]+;?`, "g"), "")
    .replace(new RegExp(`--color-${escapedKey}:\\s*[^;]+;?`, "g"), "")
    .replace(new RegExp(`--theme-${escapedKey}:\\s*[^;]+;?`, "g"), "")
    .trim();

  const newStyleValue = `${cleanedStyle}--${key}: ${sanitizedValue}; --color-${key}: ${sanitizedValue}; --theme-${key}: ${sanitizedValue};`;
  
  try {
    element.setAttribute("style", newStyleValue);
  } catch (error) {
    console.error(`applyStyleToElement: Failed to apply styles for key "${key}"`, error);
  }
}
