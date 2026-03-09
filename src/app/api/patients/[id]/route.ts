import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Session from '@/models/Session';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const patient = await Patient.findById(id).populate('package_id');
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

  const sessions = await Session.find({ patient_id: id }).sort({ session_number: 1 });
  const totalSessions = patient.package_id?.total_sessions || 0;
  const validityDays = patient.package_id?.validity_days || 0;

  let daysLeft = null;
  let expiryDate = null;
  if (validityDays > 0) {
    expiryDate = new Date(patient.start_date);
    expiryDate.setDate(expiryDate.getDate() + validityDays);
    daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  return NextResponse.json({
    patient,
    sessions,
    total_sessions: totalSessions,
    sessions_completed: sessions.length,
    sessions_remaining: Math.max(0, totalSessions - sessions.length),
    days_left: daysLeft,
    expiry_date: expiryDate,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();

  if (body.mobile) {
    body.mobile = body.mobile.replace(/\D/g, '').slice(-10);
    const existing = await Patient.findOne({ mobile: body.mobile, _id: { $ne: new mongoose.Types.ObjectId(id) } });
    if (existing) {
      return NextResponse.json({ error: 'Another patient already has this mobile number' }, { status: 400 });
    }
  }

  const patient = await Patient.findByIdAndUpdate(id, body, { new: true }).populate('package_id');
  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  return NextResponse.json(patient);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  await Session.deleteMany({ patient_id: id });
  await Patient.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
