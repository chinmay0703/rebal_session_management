import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  mobile: string;
  package_id: mongoose.Types.ObjectId;
  start_date: Date;
  notes?: string;
  status: 'active' | 'completed' | 'expired';
  created_at: Date;
}

const PatientSchema = new Schema<IPatient>({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  package_id: { type: Schema.Types.ObjectId, ref: 'Package', required: true },
  start_date: { type: Date, required: true },
  notes: { type: String },
  status: { type: String, enum: ['active', 'completed', 'expired'], default: 'active' },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
