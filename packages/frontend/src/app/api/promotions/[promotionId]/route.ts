// packages/frontend/src/app/api/promotions/[promotionId]/route.ts
// API route to proxy individual promotion requests to planning service

import { NextRequest, NextResponse } from 'next/server';

const PLANNING_SERVICE_URL = process.env['PLANNING_SERVICE_URL'] || 'http://localhost:3005';

export async function GET(request: NextRequest, { params }: { params: { promotionId: string } }) {
  try {
    const { promotionId } = params;

    const response = await fetch(`${PLANNING_SERVICE_URL}/api/promotions/${promotionId}`, {
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
      { success: false, error: 'Failed to fetch promotion' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { promotionId: string } }) {
  try {
    const { promotionId } = params;
    const body = await request.json();

    const response = await fetch(`${PLANNING_SERVICE_URL}/api/promotions/${promotionId}`, {
      method: 'PUT',
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
      { success: false, error: 'Failed to update promotion' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { promotionId: string } }) {
  try {
    const { promotionId } = params;

    const response = await fetch(`${PLANNING_SERVICE_URL}/api/promotions/${promotionId}`, {
      method: 'DELETE',
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
      { success: false, error: 'Failed to delete promotion' },
      { status: 500 },
    );
  }
}
