import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Package from '@/models/Package';

export async function GET() {
  await connectDB();
  const packages = await Package.find().sort({ created_at: -1 });
  return NextResponse.json(packages);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const pkg = await Package.create(body);
  return NextResponse.json(pkg, { status: 201 });
}
