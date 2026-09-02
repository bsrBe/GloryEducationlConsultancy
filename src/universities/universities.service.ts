import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { University } from './schemas/university.schema';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';

@Injectable()
export class UniversitiesService {
  constructor(
    @InjectModel(University.name) private universityModel: Model<University>,
  ) {}

  async create(dto: CreateUniversityDto) {
    const university = new this.universityModel(dto);
    return university.save();
  }

  async findAll(activeOnly = false) {
    const filter = activeOnly ? { isActive: true } : {};
    return this.universityModel
      .find(filter)
      .populate('representative', '-password')
      .lean();
  }

  async findById(id: string) {
    const uni = await this.universityModel
      .findById(id)
      .populate('representative', '-password')
      .lean();
    if (!uni) throw new NotFoundException('University not found');
    return uni;
  }

  async update(id: string, dto: UpdateUniversityDto) {
    const uni = await this.universityModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!uni) throw new NotFoundException('University not found');
    return uni;
  }

  async toggleActive(id: string) {
    const uni = await this.universityModel.findById(id);
    if (!uni) throw new NotFoundException('University not found');

    uni.isActive = !uni.isActive;
    await uni.save();
    return {
      message: `University ${uni.isActive ? 'activated' : 'deactivated'}`,
      university: uni,
    };
  }
}
