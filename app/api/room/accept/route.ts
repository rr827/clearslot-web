import { NextRequest, NextResponse } from 'next/server';
import { acceptProposal } from '@/lib/room';

export async function POST(req: NextRequest) {
  try {
    const { code, proposalIndex } = await req.json();
    if (!code || proposalIndex == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await acceptProposal(code, proposalIndex);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('accept proposal:', err);
    return NextResponse.json({ error: err.message ?? 'Failed to accept' }, { status: 500 });
  }
}
