import { NextRequest, NextResponse } from 'next/server';

const NEWS_SERVICE_URL = process.env.NEWS_SERVICE_URL || 'http://localhost:3005';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${NEWS_SERVICE_URL}/api/news/${params.id}`, {
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
    console.error('Error proxying news GET by ID request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch news item' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${NEWS_SERVICE_URL}/api/news/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Error proxying news PUT request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update news item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${NEWS_SERVICE_URL}/api/news/${params.id}`, {
      method: 'DELETE',
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
    console.error('Error proxying news DELETE request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete news item' },
      { status: 500 }
    );
  }
}