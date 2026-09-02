import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { AuditService } from '../src/audit/audit.service';
import { AuditInterceptor } from '../src/common/interceptors/audit.interceptor';
import { RateLimiterGuard } from '../src/common/guards/rate-limiter.guard';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, test: string, details?: any) {
  if (condition) {
    results.push({ suite, test, passed: true, details });
    console.log(`  ✅ [${suite}] ${test}`);
  } else {
    results.push({ suite, test, passed: false, error: 'Assertion failed', details });
    console.error(`  ❌ [${suite}] ${test} - Details:`, JSON.stringify(details, null, 2));
  }
}

async function fetchJSON(url: string, options: any = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });
  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function runE2ETests() {
  console.log('🚀 Starting NestJS Application for End-to-End Integration Testing...');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

  const auditService = app.get(AuditService);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new AuditInterceptor(auditService));
  app.useGlobalGuards(new RateLimiterGuard());

  const testPort = 5055;
  await app.listen(testPort);
  const baseURL = `http://127.0.0.1:${testPort}/api`;
  console.log(`📡 Test server running on ${baseURL}\n`);

  try {
    // ----------------------------------------------------
    // SUITE 1: AUTHENTICATION & IDENTITY
    // ----------------------------------------------------
    console.log('📦 SUITE 1: Authentication & Identity');

    // 1.1 Login Admin
    const adminLogin = await fetchJSON(`${baseURL}/auth/login`, {
      method: 'POST',
      body: { email: 'admin@gloryedu.com', password: 'admin123456' },
    });
    assert(adminLogin.status === 201 || adminLogin.status === 200, 'Auth', 'Admin Login', adminLogin.data);
    const adminToken = adminLogin.data?.access_token;
    assert(!!adminToken, 'Auth', 'Admin Token Received');

    // 1.2 Login Staff
    const staffLogin = await fetchJSON(`${baseURL}/auth/login`, {
      method: 'POST',
      body: { email: 'staff@gloryedu.com', password: 'staff123456' },
    });
    assert(staffLogin.ok, 'Auth', 'Staff Login');
    const staffToken = staffLogin.data?.access_token;

    // 1.3 Login Representative
    const repLogin = await fetchJSON(`${baseURL}/auth/login`, {
      method: 'POST',
      body: { email: 'rep@mit.edu', password: 'rep123456' },
    });
    assert(repLogin.ok, 'Auth', 'Rep Login');
    const repToken = repLogin.data?.access_token;

    // 1.4 Register New Student
    const testEmail = `e2e_student_${Date.now()}@test.com`;
    const regRes = await fetchJSON(`${baseURL}/auth/register`, {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'Password123!',
        firstName: 'E2E_Test',
        lastName: 'Applicant',
        phone: '+251911002233',
      },
    });
    assert(regRes.ok, 'Auth', 'Register Student HTTP 201', regRes.data);
    assert(!!regRes.data?.access_token, 'Auth', 'Registration returns access_token');
    assert(!!(regRes.data?.student?.id || regRes.data?.student?._id || regRes.data?.user?._id), 'Auth', 'Registration returns student ID field');
    const studentToken = regRes.data?.access_token;
    const studentId = regRes.data?.student?.id || regRes.data?.student?._id || regRes.data?.user?._id;
    const studentCode = regRes.data?.student?.studentId;

    // 1.5 Get Profile
    const profileRes = await fetchJSON(`${baseURL}/auth/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(profileRes.ok, 'Auth', 'Get Profile Authenticated', profileRes.data);

    // ----------------------------------------------------
    // SUITE 2: STUDENT PROFILE & 12-FIELD COMPLETION
    // ----------------------------------------------------
    console.log('\n📦 SUITE 2: Student Profile & Completion Calculation');

    const updateProfileRes = await fetchJSON(`${baseURL}/students/${studentId}/profile`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        dateOfBirth: '2004-05-15',
        gender: 'female',
        city: 'Addis Ababa',
        educationLevel: 'high_school',
        school: 'Bole Secondary School',
        gpa: 3.85,
        graduationYear: 2025,
        intendedProgram: 'Computer Science',
        preferredCountry: 'USA',
        englishTest: 'IELTS',
        englishScore: 7.5,
        budget: '20k_50k',
      },
    });
    assert(updateProfileRes.ok, 'Profile', 'Update 12-Field Profile', updateProfileRes.data);
    assert(updateProfileRes.data?.profileComplete === 100, 'Profile', 'Profile Completeness reaches 100%', updateProfileRes.data?.profileComplete);

    // ----------------------------------------------------
    // SUITE 3: PAYMENTS WORKFLOW
    // ----------------------------------------------------
    console.log('\n📦 SUITE 3: Payment Submission & Staff Verification');

    const addPaymentRes = await fetchJSON(`${baseURL}/students/${studentId}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        method: 'telebirr',
        amount: 500,
        transactionRef: 'TELE-E2E-998877',
      },
    });
    assert(addPaymentRes.ok, 'Payments', 'Student Submit 500 ETB Payment');

    // Verify Payment by Staff
    const verifyPaymentRes = await fetchJSON(`${baseURL}/students/${studentId}/payments/0/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: 'Verified' },
    });
    assert(verifyPaymentRes.ok, 'Payments', 'Staff Verifies Payment Status to Verified');

    // ----------------------------------------------------
    // SUITE 4: 100-POINT ASSESSMENT SCORING ENGINE
    // ----------------------------------------------------
    console.log('\n📦 SUITE 4: 100-Point Rubric Scoring Engine');

    const assessRes = await fetchJSON(`${baseURL}/students/${studentId}/assess`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        categoryScores: {
          academic: 28,     // max 30
          english: 18,      // max 20
          programFit: 14,   // max 15
          requirements: 14, // max 15
          graduation: 9,    // max 10
          documents: 9,     // max 10
        },
      },
    });
    assert(assessRes.ok, 'Assessment', 'Staff Submits 100-Point Rubric Score', assessRes.data);
    assert(assessRes.data?.assessment?.totalScore === 92, 'Assessment', 'Computed Total Score Equals 92/100', assessRes.data?.assessment?.totalScore);

    // Override Assessment by Admin
    const overrideRes = await fetchJSON(`${baseURL}/students/${studentId}/assess/override`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        score: 95,
        reason: 'Exceptional olympiad coding portfolio verified by Director',
      },
    });
    assert(overrideRes.ok, 'Assessment', 'Admin Overrides Score with Audit Justification');

    // ----------------------------------------------------
    // SUITE 5: UNIVERSITY MATCHING ENGINE
    // ----------------------------------------------------
    console.log('\n📦 SUITE 5: University Matching Engine');

    const matchRes = await fetchJSON(`${baseURL}/students/${studentId}/match`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(matchRes.ok, 'Matching', 'Run Heuristic University Matcher', matchRes.data);

    // Approve Match
    const approveMatchRes = await fetchJSON(`${baseURL}/students/${studentId}/match/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        status: 'approved',
        primaryProgram: 'Computer Science & AI',
        secondaryProgram: 'Software Engineering',
      },
    });
    assert(approveMatchRes.ok, 'Matching', 'Staff Approves Primary & Secondary Matches', approveMatchRes.data);

    // ----------------------------------------------------
    // SUITE 6: REPRESENTATIVE REVIEW & DECISION CONSOLE
    // ----------------------------------------------------
    console.log('\n📦 SUITE 6: Representative Review & Decision Locking');

    const repReviewRes = await fetchJSON(`${baseURL}/students/${studentId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {
        decision: 'Green',
        comments: 'Outstanding academic credentials. Direct admission track recommended.',
      },
    });
    assert(repReviewRes.ok, 'RepReview', 'Rep Submits Official Green Decision', repReviewRes.data);
    assert(repReviewRes.data?.review?.isLocked === true, 'RepReview', 'Representative Review Is Locked Upon Submission');

    // ----------------------------------------------------
    // SUITE 7: RESULT PUBLICATION & STUDENT VIEW
    // ----------------------------------------------------
    console.log('\n📦 SUITE 7: Result Publication & Official Certificate');

    const publishRes = await fetchJSON(`${baseURL}/students/${studentId}/result/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        status: 'Green',
        nextStep: 'Submit official transcripts and passport copy for I-20 issuance.',
        disclaimer: 'Official preliminary decision from Glory Edu Admissions Fair 2026.',
      },
    });
    assert(publishRes.ok, 'Result', 'Staff Publishes Final Admissions Decision');

    const studentResultRes = await fetchJSON(`${baseURL}/students/${studentId}/result`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentResultRes.ok, 'Result', 'Student Retrieves Published Result Card');
    assert(studentResultRes.data?.result?.isPublished === true, 'Result', 'Result isPublished flag is TRUE');

    // ----------------------------------------------------
    // SUITE 8: EVENTS & BREAKOUT SESSIONS
    // ----------------------------------------------------
    console.log('\n📦 SUITE 8: Fair Events & Student Breakout Sessions');

    const eventsList = await fetchJSON(`${baseURL}/events`);
    assert(eventsList.ok && Array.isArray(eventsList.data), 'Events', 'List Public Fair Events');
    const firstEventId = eventsList.data?.[0]?._id;

    if (firstEventId) {
      // Check my-sessions
      const mySessionsRes = await fetchJSON(`${baseURL}/events/${firstEventId}/my-sessions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert(mySessionsRes.ok, 'Events', 'Student Retrieves Assigned Sessions & Schedule');

      // Check-in
      const checkInRes = await fetchJSON(`${baseURL}/events/${firstEventId}/check-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: { attended: true },
      });
      assert(checkInRes.ok, 'Events', 'Student Completes Event Check-In');
    }

    // ----------------------------------------------------
    // SUITE 9: DIRECT MESSAGING
    // ----------------------------------------------------
    console.log('\n📦 SUITE 9: Direct Messaging System');

    const sendMsgRes = await fetchJSON(`${baseURL}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        recipientId: studentId,
        recipientModel: 'Student',
        subject: 'Welcome to Glory International Fair 2026',
        body: 'Congratulations on completing your profile assessment! Your MIT interview is scheduled.',
      },
    });
    assert(sendMsgRes.ok, 'Messages', 'Staff Sends Direct Message to Student');

    const inboxRes = await fetchJSON(`${baseURL}/messages/inbox`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(inboxRes.ok && Array.isArray(inboxRes.data) && inboxRes.data.length > 0, 'Messages', 'Student Inbox Receives Populated Message');
    assert(!!inboxRes.data[0]?.senderName, 'Messages', 'Message Includes Formatted Sender Name');

    const unreadRes = await fetchJSON(`${baseURL}/messages/unread`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(unreadRes.ok && (unreadRes.data?.unreadCount > 0 || unreadRes.data?.count > 0), 'Messages', 'Unread Message Count Reflects New Message');

    // ----------------------------------------------------
    // SUITE 10: ANALYTICS & CSV DATASET EXPORT
    // ----------------------------------------------------
    console.log('\n📦 SUITE 10: CRM Analytics & CSV Stream');

    const analyticsRes = await fetchJSON(`${baseURL}/students/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(analyticsRes.ok && analyticsRes.data?.totalStudents > 0, 'Analytics', 'Admissions CRM KPI Aggregation');

    const csvRes = await fetchJSON(`${baseURL}/students/export/csv`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(csvRes.ok, 'CSV', 'Export Students CSV Stream');
    assert(typeof csvRes.data === 'string' && csvRes.data.includes('Student ID,First Name,Last Name'), 'CSV', 'CSV Contains RFC 4180 Headers');

    // ----------------------------------------------------
    // SUITE 11: SYSTEM AUDIT TRAIL
    // ----------------------------------------------------
    console.log('\n📦 SUITE 11: System Audit Trail & Security Logs');

    const auditRes = await fetchJSON(`${baseURL}/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditRes.ok && auditRes.data?.logs?.length > 0, 'Audit', 'Admin Retrieves System Audit Logs');

    // ----------------------------------------------------
    // SUITE 12: USER MANAGEMENT (ADMIN)
    // ----------------------------------------------------
    console.log('\n📦 SUITE 12: User Management CRUD');

    const newUserEmail = `e2e_staff_${Date.now()}@gloryedu.com`;
    const createUserRes = await fetchJSON(`${baseURL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        email: newUserEmail,
        password: 'Password123!',
        firstName: 'NewStaff',
        lastName: 'Member',
        role: 'glory_staff',
        phone: '+251922334455',
        isActive: true,
      },
    });
    assert(createUserRes.ok, 'Users', 'Admin Creates New Staff Account with isActive & phone', createUserRes.data);
    const newUserId = createUserRes.data?._id;

    if (newUserId) {
      // Update user
      const updateUserRes = await fetchJSON(`${baseURL}/users/${newUserId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          firstName: 'UpdatedStaff',
          phone: '+251933445566',
          isActive: true,
        },
      });
      assert(updateUserRes.ok, 'Users', 'Admin Updates User Details with isActive & phone', updateUserRes.data);

      const deleteUserRes = await fetchJSON(`${baseURL}/users/${newUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(deleteUserRes.ok, 'Users', 'Admin Soft-Deletes User Account');
    }

    // ----------------------------------------------------
    // SUITE 13: UNIVERSITY DIRECTORY MANAGEMENT
    // ----------------------------------------------------
    console.log('\n📦 SUITE 13: University Directory CRUD & Validation');

    const testUniName = `E2E University of Science ${Date.now()}`;
    const createUniRes = await fetchJSON(`${baseURL}/universities`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: testUniName,
        destination: 'USA',
        reviewCapacity: 60,
        programs: [
          {
            name: 'Artificial Intelligence & Robotics',
            degreeLevel: 'Bachelor',
            gpaRequirement: 3.5,
            englishRequirement: 'IELTS 7.0',
            tuitionInfo: '$25,000 / year',
          },
        ],
        isActive: true,
      },
    });
    assert(createUniRes.ok, 'Universities', 'Admin Creates University with isActive & nested programs', createUniRes.data);
    const newUniId = createUniRes.data?._id;

    if (newUniId) {
      const updateUniRes = await fetchJSON(`${baseURL}/universities/${newUniId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          reviewCapacity: 75,
          isActive: true,
          liveSessionAvailable: true,
        },
      });
      assert(updateUniRes.ok, 'Universities', 'Admin Updates University with isActive & reviewCapacity', updateUniRes.data);

      const toggleUniRes = await fetchJSON(`${baseURL}/universities/${newUniId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(toggleUniRes.ok, 'Universities', 'Admin Toggles University Active Status');
    }

  } catch (err: any) {
    console.error('💥 Fatal error during integration tests:', err);
  } finally {
    await app.close();
    console.log('\n🛑 Test server stopped.');

    // Print summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    console.log('\n======================================================');
    console.log(`📊 INTEGRATION TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${results.length}`);
    console.log('======================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runE2ETests();
