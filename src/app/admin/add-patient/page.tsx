'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Select, Textarea } from '@/components/ui/components';
import { UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface Pkg {
  _id: string;
  name: string;
  total_sessions: number;
}

export default function AddPatientPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    package_id: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetch('/api/packages')
      .then((r) => r.json())
      .then(setPackages);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobile || !form.package_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to add patient');
        return;
      }
      toast.success('Patient added successfully');
      router.push('/admin/patients');
    } catch {
      toast.error('Failed to add patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Add Patient</h1>
        <p className="text-surface-400 mt-1">Register a new patient</p>
      </div>

      <Card className="max-w-2xl animate-slide-up">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-surface-800">Patient Details</h2>
          </div>

          <Input
            label="Patient Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Enter patient full name"
          />

          <Input
            label="Mobile Number"
            required
            type="tel"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            placeholder="Enter mobile number (must be unique)"
          />

          <Select
            label="Select Package"
            required
            value={form.package_id}
            onChange={(e) => setForm({ ...form, package_id: e.target.value })}
            placeholder="Choose a package"
            options={packages.map((p) => ({ value: p._id, label: `${p.name} (${p.total_sessions} sessions)` }))}
          />

          <Input
            label="Start Date"
            required
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any additional notes (optional)"
          />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/patients')} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              Add Patient
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
