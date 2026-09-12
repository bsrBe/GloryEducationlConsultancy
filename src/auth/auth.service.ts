import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
    const existing = await this.studentModel.findOne({
      email: dto.email.toLowerCase(),
    });
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
    this.emailService
      .sendTemplateEmail(
        'registration_confirmation',
        {
          email: student.email,
          name: `${student.firstName} ${student.lastName}`,
        },
        {
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          studentId: student.studentId,
        },
      )
      .catch(() => {});

    return {
      access_token: token,
      student: {
        id: student._id,
        _id: student._id,
        studentId: student.studentId,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        role: 'student',
      },
      user: {
        id: student._id,
        _id: student._id,
        studentId: student.studentId,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        role: 'student',
        type: 'student',
      },
    };
  }

  async login(dto: LoginDto) {
    // Try student login first
    const student = await this.studentModel.findOne({
      email: dto.email.toLowerCase(),
    });
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
          _id: student._id,
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
    const user = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive)
      throw new UnauthorizedException('Account is deactivated');

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
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        type: 'user',
      },
    };
  }

  async changePassword(
    userId: string,
    userType: string,
    dto: ChangePasswordDto,
  ) {
    if (userType === 'student') {
      const student = await this.studentModel.findById(userId);
      if (!student) throw new NotFoundException('Student not found');

      const isMatch = await bcrypt.compare(
        dto.currentPassword,
        student.password,
      );
      if (!isMatch)
        throw new BadRequestException('Current password is incorrect');

      student.password = await bcrypt.hash(dto.newPassword, 12);
      await student.save();
      return { message: 'Password changed successfully' };
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch)
      throw new BadRequestException('Current password is incorrect');

    user.password = await bcrypt.hash(dto.newPassword, 12);
    await user.save();
    return { message: 'Password changed successfully' };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.toLowerCase();
    
    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Try to find user first
    let user = await this.userModel.findOne({ email: normalizedEmail });
    let isStudent = false;
    
    if (!user) {
      // Try to find student
      user = await this.studentModel.findOne({ email: normalizedEmail });
      isStudent = true;
    }

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message: 'If an account exists with this email, a reset link has been sent.',
      };
    }

    // Update reset token
    if (isStudent) {
      await this.studentModel.findByIdAndUpdate(user._id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });
    } else {
      await this.userModel.findByIdAndUpdate(user._id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });
    }

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    this.emailService
      .sendTemplateEmail(
        'password_reset_request',
        {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        },
        {
          firstName: user.firstName,
          email: user.email,
          resetUrl,
        },
      )
      .catch((err) => {
        console.error('Failed to send password reset email:', err);
      });

    return {
      message: 'If an account exists with this email, a reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    // Try to find user with valid reset token
    let user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });
    
    let isStudent = false;
    
    if (!user) {
      // Try students
      user = await this.studentModel.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      });
      isStudent = true;
    }

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    if (isStudent) {
      await this.studentModel.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      });
    } else {
      await this.userModel.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
      });
    }

    // Send confirmation email
    this.emailService
      .sendTemplateEmail(
        'password_reset_confirmation',
        {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        },
        {
          firstName: user.firstName,
          email: user.email,
          loginUrl: process.env.FRONTEND_URL + '/login' || 'http://localhost:3000/login',
        },
      )
      .catch((err) => {
        console.error('Failed to send password reset confirmation email:', err);
      });

    return { message: 'Password reset successful' };
  }

  private generateToken(payload: {
    sub: string;
    email: string;
    role: string;
    type: string;
  }) {
    return this.jwtService.sign(payload);
  }
}
