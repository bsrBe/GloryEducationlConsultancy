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

  user_account_created: {
    subject: 'Your Glory Staff Account Has Been Created',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Welcome to Glory Educational Consultancy</h2>
        <p>Dear ${data.firstName} ${data.lastName},</p>
        <p>Your staff account has been created successfully. You now have access to the Glory Admissions Management System.</p>
        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <p><strong>Account Details:</strong></p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Role:</strong> ${data.role}</p>
          <p><strong>Status:</strong> Active</p>
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>Security Notice:</strong></p>
          <p>For security reasons, your password was provided separately. If you haven't received it or need to reset it, please use the "Forgot Password" link on the login page.</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.loginUrl || 'https://admin.gloryedu.et/login'}" 
             style="background-color: #2c5f2d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Access Dashboard
          </a>
        </div>
        <p><strong>Getting Started:</strong></p>
        <ul>
          <li>Log in with your email and password</li>
          <li>Complete your profile information</li>
          <li>Familiarize yourself with the system features</li>
          <li>Contact your supervisor if you have any questions</li>
        </ul>
        <p>If you have any questions or need assistance, please contact your system administrator.</p>
        <p>Best regards,<br>Glory Educational Consultancy<br>System Administration</p>
      </div>
    `,
  },

  password_reset_request: {
    subject: 'Password Reset Request - Glory Education',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5f2d;">Password Reset Request</h2>
        <p>Dear ${data.firstName || 'User'},</p>
        <p>We received a request to reset your password for your Glory Education account.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c5f2d;">
          <p><strong>Account:</strong> ${data.email}</p>
          <p><strong>Request Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" 
             style="background-color: #2c5f2d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Reset Your Password
          </a>
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>Security Information:</strong></p>
          <ul style="margin: 5px 0;">
            <li>This link will expire in 1 hour for security</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Your password will remain unchanged until you create a new one</li>
          </ul>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #007bff;">${data.resetUrl}</p>
        <p>If you didn't request a password reset, please ignore this email or contact our support team if you have concerns.</p>
        <p>Best regards,<br>Glory Educational Consultancy<br>System Administration</p>
      </div>
    `,
  },

  password_reset_confirmation: {
    subject: 'Password Successfully Reset - Glory Education',
    html: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">✅ Password Reset Successful</h2>
        <p>Dear ${data.firstName || 'User'},</p>
        <p>Your password has been successfully reset and updated.</p>
        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <p><strong>Account:</strong> ${data.email}</p>
          <p><strong>Reset Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Status:</strong> Password Updated Successfully</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.loginUrl || 'https://admin.gloryedu.et/login'}" 
             style="background-color: #2c5f2d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Sign In Now
          </a>
        </div>
        <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <p><strong>Security Alert:</strong></p>
          <p>If you did not initiate this password reset, please contact our support team immediately. Your account security may be at risk.</p>
        </div>
        <p>For your security:</p>
        <ul>
          <li>Make sure to use a strong, unique password</li>
          <li>Don't share your password with anyone</li>
          <li>Log out from all devices if you suspect unauthorized access</li>
        </ul>
        <p>If you have any concerns about your account security, please contact us immediately.</p>
        <p>Best regards,<br>Glory Educational Consultancy<br>System Administration</p>
      </div>
    `,
  },
};
