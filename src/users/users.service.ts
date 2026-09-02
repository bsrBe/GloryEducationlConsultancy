import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(dto: CreateUserDto) {
    const existing = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = new this.userModel({
      ...dto,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
    });

    const saved = await user.save();
    const { password, ...result } = saved.toObject();
    return result;
  }

  async findAll() {
    return this.userModel.find().select('-password').lean();
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).select('-password').lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).lean();
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.email) dto.email = dto.email.toLowerCase();
    if (dto.password) dto.password = await bcrypt.hash(dto.password, 12);

    const user = await this.userModel
      .findByIdAndUpdate(id, dto, { new: true })
      .select('-password')
      .lean();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string) {
    const user = await this.userModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .select('-password')
      .lean();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByRole(role: UserRole) {
    return this.userModel
      .find({ role, isActive: true })
      .select('-password')
      .lean();
  }
}
