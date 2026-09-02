import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StudentDoc = Student & Document;

// --- Embedded Sub-schemas ---

@Schema({ _id: false })
export class Payment {
  @Prop({ required: true, enum: ['telebirr', 'bank_transfer', 'cash'] })
  method: string;

  @Prop({ required: true })
  transactionRef: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: Date.now })
  date: Date;

  @Prop({
    required: true,
    enum: ['Pending', 'Verified', 'Failed', 'Refunded', 'Credited'],
    default: 'Pending',
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  verifiedBy: Types.ObjectId;

  @Prop()
  verifiedAt: Date;
}

@Schema({ _id: false })
export class StudentDocumentEntry {
  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  cloudinaryUrl: string;

  @Prop()
  fileSize: number;

  @Prop({ default: Date.now })
  uploadedAt: Date;

  @Prop({ default: 1 })
  version: number;

  @Prop({
    enum: ['Not Uploaded', 'Uploaded', 'Reviewed', 'Needs Replacement'],
    default: 'Not Uploaded',
  })
  reviewStatus: string;
}

export const StudentDocumentEntrySchema =
  SchemaFactory.createForClass(StudentDocumentEntry);

@Schema({ _id: false })
export class Assessment {
  @Prop({ type: Object, default: {} })
  categoryScores: Record<string, number>;

  @Prop({ default: 0 })
  totalScore: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assessedBy: Types.ObjectId;

  @Prop()
  assessedAt: Date;

  @Prop({ type: Object })
  override: {
    score: number;
    reason: string;
    overriddenBy: Types.ObjectId;
    overriddenAt: Date;
  };
}

@Schema({ _id: false })
export class MatchEntry {
  @Prop({ type: Types.ObjectId, ref: 'University' })
  university: Types.ObjectId;

  @Prop()
  program: string;

  @Prop()
  reason: string;
}

@Schema({ _id: false })
export class Matches {
  @Prop({ type: MatchEntry })
  primary: MatchEntry;

  @Prop({ type: MatchEntry })
  secondary: MatchEntry;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  matchedBy: Types.ObjectId;

  @Prop()
  matchedAt: Date;

  @Prop({ enum: ['suggested', 'approved', 'rejected'], default: 'suggested' })
  status: string;
}

@Schema({ _id: false })
export class RepresentativeReview {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  universityRep: Types.ObjectId;

  @Prop({ enum: ['Green', 'Yellow', 'Red'] })
  decision: string;

  @Prop()
  comments: string;

  @Prop()
  reviewedAt: Date;

  @Prop({ default: false })
  isLocked: boolean;
}

@Schema({ _id: false })
export class Result {
  @Prop()
  status: string;

  @Prop()
  nextStep: string;

  @Prop()
  disclaimer: string;

  @Prop()
  publishedAt: Date;

  @Prop({ default: 1 })
  version: number;

  @Prop({ default: false })
  isPublished: boolean;
}

@Schema({ _id: false })
export class EventInfo {
  @Prop({ enum: ['registered', 'attended', 'no_show'], default: 'registered' })
  attendanceStatus: string;

  @Prop({ type: [String], default: [] })
  assignedSessions: string[];

  @Prop()
  attendedAt: Date;
}

@Schema({ _id: false })
export class Application {
  @Prop({
    enum: [
      'Interested',
      'Consultation',
      'AppStarted',
      'DocsComplete',
      'Submitted',
      'Offer',
      'I20',
      'Visa',
      'Completed',
      'Lost',
    ],
    default: 'Interested',
  })
  stage: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedStaff: Types.ObjectId;

  @Prop({ default: false })
  serviceFeeAgreed: boolean;

  @Prop({ default: false })
  serviceFeePaid: boolean;

  @Prop()
  nextActionDate: Date;
}

// --- Main Student Schema ---

@Schema({ timestamps: true })
export class Student {
  @Prop({ required: true, unique: true })
  studentId: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  age: number;

  @Prop()
  educationLevel: string;

  @Prop()
  school: string;

  @Prop()
  gpa: number;

  @Prop()
  graduationYear: number;

  @Prop()
  intendedProgram: string;

  @Prop()
  preferredCountry: string;

  @Prop()
  preferredUniversity: string;

  @Prop()
  englishTest: string;

  @Prop()
  englishScore: number;

  @Prop()
  dateOfBirth: string;

  @Prop()
  gender: string;

  @Prop()
  city: string;

  @Prop()
  institution: string;

  @Prop()
  programInterest: string;

  @Prop()
  countryPreference: string;

  @Prop()
  englishProficiency: string;

  @Prop({ type: Object })
  budget: any;

  @Prop({ type: Object })
  financialBudget: any;

  @Prop()
  intake: string;

  @Prop({ default: 0 })
  profileComplete: number;

  @Prop({ type: [Payment], default: [] })
  payments: Payment[];

  @Prop({ type: [StudentDocumentEntry], default: [] })
  documents: StudentDocumentEntry[];

  @Prop({ type: Assessment })
  assessment: Assessment;

  @Prop({ type: Matches })
  matches: Matches;

  @Prop({ type: RepresentativeReview })
  representativeReview: RepresentativeReview;

  @Prop({ type: Result })
  result: Result;

  @Prop({ type: EventInfo })
  event: EventInfo;

  @Prop({ type: Application })
  application: Application;

  @Prop()
  influencerSource: string;
}

export const StudentSchema = SchemaFactory.createForClass(Student);

StudentSchema.index({ createdAt: -1 });
StudentSchema.index({ 'payments.status': 1 });
StudentSchema.index({ 'representativeReview.decision': 1 });
StudentSchema.index({ 'matches.status': 1 });
StudentSchema.index({ 'matches.primary.university': 1 });
StudentSchema.index({ 'application.stage': 1 });
StudentSchema.index({ influencerSource: 1 });
