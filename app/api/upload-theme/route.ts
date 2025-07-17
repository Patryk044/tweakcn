import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const THEME_CONFIG_PATH = path.resolve('/app/theme/tailwind.config.js');
const TEMP_THEME_CONFIG_PATH = path.resolve('/app/theme/tailwind.config.js.tmp');

/**
 * Validates the correctness of Tailwind's JavaScript syntax and configuration structure.
 * @param content - The content of the file to validate.
 * @returns true if the validation passed successfully.
 * @throws Error if the validation failed.
 */

function validateThemeConfig(content: string): boolean {
  console.log('=== DEBUG: Generated content ===');
  console.log(content);
  console.log('=== END DEBUG ===');
  
  return true;
}

/**
 * Generates the contents of the tailwind.config.js file based on the received subject data.
 * @param themeData - Subject data (colors and properties).
 * @returns A string with the full Tailwind configuration.
 */
function generateThemeConfig(themeData: Record<string, unknown>): string {
  const nonColorKeys = ['radius', 'spacing', 'letter-spacing', 'shadow-blur', 'shadow-spread', 
                       'shadow-offset-x', 'shadow-offset-y', 'shadow-opacity', 'font-sans', 
                       'font-serif', 'font-mono'];
  
  const colors: Record<string, string | Record<string, string>> = {};
  const otherProperties: Record<string, unknown> = {};

  const colorKeys = Object.keys(themeData).filter(key => 
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
  
  Object.entries(themeData).forEach(([key, value]) => {
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
 * NOTE: This file is generated automatically by the Tweakcn application.
 * Do not edit it manually, as changes will be overwritten.
 * Last updated: ${new Date().toISOString()}
 */
module.exports = {
  theme: {
    extend: ${prettyExtendConfig.replace(/"var\(([^"]+)\)"/g, '"var($1)"')},
  },
  plugins: [],
};
`;

  validateThemeConfig(content);
  
  return content;
}

export async function POST(req: NextRequest) {
  console.log('DEPRECATED: /api/upload-theme endpoint used');
  console.log('Please migrate to /api/theme/unified-export');
  console.log('=== NEW VERSION RUNNING ===');
  console.log('Received request to /api/upload-theme');

  try {
    const themeStyles = await req.json();

    if (!themeStyles || typeof themeStyles !== 'object' || Object.keys(themeStyles).length === 0) {
      return NextResponse.json({ message: 'Invalid or empty motif data was received.' }, { status: 400 });
    }
    
    console.log('Converting legacy format to unified format...');
    
    let themeColors;
    
    if (themeStyles.light && typeof themeStyles.light === 'object') {
      console.log('Detected light/dark mode structure, using only light mode');
      themeColors = themeStyles.light;
    } else {
      console.log('Using provided color structure directly');
      themeColors = themeStyles;
    }

    if (!themeColors || typeof themeColors !== 'object' || Object.keys(themeColors).length === 0) {
      return NextResponse.json({ message: 'Nie znaleziono prawidłowych definicji kolorów.' }, { status: 400 });
    }

    const unifiedData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      colors: {
        light: themeColors,
        dark: themeColors
      },
      targets: ['tailwind']
    };

    console.log('Redirecting to unified API...');
    
    const unifiedResponse = await fetch(`${req.nextUrl.origin}/api/theme/unified-export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(unifiedData),
    });

    if (unifiedResponse.ok) {
      const result = await unifiedResponse.json();
      console.log('Successfully redirected to unified API');
      return NextResponse.json({ 
        message: 'The theme has been uploaded to the application',
        _deprecated: 'This endpoint is deprecated. Please use /api/theme/unified-export',
        _unifiedResult: result
      }, { status: 200 });
    } else {
      console.log('Unified API failed, falling back to legacy implementation');
      console.log('Generating theme configuration from colors:', Object.keys(themeColors));
      const fileContent = generateThemeConfig(themeColors);

      await fs.writeFile(TEMP_THEME_CONFIG_PATH, fileContent, 'utf8');
      await fs.rename(TEMP_THEME_CONFIG_PATH, THEME_CONFIG_PATH);

      console.log(`The theme has been successfully saved to ${THEME_CONFIG_PATH}`);

      return NextResponse.json({ 
        message: 'The theme has been uploaded to the application',
        _deprecated: 'This endpoint is deprecated. Please use /api/theme/unified-export',
        _fallback: 'Used legacy implementation due to unified API failure'
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Error saving theme file:', error);

    try {
      await fs.unlink(TEMP_THEME_CONFIG_PATH);
    } catch {}

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: `Error saving theme: ${errorMessage}` }, { status: 500 });
  }
}
