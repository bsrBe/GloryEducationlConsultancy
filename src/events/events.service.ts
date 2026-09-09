import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { Student, StudentDoc } from '../students/schemas/student.schema';
import { WherebyService } from '../whereby/whereby.service';
import {
  CreateEventDto,
  UpdateEventDto,
  CreateSessionDto,
  AssignStudentsDto,
  CheckInDto,
  JoinEventDto,
} from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDoc>,
    private readonly wherebyService: WherebyService,
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

  // --- Whereby Video Room Access Gate (Paywall + Time Gate) ---
  async joinRoom(eventId: string, user: any, dto: JoinEventDto) {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');

    const isStaff =
      user.role === 'admin' ||
      user.role === 'glory_staff' ||
      user.role === 'representative';

    let studentProfile: StudentDoc | null = null;

    // 1. Payment Verification Gate for Students
    // TEMPORARILY DISABLED FOR TESTING — re-enable before production!
    if (!isStaff) {
      studentProfile = await this.studentModel.findById(user._id);
      if (!studentProfile) {
        throw new UnauthorizedException('Student profile not found');
      }

      // const hasVerifiedPayment = studentProfile.payments?.some(
      //   (p) => p.status === 'Verified',
      // );
      //
      // if (!hasVerifiedPayment) {
      //   throw new ForbiddenException(
      //     'Access to the live admissions conference requires a verified 500 ETB registration pass. Please complete or verify your payment in the payments section.',
      //   );
      // }
    }

    // 2. Validate Session (if requesting a breakout track)
    let sessionName = 'Main Plenary Room';
    let targetSession: any = null;

    if (dto.sessionIndex !== undefined) {
      if (!event.sessions || !event.sessions[dto.sessionIndex]) {
        throw new BadRequestException('Requested breakout session does not exist.');
      }
      targetSession = event.sessions[dto.sessionIndex];
      sessionName =
        targetSession.name || `Breakout Track ${dto.sessionIndex + 1}`;
    }

    // 3. Time Gate (Students can only join 15 mins before start time unless event is marked 'live')
    if (!isStaff && event.status !== 'live') {
      const timeCheck = this.isEventOpen(
        event.date,
        event.startTime,
        event.endTime,
      );
      if (!timeCheck.allowed) {
        throw new BadRequestException(timeCheck.message);
      }
    }

    // 4. Compute meeting endDate from event date + endTime (falls back to +4h from now)
    const endDate = this.computeMeetingEndDate(event.date, event.endTime);

    // 5. Create a Whereby meeting.
    //    No tokens needed — host privileges come via hostRoomUrl.
    //    Rooms auto-delete 1 hour after endDate, so a fresh one is created lazily on join.
    const displayName = `${user.firstName} ${user.lastName}`;
    const meeting = await this.wherebyService.createMeeting({
      endDate,
      withHost: true,
    });

    // 6. Staff get the host URL (lock, mute, remove participants);
    //    students get the plain room URL.
    const roomUrl =
      isStaff && meeting.hostRoomUrl ? meeting.hostRoomUrl : meeting.roomUrl;

    // 7. Automatic Attendance Check-in for students
    if (studentProfile) {
      await this.checkIn(eventId, studentProfile._id.toString(), {
        sessionId: targetSession
          ? (targetSession as any)._id?.toString()
          : undefined,
        attended: true,
      }).catch(() => {});
    }

    const studentIdBadge = studentProfile?.studentId
      ? ` (${studentProfile.studentId})`
      : ` (${user.role || 'Guest'})`;

    return {
      roomUrl,
      displayName: `${displayName}${studentIdBadge}`,
      email: user.email,
      isModerator: isStaff,
      eventName: event.name,
      sessionName,
      startTime: event.startTime,
      endTime: event.endTime,
      date: event.date,
      status: event.status,
    };
  }

  private computeMeetingEndDate(
    eventDate?: Date,
    endTimeStr?: string,
  ): Date {
    if (eventDate) {
      const end = new Date(eventDate);
      if (endTimeStr) {
        const parsed = this.parseTime(endTimeStr);
        if (parsed) {
          end.setHours(parsed.hours, parsed.minutes, 0, 0);
          return end;
        }
      }
      // Event date known but no end time → end of that day
      end.setHours(23, 59, 0, 0);
      return end;
    }
    // No date at all → allow a 4-hour window from now
    return new Date(Date.now() + 4 * 60 * 60 * 1000);
  }

  private isEventOpen(
    eventDate: Date,
    startTimeStr?: string,
    endTimeStr?: string,
  ): { allowed: boolean; message?: string } {
    if (!eventDate) return { allowed: true };
    const now = new Date();

    const start = new Date(eventDate);
    if (startTimeStr) {
      const parsed = this.parseTime(startTimeStr);
      if (parsed) {
        start.setHours(parsed.hours, parsed.minutes, 0, 0);
      }
    }

    // 15-minute buffer before scheduled start
    const openTime = new Date(start.getTime() - 15 * 60 * 1000);

    if (now < openTime) {
      const formattedDate = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return {
        allowed: false,
        message: `This conference room will open 15 minutes before the start time (${startTimeStr || 'scheduled start'} on ${formattedDate}). Please check back then.`,
      };
    }

    if (endTimeStr) {
      const end = new Date(eventDate);
      const parsedEnd = this.parseTime(endTimeStr);
      if (parsedEnd) {
        end.setHours(parsedEnd.hours, parsedEnd.minutes, 0, 0);
        // Allow up to 2 hours buffer after scheduled end
        const closeTime = new Date(end.getTime() + 120 * 60 * 1000);
        if (now > closeTime) {
          return {
            allowed: false,
            message: 'This conference session has concluded.',
          };
        }
      }
    }

    return { allowed: true };
  }

  private parseTime(timeStr: string): { hours: number; minutes: number } | null {
    try {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return null;
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const modifier = match[3]?.toUpperCase();
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return { hours, minutes };
    } catch {
      return null;
    }
  }
}

