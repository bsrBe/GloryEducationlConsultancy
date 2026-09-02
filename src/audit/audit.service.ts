import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Audit } from './schemas/audit.schema';

@Injectable()
export class AuditService {
  constructor(@InjectModel(Audit.name) private auditModel: Model<Audit>) {}

  async log(
    userId: string,
    action: string,
    studentId?: string,
    details?: Record<string, any>,
  ) {
    const audit = new this.auditModel({
      user: userId,
      action,
      studentId,
      details,
      timestamp: new Date(),
    });
    return audit.save();
  }

  async findAll(query?: {
    studentId?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: any = {};
    if (query?.studentId) filter.studentId = query.studentId;
    if (query?.userId) filter.user = query.userId;

    const page = query?.page || 1;
    const limit = query?.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .populate('user', 'email firstName lastName role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auditModel.countDocuments(filter),
    ]);

    return { logs, total, page, pages: Math.ceil(total / limit) };
  }
}
