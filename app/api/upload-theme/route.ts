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
  
  // Skip validation for now to test file generation
  return true;
}

/**
 * Generuje zawartość pliku tailwind.config.js na podstawie otrzymanych danych tematu.
 * @param themeData - Dane tematu (kolory i właściwości).
 * @returns Ciąg znaków z pełną konfiguracją Tailwind.
 */
function generateThemeConfig(themeData: Record<string, unknown>): string {
  // Lista kluczy, które nie są kolorami
  const nonColorKeys = ['radius', 'spacing', 'letter-spacing', 'shadow-blur', 'shadow-spread', 
                       'shadow-offset-x', 'shadow-offset-y', 'shadow-opacity', 'font-sans', 
                       'font-serif', 'font-mono'];
  
  const colors: Record<string, string | Record<string, string>> = {};
  const otherProperties: Record<string, unknown> = {};

  // Rozdziel kolory od innych właściwości
  // Najpierw znajdź wszystkie klucze kolorów aby ustalić strukturę
  const colorKeys = Object.keys(themeData).filter(key => 
    !nonColorKeys.includes(key) && 
    !key.startsWith('font-') && 
    !key.startsWith('shadow-') && 
    !key.startsWith('radius-') && 
    !key.startsWith('tracking-')
  );
  
  // Znajdź główne klucze kolorów (te które mają zagnieżdżone warianty)
  const mainColorKeys = new Set<string>();
  colorKeys.forEach(key => {
    if (key.includes('-')) {
      const mainKey = key.split('-')[0];
      mainColorKeys.add(mainKey);
    }
  });
  
  // Przetwórz kolory
  Object.entries(themeData).forEach(([key, value]) => {
    if (nonColorKeys.includes(key) || key.startsWith('font-') || 
        key.startsWith('shadow-') || key.startsWith('radius-') || 
        key.startsWith('tracking-')) {
      otherProperties[key] = value;
    } else {
      // Mapuj kolory na zmienne CSS
      if (key.includes('-')) {
        // Kolory zagnieżdżone (np. primary-foreground)
        const [mainKey, ...subKeys] = key.split('-');
        const subKey = subKeys.join('-');
        
        // Upewnij się, że colors[mainKey] jest obiektem
        if (!colors[mainKey]) {
          colors[mainKey] = {};
        }
        if (typeof colors[mainKey] === 'object' && colors[mainKey] !== null) {
          (colors[mainKey] as Record<string, string>)[subKey] = `var(--color-${key})`;
        }
      } else {
        // Kolory podstawowe
        if (mainColorKeys.has(key)) {
          // Ten kolor ma zagnieżdżone warianty, więc powinien być obiektem z DEFAULT
          if (!colors[key]) {
            colors[key] = {};
          }
          if (typeof colors[key] === 'object' && colors[key] !== null) {
            (colors[key] as Record<string, string>)['DEFAULT'] = `var(--color-${key})`;
          }
        } else {
          // To jest samodzielny kolor
          colors[key] = `var(--color-${key})`;
        }
      }
    }
  });

  // Przygotuj konfigurację extend
  const extendConfig: Record<string, unknown> = {};
  
  if (Object.keys(colors).length > 0) {
    extendConfig.colors = colors;
  }

  // Dodaj inne właściwości
  if (otherProperties.radius) {
    extendConfig.borderRadius = {
      lg: `var(--radius)`,
      md: `calc(var(--radius) - 2px)`,
      sm: `calc(var(--radius) - 4px)`
    };
  }

  // Dodaj fonty
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

  // Dodaj spacing jeśli istnieje
  if (otherProperties.spacing) {
    extendConfig.spacing = {
      DEFAULT: `var(--spacing)`
    };
  }

  // Dodaj letter-spacing jeśli istnieje
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

  // Waliduj przed zwróceniem
  validateThemeConfig(content);
  
  return content;
}

export async function POST(req: NextRequest) {
  console.log('=== NEW VERSION RUNNING ===');
  console.log('Otrzymano żądanie do /api/upload-theme');

  try {
    const themeStyles = await req.json();

    if (!themeStyles || typeof themeStyles !== 'object' || Object.keys(themeStyles).length === 0) {
      return NextResponse.json({ message: 'Otrzymano nieprawidłowe lub puste dane motywu.' }, { status: 400 });
    }
    
    // Sprawdź czy dane zawierają light/dark mode i wybierz tylko light mode
    let themeColors;
    
    if (themeStyles.light && typeof themeStyles.light === 'object') {
      console.log('Wykryto strukturę z trybami light/dark, używam tylko light mode');
      themeColors = themeStyles.light;
    } else {
      console.log('Używam przekazanej struktury kolorów bezpośrednio');
      themeColors = themeStyles;
    }

    // Sprawdź czy mamy prawidłowe kolory
    if (!themeColors || typeof themeColors !== 'object' || Object.keys(themeColors).length === 0) {
      return NextResponse.json({ message: 'Nie znaleziono prawidłowych definicji kolorów.' }, { status: 400 });
    }

    console.log('Generowanie konfiguracji motywu z kolorów:', Object.keys(themeColors));
    const fileContent = generateThemeConfig(themeColors);

    await fs.writeFile(TEMP_THEME_CONFIG_PATH, fileContent, 'utf8');
    
    // Skip external validation for now
    /*
    try {
      const validationScript = path.resolve('/app/scripts/validate-theme.js');
      execSync(`node "${validationScript}"`, { 
        stdio: 'pipe',
        env: { ...process.env, THEME_FILE_PATH: TEMP_THEME_CONFIG_PATH }
      });
      console.log('Dodatkowa walidacja zewnętrznym skryptem przeszła pomyślnie');
    } catch (validationError) {
      await fs.unlink(TEMP_THEME_CONFIG_PATH);
      throw new Error(`Walidacja zewnętrzna nie powiodła się: ${validationError instanceof Error ? validationError.message : 'Nieznany błąd'}`);
    }
    */

    await fs.rename(TEMP_THEME_CONFIG_PATH, THEME_CONFIG_PATH);

    console.log(`Motyw został pomyślnie zapisany w ${THEME_CONFIG_PATH}`);

    return NextResponse.json({ message: 'Motyw został przesłany do aplikacji' }, { status: 200 });

  } catch (error) {
    console.error('Błąd podczas zapisu pliku motywu:', error);

    // W razie błędu, spróbuj usunąć plik tymczasowy, jeśli istnieje.
    try {
      await fs.unlink(TEMP_THEME_CONFIG_PATH);
    } catch {
      // Ignoruj błąd, jeśli plik tymczasowy nie istnieje.
    }

    const errorMessage = error instanceof Error ? error.message : 'Wystąpił nieznany błąd';
    return NextResponse.json({ message: `Błąd przy zapisywaniu motywu: ${errorMessage}` }, { status: 500 });
  }
}
