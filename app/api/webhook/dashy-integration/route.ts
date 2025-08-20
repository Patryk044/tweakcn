import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(_request: NextRequest) {
  console.log('[WEBHOOK] Dashy theme integration webhook triggered');
  
  try {
    const scriptPath = path.resolve('/app/workspace/scripts/setup-dashy-override.sh');
    
    console.log('[WEBHOOK] Executing integration script:', scriptPath);
    
    const child = spawn('bash', [scriptPath], {
      detached: true,
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
      setTimeout(() => resolve(-1), 15000);
    });
    
    const exitCode = await Promise.race([exitPromise, timeoutPromise]);
    
    if (exitCode === -1) {
      console.log('[WEBHOOK] Integration script timed out (still running in background)');
      return NextResponse.json({
        success: true,
        message: 'Dashy theme integration started (running in background)',
        status: 'background'
      });
    }
    
    if (exitCode === 0) {
      console.log('[WEBHOOK] Integration script completed successfully');
      console.log('[WEBHOOK] Script output:', output.slice(-500)); // Last 500 chars
      
      return NextResponse.json({
        success: true,
        message: 'Dashy theme integration completed successfully',
        status: 'completed',
        output: output.slice(-200)
      });
    } else {
      console.error('[WEBHOOK] Integration script failed with exit code:', exitCode);
      console.error('[WEBHOOK] Error output:', errorOutput);
      
      return NextResponse.json({
        success: false,
        message: 'Dashy theme integration failed',
        status: 'failed',
        error: errorOutput,
        exitCode
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[WEBHOOK] Error executing integration script:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to execute Dashy theme integration',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: 'Dashy Theme Integration Webhook',
    description: 'POST to this endpoint to trigger automatic Dashy theme integration',
    script: '/app/workspace/scripts/test-theme-integration.sh',
    status: 'ready'
  });
}
