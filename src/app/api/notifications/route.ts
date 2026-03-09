import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Notification from '@/models/Notification';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unread') === 'true';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};
  if (unreadOnly) filter.read = false;

  const notifications = await Notification.find(filter)
    .sort({ created_at: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }

  const body = await req.json();

  if (body.all === true) {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    return NextResponse.json({ success: true });
  }

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    await Notification.updateMany(
      { _id: { $in: body.ids } },
      { $set: { read: true } }
    );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Provide { ids: string[] } or { all: true }' }, { status: 400 });
}

export async function DELETE() {
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }

  await Notification.deleteMany({});
  return NextResponse.json({ success: true });
}
