import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EventsService } from './events.service';
import {
  CreateEventDto,
  UpdateEventDto,
  CreateSessionDto,
  AssignStudentsDto,
  CheckInDto,
  JoinEventDto,
} from './dto/event.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  // --- Event CRUD ---

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.eventsService.delete(id);
  }

  // --- Session Management ---

  @Post(':id/sessions')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  addSession(@Param('id') id: string, @Body() dto: CreateSessionDto) {
    return this.eventsService.addSession(id, dto);
  }

  @Patch(':id/sessions/:sessionIndex')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  updateSession(
    @Param('id') id: string,
    @Param('sessionIndex') sessionIndex: string,
    @Body() dto: Partial<CreateSessionDto>,
  ) {
    return this.eventsService.updateSession(id, parseInt(sessionIndex), dto);
  }

  @Delete(':id/sessions/:sessionIndex')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  deleteSession(
    @Param('id') id: string,
    @Param('sessionIndex') sessionIndex: string,
  ) {
    return this.eventsService.deleteSession(id, parseInt(sessionIndex));
  }

  // --- Student Assignment ---

  @Post(':id/sessions/:sessionIndex/assign')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  assignStudents(
    @Param('id') id: string,
    @Param('sessionIndex') sessionIndex: string,
    @Body() dto: AssignStudentsDto,
  ) {
    return this.eventsService.assignStudents(id, parseInt(sessionIndex), dto);
  }

  @Delete(':id/sessions/:sessionIndex/students/:studentId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  removeStudent(
    @Param('id') id: string,
    @Param('sessionIndex') sessionIndex: string,
    @Param('studentId') studentId: string,
  ) {
    return this.eventsService.removeStudent(
      id,
      parseInt(sessionIndex),
      studentId,
    );
  }

  // --- Check-In / Attendance ---

  @Post(':id/check-in')
  @UseGuards(AuthGuard('jwt'))
  checkIn(
    @Param('id') id: string,
    @Body() dto: CheckInDto,
    @Request() req: any,
  ) {
    return this.eventsService.checkIn(id, req.user._id.toString(), dto);
  }

  @Get(':id/my-sessions')
  @UseGuards(AuthGuard('jwt'))
  getMySessions(@Param('id') id: string, @Request() req: any) {
    return this.eventsService.getStudentSessions(id, req.user._id.toString());
  }

  // --- Attendance Reports ---

  @Get(':id/attendance')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  getAttendanceReport(@Param('id') id: string) {
    return this.eventsService.getAttendanceReport(id);
  }

  // --- Video Conference Join (Paywall & Verification Gate) ---

  @Post(':id/join')
  @UseGuards(AuthGuard('jwt'))
  joinRoom(
    @Param('id') id: string,
    @Body() dto: JoinEventDto,
    @Request() req: any,
  ) {
    return this.eventsService.joinRoom(id, req.user, dto);
  }
}

