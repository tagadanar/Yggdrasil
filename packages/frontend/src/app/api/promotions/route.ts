// packages/frontend/src/app/api/promotions/route.ts
// API route to proxy promotion requests to planning service

import { NextRequest, NextResponse } from 'next/server';

const PLANNING_SERVICE_URL = process.env['PLANNING_SERVICE_URL'] || 'http://localhost:3005';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    // Forward the request to the planning service
    const response = await fetch(`${PLANNING_SERVICE_URL}/api/promotions${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Promotion API proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promotions' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${PLANNING_SERVICE_URL}/api/promotions`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Promotion API proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create promotion' },
      { status: 500 },
    );
  }
}
