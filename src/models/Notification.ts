import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  type: 'session_started' | 'last_3_sessions' | 'package_completed';
  patient_name: string;
  patient_mobile: string;
  message: string;
  read: boolean;
  created_at: Date;
}

const NotificationSchema = new Schema<INotification>({
  type: {
    type: String,
    enum: ['session_started', 'last_3_sessions', 'package_completed'],
    required: true,
  },
  patient_name: { type: String, required: true },
  patient_mobile: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
