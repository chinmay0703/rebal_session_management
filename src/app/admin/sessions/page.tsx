'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Badge, EmptyState, Skeleton, Input, Select, Button } from '@/components/ui/components';
import { ClipboardList, Download, FileSpreadsheet, Calendar, User, Table, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
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

interface ExportRow {
  patient_name: string;
  mobile: string;
  package: string;
  total_sessions: number;
  sessions_completed: number;
  sessions_pending: number;
  last_session_date: string;
  status: string;
}

const COLUMNS = [
  { key: 'patient_name', label: 'Patient', short: 'Patient' },
  { key: 'mobile', label: 'Mobile', short: 'Mobile' },
  { key: 'package', label: 'Package', short: 'Pkg' },
  { key: 'total_sessions', label: 'Total', short: 'Total' },
  { key: 'sessions_completed', label: 'Completed', short: 'Done' },
  { key: 'sessions_pending', label: 'Pending', short: 'Pend' },
  { key: 'last_session_date', label: 'Last Session', short: 'Last' },
  { key: 'status', label: 'Status', short: 'Status' },
] as const;

function SpreadsheetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const perPage = 25;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setPage(0);
    setSearch('');
    fetchWithRetry('/api/sessions/export')
      .then(r => r.json())
      .then(setData)
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const filtered = search
    ? data.filter(r =>
        r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
        r.mobile.includes(search) ||
        r.package.toLowerCase().includes(search.toLowerCase())
      )
    : data;

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full h-[92vh] sm:h-auto sm:max-h-[88vh] sm:max-w-5xl sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex-shrink-0 border-b border-surface-100 px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Table className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-surface-800">Session Data</h2>
              <p className="text-[11px] text-surface-400">{filtered.length} records</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
            <X className="w-5 h-5 text-surface-500" />
          </button>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 px-4 sm:px-5 py-3 border-b border-surface-100 bg-surface-50/50">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name, mobile, or package..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 bg-white text-sm placeholder:text-surface-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="w-10 h-10 text-surface-300 mb-3" />
              <p className="text-surface-500 font-medium">No records found</p>
              <p className="text-xs text-surface-400 mt-1">Try a different search term</p>
            </div>
          ) : (
            <table className="w-full min-w-[700px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="text-left text-[11px] font-semibold text-surface-500 uppercase tracking-wider px-4 py-3 w-8">#</th>
                  {COLUMNS.map(col => (
                    <th key={col.key} className="text-left text-[11px] font-semibold text-surface-500 uppercase tracking-wider px-3 py-3">
                      <span className="hidden sm:inline">{col.label}</span>
                      <span className="sm:hidden">{col.short}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row, i) => {
                  const globalIdx = page * perPage + i + 1;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-surface-100 transition-colors hover:bg-brand-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-surface-50/30'}`}
                    >
                      <td className="px-4 py-3 text-xs text-surface-400 font-medium tabular-nums">{globalIdx}</td>
                      <td className="px-3 py-3">
                        <span className="text-sm font-medium text-surface-800">{row.patient_name}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-surface-600 tabular-nums">{row.mobile}</td>
                      <td className="px-3 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-medium">{row.package}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-surface-500 tabular-nums text-center">{row.total_sessions}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold tabular-nums">{row.sessions_completed}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded-md text-xs font-semibold tabular-nums ${row.sessions_pending > 0 ? 'bg-amber-50 text-amber-700' : 'bg-surface-100 text-surface-500'}`}>{row.sessions_pending}</span>
                      </td>
                      <td className="px-3 py-3 text-sm text-surface-600 tabular-nums whitespace-nowrap">{row.last_session_date}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium capitalize ${row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : row.status === 'completed' ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-600'}`}>{row.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer - Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex-shrink-0 border-t border-surface-100 px-4 sm:px-5 py-3 bg-white flex items-center justify-between">
            <p className="text-xs text-surface-400">
              Showing {page * perPage + 1}-{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-surface-600" />
              </button>
              <span className="text-xs font-medium text-surface-600 px-2 tabular-nums">
                {page + 1} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-surface-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionsContent() {
  const searchParams = useSearchParams();
  const initialPatient = searchParams.get('patient') || '';

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientFilter, setPatientFilter] = useState(initialPatient);
  const [dateFilter, setDateFilter] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (patientFilter) params.set('patient_id', patientFilter);
      if (dateFilter) params.set('date', dateFilter);

      const res = await fetchWithRetry(`/api/sessions?${params}`, { signal });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.error('Failed to load sessions. Pull down to refresh.');
    } finally {
      setLoading(false);
    }
  }, [patientFilter, dateFilter]);

  // Set today's date on mount (client-only to avoid hydration mismatch)
  useEffect(() => {
    setDateFilter(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchWithRetry('/api/patients', { signal: controller.signal })
      .then((r) => r.json())
      .then(setPatients)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!dateFilter) return; // Wait for client-side date init
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, dateFilter]);

  const exportCSV = async () => {
    try {
      const res = await fetch('/api/sessions/export');
      const data = await res.json();
      const csv = [
        ['Patient Name', 'Mobile', 'Package', 'Total Sessions', 'Completed', 'Pending', 'Last Session', 'Status'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...data.map((r: any) => [r.patient_name, r.mobile, r.package, r.total_sessions, r.sessions_completed, r.sessions_pending, r.last_session_date, r.status]),
      ].map((row) => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'patients_export.csv';
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
      const ws = XLSX.utils.json_to_sheet(data.map((r: { patient_name: string; mobile: string; package: string; total_sessions: number; sessions_completed: number; sessions_pending: number; last_session_date: string; status: string }) => ({
        'Patient Name': r.patient_name,
        'Mobile': r.mobile,
        'Package': r.package,
        'Total Sessions': r.total_sessions,
        'Completed': r.sessions_completed,
        'Pending': r.sessions_pending,
        'Last Session': r.last_session_date,
        'Status': r.status,
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patients');
      XLSX.writeFile(wb, 'patients_export.xlsx');
      toast.success('Excel exported');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Sessions</h1>
          {!loading && (
            <span className="px-2.5 py-1 bg-brand-50 text-brand-700 text-sm font-semibold rounded-full tabular-nums">
              {sessions.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => setSheetOpen(true)} icon={<Table className="w-4 h-4" />}>View</Button>
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
              Clear All
            </Button>
          )}
          {!dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}>
              Today
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

      <SpreadsheetModal open={sheetOpen} onClose={() => setSheetOpen(false)} />
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
