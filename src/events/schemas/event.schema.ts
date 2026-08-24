import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ _id: false })
export class EventSession {
  @Prop({ required: true })
  name: string;

  @Prop()
  destination: string;

  @Prop({ type: Types.ObjectId, ref: 'University' })
  university: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  representative: Types.ObjectId;

  @Prop()
  time: string;

  @Prop()
  roomLink: string;

  @Prop({ default: 50 })
  capacity: number;

  @Prop({ type: [Types.ObjectId], ref: 'Student', default: [] })
  assignedStudents: Types.ObjectId[];
}

@Schema({ _id: false })
export class CheckIn {
  @Prop({ type: Types.ObjectId, ref: 'Student', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'EventSession' })
  session: Types.ObjectId;

  @Prop({ default: Date.now })
  checkedInAt: Date;

  @Prop({ enum: ['code', 'self_report', 'staff'], default: 'self_report' })
  method: string;

  @Prop()
  codeUsed: string;

  @Prop({ default: true })
  attended: boolean;
}

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  date: Date;

  @Prop()
  startTime: string;

  @Prop()
  endTime: string;

  @Prop()
  mainRoomLink: string;

  @Prop({ enum: ['draft', 'published', 'live', 'completed'], default: 'draft' })
  status: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  moderators: Types.ObjectId[];

  @Prop()
  checkInCode: string;

  @Prop({ type: [EventSession], default: [] })
  sessions: EventSession[];

  @Prop({ type: [CheckIn], default: [] })
  checkIns: CheckIn[];
}

export const EventSchema = SchemaFactory.createForClass(Event);
