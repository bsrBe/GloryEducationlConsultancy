import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Audit extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true })
  action: string;

  @Prop()
  studentId: string;

  @Prop({ type: Object })
  details: Record<string, any>;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);

AuditSchema.index({ timestamp: -1 });
AuditSchema.index({ studentId: 1, timestamp: -1 });
AuditSchema.index({ user: 1, timestamp: -1 });
