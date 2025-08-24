import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(_request: NextRequest) {
  console.log('[WEBHOOK] Dashy theme integration webhook triggered');
  
  try {
    console.log('[WEBHOOK] Triggering Dashy rebuild for SCSS compilation...');
    
    const child = spawn('docker', ['exec', 'chatbot-dashy-1', 'npm', 'run', 'build'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    const exitPromise = new Promise<number>((resolve) => {
      child.on('close', (code) => {
        resolve(code || 0);
      });
    });
    
    const timeoutPromise = new Promise<number>((resolve) => {
      setTimeout(() => resolve(-1), 30000); // 30 second timeout for build
    });
    
    const exitCode = await Promise.race([exitPromise, timeoutPromise]);
    
    if (exitCode === -1) {
      console.log('[WEBHOOK] Dashy rebuild timed out (still running in background)');
      return NextResponse.json({
        success: true,
        message: 'Dashy rebuild started (running in background)',
        status: 'background'
      });
    }
    
    if (exitCode === 0) {
      console.log('[WEBHOOK] Dashy rebuild completed successfully');
      console.log('[WEBHOOK] Build output:', output.slice(-500)); // Last 500 chars
      
      return NextResponse.json({
        success: true,
        message: 'Dashy theme integration and rebuild completed successfully',
        status: 'completed',
        output: output.slice(-200)
      });
    } else {
      console.error('[WEBHOOK] Dashy rebuild failed with exit code:', exitCode);
      console.error('[WEBHOOK] Error output:', errorOutput);
      
      return NextResponse.json({
        success: false,
        message: 'Dashy rebuild failed',
        status: 'failed',
        error: errorOutput,
        exitCode
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[WEBHOOK] Error executing Dashy rebuild:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to execute Dashy rebuild',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: 'Dashy Theme Integration Webhook',
    description: 'POST to this endpoint to trigger automatic Dashy theme integration',
    script: '/app/workspace/scripts/setup-dashy-override.sh',
    status: 'ready'
  });
}
