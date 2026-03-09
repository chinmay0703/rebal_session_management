import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Session from '@/models/Session';

// Import existing patient with pre-filled sessions
export async function POST(req: NextRequest) {
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }

  const body = await req.json();
  const {
    name,
    mobile,
    package_id,
    start_date,
    notes,
    sessions_completed,
    session_dates, // optional: array of date strings for each session
    auto_fill,     // boolean: auto-generate dates going backward from today
  } = body;

  if (!name || !mobile || !package_id || !sessions_completed) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check for duplicate mobile
  const existing = await Patient.findOne({ mobile });
  if (existing) {
    return NextResponse.json({ error: 'A patient with this mobile number already exists' }, { status: 400 });
  }

  // Create patient
  const patient = await Patient.create({
    name,
    mobile,
    package_id,
    start_date: start_date || new Date().toISOString().split('T')[0],
    notes: notes || `Imported with ${sessions_completed} existing sessions`,
    status: 'active',
  });

  // Generate session records
  const sessionsToCreate = [];
  const count = parseInt(sessions_completed);

  if (session_dates && session_dates.length > 0) {
    // Use provided dates
    for (let i = 0; i < Math.min(count, session_dates.length); i++) {
      sessionsToCreate.push({
        patient_id: patient._id,
        session_number: i + 1,
        scan_time: new Date(session_dates[i]),
      });
    }
    // Fill remaining if dates < count
    for (let i = session_dates.length; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (count - i));
      date.setHours(10, 0, 0, 0);
      sessionsToCreate.push({
        patient_id: patient._id,
        session_number: i + 1,
        scan_time: date,
      });
    }
  } else if (auto_fill) {
    // Auto mode: generate dates going backward from yesterday, one per day
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (count - i));
      date.setHours(10, 0, 0, 0);
      sessionsToCreate.push({
        patient_id: patient._id,
        session_number: i + 1,
        scan_time: date,
      });
    }
  } else {
    // Default: all sessions on sequential dates from start_date
    const startDt = new Date(start_date || Date.now());
    for (let i = 0; i < count; i++) {
      const date = new Date(startDt);
      date.setDate(date.getDate() + i);
      date.setHours(10, 0, 0, 0);
      sessionsToCreate.push({
        patient_id: patient._id,
        session_number: i + 1,
        scan_time: date,
      });
    }
  }

  if (sessionsToCreate.length > 0) {
    await Session.insertMany(sessionsToCreate);
  }

  return NextResponse.json({
    patient,
    sessions_created: sessionsToCreate.length,
  }, { status: 201 });
}
