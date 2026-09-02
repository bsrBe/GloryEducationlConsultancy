import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { UniversitiesModule } from './universities/universities.module';
import { MessagesModule } from './messages/messages.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './email/email.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/glory-admissions',
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    StudentsModule,
    UniversitiesModule,
    MessagesModule,
    CloudinaryModule,
    AuditModule,
    EmailModule,
    EventsModule,
  ],
})
export class AppModule {}
