import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '@/models/Session';
import Patient from '@/models/Patient';

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patient_id');
  const date = searchParams.get('date');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};
  if (patientId) filter.patient_id = patientId;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    filter.scan_time = { $gte: start, $lte: end };
  }

  const sessions = await Session.find(filter)
    .populate({ path: 'patient_id', populate: { path: 'package_id' } })
    .sort({ scan_time: -1 });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const { patient_id } = await req.json();

  const patient = await Patient.findById(patient_id).populate('package_id');
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
  }

  const totalSessions = patient.package_id?.total_sessions || 0;
  const completedSessions = await Session.countDocuments({ patient_id });

  // Check package limit
  if (completedSessions >= totalSessions) {
    return NextResponse.json({ error: 'All sessions in this package have been completed' }, { status: 400 });
  }

  // Prevent duplicate within 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentSession = await Session.findOne({
    patient_id,
    scan_time: { $gte: tenMinutesAgo },
  });

  if (recentSession) {
    return NextResponse.json({ error: 'A session was already started within the last 10 minutes' }, { status: 400 });
  }

  const session = await Session.create({
    patient_id,
    session_number: completedSessions + 1,
    scan_time: new Date(),
  });

  return NextResponse.json({
    session,
    patient_name: patient.name,
    sessions_completed: completedSessions + 1,
    total_sessions: totalSessions,
  }, { status: 201 });
}
