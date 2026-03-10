import { NextRequest, NextResponse } from 'next/server';
import { connectDB, ensureIndexes } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Session from '@/models/Session';

export async function GET(req: NextRequest) {
  const start = Date.now();

  try {
    await connectDB();
    ensureIndexes(); // non-blocking, fire-and-forget
  } catch {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const withStats = searchParams.get('stats') === 'true';

  // .lean() returns plain JS objects — skips Mongoose hydration, 2-5x faster
  const patients = await Patient.find().populate('package_id').sort({ created_at: -1 }).lean();

  if (!withStats) {
    const response = NextResponse.json(patients);
    response.headers.set('x-response-time', `${Date.now() - start}ms`);
    return response;
  }

  // Aggregate session counts and last session date per patient (runs in MongoDB, not JS)
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
    sessionStats.map((s: { _id: { toString(): string }; sessions_completed: number; last_session_date: Date }) => [
      s._id.toString(),
      { sessions_completed: s.sessions_completed, last_session_date: s.last_session_date },
    ])
  );

  const enriched = patients.map((p) => {
    const stats = statsMap.get(p._id.toString());
    const sessionsCompleted = stats?.sessions_completed || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalSessions = (p.package_id as any)?.total_sessions || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const packageName = (p.package_id as any)?.name || '';
    return {
      ...p,
      sessions_completed: sessionsCompleted,
      last_session_date: stats?.last_session_date || null,
      total_sessions: totalSessions,
      pending_sessions: Math.max(0, totalSessions - sessionsCompleted),
      package_name: packageName,
    };
  });

  const response = NextResponse.json(enriched);
  response.headers.set('x-response-time', `${Date.now() - start}ms`);
  return response;
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  // Normalize mobile: strip non-digits and take last 10 digits
  if (body.mobile) {
    body.mobile = body.mobile.replace(/\D/g, '').slice(-10);
  }

  const existing = await Patient.findOne({ mobile: body.mobile });
  if (existing) {
    return NextResponse.json({ error: 'A patient with this mobile number already exists' }, { status: 400 });
  }

  const patient = await Patient.create(body);
  return NextResponse.json(patient, { status: 201 });
}
