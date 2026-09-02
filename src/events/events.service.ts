import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import {
  CreateEventDto,
  UpdateEventDto,
  CreateSessionDto,
  AssignStudentsDto,
  CheckInDto,
} from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  // --- Event CRUD ---
  async create(dto: CreateEventDto) {
    const event = new this.eventModel({
      ...dto,
      date: new Date(dto.date),
      status: 'draft',
    });
    return event.save();
  }

  async findAll() {
    return this.eventModel.find().sort({ date: -1 }).lean();
  }

  async findById(id: string) {
    const event = await this.eventModel
      .findById(id)
      .populate('moderators', 'firstName lastName email')
      .populate('sessions.university', 'name destination')
      .populate('sessions.representative', 'firstName lastName email')
      .populate(
        'sessions.assignedStudents',
        'studentId firstName lastName email',
      )
      .populate('checkIns.student', 'studentId firstName lastName')
      .lean();
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    const event = await this.eventModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async delete(id: string) {
    const event = await this.eventModel.findByIdAndDelete(id).lean();
    if (!event) throw new NotFoundException('Event not found');
    return { message: 'Event deleted' };
  }

  // --- Session Management ---
  async addSession(eventId: string, dto: CreateSessionDto) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');

    const session = {
      name: dto.name,
      destination: dto.destination,
      university: dto.university
        ? new Types.ObjectId(dto.university)
        : undefined,
      representative: dto.representative
        ? new Types.ObjectId(dto.representative)
        : undefined,
      time: dto.time,
      roomLink: dto.roomLink,
      capacity: dto.capacity || 50,
      assignedStudents: [],
    };

    event.sessions.push(session as any);
    await event.save();
    return { message: 'Session added', session };
  }

  async updateSession(
    eventId: string,
    sessionIndex: number,
    dto: Partial<CreateSessionDto>,
  ) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (!event.sessions[sessionIndex])
      throw new BadRequestException('Session not found');

    const session = event.sessions[sessionIndex];
    if (dto.name) session.name = dto.name;
    if (dto.destination) session.destination = dto.destination;
    if (dto.university) session.university = new Types.ObjectId(dto.university);
    if (dto.representative)
      session.representative = new Types.ObjectId(dto.representative);
    if (dto.time) session.time = dto.time;
    if (dto.roomLink) session.roomLink = dto.roomLink;
    if (dto.capacity) session.capacity = dto.capacity;

    await event.save();
    return { message: 'Session updated', session };
  }

  async deleteSession(eventId: string, sessionIndex: number) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (!event.sessions[sessionIndex])
      throw new BadRequestException('Session not found');

    event.sessions.splice(sessionIndex, 1);
    await event.save();
    return { message: 'Session deleted' };
  }

  // --- Student Assignment ---
  async assignStudents(
    eventId: string,
    sessionIndex: number,
    dto: AssignStudentsDto,
  ) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (!event.sessions[sessionIndex])
      throw new BadRequestException('Session not found');

    const session = event.sessions[sessionIndex];
    const studentIds = dto.studentIds.map((id) => new Types.ObjectId(id));

    // Add new students (avoid duplicates)
    for (const id of studentIds) {
      if (!session.assignedStudents.some((s) => s.equals(id))) {
        session.assignedStudents.push(id);
      }
    }

    await event.save();
    return { message: `${studentIds.length} students assigned`, session };
  }

  async removeStudent(
    eventId: string,
    sessionIndex: number,
    studentId: string,
  ) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (!event.sessions[sessionIndex])
      throw new BadRequestException('Session not found');

    const session = event.sessions[sessionIndex];
    session.assignedStudents = session.assignedStudents.filter(
      (s) => !s.equals(new Types.ObjectId(studentId)),
    );

    await event.save();
    return { message: 'Student removed from session' };
  }

  // --- Check-In / Attendance ---
  async checkIn(eventId: string, studentId: string, dto: CheckInDto) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');

    // Check if student already checked in
    const existingCheckIn = event.checkIns.find((ci) =>
      ci.student.equals(new Types.ObjectId(studentId)),
    );

    if (existingCheckIn) {
      // Update existing check-in (self-report after event)
      existingCheckIn.attended = dto.attended !== false;
      if (dto.codeUsed) existingCheckIn.codeUsed = dto.codeUsed;
      existingCheckIn.checkedInAt = new Date();
      await event.save();
      return { message: 'Check-in updated', checkIn: existingCheckIn };
    }

    // New check-in
    const checkIn = {
      student: new Types.ObjectId(studentId),
      session: dto.sessionId ? new Types.ObjectId(dto.sessionId) : undefined,
      checkedInAt: new Date(),
      method: dto.code ? 'code' : 'self_report',
      codeUsed: dto.code,
      attended: dto.attended !== false,
    };

    event.checkIns.push(checkIn as any);
    await event.save();
    return { message: 'Checked in', checkIn };
  }

  async verifyCheckInCode(eventId: string, code: string): Promise<boolean> {
    const event = await this.eventModel.findById(eventId).lean();
    if (!event) return false;
    return event.checkInCode === code;
  }

  // --- Attendance Reports ---
  async getAttendanceReport(eventId: string) {
    const event = await this.eventModel
      .findById(eventId)
      .populate('checkIns.student', 'studentId firstName lastName email')
      .populate('checkIns.session', 'name destination')
      .lean();

    if (!event) throw new NotFoundException('Event not found');

    const totalAssigned = event.sessions.reduce(
      (sum, s) => sum + (s.assignedStudents?.length || 0),
      0,
    );

    const totalCheckedIn = event.checkIns.filter((ci) => ci.attended).length;
    const totalNoShows = totalAssigned - totalCheckedIn;

    const bySession = event.sessions.map((session) => {
      const sessionCheckIns = event.checkIns.filter(
        (ci) =>
          ci.session?.toString() === (session as any)._id?.toString() &&
          ci.attended,
      );
      return {
        sessionId: (session as any)._id,
        name: session.name,
        destination: session.destination,
        assigned: session.assignedStudents?.length || 0,
        attended: sessionCheckIns.length,
        noShows:
          (session.assignedStudents?.length || 0) - sessionCheckIns.length,
      };
    });

    return {
      eventId,
      eventName: event.name,
      date: event.date,
      totalAssigned,
      totalCheckedIn,
      totalNoShows,
      bySession,
      checkIns: event.checkIns,
    };
  }

  async getStudentSessions(eventId: string, studentId: string) {
    const event = await this.eventModel
      .findById(eventId)
      .populate('sessions.university', 'name destination')
      .populate('sessions.representative', 'firstName lastName')
      .lean();

    if (!event) throw new NotFoundException('Event not found');

    const assignedSessions = event.sessions.filter((s) =>
      s.assignedStudents?.some((sa) => sa.toString() === studentId),
    );

    const checkIn = event.checkIns.find(
      (ci) => ci.student.toString() === studentId,
    );

    return {
      event: {
        id: event._id,
        name: event.name,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        mainRoomLink: event.mainRoomLink,
        status: event.status,
      },
      assignedSessions,
      hasCheckedIn: !!checkIn,
      attended: checkIn?.attended || false,
    };
  }
}
