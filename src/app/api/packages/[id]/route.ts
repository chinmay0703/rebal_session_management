import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Package from '@/models/Package';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const pkg = await Package.findByIdAndUpdate(id, body, { new: true });
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  return NextResponse.json(pkg);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  await Package.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
