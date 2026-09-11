import { APP_NAME, APP_URL } from '@repo/constants/app';

export const DoubtBookingSuccessMail = ({
  name,
  topic,
  date,
  startTime,
  endTime,
  meetingLink,
}: {
  name: string;
  topic?: string | null;
  date: string;
  startTime: string;
  endTime?: string | null;
  meetingLink?: string | null;
}) => {
  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
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
  <title>Doubt Session Confirmed - ${APP_NAME}</title>
</head>
<body style="background-color:#efeff1;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:30px auto;background:#ffffff;padding:32px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${APP_URL}/assets/logo/icon.svg" alt="${APP_NAME}" width="48" height="48" style="display:block;margin:0 auto;" />
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;">Doubt Session Confirmed! ✈️</h2>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px;">
      Your doubt clearing session has been successfully booked. Please review the schedule and details below:
    </p>

    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">Session Details</h3>
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Topic / Subject:</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;color:#111827;">${topic || 'General Flight Doubt Session'}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Date:</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;color:#111827;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Time:</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;color:#059669;">
            ${startTime.slice(0, 5)}${endTime ? ` - ${endTime.slice(0, 5)}` : ''}
          </td>
        </tr>
        ${
          meetingLink
            ? `
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Meeting Link:</td>
          <td style="padding:6px 0;text-align:right;">
            <a href="${meetingLink}" style="color:#2563eb;text-decoration:underline;font-weight:500;" target="_blank">Join Meeting</a>
          </td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    ${
      meetingLink
        ? `
    <div style="text-align:center;margin:28px 0 20px;">
      <a href="${meetingLink}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;" target="_blank">
        Open Meeting Room
      </a>
    </div>
    `
        : ''
    }

    <p style="font-size:13px;line-height:1.5;color:#6b7280;margin:20px 0 0;">
      Please join 5 minutes prior to the scheduled start time with your questions prepared.
    </p>

    <p style="font-size:14px;line-height:1.5;color:#374151;margin:20px 0 0;">
      Best regards,<br />
      <strong>${APP_NAME} Instructor Team</strong>
    </p>
  </div>

  <footer style="text-align:center;font-size:12px;color:#9ca3af;margin:24px auto;">
    © ${new Date().getFullYear()} ${APP_NAME}. All Rights Reserved.
  </footer>
</body>
</html>
`;
};

export default DoubtBookingSuccessMail;
