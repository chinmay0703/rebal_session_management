import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import WhatsappTemplate from '@/models/WhatsappTemplate';

export async function GET() {
  await connectDB();
  const templates = await WhatsappTemplate.find().sort({ created_at: -1 });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  const template = await WhatsappTemplate.create(body);
  return NextResponse.json(template, { status: 201 });
}
