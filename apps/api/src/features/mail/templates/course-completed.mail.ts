import { APP_NAME, APP_URL } from '@repo/constants/app';

export const CourseCompletedMail = ({
  name,
  courseTitle,
  courseId,
  completedDate,
}: {
  name: string;
  courseTitle: string;
  courseId: string;
  completedDate?: Date | string;
}) => {
  const formattedDate = completedDate
    ? new Date(completedDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Congratulations on Completing ${courseTitle} - ${APP_NAME}</title>
</head>
<body style="background-color:#efeff1;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:30px auto;background:#ffffff;padding:32px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${APP_URL}/assets/logo/icon.svg" alt="${APP_NAME}" width="48" height="48" style="display:block;margin:0 auto;" />
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <div style="text-align:center;margin-bottom:20px;">
      <span style="display:inline-block;font-size:36px;margin-bottom:8px;">🏆</span>
      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Congratulations, Aviator!</h2>
      <p style="margin:0;color:#059669;font-size:16px;font-weight:600;">You have successfully completed ${courseTitle}</p>
    </div>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
      Dear <strong>${name}</strong>,
    </p>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px;">
      Outstanding work! You have finished all chapters, lessons, and required assessments in <strong>${courseTitle}</strong>. Your dedication to excellence brings you one step closer to achieving your aviation career milestones.
    </p>

    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">Course Details</h3>
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Course:</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;color:#111827;">${courseTitle}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Status:</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;color:#059669;">100% Completed</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Completion Date:</td>
          <td style="padding:6px 0;text-align:right;color:#374151;">${formattedDate}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin:32px 0 24px;">
      <a href="${APP_URL}/dashboard/courses/${courseId}" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        Review Course & Attempts
      </a>
    </div>

    <p style="font-size:14px;line-height:1.5;color:#374151;margin:20px 0 0;">
      Keep pushing forward,<br />
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

export default CourseCompletedMail;
