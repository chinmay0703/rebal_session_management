'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, CustomSelect, Textarea } from '@/components/ui/components';
import { UserPlus, User, Phone, Package, Calendar, FileText, ArrowLeft, CheckCircle2, Upload, Hash, Clock } from 'lucide-react';
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
  const [isImport, setIsImport] = useState(false);
  const [fillMode, setFillMode] = useState<'auto' | 'manual'>('auto');
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    package_id: '',
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [sessionsCompleted, setSessionsCompleted] = useState('');
  const [sessionDates, setSessionDates] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/packages')
      .then((r) => r.json())
      .then(setPackages);
  }, []);

  const selectedPkg = packages.find(p => p._id === form.package_id);

  // When sessions completed changes, adjust dates array and auto-calculate start date
  useEffect(() => {
    const count = parseInt(sessionsCompleted) || 0;
    setSessionDates(prev => {
      if (count > prev.length) {
        const newDates = [...prev];
        for (let i = prev.length; i < count; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (count - i));
          newDates.push(date.toISOString().split('T')[0]);
        }
        return newDates;
      }
      return prev.slice(0, count);
    });

    // Auto-calculate start date: today minus sessions completed
    if (isImport && count > 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - count);
      setForm(prev => ({ ...prev, start_date: startDate.toISOString().split('T')[0] }));
    }
  }, [sessionsCompleted, isImport]);

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

    if (isImport) {
      const count = parseInt(sessionsCompleted);
      if (!count || count < 1) {
        toast.error('Please enter sessions completed');
        return;
      }
      if (selectedPkg && count > selectedPkg.total_sessions) {
        toast.error(`Sessions completed cannot exceed total sessions (${selectedPkg.total_sessions})`);
        return;
      }
    }

    setSaving(true);
    try {
      if (isImport) {
        // Use import API
        const res = await fetch('/api/patients/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            sessions_completed: parseInt(sessionsCompleted),
            auto_fill: fillMode === 'auto',
            session_dates: fillMode === 'manual' ? sessionDates : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || 'Failed to import patient');
          return;
        }
        toast.success(`Patient imported with ${data.sessions_created} sessions`);
      } else {
        // Regular add
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
      }
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
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900">
            {isImport ? 'Import Existing Patient' : 'New Patient'}
          </h1>
          <p className="text-xs sm:text-sm text-surface-400">
            {isImport ? 'Add patient with existing session history' : 'Register a new patient'}
          </p>
        </div>
      </div>

      {/* Toggle: New / Import Existing */}
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setIsImport(false)}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            !isImport
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-surface-500 border border-surface-200 hover:bg-surface-50'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          New Patient
        </button>
        <button
          type="button"
          onClick={() => setIsImport(true)}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            isImport
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-surface-500 border border-surface-200 hover:bg-surface-50'
          }`}
        >
          <Upload className="w-4 h-4" />
          Import Existing
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col lg:flex-row lg:gap-6">

          {/* Left Column - Preview Card (desktop only sticky) */}
          <div className="lg:w-[280px] lg:flex-shrink-0 mb-4 lg:mb-0">
            <div className="lg:sticky lg:top-8 space-y-4">
              {/* Avatar Preview */}
              <Card className="animate-slide-up stagger-1">
                <div className="flex flex-row lg:flex-col items-center lg:items-center gap-4 lg:gap-3 lg:text-center">
                  <div className={`w-14 h-14 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                    isImport
                      ? 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-200'
                      : 'bg-gradient-to-br from-brand-500 to-brand-700 shadow-brand-200'
                  }`}>
                    {form.name ? (
                      <span className="text-white font-bold text-xl lg:text-3xl">
                        {form.name.charAt(0).toUpperCase()}
                      </span>
                    ) : isImport ? (
                      <Upload className="w-6 h-6 lg:w-8 lg:h-8 text-white/80" />
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
                    {isImport && sessionsCompleted && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">
                        {sessionsCompleted} sessions pre-filled
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Package Info */}
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
                  {isImport && sessionsCompleted && (
                    <div className="mt-2 pt-2 border-t border-brand-100">
                      <div className="flex justify-between text-xs">
                        <span className="text-brand-600">Remaining after import</span>
                        <span className="font-semibold text-brand-800">
                          {Math.max(0, selectedPkg.total_sessions - (parseInt(sessionsCompleted) || 0))} sessions
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Desktop Action Buttons */}
              <div className="hidden lg:flex flex-col gap-2 pt-1">
                <Button type="submit" loading={saving}
                  className="w-full !py-3.5 text-base"
                  icon={isImport ? <Upload className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}>
                  {isImport ? 'Import Patient' : 'Add Patient'}
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
                    maxLength={10}
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

            {/* Import Section - only shown in import mode */}
            {isImport && (
              <Card className="animate-slide-up stagger-2 !border-amber-100 !bg-amber-50/30">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Hash className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-800 text-sm">Existing Sessions</h3>
                    <p className="text-[11px] text-surface-400">Sessions already completed by this patient</p>
                  </div>
                </div>

                {/* Sessions completed input */}
                <div className="relative mb-4">
                  <Input
                    label="Sessions Completed"
                    required
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={selectedPkg?.total_sessions || 100}
                    value={sessionsCompleted}
                    onChange={(e) => setSessionsCompleted(e.target.value)}
                    placeholder={`Enter number (max ${selectedPkg?.total_sessions || '?'})`}
                  />
                </div>

                {/* Fill mode toggle */}
                {sessionsCompleted && parseInt(sessionsCompleted) > 0 && (
                  <div className="space-y-3 animate-fade-in">
                    <p className="text-xs font-medium text-surface-600">Session date filling mode:</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFillMode('auto')}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          fillMode === 'auto'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-surface-500 border border-surface-200 hover:bg-surface-50'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Auto Fill
                      </button>
                      <button
                        type="button"
                        onClick={() => setFillMode('manual')}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          fillMode === 'manual'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-white text-surface-500 border border-surface-200 hover:bg-surface-50'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Manual Dates
                      </button>
                    </div>

                    {fillMode === 'auto' && (
                      <div className="bg-white rounded-xl p-3 border border-amber-100 text-xs text-amber-700">
                        <p className="font-medium mb-1">Auto mode:</p>
                        <p className="text-amber-600">
                          {parseInt(sessionsCompleted)} sessions will be added with dates going backward from yesterday, one session per day.
                        </p>
                      </div>
                    )}

                    {fillMode === 'manual' && (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {sessionDates.map((date, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-surface-500 w-14 flex-shrink-0">
                              Day {i + 1}
                            </span>
                            <input
                              type="date"
                              value={date}
                              onChange={(e) => {
                                const newDates = [...sessionDates];
                                newDates[i] = e.target.value;
                                setSessionDates(newDates);
                              }}
                              className="flex-1 px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Date & Notes */}
            <Card className="animate-slide-up stagger-3">
              <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                <div className="relative">
                  <div className="absolute left-3.5 top-[38px] text-surface-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <Input
                    label={isImport ? 'Package Start Date' : 'Start Date'}
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
                icon={isImport ? <Upload className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}>
                {isImport ? 'Import' : 'Add Patient'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
