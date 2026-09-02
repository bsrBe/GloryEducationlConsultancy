import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from './schemas/counter.schema';

@Injectable()
export class CountersService {
  constructor(
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
  ) {}

  /**
   * Atomically increment a counter and return the new value.
   * Uses findOneAndUpdate with $inc to prevent race conditions.
   * If the counter doesn't exist, it's created with seq = 1.
   */
  async getNextSequence(name: string): Promise<number> {
    const result = await this.counterModel
      .findOneAndUpdate(
        { name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      )
      .exec();

    return result.seq;
  }

  /**
   * Get current counter value without incrementing.
   */
  async getCurrentValue(name: string): Promise<number> {
    const counter = await this.counterModel.findOne({ name }).lean().exec();
    return counter?.seq || 0;
  }
}
