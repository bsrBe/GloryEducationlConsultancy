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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateSelfDto } from './dto/update-user.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from './schemas/user.schema';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // --- Self-service profile update (any authenticated user) ---
  // Handler-level @Roles overrides the class-level ADMIN requirement, letting
  // any logged-in user update their own basic info. Route is declared before
  // @Patch(':id') so 'me' is not captured as an id.
  @Patch('me')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF, UserRole.UNIVERSITY_REP)
  updateSelf(@Request() req: any, @Body() dto: UpdateSelfDto) {
    const userId = req.user?._id ? req.user._id.toString() : req.user?.id?.toString();
    return this.usersService.updateSelf(userId, dto);
  }

  // --- Self-service account deletion (any authenticated user) ---
  @Delete('me')
  @Roles(UserRole.ADMIN, UserRole.GLORY_STAFF, UserRole.UNIVERSITY_REP)
  deleteSelf(@Request() req: any) {
    const userId = req.user?._id ? req.user._id.toString() : req.user?.id?.toString();
    return this.usersService.remove(userId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
