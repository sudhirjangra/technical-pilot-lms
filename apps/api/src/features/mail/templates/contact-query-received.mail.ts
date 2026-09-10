import { APP_NAME, APP_URL } from '@repo/constants/app';

export const ContactQueryReceivedMail = ({
  name,
  subject,
  ticketId,
  message,
}: {
  name: string;
  subject?: string | null;
  ticketId?: string | null;
  message?: string | null;
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>We Received Your Message - ${APP_NAME}</title>
</head>
<body style="background-color:#efeff1;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:30px auto;background:#ffffff;padding:32px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${APP_URL}/assets/logo/icon.svg" alt="${APP_NAME}" width="48" height="48" style="display:block;margin:0 auto;" />
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;">Support Inquiry Received 📩</h2>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
      Hello <strong>${name}</strong>,
    </p>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px;">
      Thank you for contacting ${APP_NAME}. We have received your inquiry and our support team will review your message and get back to you shortly.
    </p>

    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">Inquiry Reference</h3>
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        ${ticketId ? `
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Ticket Ref:</td>
          <td style="padding:6px 0;text-align:right;font-mono;font-weight:600;color:#111827;">${ticketId.slice(0, 8).toUpperCase()}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Subject:</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;color:#111827;">${subject || 'General Inquiry'}</td>
        </tr>
      </table>
      ${message ? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px dashed #e5e7eb;">
        <p style="font-size:12px;color:#6b7280;margin:0 0 6px;">Your Message:</p>
        <p style="font-size:13px;color:#374151;margin:0;white-space:pre-wrap;line-height:1.5;">${message.slice(0, 280)}${message.length > 280 ? '...' : ''}</p>
      </div>
      ` : ''}
    </div>

    <p style="font-size:13px;line-height:1.5;color:#6b7280;margin:20px 0 0;">
      Our standard response time is within 24 hours on working days.
    </p>

    <p style="font-size:14px;line-height:1.5;color:#374151;margin:20px 0 0;">
      Warm regards,<br />
      <strong>${APP_NAME} Support Team</strong>
    </p>
  </div>

  <footer style="text-align:center;font-size:12px;color:#9ca3af;margin:24px auto;">
    © ${new Date().getFullYear()} ${APP_NAME}. All Rights Reserved.
  </footer>
</body>
</html>
`;
};

export default ContactQueryReceivedMail;
