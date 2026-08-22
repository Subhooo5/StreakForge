import { NextResponse } from 'next/server';

export function verifyReviewAdmin(req: Request): NextResponse | null {
  const secret = process.env.REVIEW_ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, message: 'Admin access is not configured.' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized: invalid or missing admin token.' },
      { status: 401 }
    );
  }

  return null;
}
