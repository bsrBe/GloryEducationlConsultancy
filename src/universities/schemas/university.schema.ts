import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class Program {
  @Prop({ required: true })
  name: string;

  @Prop()
  degreeLevel: string;

  @Prop()
  gpaRequirement: number;

  @Prop()
  englishRequirement: string;

  @Prop()
  tuitionInfo: string;
}

@Schema({ timestamps: true })
export class University extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  destination: string;

  @Prop({ type: [Program], default: [] })
  programs: Program[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  representative: Types.ObjectId;

  @Prop({ default: 50 })
  reviewCapacity: number;

  @Prop({ default: false })
  liveSessionAvailable: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const UniversitySchema = SchemaFactory.createForClass(University);
