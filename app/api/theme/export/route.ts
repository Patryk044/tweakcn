import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const THEME_DIR = '/app/theme';
const CONFIG_FILE = path.join(THEME_DIR, 'theme-color-config.json');

export async function POST(request: NextRequest) {
  console.log('DEPRECATED: /api/theme/export endpoint used');
  console.log('Please migrate to /api/theme/color-export-unified');
  
  try {
    const data = await request.json();
    
    if (!data.colors || !data.colors.light || !data.colors.dark) {
      return NextResponse.json(
        { error: 'Invalid data structure. Expected colors.light and colors.dark' },
        { status: 400 }
      );
    }
    
    console.log('Converting legacy format to unified format...');
    
    const unifiedData = {
      timestamp: new Date().toISOString(),
      preset: data.preset || 'legacy-export',
      version: '1.0.0',
      colors: {
        light: data.colors.light,
        dark: data.colors.dark
      },
      targets: ['langflow']
    };

    console.log('Redirecting to unified API...');
    
    const unifiedResponse = await fetch(`${request.nextUrl.origin}/api/theme/color-export-unified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(unifiedData),
    });

    if (unifiedResponse.ok) {
      const result = await unifiedResponse.json();
      console.log('Successfully redirected to unified API');
      
      const lightCount = Object.keys(data.colors.light).length;
      const darkCount = Object.keys(data.colors.dark).length;
      
      return NextResponse.json({
        success: true,
        message: 'Theme exported successfully',
        stats: {
          lightColors: lightCount,
          darkColors: darkCount,
          timestamp: unifiedData.timestamp
        },
        _deprecated: 'This endpoint is deprecated. Please use /api/theme/unified-export',
        _unifiedResult: result
      });
    } else {
      console.log('Unified API failed, falling back to legacy implementation');
      
      if (!existsSync(THEME_DIR)) {
        await mkdir(THEME_DIR, { recursive: true });
      }
      
      const exportData = {
        ...data,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
      
      await writeFile(CONFIG_FILE, JSON.stringify(exportData, null, 2));
      
      const lightCount = Object.keys(data.colors.light).length;
      const darkCount = Object.keys(data.colors.dark).length;
      
      console.log(`[TWEAKCN-API] Theme exported: ${lightCount} light + ${darkCount} dark colors`);
      console.log(`[TWEAKCN-API] Config saved to: ${CONFIG_FILE}`);
      
      return NextResponse.json({
        success: true,
        message: 'Theme exported successfully',
        stats: {
          lightColors: lightCount,
          darkColors: darkCount,
          timestamp: exportData.timestamp
        },
        _deprecated: 'This endpoint is deprecated. Please use /api/theme/unified-export',
        _fallback: 'Used legacy implementation due to unified API failure'
      });
    }
    
  } catch (error) {
    console.error('[TWEAKCN-API] Export error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to export theme',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return NextResponse.json({
        exists: false,
        message: 'No theme config found'
      });
    }
    
    return NextResponse.json({
      exists: true,
      path: CONFIG_FILE,
      message: 'Theme config exists'
    });
    
  } catch (error) {
    console.error('[TWEAKCN-API] Check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check theme config',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
