import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Session from '@/models/Session';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const withStats = searchParams.get('stats') === 'true';

  const patients = await Patient.find().populate('package_id').sort({ created_at: -1 });

  if (!withStats) {
    return NextResponse.json(patients);
  }

  // Aggregate session counts and last session date per patient
  const sessionStats = await Session.aggregate([
    {
      $group: {
        _id: '$patient_id',
        sessions_completed: { $sum: 1 },
        last_session_date: { $max: '$scan_time' },
      },
    },
  ]);

  const statsMap = new Map(
    sessionStats.map((s: { _id: string; sessions_completed: number; last_session_date: Date }) => [
      s._id.toString(),
      { sessions_completed: s.sessions_completed, last_session_date: s.last_session_date },
    ])
  );

  const enriched = patients.map((p) => {
    const pObj = p.toObject();
    const stats = statsMap.get(p._id.toString());
    const sessionsCompleted = stats?.sessions_completed || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalSessions = (p.package_id as any)?.total_sessions || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packageName = (p.package_id as any)?.name || '';
    return {
      ...pObj,
      sessions_completed: sessionsCompleted,
      last_session_date: stats?.last_session_date || null,
      total_sessions: totalSessions,
      pending_sessions: Math.max(0, totalSessions - sessionsCompleted),
      package_name: packageName,
    };
  });

  return NextResponse.json(enriched);
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
