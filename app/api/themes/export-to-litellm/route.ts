import { NextRequest, NextResponse } from 'next/server';
import { exportToLiteLLM } from '@/utils/theme-exporter-litellm';

export async function POST(request: NextRequest) {
  try {
    const { colors } = await request.json();

    if (!colors) {
      return NextResponse.json(
        { error: 'Missing colors in request body' },
        { status: 400 }
      );
    }

    // Generate and save the LiteLLM globals.css file
    await exportToLiteLLM(colors);

    // Trigger webhook to restart LiteLLM container
    try {
      const webhookResponse = await fetch('http://localhost:3200/api/webhook/litellm-integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restart' }),
      });

      if (!webhookResponse.ok) {
        console.warn('Failed to trigger LiteLLM restart webhook:', webhookResponse.statusText);
      }
    } catch (webhookError) {
      console.warn('Failed to call LiteLLM restart webhook:', webhookError);
    }

    return NextResponse.json({
      success: true,
      message: 'LiteLLM theme exported successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LiteLLM export error:', error);
    return NextResponse.json(
      { error: 'Failed to export theme to LiteLLM' },
      { status: 500 }
    );
  }
}
