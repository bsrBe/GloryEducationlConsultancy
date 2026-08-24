export interface EmailTemplate {
  subject: string;
  html: (data: Record<string, string>) => string;
}

export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  registration_confirmation: {
    subject: 'Welcome to Glory International Admissions Fair',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Welcome to Glory International Admissions Fair!</h2>
        <p>Dear ${data.firstName},</p>
        <p>Thank you for registering for the Glory International Admissions Fair. Your registration has been successfully received.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Your Student ID:</strong> ${data.studentId}</p>
          <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
        </div>
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Complete your payment of 500 ETB via Telebirr, bank transfer, or cash</li>
          <li>Once payment is verified, complete your detailed Admissions Profile</li>
          <li>Upload your academic documents (combined PDF)</li>
        </ol>
        <p>Your Student ID is your permanent reference number. Please keep it safe.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },

  payment_received: {
    subject: 'Payment Received - Glory Admissions Fair',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Payment Received</h2>
        <p>Dear ${data.firstName},</p>
        <p>We have received your payment. Here are the details:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Student ID:</strong> ${data.studentId}</p>
          <p><strong>Amount:</strong> ${data.amount} ETB</p>
          <p><strong>Method:</strong> ${data.method}</p>
          <p><strong>Reference:</strong> ${data.transactionRef}</p>
          <p><strong>Status:</strong> Pending Verification</p>
        </div>
        <p>Your payment will be verified by our team shortly. Once verified, you'll receive a confirmation and can proceed to complete your Admissions Profile.</p>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },

  payment_verified: {
    subject: 'Payment Verified - Complete Your Profile',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Payment Verified!</h2>
        <p>Dear ${data.firstName},</p>
        <p>Great news! Your payment has been verified successfully.</p>
        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Student ID:</strong> ${data.studentId}</p>
          <p><strong>Status:</strong> ✅ Verified</p>
        </div>
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Complete your detailed Admissions Profile</li>
          <li>Upload your academic documents (combined PDF)</li>
          <li>Wait for your assessment and university matching</li>
        </ol>
        <p>Your Admissions Profile is now unlocked. Please complete it as soon as possible to ensure timely assessment.</p>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },

  profile_reminder: {
    subject: 'Complete Your Profile - Glory Admissions Fair',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Complete Your Admissions Profile</h2>
        <p>Dear ${data.firstName},</p>
        <p>We noticed your Admissions Profile is only ${data.profileComplete}% complete.</p>
        <p>To ensure you receive the best possible university matching, please complete your profile including:</p>
        <ul>
          <li>Educational background</li>
          <li>GPA/Grades</li>
          <li>English test scores</li>
          <li>Preferred destination and program</li>
        </ul>
        <p>Students with complete profiles receive more accurate matching results.</p>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },

  document_reminder: {
    subject: 'Upload Your Documents - Glory Admissions Fair',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Upload Your Academic Documents</h2>
        <p>Dear ${data.firstName},</p>
        <p>Please upload your academic documents as a single combined PDF.</p>
        <p><strong>Suggested order:</strong></p>
        <ol>
          <li>Passport/ID</li>
          <li>High school transcript</li>
          <li>Diploma/Certificate</li>
          <li>University transcript (if applicable)</li>
          <li>Degree certificate (if applicable)</li>
          <li>English test results</li>
          <li>CV</li>
        </ol>
        <p>Use filename format: ${data.studentId}_AcademicProfile.pdf</p>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },

  assessment_ready: {
    subject: 'Your Assessment Results Are Ready',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Assessment Complete</h2>
        <p>Dear ${data.firstName},</p>
        <p>Your admissions assessment has been completed. Please log in to your dashboard to view your results and university matches.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Student ID:</strong> ${data.studentId}</p>
          <p><strong>Status:</strong> Assessment Complete</p>
        </div>
        <p>Your results include your primary and secondary university matches, along with the next steps for your application.</p>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },

  result_green: {
    subject: '🟢 Eligible to Apply - Your Results',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">🟢 You're Eligible to Apply!</h2>
        <p>Dear ${data.firstName},</p>
        <p>Great news! Based on your assessment, you are eligible to apply to your matched institution.</p>
        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Student ID:</strong> ${data.studentId}</p>
          <p><strong>Assessment Result:</strong> 🟢 Green - Eligible to Apply</p>
          <p><strong>Primary Match:</strong> ${data.primaryMatch}</p>
          <p><strong>Next Step:</strong> ${data.nextStep}</p>
        </div>
        <p>We recommend starting your application process as soon as possible. You will be invited to our Application Clinic for personalized guidance.</p>
        <p><strong>Disclaimer:</strong> This is a preliminary eligibility assessment. Final admission depends on the institution's official application and verification process.</p>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },

  result_yellow: {
    subject: '🟡 Further Review Recommended - Your Results',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffc107;">🟡 Further Review Recommended</h2>
        <p>Dear ${data.firstName},</p>
        <p>Based on your assessment, we recommend further review of your profile.</p>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Student ID:</strong> ${data.studentId}</p>
          <p><strong>Assessment Result:</strong> 🟡 Yellow - Further Review Required</p>
          <p><strong>Primary Match:</strong> ${data.primaryMatch}</p>
          <p><strong>Next Step:</strong> ${data.nextStep}</p>
        </div>
        <p>This may mean additional documents are needed or clarification on certain requirements. Please check your dashboard for specific details.</p>
        <p><strong>Disclaimer:</strong> This is a preliminary eligibility assessment. Final admission depends on the institution's official application and verification process.</p>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },

  result_red: {
    subject: '🔴 Not Currently Matched - Your Results & Alternatives',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">🔴 Not Currently Matched</h2>
        <p>Dear ${data.firstName},</p>
        <p>Based on your current profile, we were unable to find a strong match with our participating institutions.</p>
        <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Student ID:</strong> ${data.studentId}</p>
          <p><strong>Assessment Result:</strong> 🔴 Red - Not Currently Matched</p>
          <p><strong>Next Step:</strong> ${data.nextStep}</p>
        </div>
        <p><strong>This does not mean you cannot study abroad.</strong> It means your current profile doesn't strongly match our current partner institutions. Here are some alternatives:</p>
        <ul>
          <li>Consider improving your English test scores</li>
          <li>Explore different program options</li>
          <li>Consider alternative destinations</li>
          <li>Complete your Application Clinic consultation for personalized guidance</li>
        </ul>
        <p><strong>Disclaimer:</strong> This is a preliminary eligibility assessment. Final admission depends on the institution's official application and verification process.</p>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },

  application_invitation: {
    subject: 'Start Your Application - Glory Admissions Fair',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">You're Invited to Start Your Application!</h2>
        <p>Dear ${data.firstName},</p>
        <p>Congratulations on receiving a positive assessment result! We'd like to invite you to start your application process.</p>
        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Student ID:</strong> ${data.studentId}</p>
          <p><strong>Matched Institution:</strong> ${data.primaryMatch}</p>
          <p><strong>Result:</strong> ${data.resultStatus}</p>
        </div>
        <p>Our Application Clinic will provide personalized guidance through the application process. Please log in to your dashboard to get started.</p>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },

  event_reminder: {
    subject: 'Glory Admissions Fair - Event Reminder',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Glory International Admissions Fair</h2>
        <p>Dear ${data.firstName},</p>
        <p>This is a reminder that the Glory International Admissions Fair is coming up soon!</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Student ID:</strong> ${data.studentId}</p>
          <p><strong>Event Date:</strong> ${data.eventDate || 'TBA'}</p>
          <p><strong>Your Sessions:</strong> ${data.sessions || 'TBA'}</p>
        </div>
        <p>Please make sure to:</p>
        <ul>
          <li>Join on time</li>
          <li>Have a stable internet connection</li>
          <li>Prepare any questions for the Q&A session</li>
        </ul>
        <p>Best regards,<br>Glory Educational Consultancy</p>
      </div>
    `,
  },
};
