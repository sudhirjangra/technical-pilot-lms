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
          date_of_birth: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          referral_code?: string | null;
          referred_by?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          full_name?: string | null;
          date_of_birth?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          referral_code?: string | null;
          referred_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          full_name?: string | null;
          date_of_birth?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          referral_code?: string | null;
          referred_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
          invoice_number: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          status?: PaymentStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          thumbnail_url: string | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          thumbnail_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      chapters: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          sort_order: number;
          is_published: boolean;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          sort_order?: number;
          is_published?: boolean;
        };
        Update: {
          title?: string;
          description?: string | null;
          sort_order?: number;
          is_published?: boolean;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          chapter_id: string;
          title: string;
          description: string | null;
          lesson_type: LessonType;
          sort_order: number;
          is_published: boolean;
          
        };
        Insert: {
          id?: string;
          chapter_id: string;
          title: string;
          description?: string | null;
lesson_type: LessonType;
           sort_order?: number;
           is_published?: boolean;
        };
        Update: {
          title?: string;
          description?: string | null;
lesson_type?: LessonType;
           sort_order?: number;
          is_published?: boolean;
        };
        Relationships: [];
      };
      doubt_slots: {
        Row: {
          id: string;
          created_by: string | null;
          date: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          max_bookings: number;
          current_bookings: number;
          status: string;
          topic: string | null;
          description: string | null;
          meeting_link: string | null;
          target_type: 'all' | 'course' | 'student' | null;
          course_id: string | null;
          student_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          date: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          max_bookings?: number;
          current_bookings?: number;
          status?: string;
          topic?: string | null;
          description?: string | null;
          meeting_link?: string | null;
          target_type?: 'all' | 'course' | 'student' | null;
          course_id?: string | null;
          student_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          date?: string;
          start_time?: string;
          end_time?: string;
          duration_minutes?: number;
          max_bookings?: number;
          current_bookings?: number;
          status?: string;
          topic?: string | null;
          description?: string | null;
          meeting_link?: string | null;
          target_type?: 'all' | 'course' | 'student' | null;
          course_id?: string | null;
          student_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      doubt_bookings: {
        Row: {
          id: string;
          slot_id: string;
          student_id: string;
          status: BookingStatus;
          meeting_link: string | null;
          booked_at: string;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slot_id: string;
          student_id: string;
          status?: BookingStatus;
          meeting_link?: string | null;
          booked_at?: string;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: BookingStatus;
          meeting_link?: string | null;
          cancelled_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          title: string;
          body: string | null;
          type: string;
          metadata: Json | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          title: string;
          body?: string | null;
          type: string;
          metadata?: Json | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          body?: string | null;
          type?: string;
          metadata?: Json | null;
          is_read?: boolean;
        };
        Relationships: [];
      };
      referral_settings: {
        Row: {
          id: number;
          referee_discount_percentage: number;
          referrer_reward_percentage: number;
          points_per_rupee: number;
          min_withdrawal_points: number;
          is_active: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          referee_discount_percentage?: number;
          referrer_reward_percentage?: number;
          points_per_rupee?: number;
          min_withdrawal_points?: number;
          is_active?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: number;
          referee_discount_percentage?: number;
          referrer_reward_percentage?: number;
          points_per_rupee?: number;
          min_withdrawal_points?: number;
          is_active?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referee_id: string;
          referral_code: string;
          status: 'registered' | 'purchased';
          total_purchases_count: number;
          total_purchased_amount: number;
          total_points_awarded: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referee_id: string;
          referral_code: string;
          status?: 'registered' | 'purchased';
          total_purchases_count?: number;
          total_purchased_amount?: number;
          total_points_awarded?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'registered' | 'purchased';
          total_purchases_count?: number;
          total_purchased_amount?: number;
          total_points_awarded?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_wallets: {
        Row: {
          id: string;
          user_id: string;
          current_balance: number;
          total_earned: number;
          total_redeemed: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_balance?: number;
          total_earned?: number;
          total_redeemed?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          current_balance?: number;
          total_earned?: number;
          total_redeemed?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          id: string;
          wallet_id: string;
          user_id: string;
          type: 'credit_purchase' | 'debit_conversion' | 'refund_conversion_rejected' | 'admin_adjustment';
          points: number;
          balance_after: number;
          reference_id: string | null;
          source_user_id: string | null;
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          user_id: string;
          type: 'credit_purchase' | 'debit_conversion' | 'refund_conversion_rejected' | 'admin_adjustment';
          points: number;
          balance_after: number;
          reference_id?: string | null;
          source_user_id?: string | null;
          description: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          balance_after?: number;
          description?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
      cash_conversion_requests: {
        Row: {
          id: string;
          user_id: string;
          points_requested: number;
          inr_amount: number;
          points_per_rupee: number;
          status: 'pending' | 'approved' | 'rejected' | 'paid';
          student_notes: string | null;
          admin_notes: string | null;
          processed_at: string | null;
          processed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points_requested: number;
          inr_amount: number;
          points_per_rupee: number;
          status?: 'pending' | 'approved' | 'rejected' | 'paid';
          student_notes?: string | null;
          admin_notes?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'pending' | 'approved' | 'rejected' | 'paid';
          admin_notes?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_percentage: number;
          applicable_user_id: string | null;
          max_uses: number;
          times_used: number;
          is_active: boolean;
          valid_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_percentage: number;
          applicable_user_id?: string | null;
          max_uses?: number;
          times_used?: number;
          is_active?: boolean;
          valid_until?: string | null;
          created_at?: string;
        };
        Update: {
          discount_percentage?: number;
          applicable_user_id?: string | null;
          max_uses?: number;
          times_used?: number;
          is_active?: boolean;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          test_id: string | null;
          assignment_id: string | null;
          question_text: string;
          question_type: 'mcq' | 'msq' | 'text';
          points: number;
          explanation: string | null;
          sort_order: number;
          question_number: number | null;
          correct_text_answer: string | null;
          topic: string | null;
          question_category: string;
          question_difficulty: 'easy' | 'medium' | 'hard';
          subtopic: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          test_id?: string | null;
          assignment_id?: string | null;
          question_text: string;
          question_type: 'mcq' | 'msq' | 'text';
          points?: number;
          explanation?: string | null;
          sort_order?: number;
          question_number?: number | null;
          correct_text_answer?: string | null;
          topic?: string | null;
          question_category?: string;
          question_difficulty?: 'easy' | 'medium' | 'hard';
          subtopic?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          test_id?: string | null;
          assignment_id?: string | null;
          question_text?: string;
          question_type?: 'mcq' | 'msq' | 'text';
          points?: number;
          explanation?: string | null;
          sort_order?: number;
          question_number?: number | null;
          correct_text_answer?: string | null;
          topic?: string | null;
          question_category?: string;
          question_difficulty?: 'easy' | 'medium' | 'hard';
          subtopic?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      question_options: {
        Row: {
          id: string;
          question_id: string;
          option_text: string;
          is_correct: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_text: string;
          is_correct?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          option_text?: string;
          is_correct?: boolean;
          sort_order?: number;
        };
        Relationships: [];
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
      device_platform: DevicePlatform;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
