import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/schemas/user.schema';
import { Student } from '../students/schemas/student.schema';
import { RegisterStudentDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/password.dto';
import { StudentsService } from '../students/students.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Student.name) private studentModel: Model<Student>,
    private jwtService: JwtService,
    private studentsService: StudentsService,
    private emailService: EmailService,
  ) {}

  async registerStudent(dto: RegisterStudentDto) {
    const existing = await this.studentModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const studentId = await this.studentsService.generateStudentId();

    const student = new this.studentModel({
      ...dto,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      studentId,
    });

    await student.save();

    const token = this.generateToken({
      sub: student._id.toString(),
      email: student.email,
      role: 'student',
      type: 'student',
    });

    // Send registration confirmation email
    this.emailService.sendTemplateEmail('registration_confirmation', {
      email: student.email,
      name: `${student.firstName} ${student.lastName}`,
    }, {
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      studentId: student.studentId,
    }).catch(() => {});

    return {
      access_token: token,
      student: {
        studentId: student.studentId,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
      },
    };
  }

  async login(dto: LoginDto) {
    // Try student login first
    const student = await this.studentModel.findOne({ email: dto.email.toLowerCase() });
    if (student) {
      const isMatch = await bcrypt.compare(dto.password, student.password);
      if (!isMatch) throw new UnauthorizedException('Invalid credentials');

      const token = this.generateToken({
        sub: student._id.toString(),
        email: student.email,
        role: 'student',
        type: 'student',
      });

      return {
        access_token: token,
        user: {
          id: student._id,
          studentId: student.studentId,
          email: student.email,
          firstName: student.firstName,
          lastName: student.lastName,
          role: 'student',
          type: 'student',
        },
      };
    }

    // Try staff login
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const token = this.generateToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'user',
    });

    return {
      access_token: token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        type: 'user',
      },
    };
  }

  async changePassword(userId: string, userType: string, dto: ChangePasswordDto) {
    if (userType === 'student') {
      const student = await this.studentModel.findById(userId);
      if (!student) throw new NotFoundException('Student not found');

      const isMatch = await bcrypt.compare(dto.currentPassword, student.password);
      if (!isMatch) throw new BadRequestException('Current password is incorrect');

      student.password = await bcrypt.hash(dto.newPassword, 12);
      await student.save();
      return { message: 'Password changed successfully' };
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    user.password = await bcrypt.hash(dto.newPassword, 12);
    await user.save();
    return { message: 'Password changed successfully' };
  }

  async resetPassword(email: string) {
    const student = await this.studentModel.findOne({ email: email.toLowerCase() });
    const user = await this.userModel.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!student && !user) {
      return { message: 'If an account exists with this email, a reset link has been sent.' };
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    if (student) {
      student.password = hashedPassword;
      await student.save();

      // Send reset email
      this.emailService.sendCustomEmail(
        [{ email: student.email, name: `${student.firstName} ${student.lastName}` }],
        'Password Reset - Glory Admissions Fair',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Dear ${student.firstName},</p>
          <p>Your password has been reset. Here are your new credentials:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${student.email}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p>Please log in and change your password immediately.</p>
          <p>If you did not request this reset, please contact support.</p>
          <p>Best regards,<br>Glory Educational Consultancy</p>
        </div>`,
      ).catch(() => {});
    }

    if (user) {
      user.password = hashedPassword;
      await user.save();

      this.emailService.sendCustomEmail(
        [{ email: user.email, name: `${user.firstName} ${user.lastName}` }],
        'Password Reset - Glory Admissions Fair',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset</h2>
          <p>Dear ${user.firstName},</p>
          <p>Your password has been reset. Here are your new credentials:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p>Please log in and change your password immediately.</p>
          <p>If you did not request this reset, please contact support.</p>
          <p>Best regards,<br>Glory Educational Consultancy</p>
        </div>`,
      ).catch(() => {});
    }

    return { message: 'If an account exists with this email, a reset link has been sent.' };
  }

  private generateToken(payload: { sub: string; email: string; role: string; type: string }) {
    return this.jwtService.sign(payload);
  }
}
