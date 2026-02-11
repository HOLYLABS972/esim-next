import { NextResponse } from 'next/server';
import authService from '../../../../../src/services/authService';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await authService.getUserById(userId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get user API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get user' },
      { status: 500 }
    );
  }
}
