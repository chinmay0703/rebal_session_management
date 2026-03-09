import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Session from '@/models/Session';

export async function GET() {
  await connectDB();

  const patients = await Patient.find().populate('package_id').sort({ name: 1 }).lean();

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = patients.map((p: any) => {
    const stats = statsMap.get(p._id.toString());
    const totalSessions = p.package_id?.total_sessions || 0;
    const completed = stats?.sessions_completed || 0;
    const pending = Math.max(0, totalSessions - completed);
    const lastDate = stats?.last_session_date
      ? new Date(stats.last_session_date).toLocaleDateString()
      : 'N/A';

    return {
      patient_name: p.name,
      mobile: p.mobile,
      package: p.package_id?.name || 'N/A',
      total_sessions: totalSessions,
      sessions_completed: completed,
      sessions_pending: pending,
      last_session_date: lastDate,
      status: p.status,
    };
  });

  return NextResponse.json(data);
}
