import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import PushSubscription from '@/models/PushSubscription';

// Save push subscription
export async function POST(req: NextRequest) {
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }

  const subscription = await req.json();

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    { endpoint: subscription.endpoint, keys: subscription.keys },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}

// Remove push subscription
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }

  const { endpoint } = await req.json();
  if (endpoint) {
    await PushSubscription.deleteOne({ endpoint });
  }

  return NextResponse.json({ success: true });
}
