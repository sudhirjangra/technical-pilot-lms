export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'sub_admin' | 'student';

export type CourseStatus = 'draft' | 'published' | 'archived';

export type EnrollmentStatus = 'active' | 'completed' | 'expired';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type LessonType = 'video' | 'pdf' | 'assignment' | 'test';

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export type ReferralStatus = 'pending' | 'converted' | 'expired';

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export type DevicePlatform = 'web' | 'android' | 'ios';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      devices: {
        Row: {
          id: string;
          user_id: string;
          device_fingerprint: string;
          device_name: string;
          platform: DevicePlatform;
          last_active_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_fingerprint: string;
          device_name?: string;
          platform?: DevicePlatform;
          last_active_at?: string;
          created_at?: string;
        };
        Update: {
          device_fingerprint?: string;
          device_name?: string;
          last_active_at?: string;
        };
      };
      sub_admin_permissions: {
        Row: {
          id: string;
          user_id: string;
          permissions: string[];
          granted_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          permissions: string[];
          granted_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          permissions?: string[];
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          category_id: string | null;
          title: string;
          slug: string;
          description: string | null;
          thumbnail_url: string | null;
          price: number;
          discount_price: number | null;
          status: CourseStatus;
          created_by: string;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id?: string | null;
          title: string;
          slug: string;
          description?: string | null;
          thumbnail_url?: string | null;
          price: number;
          discount_price?: number | null;
          status?: CourseStatus;
          created_by: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          title?: string;
          slug?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          price?: number;
          discount_price?: number | null;
          status?: CourseStatus;
          published_at?: string | null;
          updated_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          enrolled_at: string;
          status: EnrollmentStatus;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          enrolled_at?: string;
          status?: EnrollmentStatus;
          completed_at?: string | null;
        };
        Update: {
          status?: EnrollmentStatus;
          completed_at?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          metadata?: Json | null;
        };
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          amount: number;
          discount_amount: number;
          razorpay_order_id: string;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          status: PaymentStatus;
          refund_reason: string | null;
          invoice_number: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          course_id: string;
          amount: number;
          discount_amount?: number;
          razorpay_order_id: string;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          status?: PaymentStatus;
          refund_reason?: string | null;
          invoice_number: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          status?: PaymentStatus;
          refund_reason?: string | null;
          updated_at?: string;
        };
      };
    };
    Enums: {
      user_role: UserRole;
      course_status: CourseStatus;
      enrollment_status: EnrollmentStatus;
      payment_status: PaymentStatus;
      lesson_type: LessonType;
      progress_status: ProgressStatus;
      booking_status: BookingStatus;
      referral_status: ReferralStatus;
      commission_status: CommissionStatus;
      device_platform: DevicePlatform;
    };
  };
}
