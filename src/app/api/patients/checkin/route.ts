import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Session from '@/models/Session';

// Look up patient by mobile
export async function POST(req: NextRequest) {
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: 'Server is starting up. Please try again.' }, { status: 503 });
  }
  const { mobile } = await req.json();

  // Normalize mobile: strip non-digits and take last 10 digits
  const normalizedMobile = (mobile || '').replace(/\D/g, '').slice(-10);

  const patient = await Patient.findOne({ mobile: normalizedMobile }).populate('package_id');
  if (!patient) {
    return NextResponse.json({ error: 'No patient found with this mobile number' }, { status: 404 });
  }

  const sessions = await Session.find({ patient_id: patient._id }).sort({ session_number: 1 });
  const sessionsCompleted = sessions.length;
  const totalSessions = patient.package_id?.total_sessions || 0;

  return NextResponse.json({
    patient: {
      _id: patient._id,
      name: patient.name,
      mobile: patient.mobile,
    },
    package: {
      name: patient.package_id?.name || 'N/A',
      total_sessions: totalSessions,
    },
    sessions_completed: sessionsCompleted,
    sessions_pending: totalSessions - sessionsCompleted,
    last_session: sessions.length > 0 ? sessions[sessions.length - 1] : null,
  });
}
