import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('messages')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post()
  send(@Request() req: any, @Body() dto: SendMessageDto) {
    return this.messagesService.send(req.user, dto);
  }

  @Get('inbox')
  getInbox(@Request() req: any) {
    const userModel = req.user.type === 'student' ? 'Student' : 'User';
    return this.messagesService.getInbox(req.user._id, userModel);
  }

  @Get('unread')
  getUnreadCount(@Request() req: any) {
    return this.messagesService.getUnreadCount(req.user);
  }

  // --- Student: their conversation with the team ---
  @Get('thread')
  getMyThread(@Request() req: any) {
    if (req.user.type !== 'student') {
      throw new ForbiddenException('Only students have a team conversation');
    }
    return this.messagesService.getThread(req.user._id.toString(), 'student');
  }

  // --- Staff: all student conversations ---
  @Get('conversations')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  listConversations() {
    return this.messagesService.listConversations();
  }

  @Get('conversations/:studentId')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF)
  getConversation(@Param('studentId') studentId: string) {
    return this.messagesService.getConversation(studentId);
  }

  @Get(':id')
  getMessage(@Param('id') id: string, @Request() req: any) {
    return this.messagesService.getMessage(id, req.user._id.toString());
  }
}
