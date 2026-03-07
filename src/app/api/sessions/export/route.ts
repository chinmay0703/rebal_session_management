import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Session from '@/models/Session';

export async function GET() {
  await connectDB();

  const sessions = await Session.find()
    .populate({ path: 'patient_id', populate: { path: 'package_id' } })
    .sort({ scan_time: -1 });

  // Count completed sessions per patient
  const patientSessionCounts: Record<string, number> = {};
  for (const s of sessions) {
    const pid = s.patient_id?._id?.toString();
    if (pid) {
      patientSessionCounts[pid] = (patientSessionCounts[pid] || 0) + 1;
    }
  }

  const data = sessions.map((s) => {
    const totalSessions = s.patient_id?.package_id?.total_sessions || 0;
    const pid = s.patient_id?._id?.toString();
    const completed = pid ? (patientSessionCounts[pid] || 0) : 0;
    const remaining = Math.max(0, totalSessions - completed);

    return {
      patient_name: s.patient_id?.name || 'Unknown',
      mobile: s.patient_id?.mobile || 'N/A',
      package: s.patient_id?.package_id?.name || 'N/A',
      session_number: s.session_number,
      total_sessions: totalSessions,
      sessions_completed: completed,
      sessions_remaining: remaining,
      date: new Date(s.scan_time).toLocaleDateString(),
      time: new Date(s.scan_time).toLocaleTimeString(),
    };
  });

  return NextResponse.json(data);
}
