import {
  Controller, Get, Patch, Post,
  Body, Param, Query, UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreatePaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { CreateAssessmentDto, OverrideAssessmentDto } from './dto/assessment.dto';
import { ApproveMatchDto } from './dto/match.dto';
import { CreateReviewDto } from './dto/review.dto';
import { PublishResultDto } from './dto/result.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('students')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StudentsController {
  constructor(
    private studentsService: StudentsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // --- List all students (Staff only) ---
  @Get()
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.studentsService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
    });
  }

  // --- Get student by MongoDB ID ---
  @Get(':id')
  findById(@Param('id') id: string, @Request() req: any) {
    // Students can only see their own profile
    if (req.user.type === 'student' && req.user._id.toString() !== id) {
      return { message: 'Access denied' };
    }
    return this.studentsService.findById(id);
  }

  // --- Update profile (Student or Staff) ---
  @Patch(':id/profile')
  updateProfile(@Param('id') id: string, @Body() dto: UpdateProfileDto, @Request() req: any) {
    if (req.user.type === 'student' && req.user._id.toString() !== id) {
      return { message: 'Access denied' };
    }
    return this.studentsService.updateProfile(id, dto);
  }

  // --- Add payment (Student) ---
  @Post(':id/payments')
  addPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.studentsService.addPayment(id, dto);
  }

  // --- Verify payment (Staff) ---
  @Patch(':id/payments/:paymentIndex/verify')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  verifyPayment(
    @Param('id') id: string,
    @Param('paymentIndex') paymentIndex: string,
    @Body() dto: VerifyPaymentDto,
    @Request() req: any,
  ) {
    return this.studentsService.verifyPayment(id, parseInt(paymentIndex), dto, req.user._id);
  }

  // --- Upload document ---
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.cloudinaryService.uploadFile(file);
    return this.studentsService.addDocument(id, file, result.url);
  }

  // --- Review document (Staff) ---
  @Patch(':id/documents/:docIndex/review')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF, UserRole.UNIVERSITY_REP)
  reviewDocument(
    @Param('id') id: string,
    @Param('docIndex') docIndex: string,
    @Body('status') status: string,
  ) {
    return this.studentsService.reviewDocument(id, parseInt(docIndex), status);
  }

  // --- Assess student (Staff) ---
  @Post(':id/assess')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  assessStudent(@Param('id') id: string, @Body() dto: CreateAssessmentDto, @Request() req: any) {
    return this.studentsService.assessStudent(id, dto, req.user._id);
  }

  // --- Override assessment (Admin) ---
  @Post(':id/assess/override')
  @Roles(UserRole.ADMIN)
  overrideAssessment(@Param('id') id: string, @Body() dto: OverrideAssessmentDto, @Request() req: any) {
    return this.studentsService.overrideAssessment(id, dto, req.user._id);
  }

  // --- Suggest matches (Staff) ---
  @Post(':id/match')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  suggestMatches(@Param('id') id: string, @Request() req: any) {
    return this.studentsService.suggestMatches(id, req.user._id);
  }

  // --- Approve/edit match (Staff) ---
  @Patch(':id/match/approve')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  approveMatch(@Param('id') id: string, @Body() dto: ApproveMatchDto) {
    return this.studentsService.approveMatch(id, dto);
  }

  // --- Submit representative review (Rep) ---
  @Post(':id/review')
  @Roles(UserRole.UNIVERSITY_REP)
  submitReview(@Param('id') id: string, @Body() dto: CreateReviewDto, @Request() req: any) {
    return this.studentsService.submitReview(id, req.user._id, dto);
  }

  // --- Publish result (Staff) ---
  @Post(':id/result/publish')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  publishResult(@Param('id') id: string, @Body() dto: PublishResultDto) {
    return this.studentsService.publishResult(id, dto);
  }

  // --- Get student result (Student) ---
  @Get(':id/result')
  getStudentResult(@Param('id') id: string, @Request() req: any) {
    if (req.user.type === 'student' && req.user._id.toString() !== id) {
      return { message: 'Access denied' };
    }
    return this.studentsService.getStudentResult(id);
  }

  // --- Update application stage (Staff) ---
  @Patch(':id/application')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  updateApplicationStage(
    @Param('id') id: string,
    @Body('stage') stage: string,
    @Request() req: any,
  ) {
    return this.studentsService.updateApplicationStage(id, stage, req.user._id);
  }

  // --- Get assigned students (Representative) ---
  @Get('representative/assigned')
  @Roles(UserRole.UNIVERSITY_REP)
  getAssignedStudents(@Request() req: any) {
    return this.studentsService.getAssignedStudents(req.user._id);
  }

  // --- Student Dashboard (aggregated view) ---
  @Get('dashboard/my')
  @UseGuards(AuthGuard('jwt'))
  getMyDashboard(@Request() req: any) {
    return this.studentsService.getStudentDashboard(req.user._id.toString());
  }

  // --- Document URL (signed) ---
  @Get(':id/documents/:docIndex/url')
  @UseGuards(AuthGuard('jwt'))
  getDocumentUrl(@Param('id') id: string, @Param('docIndex') docIndex: string, @Request() req: any) {
    // Students can only access their own documents
    if (req.user.type === 'student' && req.user._id.toString() !== id) {
      return { message: 'Access denied' };
    }
    return this.studentsService.getDocumentUrl(id, parseInt(docIndex));
  }

  // --- Payment History ---
  @Get(':id/payments/history')
  @UseGuards(AuthGuard('jwt'))
  getPaymentHistory(@Param('id') id: string, @Request() req: any) {
    if (req.user.type === 'student' && req.user._id.toString() !== id) {
      return { message: 'Access denied' };
    }
    return this.studentsService.getPaymentHistory(id);
  }

  // --- Export Students (CSV) ---
  @Get('export/csv')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  exportStudents(@Query('search') search?: string) {
    return this.studentsService.exportStudents({ search });
  }

  // --- Analytics dashboard (Staff) ---
  @Get('analytics/dashboard')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  getDashboardAnalytics() {
    return this.studentsService.getDashboardAnalytics();
  }

  // --- Bulk Email ---
  @Post('bulk/email')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  bulkEmail(@Body() dto: { templateName: string; studentIds?: string[]; filter?: string }) {
    return this.studentsService.bulkEmail(dto);
  }

  // --- Bulk Assessment ---
  @Post('bulk/assess')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  bulkAssess(@Body() body: { assessments: Array<{ studentId: string; categoryScores: Record<string, number>; totalScore: number }> }, @Request() req: any) {
    return this.studentsService.bulkAssess(body.assessments, req.user._id);
  }
}
