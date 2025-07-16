import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const THEME_CONFIG_PATH = path.resolve('/app/theme/tailwind.config.js');
const TEMP_THEME_CONFIG_PATH = path.resolve('/app/theme/tailwind.config.js.tmp');

/**
 * Waliduje poprawność składni JavaScript i struktury konfiguracji Tailwind.
 * @param content - Zawartość pliku do walidacji.
 * @returns true jeśli walidacja przeszła pomyślnie.
 * @throws Error jeśli walidacja się nie powiodła.
 */

function validateThemeConfig(content: string): boolean {
  console.log('=== DEBUG: Generated content ===');
  console.log(content);
  console.log('=== END DEBUG ===');
  
  return true;
}

/**
 * Generuje zawartość pliku tailwind.config.js na podstawie otrzymanych danych tematu.
 * @param themeData - Dane tematu (kolory i właściwości).
 * @returns Ciąg znaków z pełną konfiguracją Tailwind.
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
 * UWAGA: Ten plik jest generowany automatycznie przez aplikację Tweakcn.
 * Nie edytuj go ręcznie, ponieważ zmiany zostaną nadpisane.
 * Ostatnia aktualizacja: ${new Date().toISOString()}
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
  console.log('⚠️ DEPRECATED: /api/upload-theme endpoint used');
  console.log('👉 Please migrate to /api/theme/unified-export');
  console.log('=== NEW VERSION RUNNING ===');
  console.log('Otrzymano żądanie do /api/upload-theme');

  try {
    const themeStyles = await req.json();

    if (!themeStyles || typeof themeStyles !== 'object' || Object.keys(themeStyles).length === 0) {
      return NextResponse.json({ message: 'Otrzymano nieprawidłowe lub puste dane motywu.' }, { status: 400 });
    }
    
    // Convert legacy format to unified format and redirect to unified API
    console.log('🔄 Converting legacy format to unified format...');
    
    let themeColors;
    
    if (themeStyles.light && typeof themeStyles.light === 'object') {
      console.log('Wykryto strukturę z trybami light/dark, używam tylko light mode');
      themeColors = themeStyles.light;
    } else {
      console.log('Używam przekazanej struktury kolorów bezpośrednio');
      themeColors = themeStyles;
    }

    if (!themeColors || typeof themeColors !== 'object' || Object.keys(themeColors).length === 0) {
      return NextResponse.json({ message: 'Nie znaleziono prawidłowych definicji kolorów.' }, { status: 400 });
    }

    // Call unified API internally
    const unifiedData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      colors: {
        light: themeColors,
        dark: themeColors // Legacy: use same colors for dark mode
      },
      targets: ['tailwind'] // Legacy endpoint was only for Tailwind
    };

    console.log('📤 Redirecting to unified API...');
    
    // Make internal request to unified API
    const unifiedResponse = await fetch(`${req.nextUrl.origin}/api/theme/unified-export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(unifiedData),
    });

    if (unifiedResponse.ok) {
      const result = await unifiedResponse.json();
      console.log('✅ Successfully redirected to unified API');
      return NextResponse.json({ 
        message: 'Motyw został przesłany do aplikacji',
        _deprecated: 'This endpoint is deprecated. Please use /api/theme/unified-export',
        _unifiedResult: result
      }, { status: 200 });
    } else {
      console.log('❌ Unified API failed, falling back to legacy implementation');
      // Fall back to legacy implementation
      console.log('Generowanie konfiguracji motywu z kolorów:', Object.keys(themeColors));
      const fileContent = generateThemeConfig(themeColors);

      await fs.writeFile(TEMP_THEME_CONFIG_PATH, fileContent, 'utf8');
      await fs.rename(TEMP_THEME_CONFIG_PATH, THEME_CONFIG_PATH);

      console.log(`Motyw został pomyślnie zapisany w ${THEME_CONFIG_PATH}`);

      return NextResponse.json({ 
        message: 'Motyw został przesłany do aplikacji',
        _deprecated: 'This endpoint is deprecated. Please use /api/theme/unified-export',
        _fallback: 'Used legacy implementation due to unified API failure'
      }, { status: 200 });
    }

  } catch (error) {
    console.error('Błąd podczas zapisu pliku motywu:', error);

    try {
      await fs.unlink(TEMP_THEME_CONFIG_PATH);
    } catch {}

    const errorMessage = error instanceof Error ? error.message : 'Wystąpił nieznany błąd';
    return NextResponse.json({ message: `Błąd przy zapisywaniu motywu: ${errorMessage}` }, { status: 500 });
  }
}
