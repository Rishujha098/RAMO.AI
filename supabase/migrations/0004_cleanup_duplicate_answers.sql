-- Clean up duplicate answers (keep only the latest per question)

delete from public.interview_answers ia
where ia.id not in (
  select id from (
    select id, row_number() over (partition by question_id order by created_at desc) as rn
    from public.interview_answers
  ) ranked
  where rn = 1
);
