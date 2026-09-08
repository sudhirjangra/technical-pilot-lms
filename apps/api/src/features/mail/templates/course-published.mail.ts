import { APP_NAME, APP_URL } from '@repo/constants/app';

export const CoursePublishedMail = ({
  name,
  courseTitle,
  courseSlug,
  description,
  price,
  discountPrice,
}: {
  name: string;
  courseTitle: string;
  courseSlug: string;
  description?: string | null;
  price?: number;
  discountPrice?: number | null;
}) => {
  const displayPrice =
    discountPrice !== undefined && discountPrice !== null
      ? `₹${discountPrice}`
      : price !== undefined
        ? `₹${price}`
        : 'Free';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Course Available - ${APP_NAME}</title>
</head>
<body style="background-color:#efeff1;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:580px;margin:30px auto;background:#ffffff;padding:32px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${APP_URL}/assets/logo/icon.svg" alt="${APP_NAME}" width="48" height="48" style="display:block;margin:0 auto;" />
    </div>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700;">New Course Launch 🚀</h2>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px;">
      We are excited to announce a new course on <strong>${APP_NAME}</strong>:
    </p>

    <div style="background-color:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
      <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a;">${courseTitle}</h3>
      ${description ? `<p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 12px;">${description.slice(0, 200)}${description.length > 200 ? '...' : ''}</p>` : ''}
      <p style="margin:0;font-size:15px;font-weight:600;color:#059669;">
        Price: ${displayPrice} ${discountPrice && price ? `<span style="text-decoration:line-through;color:#94a3b8;font-size:13px;font-weight:normal;">₹${price}</span>` : ''}
      </p>
    </div>

    <div style="text-align:center;margin:32px 0 24px;">
      <a href="${APP_URL}/courses/${courseSlug}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        Explore Course
      </a>
    </div>

    <p style="font-size:13px;line-height:1.5;color:#6b7280;margin:24px 0 0;">
      Start advancing your aviation technical preparation today.
    </p>

    <p style="font-size:14px;line-height:1.5;color:#374151;margin:20px 0 0;">
      Best regards,<br />
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

export default CoursePublishedMail;
