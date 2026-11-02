import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from './schemas/message.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { Student, StudentDoc } from '../students/schemas/student.schema';
import { UserRole } from '../users/schemas/user.schema';

interface AuthUser {
  _id: Types.ObjectId | string;
  type: string;
  role: string;
}

const STAFF_ROLES: string[] = [UserRole.ADMIN, UserRole.GLORY_STAFF];
const MAX_CONVERSATIONS = 100;

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Student.name) private studentModel: Model<StudentDoc>,
  ) {}

  async send(user: AuthUser, dto: SendMessageDto) {
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('Message cannot be empty');
    const sender = new Types.ObjectId(user._id.toString());

    // Students always write to the shared team inbox
    if (user.type === 'student') {
      const message = await this.messageModel.create({
        sender,
        senderModel: 'Student',
        subject: dto.subject,
        body,
        type: 'manual',
        status: 'sent',
        sentAt: new Date(),
      });
      return this.toThreadMessage(message.toObject());
    }

    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException('Only Veridan staff can send messages');
    }
    if (!dto.recipientId) {
      throw new BadRequestException('Choose a student to message');
    }
    if (dto.recipientModel && dto.recipientModel !== 'Student') {
      throw new BadRequestException('Staff can only message students');
    }
    const studentExists = await this.studentModel.exists({
      _id: dto.recipientId,
    });
    if (!studentExists) throw new NotFoundException('Student not found');

    const message = await this.messageModel.create({
      sender,
      senderModel: 'User',
      recipient: new Types.ObjectId(dto.recipientId),
      recipientModel: 'Student',
      subject: dto.subject,
      body,
      type: dto.type || 'manual',
      templateName: dto.templateName,
      status: 'sent',
      sentAt: new Date(),
    });
    return this.toThreadMessage(message.toObject());
  }

  // Everything a student sent or received makes up their conversation with the team
  private threadFilter(studentId: Types.ObjectId) {
    return {
      $or: [
        { sender: studentId, senderModel: 'Student' },
        { recipient: studentId, recipientModel: 'Student' },
      ],
    };
  }

  private toThreadMessage(m: any) {
    const fromStudent = m.senderModel === 'Student';
    const senderName =
      m.sender && typeof m.sender === 'object' && 'firstName' in m.sender
        ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim()
        : '';
    return {
      _id: m._id,
      subject: m.subject,
      body: m.body,
      fromStudent,
      senderName: senderName || (fromStudent ? 'Student' : 'Veridan Team'),
      sentAt: m.sentAt || m.createdAt,
      isRead: m.isRead,
    };
  }

  // Opening a conversation marks the other side's messages as read
  async getThread(studentId: string, viewer: 'student' | 'staff') {
    const id = new Types.ObjectId(studentId);
    const unreadFromOtherSide =
      viewer === 'student'
        ? { recipient: id, recipientModel: 'Student', isRead: false }
        : { sender: id, senderModel: 'Student', isRead: false };
    await this.messageModel.updateMany(unreadFromOtherSide, { isRead: true });

    const messages = await this.messageModel
      .find(this.threadFilter(id))
      .populate('sender', 'firstName lastName')
      .sort({ sentAt: 1 })
      .lean();
    return { messages: messages.map((m) => this.toThreadMessage(m)) };
  }

  async getConversation(studentId: string) {
    if (!Types.ObjectId.isValid(studentId)) {
      throw new BadRequestException('Invalid student ID');
    }
    const student = await this.studentModel
      .findById(studentId)
      .select('firstName lastName email studentId')
      .lean();
    if (!student) throw new NotFoundException('Student not found');
    const { messages } = await this.getThread(studentId, 'staff');
    return {
      student: {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        studentId: student.studentId,
      },
      messages,
    };
  }

  async listConversations() {
    return this.messageModel.aggregate([
      {
        $match: {
          $or: [{ senderModel: 'Student' }, { recipientModel: 'Student' }],
        },
      },
      {
        $addFields: {
          student: {
            $cond: [
              { $eq: ['$senderModel', 'Student'] },
              '$sender',
              '$recipient',
            ],
          },
        },
      },
      { $sort: { sentAt: -1 } },
      {
        $group: {
          _id: '$student',
          lastMessage: { $first: '$body' },
          lastMessageAt: { $first: '$sentAt' },
          lastFromStudent: { $first: { $eq: ['$senderModel', 'Student'] } },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$senderModel', 'Student'] },
                    { $eq: ['$isRead', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $limit: MAX_CONVERSATIONS },
      {
        $lookup: {
          from: this.studentModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        },
      },
      // Drops conversations whose student account was deleted
      { $unwind: '$student' },
      {
        $project: {
          _id: '$student._id',
          firstName: '$student.firstName',
          lastName: '$student.lastName',
          email: '$student.email',
          studentId: '$student.studentId',
          lastMessage: 1,
          lastMessageAt: 1,
          lastFromStudent: 1,
          unreadCount: 1,
        },
      },
    ]);
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
      senderName: m.sender ? `${m.sender.firstName || ''} ${m.sender.lastName || ''}`.trim() : 'Veridan Staff',
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
      senderName: message.sender ? `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim() : 'Veridan Staff',
      recipientName: message.recipient ? `${message.recipient.firstName || ''} ${message.recipient.lastName || ''}`.trim() : 'Student',
    };
  }

  async getUnreadCount(user: AuthUser) {
    // Staff share one inbox: any unread student message counts for all of them
    const filter =
      user.type !== 'student' && STAFF_ROLES.includes(user.role)
        ? { senderModel: 'Student', isRead: false }
        : {
            recipient: new Types.ObjectId(user._id.toString()),
            recipientModel: user.type === 'student' ? 'Student' : 'User',
            isRead: false,
          };
    const count = await this.messageModel.countDocuments(filter);
    return { unreadCount: count, count };
  }
}
