import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Session from '@/models/Session';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const { package_id, start_date } = await req.json();

  const patient = await Patient.findById(id);
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  // Clear old sessions and assign new package
  await Session.deleteMany({ patient_id: id });
  patient.package_id = package_id;
  patient.start_date = new Date(start_date);
  patient.status = 'active';
  await patient.save();

  const updated = await Patient.findById(id).populate('package_id');
  return NextResponse.json(updated);
}
