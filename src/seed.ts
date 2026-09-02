import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { User, UserRole } from './users/schemas/user.schema';
import { Student, StudentDoc } from './students/schemas/student.schema';
import { University } from './universities/schemas/university.schema';
import { Event, EventDocument } from './events/schemas/event.schema';
import { Counter, CounterDocument } from './counters/schemas/counter.schema';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const studentModel = app.get<Model<StudentDoc>>(getModelToken(Student.name));
  const universityModel = app.get<Model<University>>(
    getModelToken(University.name),
  );
  const eventModel = app.get<Model<EventDocument>>(getModelToken(Event.name));
  const counterModel = app.get<Model<CounterDocument>>(
    getModelToken(Counter.name),
  );

  console.log('🌱 Starting seed...\n');

  // --- 1. Admin User ---
  const adminExists = await userModel.findOne({ role: UserRole.ADMIN });
  let admin: any;
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123456', 12);
    admin = await userModel.create({
      email: 'admin@gloryedu.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.ADMIN,
      isActive: true,
    });
    console.log('✅ Admin created: admin@gloryedu.com / admin123456');
  } else {
    admin = adminExists;
    const hashedPassword = await bcrypt.hash('admin123456', 12);
    await userModel.updateOne(
      { _id: admin._id },
      { isActive: true, password: hashedPassword },
    );
    console.log('ℹ️  Admin already exists (updated to active):', admin.email);
  }

  // --- 2. Glory Staff ---
  const staffExists = await userModel.findOne({ email: 'staff@gloryedu.com' });
  let staff: any;
  if (!staffExists) {
    const hashedPassword = await bcrypt.hash('staff123456', 12);
    staff = await userModel.create({
      email: 'staff@gloryedu.com',
      password: hashedPassword,
      firstName: 'Abebe',
      lastName: 'Kebede',
      role: UserRole.GLORY_STAFF,
      isActive: true,
    });
    console.log('✅ Staff created: staff@gloryedu.com / staff123456');
  } else {
    staff = staffExists;
    console.log('ℹ️  Staff already exists:', staff.email);
  }

  // --- 3. Universities ---
  const uniCount = await universityModel.countDocuments();
  let universities: any[] = [];
  if (uniCount === 0) {
    universities = await universityModel.insertMany([
      {
        name: 'Massachusetts Institute of Technology',
        destination: 'USA',
        programs: [
          {
            name: 'Computer Science',
            degreeLevel: 'Bachelor',
            gpaRequirement: 3.5,
            englishRequirement: 'IELTS 7.0',
            tuitionInfo: '$55,000/year',
          },
          {
            name: 'Business',
            degreeLevel: 'Master',
            gpaRequirement: 3.2,
            englishRequirement: 'IELTS 6.5',
            tuitionInfo: '$75,000/year',
          },
          {
            name: 'Engineering',
            degreeLevel: 'Bachelor',
            gpaRequirement: 3.4,
            englishRequirement: 'IELTS 7.0',
            tuitionInfo: '$52,000/year',
          },
        ],
        reviewCapacity: 100,
        liveSessionAvailable: true,
        isActive: true,
      },
      {
        name: 'University of Toronto',
        destination: 'Canada',
        programs: [
          {
            name: 'Computer Science',
            degreeLevel: 'Bachelor',
            gpaRequirement: 3.0,
            englishRequirement: 'IELTS 6.5',
            tuitionInfo: 'CAD 55,000/year',
          },
          {
            name: 'Business',
            degreeLevel: 'Bachelor',
            gpaRequirement: 2.8,
            englishRequirement: 'IELTS 6.0',
            tuitionInfo: 'CAD 48,000/year',
          },
          {
            name: 'Engineering',
            degreeLevel: 'Bachelor',
            gpaRequirement: 3.2,
            englishRequirement: 'IELTS 6.5',
            tuitionInfo: 'CAD 52,000/year',
          },
        ],
        reviewCapacity: 80,
        liveSessionAvailable: true,
        isActive: true,
      },
      {
        name: 'University of Oxford',
        destination: 'UK',
        programs: [
          {
            name: 'Computer Science',
            degreeLevel: 'Bachelor',
            gpaRequirement: 3.7,
            englishRequirement: 'IELTS 7.5',
            tuitionInfo: '£35,000/year',
          },
          {
            name: 'Business',
            degreeLevel: 'Master',
            gpaRequirement: 3.5,
            englishRequirement: 'IELTS 7.0',
            tuitionInfo: '£45,000/year',
          },
          {
            name: 'Medicine',
            degreeLevel: 'Bachelor',
            gpaRequirement: 3.8,
            englishRequirement: 'IELTS 7.5',
            tuitionInfo: '£38,000/year',
          },
        ],
        reviewCapacity: 50,
        liveSessionAvailable: true,
        isActive: true,
      },
      {
        name: 'Technical University of Munich',
        destination: 'Germany',
        programs: [
          {
            name: 'Engineering',
            degreeLevel: 'Bachelor',
            gpaRequirement: 3.0,
            englishRequirement: 'IELTS 6.0',
            tuitionInfo: '€500/semester',
          },
          {
            name: 'Computer Science',
            degreeLevel: 'Master',
            gpaRequirement: 3.2,
            englishRequirement: 'IELTS 6.5',
            tuitionInfo: '€500/semester',
          },
        ],
        reviewCapacity: 60,
        liveSessionAvailable: true,
        isActive: true,
      },
      {
        name: 'University of Melbourne',
        destination: 'Australia',
        programs: [
          {
            name: 'Business',
            degreeLevel: 'Bachelor',
            gpaRequirement: 3.0,
            englishRequirement: 'IELTS 6.5',
            tuitionInfo: 'AUD 45,000/year',
          },
          {
            name: 'Computer Science',
            degreeLevel: 'Bachelor',
            gpaRequirement: 3.2,
            englishRequirement: 'IELTS 6.5',
            tuitionInfo: 'AUD 48,000/year',
          },
        ],
        reviewCapacity: 40,
        liveSessionAvailable: true,
        isActive: true,
      },
    ]);
    console.log('✅ 5 universities created');
  } else {
    universities = await universityModel.find().lean();
    console.log(`ℹ️  ${uniCount} universities already exist`);
  }

  // --- 4. University Representative ---
  const repExists = await userModel.findOne({ email: 'rep@mit.edu' });
  let rep: any;
  if (!repExists) {
    const hashedPassword = await bcrypt.hash('rep123456', 12);
    rep = await userModel.create({
      email: 'rep@mit.edu',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: UserRole.UNIVERSITY_REP,
      university: universities[0]._id,
      isActive: true,
    });
    console.log('✅ University Rep created: rep@mit.edu / rep123456');
  } else {
    rep = repExists;
    console.log('ℹ️  University Rep already exists:', rep.email);
  }

  // --- 5. Initialize Counter ---
  const counterExists = await counterModel.findOne({ name: 'studentId' });
  if (!counterExists) {
    await counterModel.create({ name: 'studentId', seq: 0 });
    console.log('✅ Student ID counter initialized');
  }

  // --- 6. Test Students at various stages ---
  const studentCount = await studentModel.countDocuments();
  const studentCounter = await counterModel.findOne({ name: 'studentId' });
  const startNum = (studentCounter?.seq || 0) + 1;

  if (studentCount === 0) {
    const testStudents = [
      {
        // Student 1: Complete flow - ready for matching
        firstName: 'Almaz',
        lastName: 'Tadesse',
        email: 'almaz@test.com',
        phone: '+251911111111',
        age: 22,
        educationLevel: 'Bachelor',
        school: 'Addis Ababa University',
        gpa: 3.5,
        graduationYear: 2025,
        intendedProgram: 'Computer Science',
        preferredCountry: 'USA',
        englishTest: 'IELTS',
        englishScore: 7.0,
        profileComplete: 100,
        payments: [
          {
            method: 'telebirr',
            transactionRef: 'TXN001',
            amount: 500,
            status: 'Verified',
            date: new Date(),
          },
        ],
        documents: [
          {
            fileName: 'GH26-000001_AcademicProfile.pdf',
            cloudinaryUrl: 'https://example.com/doc1.pdf',
            fileSize: 1024000,
            reviewStatus: 'Uploaded',
            version: 1,
          },
        ],
      },
      {
        // Student 2: Payment pending
        firstName: 'Dawit',
        lastName: 'Haile',
        email: 'dawit@test.com',
        phone: '+251922222222',
        age: 20,
        educationLevel: 'Grade 12',
        school: 'St. Joseph School',
        gpa: 3.2,
        graduationYear: 2026,
        intendedProgram: 'Business',
        preferredCountry: 'Canada',
        englishTest: 'IELTS',
        englishScore: 6.5,
        profileComplete: 100,
        payments: [
          {
            method: 'bank_transfer',
            transactionRef: 'TXN002',
            amount: 500,
            status: 'Pending',
            date: new Date(),
          },
        ],
      },
      {
        // Student 3: Assessed + Matched + Reviewed (Green)
        firstName: 'Hana',
        lastName: 'Getachew',
        email: 'hana@test.com',
        phone: '+251933333333',
        age: 21,
        educationLevel: 'Bachelor',
        school: 'Bahir Dar University',
        gpa: 3.8,
        graduationYear: 2025,
        intendedProgram: 'Engineering',
        preferredCountry: 'UK',
        englishTest: 'TOEFL',
        englishScore: 95,
        profileComplete: 100,
        payments: [
          {
            method: 'cash',
            transactionRef: 'TXN003',
            amount: 500,
            status: 'Verified',
            date: new Date(),
          },
        ],
        documents: [
          {
            fileName: 'GH26-000003_AcademicProfile.pdf',
            cloudinaryUrl: 'https://example.com/doc3.pdf',
            fileSize: 2048000,
            reviewStatus: 'Reviewed',
            version: 1,
          },
        ],
        assessment: {
          categoryScores: {
            academic: 30,
            english: 18,
            programFit: 14,
            academicStatus: 9,
            documentation: 9,
            institutionRequirements: 14,
          },
          totalScore: 94,
          assessedBy: staff._id,
          assessedAt: new Date(),
        },
        matches: {
          primary: {
            university: universities[2]._id,
            program: 'Engineering',
            reason: 'UK preference + Engineering + GPA 3.8 + TOEFL 95',
          },
          secondary: {
            university: universities[0]._id,
            program: 'Engineering',
            reason: 'Strong academic profile',
          },
          matchedBy: staff._id,
          matchedAt: new Date(),
          status: 'approved',
        },
        representativeReview: {
          universityRep: rep._id,
          decision: 'Green',
          comments: 'Strong academic profile, excellent match',
          reviewedAt: new Date(),
          isLocked: true,
        },
      },
      {
        // Student 4: Assessed + Matched + Reviewed (Yellow)
        firstName: 'Samuel',
        lastName: 'Bekele',
        email: 'samuel@test.com',
        phone: '+251944444444',
        age: 23,
        educationLevel: 'Bachelor',
        school: 'Jimma University',
        gpa: 3.0,
        graduationYear: 2024,
        intendedProgram: 'Business',
        preferredCountry: 'Canada',
        englishTest: 'IELTS',
        englishScore: 6.0,
        profileComplete: 100,
        payments: [
          {
            method: 'telebirr',
            transactionRef: 'TXN004',
            amount: 500,
            status: 'Verified',
            date: new Date(),
          },
        ],
        assessment: {
          categoryScores: {
            academic: 24,
            english: 14,
            programFit: 12,
            academicStatus: 8,
            documentation: 7,
            institutionRequirements: 11,
          },
          totalScore: 76,
          assessedBy: staff._id,
          assessedAt: new Date(),
        },
        matches: {
          primary: {
            university: universities[1]._id,
            program: 'Business',
            reason: 'Canada preference + Business + GPA 3.0 + IELTS 6.0',
          },
          secondary: {
            university: universities[4]._id,
            program: 'Business',
            reason: 'Alternative destination',
          },
          matchedBy: staff._id,
          matchedAt: new Date(),
          status: 'approved',
        },
        representativeReview: {
          universityRep: rep._id,
          decision: 'Yellow',
          comments: 'Potential match, needs updated transcripts',
          reviewedAt: new Date(),
          isLocked: true,
        },
      },
      {
        // Student 5: Not yet assessed
        firstName: 'Fatima',
        lastName: 'Yusuf',
        email: 'fatima@test.com',
        phone: '+251955555555',
        age: 19,
        educationLevel: 'Grade 12',
        school: 'Harar Science School',
        gpa: 3.6,
        graduationYear: 2026,
        intendedProgram: 'Computer Science',
        preferredCountry: 'Germany',
        englishTest: 'IELTS',
        englishScore: 6.5,
        profileComplete: 100,
        payments: [
          {
            method: 'bank_transfer',
            transactionRef: 'TXN005',
            amount: 500,
            status: 'Verified',
            date: new Date(),
          },
        ],
        documents: [
          {
            fileName: 'GH26-000005_AcademicProfile.pdf',
            cloudinaryUrl: 'https://example.com/doc5.pdf',
            fileSize: 1536000,
            reviewStatus: 'Uploaded',
            version: 1,
          },
        ],
      },
    ];

    const hashedPassword = await bcrypt.hash('student123', 12);
    for (let i = 0; i < testStudents.length; i++) {
      const data = testStudents[i];
      const studentId = `GH26-${(startNum + i).toString().padStart(6, '0')}`;
      await studentModel.create({
        ...data,
        studentId,
        password: hashedPassword,
      });
      console.log(
        `✅ Student created: ${studentId} (${data.firstName} ${data.lastName})`,
      );
    }

    // Update counter
    await counterModel.findOneAndUpdate(
      { name: 'studentId' },
      { $set: { seq: startNum + testStudents.length - 1 } },
    );
  } else {
    console.log(`ℹ️  ${studentCount} students already exist`);
  }

  // --- 7. Event ---
  const eventExists = await eventModel.findOne({ name: 'Glory Fair 2026' });
  if (!eventExists) {
    await eventModel.create({
      name: 'Glory Fair 2026',
      description: 'Glory International Admissions Fair - Main Event',
      date: new Date('2026-09-15'),
      startTime: '14:00',
      endTime: '17:00',
      mainRoomLink: 'https://meet.google.com/abc-defg-hij',
      status: 'draft',
      moderators: [staff._id],
      checkInCode: 'GLORY2026',
      sessions: [
        {
          name: 'USA Session - MIT',
          destination: 'USA',
          university: universities[0]._id,
          representative: rep._id,
          time: '15:00-16:00',
          roomLink: 'https://meet.google.com/usa-mit-session',
          capacity: 50,
          assignedStudents: [],
        },
        {
          name: 'Canada Session - UofT',
          destination: 'Canada',
          university: universities[1]._id,
          representative: rep._id,
          time: '15:00-16:00',
          roomLink: 'https://meet.google.com/can-uoft-session',
          capacity: 40,
          assignedStudents: [],
        },
        {
          name: 'UK Session - Oxford',
          destination: 'UK',
          university: universities[2]._id,
          representative: rep._id,
          time: '16:00-17:00',
          roomLink: 'https://meet.google.com/uk-oxford-session',
          capacity: 30,
          assignedStudents: [],
        },
      ],
    });
    console.log('✅ Event created: Glory Fair 2026');
  } else {
    console.log('ℹ️  Event already exists');
  }

  console.log('\n🎉 Seed completed!');
  console.log('\n📋 Login Credentials:');
  console.log('─'.repeat(40));
  console.log('Admin:    admin@gloryedu.com / admin123456');
  console.log('Staff:    staff@gloryedu.com / staff123456');
  console.log('Rep:      rep@mit.edu / rep123456');
  console.log('Student:  almaz@test.com / student123');
  console.log('Student:  dawit@test.com / student123');
  console.log('Student:  hana@test.com / student123');
  console.log('Student:  samuel@test.com / student123');
  console.log('Student:  fatima@test.com / student123');
  console.log('─'.repeat(40));

  await app.close();
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
