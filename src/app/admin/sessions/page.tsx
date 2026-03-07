'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Badge, EmptyState, Skeleton, Input, Select, Button } from '@/components/ui/components';
import { ClipboardList, Download, FileSpreadsheet, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface SessionRecord {
  _id: string;
  patient_id: {
    _id: string;
    name: string;
    mobile: string;
    package_id?: { name: string };
  };
  session_number: number;
  scan_time: string;
  created_at: string;
}

interface PatientOption {
  _id: string;
  name: string;
}

function SessionsContent() {
  const searchParams = useSearchParams();
  const initialPatient = searchParams.get('patient') || '';

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientFilter, setPatientFilter] = useState(initialPatient);
  const [dateFilter, setDateFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (patientFilter) params.set('patient_id', patientFilter);
      if (dateFilter) params.set('date', dateFilter);

      const res = await fetch(`/api/sessions?${params}`);
      const data = await res.json();
      setSessions(data);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [patientFilter, dateFilter]);

  useEffect(() => {
    fetch('/api/patients').then((r) => r.json()).then(setPatients);
  }, []);

  useEffect(() => { load(); }, [load]);

  const exportCSV = async () => {
    try {
      const res = await fetch('/api/sessions/export');
      const data = await res.json();
      const csv = [
        ['Patient Name', 'Mobile', 'Package', 'Session Number', 'Total Sessions', 'Sessions Completed', 'Sessions Remaining', 'Date', 'Time'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...data.map((r: any) => [r.patient_name, r.mobile, r.package, r.session_number, r.total_sessions, r.sessions_completed, r.sessions_remaining, r.date, r.time]),
      ].map((row) => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sessions_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const exportExcel = async () => {
    try {
      const res = await fetch('/api/sessions/export');
      const data = await res.json();
      const ws = XLSX.utils.json_to_sheet(data.map((r: { patient_name: string; mobile: string; package: string; session_number: number; total_sessions: number; sessions_completed: number; sessions_remaining: number; date: string; time: string }) => ({
        'Patient Name': r.patient_name,
        'Mobile': r.mobile,
        'Package': r.package,
        'Session Number': r.session_number,
        'Total Sessions': r.total_sessions,
        'Sessions Completed': r.sessions_completed,
        'Sessions Remaining': r.sessions_remaining,
        'Date': r.date,
        'Time': r.time,
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sessions');
      XLSX.writeFile(wb, 'sessions_export.xlsx');
      toast.success('Excel exported');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Sessions</h1>
          <p className="text-surface-400 mt-1">Session history and records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportCSV} icon={<Download className="w-4 h-4" />}>CSV</Button>
          <Button variant="secondary" size="sm" onClick={exportExcel} icon={<FileSpreadsheet className="w-4 h-4" />}>Excel</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select
              placeholder="All Patients"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              options={patients.map((p) => ({ value: p._id, label: p.name }))}
            />
          </div>
          <div className="flex-1">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              placeholder="Filter by date"
            />
          </div>
          {(patientFilter || dateFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setPatientFilter(''); setDateFilter(''); }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6 text-surface-400" />}
          title="No sessions found"
          description={patientFilter || dateFilter ? 'Try adjusting your filters' : 'Sessions will appear here when patients check in'}
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <Card key={session._id} className={`!p-4 animate-slide-up stagger-${Math.min(i + 1, 4)}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-600 font-bold text-sm">#{session.session_number}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-surface-400" />
                      <h3 className="font-semibold text-surface-800 truncate">{session.patient_id?.name || 'Unknown'}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-surface-400 mt-0.5">
                      <span>{session.patient_id?.mobile}</span>
                      <Badge className="bg-surface-100 text-surface-600">{session.patient_id?.package_id?.name || 'N/A'}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-surface-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(session.scan_time).toLocaleDateString()}</span>
                  </div>
                  <span>{new Date(session.scan_time).toLocaleTimeString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>}>
      <SessionsContent />
    </Suspense>
  );
}
