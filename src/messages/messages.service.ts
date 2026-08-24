import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from './schemas/message.schema';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async send(senderId: string, senderModel: string, dto: SendMessageDto) {
    const message = new this.messageModel({
      sender: senderId,
      senderModel,
      recipient: dto.recipientId,
      recipientModel: dto.recipientModel,
      subject: dto.subject,
      body: dto.body,
      type: dto.type || 'manual',
      templateName: dto.templateName,
      status: 'sent',
      sentAt: new Date(),
    });

    return message.save();
  }

  async getInbox(userId: string, userModel: string) {
    return this.messageModel
      .find({
        recipient: userId,
        recipientModel: userModel,
      })
      .sort({ sentAt: -1 })
      .lean();
  }

  async getMessage(messageId: string, userId: string) {
    const message = await this.messageModel.findById(messageId).lean();
    if (!message) throw new NotFoundException('Message not found');

    // Only sender or recipient can view
    if (
      message.sender.toString() !== userId &&
      message.recipient.toString() !== userId
    ) {
      throw new ForbiddenException('Access denied');
    }

    // Mark as read if recipient
    if (message.recipient.toString() === userId && !message.isRead) {
      await this.messageModel.findByIdAndUpdate(messageId, { isRead: true });
    }

    return message;
  }

  async getUnreadCount(userId: string, userModel: string) {
    const count = await this.messageModel.countDocuments({
      recipient: userId,
      recipientModel: userModel,
      isRead: false,
    });
    return { unreadCount: count };
  }
}
