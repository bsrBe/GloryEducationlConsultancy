import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { Student, StudentSchema } from './schemas/student.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { EmailModule } from '../email/email.module';
import { CountersModule } from '../counters/counters.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Student.name, schema: StudentSchema }]),
    CloudinaryModule,
    EmailModule,
    CountersModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
