import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const THEME_DIR = '/app/theme';
const CONFIG_FILE = path.join(THEME_DIR, 'tweakcn-config.json');
const TAILWIND_CONFIG_PATH = path.resolve('/app/theme/tailwind.config.js');
const TEMP_TAILWIND_CONFIG_PATH = path.resolve('/app/theme/tailwind.config.js.tmp');

interface UnifiedThemeData {
  timestamp: string;
  preset?: string;
  version: string;
  colors: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  targets: string[];
}


function validateThemeData(data: unknown): data is UnifiedThemeData {
  return (
    data &&
    typeof data === 'object' &&
    data !== null &&
    'colors' in data &&
    data.colors &&
    typeof data.colors === 'object' &&
    data.colors !== null &&
    'light' in data.colors &&
    data.colors.light &&
    typeof data.colors.light === 'object' &&
    'dark' in data.colors &&
    data.colors.dark &&
    typeof data.colors.dark === 'object' &&
    'targets' in data &&
    Array.isArray(data.targets) &&
    data.targets.length > 0
  );
}

function generateTailwindConfig(lightColors: Record<string, string>): string {
  const nonColorKeys = ['radius', 'spacing', 'letter-spacing', 'shadow-blur', 'shadow-spread', 
                       'shadow-offset-x', 'shadow-offset-y', 'shadow-opacity', 'font-sans', 
                       'font-serif', 'font-mono'];
  
  const colors: Record<string, string | Record<string, string>> = {};
  const otherProperties: Record<string, unknown> = {};

  const colorKeys = Object.keys(lightColors).filter(key => 
    !nonColorKeys.includes(key) && 
    !key.startsWith('font-') && 
    !key.startsWith('shadow-') && 
    !key.startsWith('radius-') && 
    !key.startsWith('tracking-')
  );
  
  const mainColorKeys = new Set<string>();
  colorKeys.forEach(key => {
    if (key.includes('-')) {
      const mainKey = key.split('-')[0];
      mainColorKeys.add(mainKey);
    }
  });
  
  Object.entries(lightColors).forEach(([key, value]) => {
    if (nonColorKeys.includes(key) || key.startsWith('font-') || 
        key.startsWith('shadow-') || key.startsWith('radius-') || 
        key.startsWith('tracking-')) {
      otherProperties[key] = value;
    } else {
      if (key.includes('-')) {
        const [mainKey, ...subKeys] = key.split('-');
        const subKey = subKeys.join('-');

        if (!colors[mainKey]) {
          colors[mainKey] = {};
        }
        if (typeof colors[mainKey] === 'object' && colors[mainKey] !== null) {
          (colors[mainKey] as Record<string, string>)[subKey] = `var(--color-${key})`;
        }
      } else {
        if (mainColorKeys.has(key)) {
          if (!colors[key]) {
            colors[key] = {};
          }
          if (typeof colors[key] === 'object' && colors[key] !== null) {
            (colors[key] as Record<string, string>)['DEFAULT'] = `var(--color-${key})`;
          }
        } else {
          colors[key] = `var(--color-${key})`;
        }
      }
    }
  });

  const extendConfig: Record<string, unknown> = {};
  
  if (Object.keys(colors).length > 0) {
    extendConfig.colors = colors;
  }

  if (otherProperties.radius) {
    extendConfig.borderRadius = {
      lg: `var(--radius)`,
      md: `calc(var(--radius) - 2px)`,
      sm: `calc(var(--radius) - 4px)`
    };
  }

  const fontFamily: Record<string, string> = {};
  Object.entries(otherProperties).forEach(([key, _value]) => {
    if (key.startsWith('font-')) {
      const fontType = key.replace('font-', '');
      fontFamily[fontType] = `var(--${key})`;
    }
  });
  if (Object.keys(fontFamily).length > 0) {
    extendConfig.fontFamily = fontFamily;
  }

  if (otherProperties['letter-spacing']) {
    extendConfig.letterSpacing = {
      DEFAULT: `var(--letter-spacing)`
    };
  }

  const prettyExtendConfig = JSON.stringify(extendConfig, null, 6);

  const content = `/**
 * @type {import('tailwindcss').Config}
 *
 * UWAGA: Ten plik jest generowany automatycznie przez Unified Theme Export API.
 * Nie edytuj go ręcznie, ponieważ zmiany zostaną nadpisane.
 * Ostatnia aktualizacja: ${new Date().toISOString()}
 * 
 * System: Unified Theme Export
 * Źródło: tweakcn editor
 * Cele: ${lightColors ? 'Tailwind Config' : 'Unknown'}
 */
module.exports = {
  theme: {
    extend: ${prettyExtendConfig.replace(/"var\(([^"]+)\)"/g, '"var($1)"')},
  },
  plugins: [],
};
`;

  return content;
}

async function exportToLangflow(data: UnifiedThemeData): Promise<boolean> {
  try {
    if (!existsSync(THEME_DIR)) {
      await mkdir(THEME_DIR, { recursive: true });
    }
    
    await writeFile(CONFIG_FILE, JSON.stringify(data, null, 2));
    
    const { langflowColorExporter } = await import('@/utils/theme-exporter-langflow');
    const cssOverride = langflowColorExporter.generateLangflowCSS(data.colors.light, data.colors.dark);
    const cssOverridePath = path.join(THEME_DIR, 'langflow-override.css');
    
    await writeFile(cssOverridePath, cssOverride);
    
    const timestamp = Date.now();
    const signalPath = path.join(THEME_DIR, 'theme-changed.signal');
    await writeFile(signalPath, timestamp.toString());
    
    console.log('[UNIFIED-API] Langflow config saved to:', CONFIG_FILE);
    console.log('[UNIFIED-API] Langflow CSS override saved to:', cssOverridePath);
    console.log('[UNIFIED-API] Theme change signal created');
    console.log(`[UNIFIED-API] Colors: ${Object.keys(data.colors.light).length} light + ${Object.keys(data.colors.dark).length} dark`);
    
    return true;
  } catch (error) {
    console.error('[UNIFIED-API] Langflow export error:', error);
    return false;
  }
}

async function exportToOpenWebUI(data: UnifiedThemeData): Promise<boolean> {
  try {
    if (!existsSync(THEME_DIR)) {
      await mkdir(THEME_DIR, { recursive: true });
    }
    
    const { openWebUIColorExporter } = await import('@/utils/theme-exporter-openwebui');
    const cssOverride = openWebUIColorExporter.generateOpenWebUICSS(data.colors.light, data.colors.dark);
    
    // Ensure output directory exists for the main output
    const outputDir = path.join(THEME_DIR, 'output');
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    // Primary location: output directory (this is what OpenWebUI container should read)
    const cssOutputPath = path.join(outputDir, 'openwebui-override.css');
    
    // Secondary location: root theme dir for backward compatibility
    const cssOverridePath = path.join(THEME_DIR, 'openwebui-override.css');

    await writeFile(cssOutputPath, cssOverride);
    await writeFile(cssOverridePath, cssOverride);
    
    const timestamp = Date.now();
    const outputSignalPath = path.join(outputDir, 'openwebui-theme-changed.signal');
    const signalPath = path.join(THEME_DIR, 'openwebui-theme-changed.signal');
    
    await writeFile(outputSignalPath, timestamp.toString());
    await writeFile(signalPath, timestamp.toString());
    
    console.log('[UNIFIED-API] OpenWebUI config saved to:', cssOutputPath);
    console.log('[UNIFIED-API] OpenWebUI config also saved to:', cssOverridePath);
    console.log('[UNIFIED-API] OpenWebUI theme change signal created');
    console.log(`[UNIFIED-API] OpenWebUI colors: ${Object.keys(data.colors.light).length} light + ${Object.keys(data.colors.dark).length} dark`);
    
    return true;
  } catch (error) {
    console.error('[UNIFIED-API] OpenWebUI export error:', error);
    return false;
  }
}

async function exportToTailwind(data: UnifiedThemeData): Promise<boolean> {
  try {
    const fileContent = generateTailwindConfig(data.colors.light);
    
    await writeFile(TEMP_TAILWIND_CONFIG_PATH, fileContent, 'utf8');
    await writeFile(TAILWIND_CONFIG_PATH, fileContent, 'utf8');
    
    console.log('[UNIFIED-API] Tailwind config saved to:', TAILWIND_CONFIG_PATH);
    console.log(`[UNIFIED-API] Tailwind colors: ${Object.keys(data.colors.light).length} properties`);
    
    try {
      await writeFile(TEMP_TAILWIND_CONFIG_PATH, '', 'utf8');
    } catch {}
    
    return true;
  } catch (error) {
    console.error('[UNIFIED-API] Tailwind export error:', error);
    
    try {
      await writeFile(TEMP_TAILWIND_CONFIG_PATH, '', 'utf8');
    } catch {}
    
    return false;
  }
}

export async function POST(request: NextRequest) {
  console.log('[UNIFIED-API] Unified Theme Export request received');
  
  try {
    const data = await request.json();
    
    if (!data.colors && !data.targets) {
      console.log('[UNIFIED-API] Converting legacy format to unified format');
      
      const legacyData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        colors: {
          light: data,
          dark: data 
        },
        targets: ['all']
      };
      
      console.log(`[UNIFIED-API] Legacy export targets: ${legacyData.targets.join(', ')}`);
      console.log(`[UNIFIED-API] Light colors: ${Object.keys(legacyData.colors.light).length}`);
      console.log(`[UNIFIED-API] Dark colors: ${Object.keys(legacyData.colors.dark).length}`);
      
      const results: Record<string, boolean> = {};
      const targetList = legacyData.targets.includes('all') 
        ? ['langflow', 'openwebui', 'tailwind'] 
        : legacyData.targets;
      
      for (const target of targetList) {
        switch (target) {
          case 'langflow':
            results.langflow = await exportToLangflow(legacyData);
            break;
          case 'openwebui':
            results.openwebui = await exportToOpenWebUI(legacyData);
            break;
          case 'tailwind':
            results.tailwind = await exportToTailwind(legacyData);
            break;
          default:
            console.warn(`[UNIFIED-API] Unknown target: ${target}`);
            results[target] = false;
        }
      }
      
      const successCount = Object.values(results).filter(Boolean).length;
      const totalCount = Object.keys(results).length;
      
      if (successCount === totalCount) {
        console.log(`[UNIFIED-API] All legacy exports successful (${successCount}/${totalCount})`);
        return NextResponse.json({ 
          message: 'Legacy theme exported successfully to all targets',
          targets: targetList,
          results,
          success: true
        }, { status: 200 });
      } else if (successCount > 0) {
        console.log(`[UNIFIED-API] Legacy partial success (${successCount}/${totalCount})`);
        return NextResponse.json({
          message: `Legacy theme exported with partial success (${successCount}/${totalCount})`,
          targets: targetList,
          results,
          success: false
        }, { status: 207 });
      } else {
        console.error(`[UNIFIED-API] All legacy exports failed (0/${totalCount})`);
        return NextResponse.json({
          message: 'All legacy theme exports failed',
          targets: targetList,
          results,
          success: false
        }, { status: 500 });
      }
    }

    if (!validateThemeData(data)) {
      return NextResponse.json({ 
        error: 'Invalid theme data structure',
        expected: {
          colors: { light: {}, dark: {} },
          targets: ['langflow', 'tailwind', 'all']
        }
      }, { status: 400 });
    }
    
    console.log(`[UNIFIED-API] Export targets: ${data.targets.join(', ')}`);
    console.log(`[UNIFIED-API] Light colors: ${Object.keys(data.colors.light).length}`);
    console.log(`[UNIFIED-API] Dark colors: ${Object.keys(data.colors.dark).length}`);
    
    const results: Record<string, boolean> = {};
    const targetList = data.targets.includes('all') 
      ? ['langflow', 'openwebui', 'tailwind'] 
      : data.targets;
    
    for (const target of targetList) {
      switch (target) {
        case 'langflow':
          results.langflow = await exportToLangflow(data);
          break;
        case 'openwebui':
          results.openwebui = await exportToOpenWebUI(data);
          break;
        case 'tailwind':
          results.tailwind = await exportToTailwind(data);
          break;
        default:
          console.warn(`[UNIFIED-API] Unknown target: ${target}`);
          results[target] = false;
      }
    }
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    if (successCount === totalCount) {
      console.log(`[UNIFIED-API] All exports successful (${successCount}/${totalCount})`);
      return NextResponse.json({
        message: 'Theme exported successfully to all targets',
        targets: targetList,
        results,
        success: true
      }, { status: 200 });
    } else if (successCount > 0) {
      console.log(`[UNIFIED-API] Partial success (${successCount}/${totalCount})`);
      return NextResponse.json({
        message: `Theme exported with partial success (${successCount}/${totalCount})`,
        targets: targetList,
        results,
        success: false
      }, { status: 207 });
    } else {
      console.error(`[UNIFIED-API] All exports failed (0/${totalCount})`);
      return NextResponse.json({
        message: 'All theme exports failed',
        targets: targetList,
        results,
        success: false
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[UNIFIED-API] Unified export error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      message: `Unified theme export failed: ${errorMessage}`,
      success: false
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Unified Theme Export API',
    version: '1.0.0',
    endpoints: {
      POST: 'Export theme to multiple targets',
    },
    supportedTargets: ['langflow', 'openwebui', 'tailwind', 'all'],
    formats: {
      unified: {
        colors: { light: {}, dark: {} },
        targets: ['langflow'],
        timestamp: 'ISO string',
        version: 'string'
      },
      legacy: 'Raw colors object (auto-converted)'
    }
  });
}
