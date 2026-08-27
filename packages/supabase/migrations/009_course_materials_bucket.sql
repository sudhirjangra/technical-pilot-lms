insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', false)
on conflict (id) do nothing;

create policy "Admins manage course materials"
on storage.objects for all
using (bucket_id = 'course-materials' and public.get_my_role() in ('admin', 'sub_admin'))
with check (bucket_id = 'course-materials' and public.get_my_role() in ('admin', 'sub_admin'));

create policy "Enrolled students read course materials"
on storage.objects for select
using (
  bucket_id = 'course-materials'
  and exists (
    select 1
    from public.enrollments e
    join public.courses c on c.slug = split_part(name, '/', 1)
    where e.student_id = auth.uid() and e.course_id = c.id and e.status = 'active'
  )
);