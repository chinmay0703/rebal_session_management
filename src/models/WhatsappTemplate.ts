import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsappTemplate extends Document {
  name: string;
  category: 'reminder' | 'review' | 'followup' | 'payment' | 'holiday' | 'general';
  message: string;
  created_at: Date;
}

const WhatsappTemplateSchema = new Schema<IWhatsappTemplate>({
  name: { type: String, required: true },
  category: { type: String, enum: ['reminder', 'review', 'followup', 'payment', 'holiday', 'general'], default: 'general' },
  message: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.models.WhatsappTemplate || mongoose.model<IWhatsappTemplate>('WhatsappTemplate', WhatsappTemplateSchema);
