import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, refPath: 'senderModel', required: true })
  sender: Types.ObjectId;

  @Prop({ required: true, enum: ['User', 'Student'] })
  senderModel: string;

  // Empty when a student writes to the team: every admin and staff member sees it
  @Prop({ type: Types.ObjectId, refPath: 'recipientModel' })
  recipient?: Types.ObjectId;

  @Prop({ enum: ['User', 'Student'] })
  recipientModel?: string;

  @Prop()
  subject?: string;

  @Prop({ required: true })
  body: string;

  @Prop({ enum: ['template', 'manual'], default: 'manual' })
  type: string;

  @Prop()
  templateName: string;

  @Prop({ enum: ['sent', 'delivered', 'failed'], default: 'sent' })
  status: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: Date.now })
  sentAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ recipient: 1, recipientModel: 1, isRead: 1, sentAt: -1 });
MessageSchema.index({ sender: 1, sentAt: -1 });
MessageSchema.index({ senderModel: 1, sender: 1, sentAt: 1 });
