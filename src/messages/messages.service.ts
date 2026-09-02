import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './schemas/message.schema';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async send(senderId: string, senderModel: string, dto: SendMessageDto) {
    const message = new this.messageModel({
      sender: new Types.ObjectId(senderId.toString()),
      senderModel,
      recipient: new Types.ObjectId(dto.recipientId.toString()),
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
    const recipientId = new Types.ObjectId(userId.toString());
    const messages = await this.messageModel
      .find({
        recipient: recipientId,
        recipientModel: userModel,
      })
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .sort({ sentAt: -1 })
      .lean();

    return messages.map((m: any) => ({
      ...m,
      content: m.body,
      read: m.isRead,
      createdAt: m.sentAt || m.createdAt,
      senderName: m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() : 'Glory Staff',
      recipientName: m.recipient ? `${m.recipient.firstName || ''} ${m.recipient.lastName || ''}`.trim() : 'Student',
    }));
  }

  async getMessage(messageId: string, userId: string) {
    const message: any = await this.messageModel
      .findById(messageId)
      .populate('sender', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .lean();
    if (!message) throw new NotFoundException('Message not found');

    const senderId = message.sender?._id?.toString() || message.sender?.toString();
    const recipientId = message.recipient?._id?.toString() || message.recipient?.toString();

    // Only sender or recipient can view
    if (senderId !== userId && recipientId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Mark as read if recipient
    if (recipientId === userId && !message.isRead) {
      await this.messageModel.findByIdAndUpdate(messageId, { isRead: true });
      message.isRead = true;
    }

    return {
      ...message,
      content: message.body,
      read: message.isRead,
      createdAt: message.sentAt || message.createdAt,
      senderName: message.sender ? `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim() : 'Glory Staff',
      recipientName: message.recipient ? `${message.recipient.firstName || ''} ${message.recipient.lastName || ''}`.trim() : 'Student',
    };
  }

  async getUnreadCount(userId: string, userModel: string) {
    const recipientId = new Types.ObjectId(userId.toString());
    const count = await this.messageModel.countDocuments({
      recipient: recipientId,
      recipientModel: userModel,
      isRead: false,
    });
    return { unreadCount: count, count };
  }
}
