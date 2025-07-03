import { NextRequest, NextResponse } from 'next/server';

const NEWS_SERVICE_URL = process.env.NEWS_SERVICE_URL || 'http://localhost:3005';

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(`${NEWS_SERVICE_URL}/api/news/categories/${params.category}${queryString ? '?' + queryString : ''}`, {
      method: 'GET',
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
    console.error('Error proxying category news GET request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news by category' },
      { status: 500 }
    );
  }
}