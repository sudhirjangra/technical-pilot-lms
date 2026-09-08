import { APP_NAME, APP_URL } from '@repo/constants/app';

export const CourseArchivedMail = ({
  name,
  courseTitle,
}: {
  name: string;
  courseTitle: string;
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Course Archived Notice - ${APP_NAME}</title>
</head>
<body style="background-color:#efeff1;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:30px auto;background:#ffffff;padding:32px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${APP_URL}/assets/logo/icon.svg" alt="${APP_NAME}" width="48" height="48" style="display:block;margin:0 auto;" />
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <h2 style="margin:0 0 16px;color:#dc2626;font-size:20px;font-weight:700;">Course Archived Notification</h2>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px;">
      Please be advised that the course <strong>${courseTitle}</strong> has been archived by the platform administrator (${APP_NAME}).
    </p>

    <div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:14px;line-height:1.5;color:#991b1b;">
        <strong>Important notice regarding your access:</strong><br />
        Active access to video lectures, PDF notes, and new assessment attempts for this course has been closed. Your historical progress and previous attempt records remain securely preserved in your student account.
      </p>
    </div>

    <div style="text-align:center;margin:28px 0 20px;">
      <a href="${APP_URL}/dashboard/courses" style="display:inline-block;background-color:#4b5563;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;">
        View My Courses
      </a>
    </div>

    <p style="font-size:13px;line-height:1.5;color:#6b7280;margin:24px 0 0;">
      If you have questions regarding this archive notice, please reach out via our <a href="${APP_URL}/contact" style="color:#2563eb;text-decoration:underline;">Contact Support</a> page.
    </p>

    <p style="font-size:14px;line-height:1.5;color:#374151;margin:20px 0 0;">
      Regards,<br />
      <strong>${APP_NAME} Team</strong>
    </p>
  </div>

  <footer style="text-align:center;font-size:12px;color:#9ca3af;margin:24px auto;">
    © ${new Date().getFullYear()} ${APP_NAME}. All Rights Reserved.
  </footer>
</body>
</html>
`;
};

export default CourseArchivedMail;
