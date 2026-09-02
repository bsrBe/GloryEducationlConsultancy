import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { Student } from '../students/schemas/student.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Student.name) private studentModel: Model<Student>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    type: string;
  }) {
    if (payload.type === 'student') {
      const student = await this.studentModel
        .findById(payload.sub)
        .select('-password');
      if (!student) throw new UnauthorizedException();
      return { ...student.toObject(), role: 'student', type: 'student' };
    }

    const user = await this.userModel.findById(payload.sub).select('-password');
    if (!user || !user.isActive) throw new UnauthorizedException();
    return { ...user.toObject(), type: 'user' };
  }
}
