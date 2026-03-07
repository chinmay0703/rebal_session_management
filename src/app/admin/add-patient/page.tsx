'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, CustomSelect, Textarea } from '@/components/ui/components';
import { UserPlus, User, Phone, Package, Calendar, FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Pkg {
  _id: string;
  name: string;
  total_sessions: number;
  validity_days?: number;
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

  const selectedPkg = packages.find(p => p._id === form.package_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobile || !form.package_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.mobile.length < 10) {
      toast.error('Please enter a valid mobile number');
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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-white border border-surface-200 flex items-center justify-center hover:bg-surface-50 transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-surface-500" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900">New Patient</h1>
          <p className="text-xs sm:text-sm text-surface-400">Register a new patient</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col lg:flex-row lg:gap-6">

          {/* Left Column - Preview Card (desktop only sticky) */}
          <div className="lg:w-[280px] lg:flex-shrink-0 mb-4 lg:mb-0">
            <div className="lg:sticky lg:top-8 space-y-4">
              {/* Avatar Preview */}
              <Card className="animate-slide-up stagger-1">
                <div className="flex flex-row lg:flex-col items-center lg:items-center gap-4 lg:gap-3 lg:text-center">
                  <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-200">
                    {form.name ? (
                      <span className="text-white font-bold text-xl lg:text-3xl">
                        {form.name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <UserPlus className="w-6 h-6 lg:w-8 lg:h-8 text-white/80" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 lg:flex-none">
                    <h2 className="font-semibold text-surface-800 text-base lg:text-lg truncate">
                      {form.name || 'Patient Name'}
                    </h2>
                    <p className="text-xs text-surface-400">
                      {form.mobile ? `+91 ${form.mobile}` : 'Mobile number'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Package Info - shows when selected */}
              {selectedPkg && (
                <Card className="animate-fade-in !p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-medium text-brand-700">{selectedPkg.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="text-xs text-brand-600">
                      <span className="font-semibold text-brand-800">{selectedPkg.total_sessions}</span> sessions
                    </div>
                    {selectedPkg.validity_days && (
                      <div className="text-xs text-brand-600">
                        <span className="font-semibold text-brand-800">{selectedPkg.validity_days}</span> days
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Desktop Action Buttons */}
              <div className="hidden lg:flex flex-col gap-2 pt-1">
                <Button type="submit" loading={saving}
                  className="w-full !py-3.5 text-base"
                  icon={<UserPlus className="w-5 h-5" />}>
                  Add Patient
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.push('/admin/patients')}
                  className="w-full !py-3.5 text-base">
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Form Fields */}
          <div className="flex-1 space-y-4">
            {/* Name & Phone */}
            <Card className="animate-slide-up stagger-1 lg:stagger-1">
              <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                <div className="relative">
                  <div className="absolute left-3.5 top-[38px] text-surface-400">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    label="Full Name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter patient name"
                    className="!pl-10"
                  />
                </div>

                <div className="relative">
                  <div className="absolute left-3.5 top-[38px] text-surface-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <Input
                    label="Mobile Number"
                    required
                    type="tel"
                    inputMode="numeric"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                    placeholder="Enter 10-digit mobile"
                    maxLength={15}
                    className="!pl-10"
                  />
                </div>
              </div>
            </Card>

            {/* Package Selection */}
            <Card className="animate-slide-up stagger-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-brand-600" />
                </div>
                <h3 className="font-semibold text-surface-800 text-sm">Package</h3>
              </div>

              <CustomSelect
                required
                value={form.package_id}
                onChange={(val) => setForm({ ...form, package_id: val })}
                placeholder="Choose a package"
                options={packages.map((p) => ({
                  value: p._id,
                  label: p.name,
                  description: `${p.total_sessions} sessions${p.validity_days ? ` · ${p.validity_days} days validity` : ''}`,
                }))}
              />

              {/* Mobile-only package info */}
              {selectedPkg && (
                <div className="mt-3 bg-brand-50 rounded-xl p-3 border border-brand-100 animate-fade-in lg:hidden">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-600" />
                    <span className="text-sm font-medium text-brand-700">{selectedPkg.name}</span>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="text-xs text-brand-600">
                      <span className="font-semibold text-brand-800">{selectedPkg.total_sessions}</span> sessions
                    </div>
                    {selectedPkg.validity_days && (
                      <div className="text-xs text-brand-600">
                        <span className="font-semibold text-brand-800">{selectedPkg.validity_days}</span> days validity
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* Date & Notes */}
            <Card className="animate-slide-up stagger-3">
              <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                <div className="relative">
                  <div className="absolute left-3.5 top-[38px] text-surface-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <Input
                    label="Start Date"
                    required
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="!pl-10"
                  />
                </div>

                <div className="relative">
                  <div className="absolute left-3.5 top-[38px] text-surface-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <Textarea
                    label="Notes (optional)"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    className="!pl-10 !min-h-[80px]"
                  />
                </div>
              </div>
            </Card>

            {/* Mobile Action Buttons */}
            <div className="flex gap-3 pt-1 pb-4 lg:hidden animate-slide-up stagger-4">
              <Button type="button" variant="secondary" onClick={() => router.push('/admin/patients')}
                className="flex-1 !py-3.5 text-base">
                Cancel
              </Button>
              <Button type="submit" loading={saving}
                className="flex-1 !py-3.5 text-base"
                icon={<UserPlus className="w-5 h-5" />}>
                Add Patient
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
