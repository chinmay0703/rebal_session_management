'use client';
import { useEffect, useState, useCallback } from 'react';
import { Button, Card, Input, Select, Textarea, Modal, EmptyState, ConfirmDialog, Skeleton, Badge } from '@/components/ui/components';
import { MessageSquareText, Plus, Edit3, Trash2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
  _id: string;
  name: string;
  category: string;
  message: string;
  created_at: string;
}

const categories = [
  { value: 'reminder', label: 'Reminder' },
  { value: 'review', label: 'Review' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'payment', label: 'Payment' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'general', label: 'General' },
];

const categoryColors: Record<string, string> = {
  reminder: 'bg-amber-50 text-amber-700',
  review: 'bg-accent-sky/10 text-accent-sky',
  followup: 'bg-accent-violet/10 text-accent-violet',
  payment: 'bg-emerald-50 text-emerald-700',
  holiday: 'bg-rose-50 text-rose-700',
  general: 'bg-surface-100 text-surface-600',
};

const placeholderHelp = [
  { tag: '{patient_name}', desc: 'Patient\'s name' },
  { tag: '{package_name}', desc: 'Package name' },
  { tag: '{sessions_done}', desc: 'Sessions completed' },
  { tag: '{sessions_left}', desc: 'Sessions remaining' },
  { tag: '{total_sessions}', desc: 'Total sessions' },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterCat, setFilterCat] = useState('all');

  const [form, setForm] = useState({ name: '', category: 'general', message: '' });

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/whatsapp-templates')
      .then((r) => r.json())
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', category: 'general', message: '' });
    setModalOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, category: t.category, message: t.message });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.message) { toast.error('Name and message are required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/whatsapp-templates/${editing._id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        toast.success('Template updated');
      } else {
        await fetch('/api/whatsapp-templates', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        toast.success('Template created');
      }
      setModalOpen(false);
      load();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/whatsapp-templates/${deleteTarget._id}`, { method: 'DELETE' });
      toast.success('Template deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  const insertPlaceholder = (tag: string) => {
    setForm({ ...form, message: form.message + tag });
  };

  const filtered = filterCat === 'all' ? templates : templates.filter(t => t.category === filterCat);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">WhatsApp Templates</h1>
          <p className="text-surface-400 mt-1">Create message templates for quick patient communication</p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>New Template</Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilterCat('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${filterCat === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-surface-500 border border-surface-200 hover:bg-surface-50'}`}>
          All ({templates.length})
        </button>
        {categories.map((c) => {
          const count = templates.filter(t => t.category === c.value).length;
          return (
            <button key={c.value} onClick={() => setFilterCat(c.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${filterCat === c.value ? 'bg-brand-600 text-white' : 'bg-white text-surface-500 border border-surface-200 hover:bg-surface-50'}`}>
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="w-6 h-6 text-surface-400" />}
          title="No templates yet"
          description="Create your first WhatsApp message template"
          action={<Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>New Template</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((t, i) => (
            <Card key={t._id} className={`animate-slide-up stagger-${Math.min(i + 1, 4)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <MessageSquareText className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-800 text-sm">{t.name}</h3>
                    <Badge className={categoryColors[t.category] || categoryColors.general}>{t.category}</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
                    <Edit3 className="w-3.5 h-3.5 text-surface-400" />
                  </button>
                  <button onClick={() => setDeleteTarget(t)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-surface-500 whitespace-pre-wrap line-clamp-4 bg-surface-50 rounded-lg p-3">{t.message}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'New Template'} size="lg">
        <div className="space-y-4">
          <Input label="Template Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Session Reminder, Review Request" />
          <Select label="Category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            options={categories} />

          {/* Placeholder Tags */}
          <div>
            <label className="block text-sm font-medium text-surface-600 mb-1.5">Placeholders</label>
            <div className="flex flex-wrap gap-1.5">
              {placeholderHelp.map((p) => (
                <button key={p.tag} type="button" onClick={() => insertPlaceholder(p.tag)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-mono hover:bg-brand-100 transition-colors cursor-pointer"
                  title={p.desc}>
                  <Copy className="w-3 h-3" /> {p.tag}
                </button>
              ))}
            </div>
            <p className="text-xs text-surface-400 mt-1">Click to insert. These will be replaced with actual patient data when sending.</p>
          </div>

          <Textarea label="Message" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Hi {patient_name}, this is a reminder for your upcoming session..." className="!min-h-[120px]" />

          {/* Preview */}
          {form.message && (
            <div>
              <label className="block text-sm font-medium text-surface-600 mb-1.5">Preview</label>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-surface-700 whitespace-pre-wrap">
                {form.message
                  .replace(/\{patient_name\}/g, 'John Doe')
                  .replace(/\{package_name\}/g, 'Physiotherapy Basic')
                  .replace(/\{sessions_done\}/g, '8')
                  .replace(/\{sessions_left\}/g, '4')
                  .replace(/\{total_sessions\}/g, '12')}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Template"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
