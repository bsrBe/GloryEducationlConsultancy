import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student, StudentDoc } from './schemas/student.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreatePaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { CreateAssessmentDto, OverrideAssessmentDto } from './dto/assessment.dto';
import { ApproveMatchDto } from './dto/match.dto';
import { CreateReviewDto } from './dto/review.dto';
import { PublishResultDto } from './dto/result.dto';
import { EmailService } from '../email/email.service';
import { CountersService } from '../counters/counters.service';

@Injectable()
export class StudentsService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDoc>,
    private emailService: EmailService,
    private countersService: CountersService,
  ) {}

  async generateStudentId(): Promise<string> {
    const nextNum = await this.countersService.getNextSequence('studentId');
    return `GH26-${nextNum.toString().padStart(6, '0')}`;
  }

  async findAll(query?: { page?: number; limit?: number; search?: string }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query?.search) {
      filter.$or = [
        { studentId: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [students, total] = await Promise.all([
      this.studentModel.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.studentModel.countDocuments(filter),
    ]);

    return { students, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async findById(id: string) {
    const student = await this.studentModel.findById(id).select('-password').lean();
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async findByStudentId(studentId: string) {
    const student = await this.studentModel.findOne({ studentId }).select('-password').lean();
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const student = await this.studentModel.findByIdAndUpdate(id, { $set: dto }, { new: true }).select('-password').lean();
    if (!student) throw new NotFoundException('Student not found');
    return this.calculateProfileCompletion(student._id.toString());
  }

  private async calculateProfileCompletion(id: string) {
    const student = await this.studentModel.findById(id).lean();
    if (!student) throw new NotFoundException('Student not found');

    const requiredFields = ['firstName', 'lastName', 'phone', 'email', 'educationLevel', 'school', 'gpa', 'graduationYear', 'intendedProgram', 'preferredCountry', 'englishTest', 'englishScore'];
    const filled = requiredFields.filter(f => {
      const val = student[f as keyof typeof student];
      return val != null && val !== '';
    });
    const percentage = Math.round((filled.length / requiredFields.length) * 100);
    await this.studentModel.findByIdAndUpdate(id, { profileComplete: percentage });
    return { ...student, profileComplete: percentage };
  }

  async addPayment(studentId: string, dto: CreatePaymentDto) {
    const student = await this.studentModel.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');
    student.payments.push({ method: dto.method, transactionRef: dto.transactionRef, amount: dto.amount, date: new Date(), status: 'Pending' } as any);
    await student.save();

    // Send payment received email
    this.emailService.sendTemplateEmail('payment_received', {
      email: student.email,
      name: `${student.firstName} ${student.lastName}`,
    }, {
      firstName: student.firstName,
      studentId: student.studentId,
      amount: dto.amount.toString(),
      method: dto.method,
      transactionRef: dto.transactionRef,
    }).catch(() => {});

    return { message: 'Payment recorded', payments: student.payments };
  }

  async verifyPayment(studentId: string, paymentIndex: number, dto: VerifyPaymentDto, verifiedBy: string) {
    const student = await this.studentModel.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');
    if (!student.payments[paymentIndex]) throw new BadRequestException('Payment not found');
    student.payments[paymentIndex].status = dto.status;
    student.payments[paymentIndex].verifiedBy = new Types.ObjectId(verifiedBy);
    student.payments[paymentIndex].verifiedAt = new Date();
    await student.save();

    // Send payment verified email
    if (dto.status === 'Verified') {
      this.emailService.sendTemplateEmail('payment_verified', {
        email: student.email,
        name: `${student.firstName} ${student.lastName}`,
      }, {
        firstName: student.firstName,
        studentId: student.studentId,
      }).catch(() => {});
    }

    return { message: `Payment ${dto.status.toLowerCase()}`, payment: student.payments[paymentIndex] };
  }

  async addDocument(studentId: string, file: Express.Multer.File, cloudinaryUrl: string) {
    const student = await this.studentModel.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');
    const doc = { fileName: file.originalname, cloudinaryUrl, fileSize: file.size, uploadedAt: new Date(), version: 1, reviewStatus: 'Uploaded' };
    student.documents.push(doc as any);
    await student.save();
    return { message: 'Document uploaded', document: doc };
  }

  async reviewDocument(studentId: string, docIndex: number, status: string) {
    const student = await this.studentModel.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');
    if (!student.documents[docIndex]) throw new BadRequestException('Document not found');
    (student.documents[docIndex] as any).reviewStatus = status;
    await student.save();
    return { message: `Document marked as ${status}`, document: student.documents[docIndex] };
  }

  async assessStudent(studentId: string, dto: CreateAssessmentDto, assessedBy: string) {
    const student = await this.studentModel.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');
    student.assessment = { categoryScores: dto.categoryScores, totalScore: dto.totalScore, assessedBy: new Types.ObjectId(assessedBy), assessedAt: new Date(), override: null } as any;
    await student.save();
    return { message: 'Assessment recorded', assessment: student.assessment };
  }

  async overrideAssessment(studentId: string, dto: OverrideAssessmentDto, overriddenBy: string) {
    const student = await this.studentModel.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');
    if (!student.assessment) throw new BadRequestException('No assessment to override');
    student.assessment.totalScore = dto.score;
    student.assessment.override = { score: dto.score, reason: dto.reason, overriddenBy: new Types.ObjectId(overriddenBy), overriddenAt: new Date() } as any;
    await student.save();
    return { message: 'Assessment overridden', assessment: student.assessment };
  }

  async suggestMatches(studentId: string, matchedBy: string) {
    const student = await this.studentModel.findById(studentId).lean();
    if (!student) throw new NotFoundException('Student not found');
    const universityModel = this.studentModel.db.model('University');
    const universities = await universityModel.find({ isActive: true }).lean();

    const scored = universities.map((uni: any) => {
      let score = 0;
      if (uni.destination?.toLowerCase() === student.preferredCountry?.toLowerCase()) score += 30;
      const programs = uni.programs || [];
      const matchingProgram = programs.find((p: any) => p.name?.toLowerCase() === student.intendedProgram?.toLowerCase());
      if (matchingProgram) { score += 25; if (student.gpa >= (matchingProgram.gpaRequirement || 0)) score += 10; }
      if (student.englishScore) score += 10;
      return { university: uni, score, program: matchingProgram?.name || programs[0]?.name };
    });

    scored.sort((a: any, b: any) => b.score - a.score);
    const primary = scored[0];
    const secondary = scored[1];

    const reasonBuilder = (match: any) => {
      const parts: string[] = [];
      if (student.preferredCountry) parts.push(`${student.preferredCountry} preference`);
      if (match?.program) parts.push(match.program);
      if (student.gpa) parts.push(`GPA ${student.gpa}`);
      if (student.englishTest && student.englishScore) parts.push(`${student.englishTest} ${student.englishScore}`);
      if (student.intake) parts.push(`${student.intake} intake`);
      return parts.join(' + ') || 'General match';
    };

    const matches = {
      primary: primary?.university ? { university: primary.university._id, program: primary.program, reason: reasonBuilder(primary) } : null,
      secondary: secondary?.university ? { university: secondary.university._id, program: secondary.program, reason: reasonBuilder(secondary) } : null,
      matchedBy: new Types.ObjectId(matchedBy), matchedAt: new Date(), status: 'suggested',
    };

    await this.studentModel.findByIdAndUpdate(studentId, { matches });
    return { message: 'Matches suggested', matches };
  }

  async approveMatch(studentId: string, dto: ApproveMatchDto) {
    const student = await this.studentModel.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');
    if (!student.matches) throw new BadRequestException('No matches to approve');
    if (dto.primaryUniversityId) student.matches.primary.university = new Types.ObjectId(dto.primaryUniversityId);
    if (dto.primaryProgram) student.matches.primary.program = dto.primaryProgram;
    if (dto.secondaryUniversityId) student.matches.secondary.university = new Types.ObjectId(dto.secondaryUniversityId);
    if (dto.secondaryProgram) student.matches.secondary.program = dto.secondaryProgram;
    student.matches.status = dto.status;
    await student.save();
    return { message: `Match ${dto.status}`, matches: student.matches };
  }

  async submitReview(studentId: string, repId: string, dto: CreateReviewDto) {
    const student = await this.studentModel.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');
    if (student.representativeReview?.isLocked) throw new BadRequestException('Review is already locked');
    student.representativeReview = { universityRep: new Types.ObjectId(repId), decision: dto.decision, comments: dto.comments, reviewedAt: new Date(), isLocked: true } as any;
    await student.save();
    return { message: 'Review submitted', review: student.representativeReview };
  }

  async publishResult(studentId: string, dto: PublishResultDto) {
    const student = await this.studentModel.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');

    const version = (student.result?.version || 0) + 1;
    student.result = { status: dto.status, nextStep: dto.nextStep, disclaimer: dto.disclaimer || 'This assessment is preliminary. Final admission depends on the institution\'s official application and verification.', publishedAt: new Date(), version, isPublished: true } as any;
    await student.save();

    // Get university name for the match
    let primaryMatchName = 'Pending';
    if (student.matches?.primary?.university) {
      const universityModel = this.studentModel.db.model('University');
      const uni = await universityModel.findById(student.matches.primary.university).lean().catch(() => null) as any;
      primaryMatchName = uni?.name || 'Matched Institution';
    }

    // Determine email template based on result
    const templateMap: Record<string, string> = {
      'Green': 'result_green',
      'Yellow': 'result_yellow',
      'Red': 'result_red',
    };

    const templateName = templateMap[dto.status] || 'assessment_ready';

    // Send result email
    this.emailService.sendTemplateEmail(templateName, {
      email: student.email,
      name: `${student.firstName} ${student.lastName}`,
    }, {
      firstName: student.firstName,
      studentId: student.studentId,
      primaryMatch: primaryMatchName,
      nextStep: dto.nextStep,
      resultStatus: dto.status,
    }).catch(() => {});

    return { message: 'Result published', result: student.result };
  }

  async getStudentResult(id: string) {
    const student = await this.studentModel.findById(id).select('studentId firstName lastName result matches representativeReview').lean();
    if (!student) throw new NotFoundException('Student not found');
    if (!student.result?.isPublished) return { message: 'Assessment in Progress', studentId: student.studentId };
    return student;
  }

  async getAssignedStudents(repId: string) {
    return this.studentModel.find({ 'matches.primary.university': { $exists: true }, $or: [{ 'representativeReview.universityRep': new Types.ObjectId(repId) }, { 'matches.status': 'approved' }] }).select('-password').lean();
  }

  async updateApplicationStage(studentId: string, stage: string, assignedStaff?: string) {
    const student = await this.studentModel.findById(studentId);
    if (!student) throw new NotFoundException('Student not found');
    student.application = { ...student.application, stage: stage as any, ...(assignedStaff && { assignedStaff: new Types.ObjectId(assignedStaff) }) } as any;
    await student.save();

    // Send application invitation email
    if (stage === 'Consultation') {
      let primaryMatchName = 'Your matched institution';
      if (student.matches?.primary?.university) {
        const universityModel = this.studentModel.db.model('University');
        const uni = await universityModel.findById(student.matches.primary.university).lean().catch(() => null) as any;
        primaryMatchName = uni?.name || primaryMatchName;
      }
      this.emailService.sendTemplateEmail('application_invitation', {
        email: student.email,
        name: `${student.firstName} ${student.lastName}`,
      }, {
        firstName: student.firstName,
        studentId: student.studentId,
        primaryMatch: primaryMatchName,
        resultStatus: student.representativeReview?.decision || 'N/A',
      }).catch(() => {});
    }

    return { message: 'Application stage updated', application: student.application };
  }

  // --- Student Dashboard (aggregated view) ---
  async getStudentDashboard(studentId: string) {
    const student = await this.studentModel.findById(studentId)
      .select('studentId firstName lastName email phone educationLevel school gpa graduationYear intendedProgram preferredCountry englishTest englishScore profileComplete payments documents assessment matches representativeReview result event application')
      .lean();
    if (!student) throw new NotFoundException('Student not found');

    // Get university names for matches
    let primaryMatchName = null;
    let secondaryMatchName = null;
    if (student.matches?.primary?.university) {
      const universityModel = this.studentModel.db.model('University');
      const uni = await universityModel.findById(student.matches.primary.university).lean().catch(() => null) as any;
      primaryMatchName = uni?.name || null;
    }
    if (student.matches?.secondary?.university) {
      const universityModel = this.studentModel.db.model('University');
      const uni = await universityModel.findById(student.matches.secondary.university).lean().catch(() => null) as any;
      secondaryMatchName = uni?.name || null;
    }

    return {
      studentId: student.studentId,
      name: `${student.firstName} ${student.lastName}`,
      email: student.email,
      phone: student.phone,
      education: {
        level: student.educationLevel,
        school: student.school,
        gpa: student.gpa,
        graduationYear: student.graduationYear,
        program: student.intendedProgram,
        country: student.preferredCountry,
        englishTest: student.englishTest,
        englishScore: student.englishScore,
      },
      profileComplete: student.profileComplete,
      paymentStatus: student.payments?.some(p => p.status === 'Verified') ? 'Verified' : 'Pending',
      documentStatus: student.documents?.length > 0 ? student.documents[student.documents.length - 1].reviewStatus : 'Not Uploaded',
      assessmentStatus: student.assessment?.totalScore > 0 ? 'Completed' : 'Pending',
      assessmentScore: student.assessment?.totalScore || null,
      matchStatus: student.matches?.status || 'Not Matched',
      primaryMatch: primaryMatchName,
      secondaryMatch: secondaryMatchName,
      representativeDecision: student.representativeReview?.decision || 'Pending',
      resultPublished: student.result?.isPublished || false,
      result: student.result?.isPublished ? {
        status: student.result.status,
        nextStep: student.result.nextStep,
        disclaimer: student.result.disclaimer,
      } : null,
      applicationStage: student.application?.stage || 'N/A',
    };
  }

  // --- Document URL (signed/temporary) ---
  async getDocumentUrl(studentId: string, docIndex: number) {
    const student = await this.studentModel.findById(studentId).lean();
    if (!student) throw new NotFoundException('Student not found');
    if (!student.documents[docIndex]) throw new BadRequestException('Document not found');

    const doc = student.documents[docIndex];
    // Cloudinary URLs are already secure, but we can add expiry if needed
    return {
      fileName: doc.fileName,
      url: doc.cloudinaryUrl,
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt,
      reviewStatus: doc.reviewStatus,
    };
  }

  // --- Payment History (student's own) ---
  async getPaymentHistory(studentId: string) {
    const student = await this.studentModel.findById(studentId)
      .select('studentId payments')
      .lean();
    if (!student) throw new NotFoundException('Student not found');
    return {
      studentId: student.studentId,
      payments: student.payments,
    };
  }

  // --- Export Students (CSV) ---
  async exportStudents(query?: { search?: string }) {
    const filter: any = {};
    if (query?.search) {
      filter.$or = [
        { studentId: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
      ];
    }

    const students = await this.studentModel.find(filter)
      .select('studentId firstName lastName email phone educationLevel gpa graduationYear intendedProgram preferredCountry englishTest englishScore profileComplete payments assessment matches representativeReview result application influencerSource createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Convert to CSV format
    const headers = ['Student ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Education Level', 'GPA', 'Graduation Year', 'Program', 'Country', 'English Test', 'English Score', 'Profile %', 'Payment Status', 'Assessment Score', 'Match Status', 'Result', 'Application Stage', 'Influencer Source', 'Registered At'];
    const rows = students.map(s => [
      s.studentId,
      s.firstName,
      s.lastName,
      s.email,
      s.phone,
      s.educationLevel || '',
      s.gpa || '',
      s.graduationYear || '',
      s.intendedProgram || '',
      s.preferredCountry || '',
      s.englishTest || '',
      s.englishScore || '',
      s.profileComplete || 0,
      s.payments?.some(p => p.status === 'Verified') ? 'Verified' : 'Pending',
      s.assessment?.totalScore || '',
      s.matches?.status || 'Not Matched',
      s.representativeReview?.decision || 'Pending',
      s.application?.stage || 'N/A',
      s.influencerSource || 'organic',
      (s as any).createdAt,
    ]);

    return { headers, rows, total: students.length };
  }

  // --- Dashboard Analytics (staff) ---
  async getDashboardAnalytics() {
    const [totalStudents, paidStudents, assessedStudents, matchedStudents, reviewedStudents, greenCount, yellowCount, redCount, publishedResults, applicationStages, influencerSources] = await Promise.all([
      this.studentModel.countDocuments(),
      this.studentModel.countDocuments({ 'payments.status': 'Verified' }),
      this.studentModel.countDocuments({ 'assessment.totalScore': { $gt: 0 } }),
      this.studentModel.countDocuments({ 'matches.status': 'approved' }),
      this.studentModel.countDocuments({ 'representativeReview.decision': { $exists: true } }),
      this.studentModel.countDocuments({ 'representativeReview.decision': 'Green' }),
      this.studentModel.countDocuments({ 'representativeReview.decision': 'Yellow' }),
      this.studentModel.countDocuments({ 'representativeReview.decision': 'Red' }),
      this.studentModel.countDocuments({ 'result.isPublished': true }),
      this.studentModel.aggregate([{ $group: { _id: '$application.stage', count: { $sum: 1 } } }]),
      this.studentModel.aggregate([{ $group: { _id: '$influencerSource', count: { $sum: 1 } } }]),
    ]);
    return {
      totalStudents,
      paidStudents,
      assessedStudents,
      matchedStudents,
      reviewedStudents,
      representativeReviews: { green: greenCount, yellow: yellowCount, red: redCount },
      publishedResults,
      applicationStages: applicationStages.reduce((acc: any, item: any) => { acc[item._id || 'None'] = item.count; return acc; }, {}),
      influencerSources: influencerSources.reduce((acc: any, item: any) => { acc[item._id || 'organic'] = item.count; return acc; }, {}),
    };
  }

  // --- Bulk Email ---
  async bulkEmail(dto: { templateName: string; studentIds?: string[]; filter?: string }) {
    let students: any[] = [];

    if (dto.studentIds?.length) {
      // Specific students
      students = await this.studentModel.find({ _id: { $in: dto.studentIds } }).select('firstName lastName email studentId').lean();
    } else if (dto.filter) {
      // Filter-based
      const filter: any = {};
      switch (dto.filter) {
        case 'green': filter['representativeReview.decision'] = 'Green'; break;
        case 'yellow': filter['representativeReview.decision'] = 'Yellow'; break;
        case 'red': filter['representativeReview.decision'] = 'Red'; break;
        case 'unpaid': filter.payments = { $not: { $elemMatch: { status: 'Verified' } } }; break;
        case 'incomplete_profile': filter.profileComplete = { $lt: 100 }; break;
        case 'all': break;
        default: throw new BadRequestException('Invalid filter');
      }
      students = await this.studentModel.find(filter).select('firstName lastName email studentId').lean();
    } else {
      throw new BadRequestException('Either studentIds or filter is required');
    }

    if (students.length === 0) {
      return { message: 'No students match the criteria', sent: 0 };
    }

    // Send emails in batches
    let sent = 0;
    let failed = 0;

    for (const student of students) {
      try {
        const result = await this.emailService.sendTemplateEmail(
          dto.templateName,
          { email: student.email, name: `${student.firstName} ${student.lastName}` },
          {
            firstName: student.firstName,
            lastName: student.lastName,
            studentId: student.studentId,
          },
        );
        if (result) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { message: `Bulk email completed`, sent, failed, total: students.length };
  }

  // --- Bulk Assessment ---
  async bulkAssess(assessments: Array<{ studentId: string; categoryScores: Record<string, number>; totalScore: number }>, assessedBy: string) {
    const results: Array<{ studentId: string; success: boolean; message: string }> = [];

    for (const item of assessments) {
      try {
        const student = await this.studentModel.findOne({ studentId: item.studentId });
        if (!student) {
          results.push({ studentId: item.studentId, success: false, message: 'Student not found' });
          continue;
        }

        student.assessment = {
          categoryScores: item.categoryScores,
          totalScore: item.totalScore,
          assessedBy: new Types.ObjectId(assessedBy),
          assessedAt: new Date(),
          override: null,
        } as any;

        await student.save();
        results.push({ studentId: item.studentId, success: true, message: 'Assessed' });
      } catch {
        results.push({ studentId: item.studentId, success: false, message: 'Error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return { message: 'Bulk assessment completed', success: successCount, failed: failCount, results };
  }
}
