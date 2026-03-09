'use client';
import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Badge, ProgressBar, Button, Input, CustomSelect, Textarea, Modal, Skeleton, ConfirmDialog } from '@/components/ui/components';
import WhatsappPicker from '@/components/WhatsappPicker';
import {
  ArrowLeft, User, Phone, Package, Calendar, Clock, Hash,
  Edit3, RefreshCw, MessageCircle, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PatientDetail {
  patient: {
    _id: string;
    name: string;
    mobile: string;
    package_id: { _id: string; name: string; total_sessions: number; validity_days?: number; description?: string };
    start_date: string;
    notes?: string;
    status: string;
    created_at: string;
  };
  sessions: Array<{ _id: string; session_number: number; scan_time: string }>;
  total_sessions: number;
  sessions_completed: number;
  sessions_remaining: number;
  days_left: number | null;
  expiry_date: string | null;
}

interface Pkg {
  _id: string;
  name: string;
  total_sessions: number;
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<Pkg[]>([]);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', mobile: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Renew modal
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewForm, setRenewForm] = useState({ package_id: '', start_date: new Date().toISOString().split('T')[0] });
  const [renewSaving, setRenewSaving] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // WhatsApp
  const [waOpen, setWaOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/patients/${id}`);
      if (!res.ok) { router.push('/admin/patients'); return; }
      const d = await res.json();
      setData(d);
    } catch {
      toast.error('Failed to load patient');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch('/api/packages').then(r => r.json()).then(setPackages); }, []);

  const openEdit = () => {
    if (!data) return;
    setEditForm({ name: data.patient.name, mobile: data.patient.mobile, notes: data.patient.notes || '' });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      toast.success('Patient updated');
      setEditOpen(false);
      load();
    } catch { toast.error('Failed to update'); }
    finally { setEditSaving(false); }
  };

  const handleRenew = async () => {
    if (!renewForm.package_id) { toast.error('Select a package'); return; }
    setRenewSaving(true);
    try {
      const res = await fetch(`/api/patients/${id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renewForm),
      });
      if (!res.ok) { toast.error('Failed to renew'); return; }
      toast.success('Patient renewed with new package');
      setRenewOpen(false);
      load();
    } catch { toast.error('Failed to renew'); }
    finally { setRenewSaving(false); }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      toast.success('Patient deleted');
      router.push('/admin/patients');
    } catch { toast.error('Failed to delete'); }
    finally { setDeleteLoading(false); }
  };

  const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    active: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    completed: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    expired: { bg: 'bg-red-50', text: 'text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) return null;
  const { patient, sessions, total_sessions, sessions_completed, sessions_remaining, days_left, expiry_date } = data;
  const sc = statusConfig[patient.status] || statusConfig.active;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center hover:bg-surface-50 transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-surface-500" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900">{patient.name}</h1>
          <p className="text-xs sm:text-sm text-surface-400">Patient Details</p>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card className="animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-2xl">{patient.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-surface-900">{patient.name}</h1>
              <Badge className={`${sc.bg} ${sc.text} flex items-center gap-1`}>
                {sc.icon} {patient.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500 mb-4">
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {patient.mobile}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Started {new Date(patient.start_date).toLocaleDateString()}</span>
              {days_left !== null && (
                <span className={`flex items-center gap-1.5 ${days_left <= 7 ? 'text-red-500 font-medium' : ''}`}>
                  <Clock className="w-4 h-4" />
                  {days_left > 0 ? `${days_left} days left` : 'Expired'}
                  {expiry_date && ` (${new Date(expiry_date).toLocaleDateString()})`}
                </span>
              )}
            </div>
            {patient.notes && (
              <p className="text-sm text-surface-400 bg-surface-50 rounded-lg p-3 mb-4">{patient.notes}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={openEdit} icon={<Edit3 className="w-4 h-4" />}>Edit</Button>
              <Button variant="secondary" size="sm" onClick={() => setRenewOpen(true)} icon={<RefreshCw className="w-4 h-4" />}>Renew Package</Button>
              <Button variant="secondary" size="sm" onClick={() => setWaOpen(true)} icon={<MessageCircle className="w-4 h-4 text-emerald-500" />}>WhatsApp</Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} className="text-red-500">Delete</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Session Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="animate-slide-up stagger-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-surface-400">Package</p>
              <p className="font-semibold text-surface-800">{patient.package_id?.name}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-surface-400">Completed</p>
              <p className="font-semibold text-surface-800">{sessions_completed} / {total_sessions}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up stagger-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-surface-400">Remaining</p>
              <p className="font-semibold text-surface-800">{sessions_remaining}</p>
            </div>
          </div>
        </Card>
      </div>

      <ProgressBar value={sessions_completed} max={total_sessions} />

      {/* Session History */}
      <div>
        <h2 className="text-lg font-semibold text-surface-800 mb-3">Session History</h2>
        {sessions.length === 0 ? (
          <Card>
            <p className="text-center text-surface-400 py-6">No sessions recorded yet</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sessions.map((session, i) => (
              <Card key={session._id} className={`!p-4 animate-slide-up stagger-${Math.min(i + 1, 4)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                      <span className="text-brand-600 font-bold text-xs">#{session.session_number}</span>
                    </div>
                    <div>
                      <p className="font-medium text-surface-800 text-sm">Session {session.session_number}</p>
                    </div>
                  </div>
                  <div className="text-xs text-surface-400 text-right">
                    <p>{new Date(session.scan_time).toLocaleDateString()}</p>
                    <p>{new Date(session.scan_time).toLocaleTimeString()}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Patient">
        <div className="space-y-4">
          <Input label="Patient Name" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Mobile Number" required type="tel" inputMode="numeric" maxLength={10} value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          <Textarea label="Notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleEdit} loading={editSaving} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Renew Modal */}
      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="Renew Package">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            This will clear all existing session records and assign a new package.
          </div>
          <CustomSelect
            label="New Package"
            required
            value={renewForm.package_id}
            onChange={(val) => setRenewForm({ ...renewForm, package_id: val })}
            placeholder="Choose a package"
            options={packages.map((p) => ({ value: p._id, label: p.name, description: `${p.total_sessions} sessions` }))}
          />
          <Input
            label="New Start Date"
            required
            type="date"
            value={renewForm.start_date}
            onChange={(e) => setRenewForm({ ...renewForm, start_date: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setRenewOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleRenew} loading={renewSaving} className="flex-1">Renew Package</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Patient"
        message={`Delete "${patient.name}" and all session records? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        loading={deleteLoading}
      />

      {/* WhatsApp Picker */}
      <WhatsappPicker
        open={waOpen}
        onClose={() => setWaOpen(false)}
        patient={{
          name: patient.name,
          mobile: patient.mobile,
          package_name: patient.package_id?.name || 'N/A',
          sessions_done: sessions_completed,
          sessions_left: sessions_remaining,
          total_sessions: total_sessions,
        }}
      />
    </div>
  );
}
