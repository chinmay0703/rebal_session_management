import { NextResponse } from 'next/server';
import { connectDB, ensureIndexes } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Package from '@/models/Package';
import Session from '@/models/Session';

export async function GET() {
  const start = Date.now();

  try {
    await connectDB();
    ensureIndexes(); // non-blocking, fire-and-forget
  } catch {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Parallel queries — aggregate session stats in MongoDB instead of loading all sessions
  const [totalPatients, totalPackages, allPatients, sessionStats, lastSessionMap, todaySessions] = await Promise.all([
    Patient.countDocuments(),
    Package.countDocuments(),
    Patient.find().populate('package_id').lean(),
    // Aggregate: count sessions per patient (done in DB, not JS)
    Session.aggregate([
      { $group: { _id: '$patient_id', count: { $sum: 1 } } },
    ]),
    // Aggregate: last session date per patient
    Session.aggregate([
      { $group: { _id: '$patient_id', last_session: { $max: '$scan_time' } } },
    ]),
    // Today's sessions only
    Session.find({ scan_time: { $gte: todayStart, $lte: todayEnd } })
      .populate({ path: 'patient_id', select: 'name mobile' })
      .sort({ scan_time: -1 })
      .lean(),
  ]);

  // Build lookup maps from aggregation results
  const sessCountMap = new Map<string, number>(
    sessionStats.map((s: { _id: { toString(): string }; count: number }) => [s._id.toString(), s.count])
  );
  const lastSessMap = new Map<string, Date>(
    lastSessionMap.map((s: { _id: { toString(): string }; last_session: Date }) => [s._id.toString(), s.last_session])
  );

  let totalSessionsPending = 0;
  const completingSoon: Array<{ _id: string; name: string; mobile: string; package_name: string; sessions_remaining: number }> = [];
  const expiringSoon: Array<{ _id: string; name: string; mobile: string; package_name: string; days_left: number }> = [];
  const noShow: Array<{ _id: string; name: string; mobile: string; package_name: string; days_since: number }> = [];
  let activeCount = 0;
  let completedCount = 0;
  let expiredCount = 0;

  // Batch status updates instead of one-by-one
  const statusUpdates: Array<{ id: string; status: string }> = [];

  for (const patient of allPatients) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pkg = patient.package_id as any;
    const totalInPackage = pkg?.total_sessions || 0;
    const validityDays = pkg?.validity_days || 0;
    const completed = sessCountMap.get(patient._id.toString()) || 0;
    const remaining = Math.max(0, totalInPackage - completed);
    totalSessionsPending += remaining;

    // Auto-detect status
    const isCompleted = completed >= totalInPackage && totalInPackage > 0;
    let isExpired = false;
    let daysLeft = 0;
    if (validityDays > 0) {
      const expiryDate = new Date(patient.start_date);
      expiryDate.setDate(expiryDate.getDate() + validityDays);
      daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      isExpired = daysLeft <= 0 && !isCompleted;
    }

    const newStatus = isCompleted ? 'completed' : isExpired ? 'expired' : 'active';
    if (patient.status !== newStatus) {
      statusUpdates.push({ id: patient._id.toString(), status: newStatus });
    }

    if (newStatus === 'active') activeCount++;
    else if (newStatus === 'completed') completedCount++;
    else expiredCount++;

    const packageName = pkg?.name || 'N/A';

    // Completing soon: 1-3 sessions left, still active
    if (remaining > 0 && remaining <= 3 && newStatus === 'active') {
      completingSoon.push({
        _id: patient._id.toString(),
        name: patient.name,
        mobile: patient.mobile,
        package_name: packageName,
        sessions_remaining: remaining,
      });
    }

    // Expiring soon: within 7 days, still active
    if (validityDays > 0 && daysLeft > 0 && daysLeft <= 7 && newStatus === 'active') {
      expiringSoon.push({
        _id: patient._id.toString(),
        name: patient.name,
        mobile: patient.mobile,
        package_name: packageName,
        days_left: daysLeft,
      });
    }

    // No show: active patients who haven't visited in 7+ days
    if (newStatus === 'active' && remaining > 0) {
      const lastVisit = lastSessMap.get(patient._id.toString()) || patient.start_date;
      const daysSince = Math.floor((Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        noShow.push({
          _id: patient._id.toString(),
          name: patient.name,
          mobile: patient.mobile,
          package_name: packageName,
          days_since: daysSince,
        });
      }
    }
  }

  // Batch update changed statuses (non-blocking)
  if (statusUpdates.length > 0) {
    Promise.all(
      statusUpdates.map(({ id, status }) =>
        Patient.updateOne({ _id: id }, { status })
      )
    ).catch(() => {});
  }

  // Today's feed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todayFeed = todaySessions.map((s: any) => ({
    _id: s._id,
    patient_name: s.patient_id?.name || 'Unknown',
    patient_mobile: s.patient_id?.mobile || '',
    session_number: s.session_number,
    time: s.scan_time,
  }));

  const response = NextResponse.json({
    total_patients: totalPatients,
    total_packages: totalPackages,
    sessions_today: todaySessions.length,
    total_sessions_pending: totalSessionsPending,
    total_scans_today: todaySessions.length,
    active_patients: activeCount,
    completed_patients: completedCount,
    expired_patients: expiredCount,
    completing_soon: completingSoon,
    expiring_soon: expiringSoon,
    no_show: noShow.sort((a, b) => b.days_since - a.days_since),
    today_feed: todayFeed,
  });

  response.headers.set('x-response-time', `${Date.now() - start}ms`);
  return response;
}
