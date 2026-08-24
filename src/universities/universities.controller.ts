import {
  Controller, Get, Post, Patch,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UniversitiesService } from './universities.service';
import { CreateUniversityDto } from './dto/create-university.dto';
import { UpdateUniversityDto } from './dto/update-university.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('universities')
export class UniversitiesController {
  constructor(private universitiesService: UniversitiesService) {}

  // Public: list active universities
  @Get()
  findAll(@Query('active') active?: string) {
    return this.universitiesService.findAll(active === 'true');
  }

  // Authenticated: get university detail
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findById(@Param('id') id: string) {
    return this.universitiesService.findById(id);
  }

  // Admin only: create university
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUniversityDto) {
    return this.universitiesService.create(dto);
  }

  // Admin only: update university
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUniversityDto) {
    return this.universitiesService.update(id, dto);
  }

  // Admin only: toggle active status
  @Patch(':id/toggle')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  toggleActive(@Param('id') id: string) {
    return this.universitiesService.toggleActive(id);
  }
}
