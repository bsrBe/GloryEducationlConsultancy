import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post()
  send(@Request() req: any, @Body() dto: SendMessageDto) {
    const userModel = req.user.type === 'student' ? 'Student' : 'User';
    return this.messagesService.send(req.user._id, userModel, dto);
  }

  @Get('inbox')
  getInbox(@Request() req: any) {
    const userModel = req.user.type === 'student' ? 'Student' : 'User';
    return this.messagesService.getInbox(req.user._id, userModel);
  }

  @Get('unread')
  getUnreadCount(@Request() req: any) {
    const userModel = req.user.type === 'student' ? 'Student' : 'User';
    return this.messagesService.getUnreadCount(req.user._id, userModel);
  }

  @Get(':id')
  getMessage(@Param('id') id: string, @Request() req: any) {
    return this.messagesService.getMessage(id, req.user._id);
  }
}
