import { SUPABASE_ADMIN } from '@/common/modules/supabase.module';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  BookSlotDto,
  CreateSlotDto,
  UpdateBookingDto,
  UpdateSlotDto,
} from './dto';

@Injectable()
export class DoubtSessionsService {
  constructor(
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  async createSlot(dto: CreateSlotDto, createdBy: string) {
    const { data, error } = await this.supabase
      .from('doubt_slots')
      .insert({ ...dto, created_by: createdBy })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getSlots(filters?: { date?: string; status?: string }) {
    let query = this.supabase
      .from('doubt_slots')
      .select('*, profiles!doubt_slots_created_by_fkey(full_name, email)')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (filters?.date) query = query.eq('date', filters.date);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getUpcomingSlots() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.supabase
      .from('doubt_slots')
      .select('*')
      .eq('status', 'available')
      .gte('date', today)
      .order('date')
      .order('start_time');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateSlot(id: string, dto: UpdateSlotDto) {
    const { data, error } = await this.supabase
      .from('doubt_slots')
      .update(dto)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Slot not found');
    return data;
  }

  async deleteSlot(id: string) {
    const { error } = await this.supabase
      .from('doubt_slots')
      .delete()
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  async bookSlot(dto: BookSlotDto, studentId: string) {
    // Check slot availability
    const { data: slot, error: slotErr } = await this.supabase
      .from('doubt_slots')
      .select('*')
      .eq('id', dto.slot_id)
      .single();
    if (slotErr || !slot) throw new NotFoundException('Slot not found');
    if (slot.status !== 'available')
      throw new BadRequestException('Slot is not available');
    if (slot.current_bookings >= slot.max_bookings)
      throw new BadRequestException('Slot is full');

    // Create booking
    const { data: booking, error } = await this.supabase
      .from('doubt_bookings')
      .insert({ slot_id: dto.slot_id, student_id: studentId })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505')
        throw new ConflictException('Already booked this slot');
      throw new BadRequestException(error.message);
    }

    // Increment current_bookings, mark full if needed
    const newCount = slot.current_bookings + 1;
    await this.supabase
      .from('doubt_slots')
      .update({
        current_bookings: newCount,
        status: newCount >= slot.max_bookings ? 'full' : 'available',
      })
      .eq('id', dto.slot_id);

    return booking;
  }

  async cancelBooking(bookingId: string, studentId: string) {
    const { data: booking, error: bErr } = await this.supabase
      .from('doubt_bookings')
      .select('*, doubt_slots(id, current_bookings)')
      .eq('id', bookingId)
      .eq('student_id', studentId)
      .single();
    if (bErr || !booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'cancelled')
      throw new BadRequestException('Already cancelled');

    await this.supabase
      .from('doubt_bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', bookingId);

    // Decrement slot counter, reopen if was full
    const slot = booking.doubt_slots as {
      id: string;
      current_bookings: number;
    };
    const newCount = Math.max(0, slot.current_bookings - 1);
    await this.supabase
      .from('doubt_slots')
      .update({ current_bookings: newCount, status: 'available' })
      .eq('id', slot.id);
  }

  async getMyBookings(studentId: string) {
    const { data, error } = await this.supabase
      .from('doubt_bookings')
      .select(
        '*, doubt_slots(id, date, start_time, end_time, duration_minutes, status)',
      )
      .eq('student_id', studentId)
      .order('booked_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getSlotBookings(slotId: string) {
    const { data, error } = await this.supabase
      .from('doubt_bookings')
      .select(
        '*, profiles!doubt_bookings_student_id_fkey(id, full_name, email)',
      )
      .eq('slot_id', slotId)
      .order('booked_at');
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateBooking(bookingId: string, dto: UpdateBookingDto) {
    const { data, error } = await this.supabase
      .from('doubt_bookings')
      .update({ status: dto.status })
      .eq('id', bookingId)
      .select('*')
      .single();
    if (error || !data) throw new NotFoundException('Booking not found');
    return data;
  }
}
