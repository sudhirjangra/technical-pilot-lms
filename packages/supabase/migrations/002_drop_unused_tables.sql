-- Migration: 002_drop_unused_tables
-- Description: Remove blog/private_items tables not part of LMS architecture
-- Run in: Supabase Dashboard > SQL Editor

drop table if exists public.content_blog_post_comments cascade;
drop table if exists public.content_blog_posts cascade;
drop table if exists public.private_items cascade;
