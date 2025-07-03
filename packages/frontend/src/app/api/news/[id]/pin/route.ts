import { NextRequest, NextResponse } from 'next/server';

const NEWS_SERVICE_URL = process.env.NEWS_SERVICE_URL || 'http://localhost:3005';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${NEWS_SERVICE_URL}/api/news/${params.id}/pin`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
    });

    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Error proxying news pin toggle request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle pin status' },
      { status: 500 }
    );
  }
}