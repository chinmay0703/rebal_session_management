import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Patient from '@/models/Patient';
import Package from '@/models/Package';
import Session from '@/models/Session';

export async function GET() {
  try {
    await connectDB();
  } catch {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [totalPatients, totalPackages, allPatients, allSessions, todaySessions] = await Promise.all([
    Patient.countDocuments(),
    Package.countDocuments(),
    Patient.find().populate('package_id'),
    Session.find(),
    Session.find({ scan_time: { $gte: todayStart, $lte: todayEnd } })
      .populate({ path: 'patient_id', select: 'name mobile' })
      .sort({ scan_time: -1 }),
  ]);

  let totalSessionsPending = 0;
  const completingSoon: Array<{ _id: string; name: string; mobile: string; package_name: string; sessions_remaining: number }> = [];
  const expiringSoon: Array<{ _id: string; name: string; mobile: string; package_name: string; days_left: number }> = [];
  const noShow: Array<{ _id: string; name: string; mobile: string; package_name: string; days_since: number }> = [];
  let activeCount = 0;
  let completedCount = 0;
  let expiredCount = 0;

  for (const patient of allPatients) {
    const totalInPackage = patient.package_id?.total_sessions || 0;
    const validityDays = patient.package_id?.validity_days || 0;
    const completed = allSessions.filter(
      (s) => s.patient_id.toString() === patient._id.toString()
    ).length;
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

    // Update status in DB if changed
    const newStatus = isCompleted ? 'completed' : isExpired ? 'expired' : 'active';
    if (patient.status !== newStatus) {
      await Patient.findByIdAndUpdate(patient._id, { status: newStatus });
    }

    if (newStatus === 'active') activeCount++;
    else if (newStatus === 'completed') completedCount++;
    else expiredCount++;

    // Completing soon: 1-3 sessions left, still active
    if (remaining > 0 && remaining <= 3 && newStatus === 'active') {
      completingSoon.push({
        _id: patient._id.toString(),
        name: patient.name,
        mobile: patient.mobile,
        package_name: patient.package_id?.name || 'N/A',
        sessions_remaining: remaining,
      });
    }

    // Expiring soon: within 7 days, still active
    if (validityDays > 0 && daysLeft > 0 && daysLeft <= 7 && newStatus === 'active') {
      expiringSoon.push({
        _id: patient._id.toString(),
        name: patient.name,
        mobile: patient.mobile,
        package_name: patient.package_id?.name || 'N/A',
        days_left: daysLeft,
      });
    }

    // No show: active patients who haven't visited in 7+ days
    if (newStatus === 'active' && remaining > 0) {
      const patientSessions = allSessions
        .filter(s => s.patient_id.toString() === patient._id.toString())
        .sort((a, b) => new Date(b.scan_time).getTime() - new Date(a.scan_time).getTime());
      const lastVisit = patientSessions.length > 0
        ? new Date(patientSessions[0].scan_time)
        : new Date(patient.start_date);
      const daysSince = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        noShow.push({
          _id: patient._id.toString(),
          name: patient.name,
          mobile: patient.mobile,
          package_name: patient.package_id?.name || 'N/A',
          days_since: daysSince,
        });
      }
    }
  }

  // Today's feed
  const todayFeed = todaySessions.map((s) => ({
    _id: s._id,
    patient_name: s.patient_id?.name || 'Unknown',
    patient_mobile: s.patient_id?.mobile || '',
    session_number: s.session_number,
    time: s.scan_time,
  }));

  return NextResponse.json({
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
}
