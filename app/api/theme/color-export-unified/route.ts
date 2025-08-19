import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const THEME_DIR = process.env.TWEAKCN_THEME_DIR || '/app/theme';
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
  dashyDarkStrategy?: 'class' | 'media';
}

function validateThemeData(data: unknown): data is UnifiedThemeData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  if (!('colors' in d) || typeof d.colors !== 'object' || d.colors === null) return false;
  const colors = d.colors as Record<string, unknown>;
  if (!('light' in colors) || typeof colors.light !== 'object' || colors.light === null) return false;
  if (!('dark' in colors) || typeof colors.dark !== 'object' || colors.dark === null) return false;

  if (!('targets' in d) || !Array.isArray(d.targets) || d.targets.length === 0) return false;

  if (!('timestamp' in d) || typeof d.timestamp !== 'string') return false;
  if (!('version' in d) || typeof d.version !== 'string') return false;

  return true;
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
 * NOTE: This file is generated automatically by Unified Theme Export API.
 * Do not edit it manually, as changes will be overwritten.
 * Last updated: ${new Date().toISOString()}
 *
 * System: Unified Theme Export
 * Source: tweakcn editor
 * Purpose: ${lightColors ? 'Tailwind Config' : 'Unknown'}
 */
module.exports = {
  theme: {
    extend: ${prettyExtendConfig.replace(/"var\(([^\"]+?)\)"/g, '"var($1)"')},
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
    
    const outputDir = path.join(THEME_DIR, 'output');
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }
    
    const cssOutputPath = path.join(outputDir, 'openwebui-override.css');
    
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

async function exportToLiteLLM(data: UnifiedThemeData): Promise<boolean> {
  try {
    if (!existsSync(THEME_DIR)) {
      await mkdir(THEME_DIR, { recursive: true });
    }
    
    const { litellmColorExporter } = await import('@/utils/theme-exporter-litellm');
    
    // Generate CSS override
    const cssOverride = litellmColorExporter.generateLiteLLMCSS(data.colors.light, data.colors.dark);
    const cssOverridePath = path.join(THEME_DIR, 'litellm-override.css');
    await writeFile(cssOverridePath, cssOverride);
    
    // Generate JSON UI colors
    const jsonData = litellmColorExporter.generateLiteLLMJson(data.colors.light);
    const jsonPath = path.join(THEME_DIR, 'litellm-ui-colors.json');
    await writeFile(jsonPath, jsonData);
    
    // Create signal file
    const timestamp = Date.now();
    const signalPath = path.join(THEME_DIR, 'litellm-theme-changed.signal');
    await writeFile(signalPath, timestamp.toString());
    
    console.log('[UNIFIED-API] LiteLLM CSS override saved to:', cssOverridePath);
    console.log('[UNIFIED-API] LiteLLM UI colors JSON saved to:', jsonPath);
    console.log('[UNIFIED-API] LiteLLM theme change signal created');
    console.log(`[UNIFIED-API] LiteLLM colors: ${Object.keys(data.colors.light).length} light + ${Object.keys(data.colors.dark).length} dark`);
    
    return true;
  } catch (error) {
    console.error('[UNIFIED-API] LiteLLM export error:', error);
    return false;
  }
}

async function exportToDashy(data: UnifiedThemeData): Promise<boolean> {
  try {
    if (!existsSync(THEME_DIR)) {
      await mkdir(THEME_DIR, { recursive: true });
    }
    const { dashyColorExporter } = await import('../../../../utils/theme-exporter-dashy');
    const darkModeStrategy: 'class' | 'media' = data.dashyDarkStrategy === 'class' ? 'class' : 'media';
    const cssOverride = dashyColorExporter.generateDashyCSS(data.colors.light, data.colors.dark, { darkModeStrategy });
    const yamlSnippet = dashyColorExporter.generateDashyYAML(data.colors.light, data.colors.dark);
    const scssTheme = dashyColorExporter.generateUserDefinedThemesSCSS(data.colors.light, data.colors.dark);

    const cssPath = path.join(THEME_DIR, 'dashy-override.css');
    const yamlPath = path.join(THEME_DIR, 'dashy-theme-snippet.yml');
    const scssPath = path.join(THEME_DIR, 'user-defined-themes.scss');
    const tmpCss = cssPath + '.tmp';
    const tmpYaml = yamlPath + '.tmp';
    const tmpScss = scssPath + '.tmp';

    await writeFile(tmpCss, cssOverride, 'utf8');
    await writeFile(tmpYaml, yamlSnippet, 'utf8');
    await writeFile(tmpScss, scssTheme, 'utf8');
    await writeFile(cssPath, cssOverride, 'utf8');
    await writeFile(yamlPath, yamlSnippet, 'utf8');
    await writeFile(scssPath, scssTheme, 'utf8');

    try { await writeFile(tmpCss, '', 'utf8'); } catch {}
    try { await writeFile(tmpYaml, '', 'utf8'); } catch {}
    try { await writeFile(tmpScss, '', 'utf8'); } catch {}

    const timestamp = Date.now();
    const signalPath = path.join(THEME_DIR, 'dashy-theme-changed.signal');
    await writeFile(signalPath, timestamp.toString());
    console.log('[UNIFIED-API] Dashy CSS + YAML + SCSS override saved');
    return true;
  } catch (error) {
    console.error('[UNIFIED-API] Dashy export error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  console.log('[UNIFIED-API] Unified Theme Export request received');
  
  try {
    const rawData: unknown = await request.json();
    
    // Legacy format: plain colors object (no colors/targets keys)
    if (typeof rawData === 'object' && rawData !== null && !('colors' in rawData) && !('targets' in rawData)) {
      console.log('[UNIFIED-API] Converting legacy format to unified format');
      const legacyColors = rawData as Record<string, string>;
      const legacyData: UnifiedThemeData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        colors: {
          light: legacyColors,
          dark: legacyColors 
        },
        targets: ['all']
      };
      
      console.log(`[UNIFIED-API] Legacy export targets: ${legacyData.targets.join(', ')}`);
      console.log(`[UNIFIED-API] Light colors: ${Object.keys(legacyData.colors.light).length}`);
      console.log(`[UNIFIED-API] Dark colors: ${Object.keys(legacyData.colors.dark).length}`);
      
      const results: Record<string, boolean> = {};
      const targetList = legacyData.targets.includes('all') 
        ? ['langflow', 'openwebui', 'tailwind', 'litellm', 'dashy'] 
        : legacyData.targets;
      
      for (const target of targetList) {
        switch (target) {
          case 'langflow':
            results.langflow = await exportToLangflow(legacyData);
            break;
          case 'openwebui':
            results.openwebui = await exportToOpenWebUI(legacyData);
            break;
          case 'litellm':
            results.litellm = await exportToLiteLLM(legacyData);
            break;
          case 'tailwind':
            results.tailwind = await exportToTailwind(legacyData);
            break;
          case 'dashy':
            results.dashy = await exportToDashy(legacyData);
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

    if (!validateThemeData(rawData)) {
      return NextResponse.json({ 
        error: 'Invalid theme data structure',
        expected: {
          colors: { light: {}, dark: {} },
          targets: ['langflow', 'tailwind', 'all']
        }
      }, { status: 400 });
    }

    const data = rawData; // now narrowed by type guard
    
    console.log(`[UNIFIED-API] Export targets: ${data.targets.join(', ')}`);
    console.log(`[UNIFIED-API] Light colors: ${Object.keys(data.colors.light).length}`);
    console.log(`[UNIFIED-API] Dark colors: ${Object.keys(data.colors.dark).length}`);
    
    const results: Record<string, boolean> = {};
    const targetList = data.targets.includes('all') 
      ? ['langflow', 'openwebui', 'tailwind', 'litellm', 'dashy'] 
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
        case 'litellm':
          results.litellm = await exportToLiteLLM(data);
          break;
        case 'dashy':
          results.dashy = await exportToDashy(data);
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
    supportedTargets: ['langflow', 'openwebui', 'tailwind', 'litellm', 'dashy', 'all'],
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
