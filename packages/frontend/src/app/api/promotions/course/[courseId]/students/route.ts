// packages/frontend/src/app/api/promotions/course/[courseId]/students/route.ts
// API route to get students enrolled in a course through promotions

import { NextRequest, NextResponse } from 'next/server';

const PLANNING_SERVICE_URL = process.env['PLANNING_SERVICE_URL'] || 'http://localhost:3005';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Forward the request to the planning service
    const response = await fetch(`${PLANNING_SERVICE_URL}/api/promotions/course/${courseId}/students`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Course students API proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course students' },
      { status: 500 },
    );
  }
}