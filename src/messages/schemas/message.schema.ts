import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, refPath: 'senderModel', required: true })
  sender: Types.ObjectId;

  @Prop({ required: true, enum: ['User', 'Student'] })
  senderModel: string;

  @Prop({ type: Types.ObjectId, refPath: 'recipientModel', required: true })
  recipient: Types.ObjectId;

  @Prop({ required: true, enum: ['User', 'Student'] })
  recipientModel: string;

  @Prop({ required: true })
  subject: string;

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
