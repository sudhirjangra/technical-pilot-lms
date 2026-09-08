import { APP_NAME, APP_URL } from '@repo/constants/app';

export const CoursePurchaseSuccessMail = ({
  name,
  courseTitle,
  courseId,
  amount,
  invoiceNumber,
  orderId,
  purchaseDate,
}: {
  name: string;
  courseTitle: string;
  courseId: string;
  amount: number | string;
  invoiceNumber?: string;
  orderId?: string;
  purchaseDate?: Date | string;
}) => {
  const formattedDate = purchaseDate
    ? new Date(purchaseDate).toLocaleDateString('en-IN', {
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
  <title>Course Purchase Confirmation - ${APP_NAME}</title>
</head>
<body style="background-color:#efeff1;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:30px auto;background:#ffffff;padding:32px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${APP_URL}/assets/logo/icon.svg" alt="${APP_NAME}" width="48" height="48" style="display:block;margin:0 auto;" />
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;">Purchase Confirmed! 🎉</h2>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px;">
      Thank you for purchasing <strong>${courseTitle}</strong>. Your enrollment is now active, and you have immediate access to all course materials, lectures, and assessments.
    </p>

    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;">Order Summary</h3>
      <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Course:</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;color:#111827;">${courseTitle}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Amount Paid:</td>
          <td style="padding:6px 0;text-align:right;font-weight:600;color:#059669;">₹${amount}</td>
        </tr>
        ${invoiceNumber ? `
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Invoice Number:</td>
          <td style="padding:6px 0;text-align:right;color:#374151;">${invoiceNumber}</td>
        </tr>
        ` : ''}
        ${orderId ? `
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Order Reference:</td>
          <td style="padding:6px 0;text-align:right;color:#374151;">${orderId}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding:6px 0;color:#6b7280;">Date:</td>
          <td style="padding:6px 0;text-align:right;color:#374151;">${formattedDate}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin:32px 0 24px;">
      <a href="${APP_URL}/dashboard/courses/${courseId}" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        Start Learning Now
      </a>
    </div>

    <p style="font-size:13px;line-height:1.5;color:#6b7280;margin:24px 0 0;">
      If you have any questions or require assistance, please visit our <a href="${APP_URL}/contact" style="color:#2563eb;text-decoration:underline;">Support Page</a>.
    </p>

    <p style="font-size:14px;line-height:1.5;color:#374151;margin:20px 0 0;">
      Happy learning,<br />
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

export default CoursePurchaseSuccessMail;
