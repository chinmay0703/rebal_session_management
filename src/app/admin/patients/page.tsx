'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, Badge, ProgressBar, EmptyState, ConfirmDialog, Skeleton, SearchInput, Button } from '@/components/ui/components';
import { Users, Eye, Trash2, UserPlus, Phone, MessageCircle, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import WhatsappPicker from '@/components/WhatsappPicker';

interface PatientWithData {
  _id: string;
  name: string;
  mobile: string;
  package_id: { _id: string; name: string; total_sessions: number } | null;
  start_date: string;
  notes?: string;
  status?: string;
  created_at: string;
  sessions_completed?: number;
  last_session_date?: string;
}

const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Active' },
  completed: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Completed' },
  expired: { bg: 'bg-red-50', text: 'text-red-700', icon: <XCircle className="w-3 h-3" />, label: 'Expired' },
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<PatientWithData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState<PatientWithData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [patientsRes, sessionsRes] = await Promise.all([
        fetch('/api/patients').then((r) => r.json()),
        fetch('/api/sessions').then((r) => r.json()),
      ]);

      const enriched = patientsRes.map((p: PatientWithData) => {
        const patientSessions = sessionsRes.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => (s.patient_id?._id || s.patient_id) === p._id
        );
        const lastSession = patientSessions.length > 0
          ? patientSessions.sort((a: { scan_time: string }, b: { scan_time: string }) =>
              new Date(b.scan_time).getTime() - new Date(a.scan_time).getTime()
            )[0]
          : null;
        return {
          ...p,
          sessions_completed: patientSessions.length,
          last_session_date: lastSession?.scan_time || null,
        };
      });

      setPatients(enriched);
    } catch {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/patients/${deleteTarget._id}`, { method: 'DELETE' });
      toast.success('Patient deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Failed to delete patient');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = patients.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.mobile.includes(search);
    const matchStatus = statusFilter === 'all' || (p.status || 'active') === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: patients.length,
    active: patients.filter(p => (p.status || 'active') === 'active').length,
    completed: patients.filter(p => p.status === 'completed').length,
    expired: patients.filter(p => p.status === 'expired').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Patients</h1>
          <p className="text-surface-400 mt-1">{patients.length} registered patients</p>
        </div>
        <Link href="/admin/add-patient">
          <Button icon={<UserPlus className="w-4 h-4" />}>Add Patient</Button>
        </Link>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search by name or mobile..." />

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'active', 'completed', 'expired'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              statusFilter === status
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-surface-500 border border-surface-200 hover:bg-surface-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)} ({counts[status]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-surface-400" />}
          title={search || statusFilter !== 'all' ? 'No patients found' : 'No patients yet'}
          description={search || statusFilter !== 'all' ? 'Try adjusting your search or filter' : 'Add your first patient to get started'}
          action={!search && statusFilter === 'all' ? <Link href="/admin/add-patient"><Button icon={<UserPlus className="w-4 h-4" />}>Add Patient</Button></Link> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((patient, i) => {
            const total = patient.package_id?.total_sessions || 0;
            const completed = patient.sessions_completed || 0;
            const pending = total - completed;
            const status = patient.status || 'active';
            const sc = statusConfig[status] || statusConfig.active;

            return (
              <Card key={patient._id} className={`animate-slide-up stagger-${Math.min(i + 1, 4)}`}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <Link href={`/admin/patients/${patient._id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-brand-600 font-semibold text-sm">{patient.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-surface-800 truncate">{patient.name}</h3>
                          <Badge className={`${sc.bg} ${sc.text} flex items-center gap-1`}>
                            {sc.icon} {sc.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-surface-400">
                          <Phone className="w-3 h-3" />
                          {patient.mobile}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge className="bg-brand-50 text-brand-700">
                        {patient.package_id?.name || 'No Package'}
                      </Badge>
                      <Badge className="bg-emerald-50 text-emerald-700">
                        {completed}/{total} done
                      </Badge>
                      {pending > 0 && (
                        <Badge className="bg-amber-50 text-amber-700">
                          {pending} left
                        </Badge>
                      )}
                      {patient.last_session_date && (
                        <span className="text-xs text-surface-400">
                          Last: {new Date(patient.last_session_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <ProgressBar value={completed} max={total} className="mt-3" />
                  </Link>

                  <div className="flex items-center gap-1 sm:flex-col">
                    <Link href={`/admin/patients/${patient._id}`}>
                      <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />}>View</Button>
                    </Link>
                    <Button variant="ghost" size="sm" icon={<MessageCircle className="w-4 h-4 text-emerald-500" />}
                      onClick={(e) => { e.preventDefault(); setWhatsappTarget(patient); }} />
                    <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4 text-red-400" />} onClick={() => setDeleteTarget(patient)} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Patient"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All their session data will also be deleted.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {whatsappTarget && (
        <WhatsappPicker
          open={!!whatsappTarget}
          onClose={() => setWhatsappTarget(null)}
          patient={{
            name: whatsappTarget.name,
            mobile: whatsappTarget.mobile,
            package_name: whatsappTarget.package_id?.name || 'N/A',
            sessions_done: whatsappTarget.sessions_completed || 0,
            sessions_left: (whatsappTarget.package_id?.total_sessions || 0) - (whatsappTarget.sessions_completed || 0),
            total_sessions: whatsappTarget.package_id?.total_sessions || 0,
          }}
        />
      )}
    </div>
  );
}
