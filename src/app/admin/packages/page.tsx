'use client';
import { useEffect, useState, useCallback } from 'react';
import { Button, Card, Input, Textarea, Modal, EmptyState, ConfirmDialog, Skeleton } from '@/components/ui/components';
import { Package, Plus, Edit3, Trash2, Clock, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

interface Pkg {
  _id: string;
  name: string;
  total_sessions: number;
  validity_days?: number;
  description?: string;
  created_at: string;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pkg | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ name: '', total_sessions: '', validity_days: '', description: '' });

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/packages')
      .then((r) => r.json())
      .then(setPackages)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', total_sessions: '', validity_days: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (pkg: Pkg) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      total_sessions: String(pkg.total_sessions),
      validity_days: pkg.validity_days ? String(pkg.validity_days) : '',
      description: pkg.description || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.total_sessions) {
      toast.error('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        total_sessions: Number(form.total_sessions),
        validity_days: form.validity_days ? Number(form.validity_days) : undefined,
        description: form.description || undefined,
      };

      if (editing) {
        await fetch(`/api/packages/${editing._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast.success('Package updated');
      } else {
        await fetch('/api/packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        toast.success('Package created');
      }
      setModalOpen(false);
      load();
    } catch {
      toast.error('Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/packages/${deleteTarget._id}`, { method: 'DELETE' });
      toast.success('Package deleted');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Failed to delete package');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Packages</h1>
          <p className="text-surface-400 mt-1">Manage therapy packages</p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>Add Package</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : packages.length === 0 ? (
        <EmptyState
          icon={<Package className="w-6 h-6 text-surface-400" />}
          title="No packages yet"
          description="Create your first therapy package to get started"
          action={<Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>Add Package</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg, i) => (
            <Card key={pkg._id} hover className={`animate-slide-up stagger-${Math.min(i + 1, 4)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(pkg)} className="p-2 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
                    <Edit3 className="w-4 h-4 text-surface-400" />
                  </button>
                  <button onClick={() => setDeleteTarget(pkg)} className="p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-surface-800 mb-2">{pkg.name}</h3>
              {pkg.description && <p className="text-sm text-surface-400 mb-3 line-clamp-2">{pkg.description}</p>}
              <div className="flex items-center gap-4 text-sm text-surface-500">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-4 h-4" />
                  <span>{pkg.total_sessions} sessions</span>
                </div>
                {pkg.validity_days && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{pkg.validity_days} days</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Package' : 'Add Package'}>
        <div className="space-y-4">
          <Input label="Package Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Physiotherapy Basic" />
          <Input label="Total Sessions" required type="number" min="1" value={form.total_sessions} onChange={(e) => setForm({ ...form, total_sessions: e.target.value })} placeholder="e.g. 12" />
          <Input label="Validity Days" type="number" min="1" value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: e.target.value })} placeholder="e.g. 90 (optional)" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Package description (optional)" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Package"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
