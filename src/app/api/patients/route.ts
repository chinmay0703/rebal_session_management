import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/models/Patient';

export async function GET() {
  await connectDB();
  const patients = await Patient.find().populate('package_id').sort({ created_at: -1 });
  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  const existing = await Patient.findOne({ mobile: body.mobile });
  if (existing) {
    return NextResponse.json({ error: 'A patient with this mobile number already exists' }, { status: 400 });
  }

  const patient = await Patient.create(body);
  return NextResponse.json(patient, { status: 201 });
}
