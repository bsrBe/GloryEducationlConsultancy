import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { StudentsService } from './students.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreatePaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import {
  CreateAssessmentDto,
  OverrideAssessmentDto,
} from './dto/assessment.dto';
import { ApproveMatchDto, OverrideMatchDto } from './dto/match.dto';
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

  // Students reach only their own record. Reps reach only students approved for
  // their university, and only on routes that allow reps. Staff reach everyone.
  private async assertAccess(
    req: any,
    id: string,
    { repAllowed = true }: { repAllowed?: boolean } = {},
  ) {
    const user = req.user;
    if (user?.type === 'student') {
      if (user._id?.toString() !== id)
        throw new ForbiddenException('Access denied');
    } else if (user?.role === UserRole.UNIVERSITY_REP) {
      if (!repAllowed) throw new ForbiddenException('Access denied');
      await this.studentsService.assertRepCanAccess(id, user.university);
    }
  }

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
  async findById(@Param('id') id: string, @Request() req: any) {
    await this.assertAccess(req, id);
    return this.studentsService.findById(
      id,
      req.user?.role === UserRole.UNIVERSITY_REP,
    );
  }

  // --- Update profile (Student or Staff) ---
  @Patch(':id/profile')
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Request() req: any,
  ) {
    await this.assertAccess(req, id, { repAllowed: false });
    return this.studentsService.updateProfile(id, dto);
  }

  // --- Add payment (Student) ---
  @Post(':id/payments')
  async addPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
    @Request() req: any,
  ) {
    await this.assertAccess(req, id, { repAllowed: false });
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
    return this.studentsService.verifyPayment(
      id,
      parseInt(paymentIndex),
      dto,
      req.user._id,
    );
  }

  // --- Upload document ---
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    await this.assertAccess(req, id, { repAllowed: false });
    const result = await this.cloudinaryService.uploadFile(file);
    return this.studentsService.addDocument(id, file, result.url);
  }

  // --- Review document (Staff) ---
  @Patch(':id/documents/:docIndex/review')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  async reviewDocument(
    @Param('id') id: string,
    @Param('docIndex') docIndex: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    await this.assertAccess(req, id);
    return this.studentsService.reviewDocument(id, parseInt(docIndex), status);
  }

  // --- Assess student (Staff) ---
  @Post(':id/assess')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  assessStudent(
    @Param('id') id: string,
    @Body() dto: CreateAssessmentDto,
    @Request() req: any,
  ) {
    return this.studentsService.assessStudent(id, dto, req.user._id);
  }

  // --- Override assessment (Admin) ---
  @Post(':id/assess/override')
  @Roles(UserRole.ADMIN)
  overrideAssessment(
    @Param('id') id: string,
    @Body() dto: OverrideAssessmentDto,
    @Request() req: any,
  ) {
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

  // --- Manually override match (Staff) ---
  @Patch(':id/match/override')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  overrideMatch(
    @Param('id') id: string,
    @Body() dto: OverrideMatchDto,
    @Request() req: any,
  ) {
    return this.studentsService.overrideMatch(id, dto, req.user._id);
  }

  // --- Submit representative review (Rep) ---
  // [G/Y/R disabled] Reps have read-only access, so they can't submit decisions
  @Post(':id/review')
  @Roles(UserRole.ADMIN)
  async submitReview(
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
    @Request() req: any,
  ) {
    await this.assertAccess(req, id);
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
  async getStudentResult(@Param('id') id: string, @Request() req: any) {
    await this.assertAccess(req, id);
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
    return this.studentsService.getAssignedStudents(req.user.university);
  }

  // --- Student Dashboard (aggregated view) ---
  @Get('dashboard/my')
  @UseGuards(AuthGuard('jwt'))
  getMyDashboard(@Request() req: any) {
    const currentId = req.user?._id ? req.user._id.toString() : req.user?.id?.toString();
    return this.studentsService.getStudentDashboard(currentId);
  }

  // --- Self-service account deletion ---
  @Post('dashboard/delete-account')
  @UseGuards(AuthGuard('jwt'))
  deleteSelf(@Request() req: any) {
    const currentId = req.user?._id ? req.user._id.toString() : req.user?.id?.toString();
    if (req.user?.type !== 'student') {
      throw new ForbiddenException('This endpoint is for students only');
    }
    return this.studentsService.deleteSelf(currentId);
  }

  // --- Document URL (signed) ---
  @Get(':id/documents/:docIndex/url')
  @UseGuards(AuthGuard('jwt'))
  async getDocumentUrl(
    @Param('id') id: string,
    @Param('docIndex') docIndex: string,
    @Request() req: any,
  ) {
    await this.assertAccess(req, id);
    return this.studentsService.getDocumentUrl(id, parseInt(docIndex));
  }

  // --- Payment History ---
  @Get(':id/payments/history')
  @UseGuards(AuthGuard('jwt'))
  async getPaymentHistory(@Param('id') id: string, @Request() req: any) {
    await this.assertAccess(req, id, { repAllowed: false });
    return this.studentsService.getPaymentHistory(id);
  }

  // --- Export Students (CSV) ---
  @Get('export/csv')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  async exportStudents(
    @Query('search') search: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.studentsService.exportStudentsCSV({ search });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=veridan-students-export-${new Date().toISOString().split('T')[0]}.csv`,
    );
    return res.send(csv);
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
  bulkEmail(
    @Body()
    dto: {
      templateName: string;
      studentIds?: string[];
      filter?: string;
    },
  ) {
    return this.studentsService.bulkEmail(dto);
  }

  // --- Bulk Assessment ---
  @Post('bulk/assess')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  bulkAssess(
    @Body()
    body: {
      assessments: Array<{
        studentId: string;
        categoryScores: Record<string, number>;
        totalScore: number;
      }>;
    },
    @Request() req: any,
  ) {
    return this.studentsService.bulkAssess(body.assessments, req.user._id);
  }
}
