import mongoose, { Schema, Document } from 'mongoose';

export interface IPackage extends Document {
  name: string;
  total_sessions: number;
  validity_days?: number;
  description?: string;
  created_at: Date;
}

const PackageSchema = new Schema<IPackage>({
  name: { type: String, required: true },
  total_sessions: { type: Number, required: true },
  validity_days: { type: Number },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Package || mongoose.model<IPackage>('Package', PackageSchema);
