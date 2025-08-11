// packages/frontend/src/app/api/progress/promotions/[promotionId]/route.ts
// API route to proxy promotion progress requests to planning service

import { NextRequest, NextResponse } from 'next/server';

const PLANNING_SERVICE_URL = process.env['PLANNING_SERVICE_URL'] || 'http://localhost:3005';

export async function GET(request: NextRequest, { params }: { params: { promotionId: string } }) {
  try {
    const { promotionId } = params;

    const response = await fetch(`${PLANNING_SERVICE_URL}/api/progress/promotions/${promotionId}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Progress API proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promotion progress' },
      { status: 500 },
    );
  }
}
