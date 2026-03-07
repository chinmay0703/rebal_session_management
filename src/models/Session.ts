import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  patient_id: mongoose.Types.ObjectId;
  session_number: number;
  scan_time: Date;
  created_at: Date;
}

const SessionSchema = new Schema<ISession>({
  patient_id: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  session_number: { type: Number, required: true },
  scan_time: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
