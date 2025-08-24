import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(_request: NextRequest) {
  console.log('[WEBHOOK] LiteLLM theme integration webhook triggered');
  
  try {
    console.log('[WEBHOOK] Restarting LiteLLM container to rebuild UI with new theme...');
    
    // Restart the LiteLLM container to trigger rebuild with mounted globals.css
    const restartChild = spawn('docker', [
      'restart', 
      'chatbot-litellm-1'
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let restartOutput = '';
    let restartErrorOutput = '';
    
    restartChild.stdout?.on('data', (data) => {
      restartOutput += data.toString();
    });
    
    restartChild.stderr?.on('data', (data) => {
      restartErrorOutput += data.toString();
    });
    
    const restartExitPromise = new Promise<number>((resolve) => {
      restartChild.on('close', (code) => {
        resolve(code || 0);
      });
    });
    
    const restartTimeoutPromise = new Promise<number>((resolve) => {
      setTimeout(() => resolve(-1), 30000); // 30 second timeout for restart
    });
    
    const restartExitCode = await Promise.race([restartExitPromise, restartTimeoutPromise]);
    
    if (restartExitCode === -1) {
      console.log('[WEBHOOK] LiteLLM restart timed out (still restarting in background)');
      return NextResponse.json({
        success: true,
        message: 'LiteLLM theme integration started (container restarting in background)',
        status: 'background'
      });
    }
    
    if (restartExitCode === 0) {
      console.log('[WEBHOOK] LiteLLM container restarted successfully');
      console.log('[WEBHOOK] Container will rebuild UI with new theme on startup');
      
      return NextResponse.json({
        success: true,
        message: 'LiteLLM theme integration completed - container restarted with new theme',
        status: 'completed',
        output: restartOutput.trim() || 'Container restarted successfully'
      });
    } else {
      console.error('[WEBHOOK] LiteLLM restart failed with exit code:', restartExitCode);
      console.error('[WEBHOOK] Restart error output:', restartErrorOutput);
      
      return NextResponse.json({
        success: false,
        message: 'LiteLLM container restart failed',
        status: 'failed',
        error: restartErrorOutput,
        exitCode: restartExitCode
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[WEBHOOK] Error executing LiteLLM integration:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to execute LiteLLM theme integration',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'LiteLLM theme integration webhook endpoint',
    status: 'ready'
  });
}
