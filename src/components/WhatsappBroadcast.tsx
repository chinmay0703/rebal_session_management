'use client';
import { useEffect, useState } from 'react';
import { Modal, Button, Badge } from '@/components/ui/components';
import { Send, FileText, MessageCircle, Users, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Template {
  _id: string;
  name: string;
  category: string;
  message: string;
}

interface BroadcastPatient {
  name: string;
  mobile: string;
  package_name: string;
  sessions_done: number;
  sessions_left: number;
  total_sessions: number;
}

const categoryColors: Record<string, string> = {
  reminder: 'bg-amber-50 text-amber-700',
  review: 'bg-sky-50 text-sky-700',
  followup: 'bg-violet-50 text-violet-700',
  payment: 'bg-emerald-50 text-emerald-700',
  holiday: 'bg-rose-50 text-rose-700',
  general: 'bg-surface-100 text-surface-600',
};

function fillTemplate(message: string, patient: BroadcastPatient): string {
  return message
    .replace(/\{patient_name\}/g, patient.name)
    .replace(/\{package_name\}/g, patient.package_name || 'N/A')
    .replace(/\{sessions_done\}/g, String(patient.sessions_done ?? 0))
    .replace(/\{sessions_left\}/g, String(patient.sessions_left ?? 0))
    .replace(/\{total_sessions\}/g, String(patient.total_sessions ?? 0));
}

export default function WhatsappBroadcast({ open, onClose, patients }: {
  open: boolean;
  onClose: () => void;
  patients: BroadcastPatient[];
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [customMsg, setCustomMsg] = useState('');
  const [mode, setMode] = useState<'templates' | 'custom'>('templates');
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [currentPatient, setCurrentPatient] = useState('');

  useEffect(() => {
    if (!open) { setSentCount(0); setCurrentPatient(''); return; }
    setLoading(true);
    fetch('/api/whatsapp-templates')
      .then((r) => r.json())
      .then(setTemplates)
      .finally(() => setLoading(false));
  }, [open]);

  const broadcastMessage = async (message: string) => {
    setSending(true);
    setSentCount(0);

    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      const filled = fillTemplate(message, p);
      const phone = p.mobile.replace(/\D/g, '');
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(filled)}`;

      setCurrentPatient(p.name);
      setSentCount(i + 1);

      window.open(url, '_blank');

      // Small delay between opens to avoid browser blocking popups
      if (i < patients.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    setSending(false);
    toast.success(`Opened WhatsApp for ${patients.length} patients`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Broadcast to All Active Patients" size="lg">
      <div className="space-y-4">
        {/* Toggle */}
        <div className="flex gap-2">
          <button onClick={() => setMode('templates')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${mode === 'templates' ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-500'}`}>
            <FileText className="w-4 h-4 inline mr-1.5" />Templates
          </button>
          <button onClick={() => setMode('custom')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${mode === 'custom' ? 'bg-brand-600 text-white' : 'bg-surface-100 text-surface-500'}`}>
            <MessageCircle className="w-4 h-4 inline mr-1.5" />Custom
          </button>
        </div>

        {/* Recipients Count */}
        <div className="flex items-center gap-3 bg-brand-50 rounded-xl p-3 border border-brand-100">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-brand-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-brand-800 text-sm">Sending to {patients.length} active patient{patients.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-brand-600">Each patient will receive a personalized message via WhatsApp</p>
          </div>
        </div>

        {/* Sending Progress */}
        {sending && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-emerald-700">Opening WhatsApp...</span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-600 mb-2">
              <span>Sending to: {currentPatient}</span>
              <span>{sentCount}/{patients.length}</span>
            </div>
            <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${(sentCount / patients.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Sent Complete */}
        {!sending && sentCount > 0 && sentCount === patients.length && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center animate-fade-in">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-700">
              WhatsApp opened for all {patients.length} patients!
            </p>
            <p className="text-xs text-emerald-600 mt-1">Send the message in each WhatsApp tab</p>
          </div>
        )}

        {mode === 'templates' ? (
          <>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-surface-300 mx-auto mb-2" />
                <p className="text-surface-400 text-sm mb-3">No templates created yet</p>
                <p className="text-xs text-surface-400">Go to Templates page to create message templates</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                {templates.map((t) => {
                  const samplePatient = patients[0];
                  const preview = samplePatient
                    ? fillTemplate(t.message, samplePatient)
                    : t.message;
                  return (
                    <div key={t._id}
                      className="border border-surface-200 rounded-xl p-4 hover:border-brand-300 hover:bg-brand-50/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-surface-800 text-sm">{t.name}</h4>
                          <Badge className={categoryColors[t.category] || categoryColors.general}>{t.category}</Badge>
                        </div>
                        <Button size="sm" onClick={() => broadcastMessage(t.message)} disabled={sending}
                          icon={<Send className="w-3.5 h-3.5" />}>
                          Send All
                        </Button>
                      </div>
                      {samplePatient && (
                        <p className="text-[10px] text-brand-500 mb-1 font-medium">
                          Preview for: {samplePatient.name} (auto-fills for each patient)
                        </p>
                      )}
                      <p className="text-xs text-surface-500 whitespace-pre-wrap line-clamp-3 bg-white rounded-lg p-2 border border-surface-100">
                        {preview}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <textarea
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="Type your broadcast message here... Use {patient_name} for personalization"
              className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-800 placeholder:text-surface-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all resize-none min-h-[120px] text-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {['{patient_name}', '{package_name}', '{sessions_done}', '{sessions_left}'].map(tag => (
                <button key={tag} type="button"
                  onClick={() => setCustomMsg(prev => prev + tag)}
                  className="px-2 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-mono hover:bg-brand-100 transition-colors cursor-pointer">
                  {tag}
                </button>
              ))}
            </div>
            {customMsg.trim() && patients[0] && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-[10px] text-brand-500 font-medium mb-1">
                  Preview for: {patients[0].name} (auto-fills for each patient)
                </p>
                <p className="text-xs text-surface-600 whitespace-pre-wrap">
                  {fillTemplate(customMsg, patients[0])}
                </p>
              </div>
            )}
            <Button onClick={() => broadcastMessage(customMsg)} disabled={!customMsg.trim() || sending}
              icon={<Send className="w-4 h-4" />} className="w-full">
              Send to All {patients.length} Patients
            </Button>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> This will open WhatsApp Web for each patient in a new tab.
            You may need to allow popups in your browser. Send each message manually in the opened tabs.
          </p>
        </div>
      </div>
    </Modal>
  );
}
