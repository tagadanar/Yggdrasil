import { NextRequest, NextResponse } from 'next/server';

const PLANNING_SERVICE_URL = process.env.PLANNING_SERVICE_URL || 'http://localhost:3004';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`${PLANNING_SERVICE_URL}/api/planning/events/${params.id}`, {
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
    console.error('Error proxying planning event GET request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch planning event' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${PLANNING_SERVICE_URL}/api/planning/events/${params.id}`, {
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
    console.error('Error proxying planning event PUT request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update planning event' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`${PLANNING_SERVICE_URL}/api/planning/events/${params.id}`, {
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
    console.error('Error proxying planning event DELETE request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete planning event' },
      { status: 500 }
    );
  }
}