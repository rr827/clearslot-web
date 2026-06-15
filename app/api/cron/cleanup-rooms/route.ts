import { NextRequest, NextResponse } from 'next/server';
import { deleteExpiredRooms } from '@/lib/room';

// Scheduled by vercel.json to run daily. Vercel sets the Authorization
// header to `Bearer ${CRON_SECRET}` for cron-triggered requests when
// CRON_SECRET is configured.
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const deleted = await deleteExpiredRooms();
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cleanup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
