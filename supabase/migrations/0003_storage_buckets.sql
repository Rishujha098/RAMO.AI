-- Create storage buckets for RAMO.AI

insert into storage.buckets (id, name, public)
values 
  ('resumes', 'resumes', false),
  ('audio', 'audio', false)
on conflict (id) do nothing;
