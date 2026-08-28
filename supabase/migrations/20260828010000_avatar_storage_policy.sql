-- 아바타를 Supabase Storage 로 옮긴다 (Cloudflare 의존성 제거)
--
-- 배경
--   아바타 이미지만 Cloudflare Worker(`nanuri-bill`) → R2 로 올리고 있었다. 영수증 업로드에서
--   출발한 경로인데 청구 기능이 사라지면서 아바타 하나만 남았다. 그 Worker 는 인증이 없고
--   `Access-Control-Allow-Origin: *` 라, URL 만 알면 누구나 업로드·삭제할 수 있었다.
--
--   Supabase Storage 에는 공개 `avatars` 버킷이 이미 있다(관리자 앱의
--   20260813120000_reset_schema.sql 이 만들었다). 다만 업로드 정책이 is_admin() 을 요구해
--   웹 멤버는 못 올린다. 그 정책을 지우지 않고 **멤버용 정책을 하나 더** 얹는다.
--   PERMISSIVE 정책은 OR 로 합쳐지므로 관리자 앱 경로는 그대로 산다.

-- 버킷이 없으면 만들고, 있으면 공개 읽기만 보장한다.
-- 앱이 getPublicUrl 을 쓰므로 public = true 여야 한다.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 공개 읽기. 관리자 앱이 이미 만들어 뒀지만 없을 수도 있으니 여기서도 보장한다.
drop policy if exists "아바타 공개 읽기" on storage.objects;
create policy "아바타 공개 읽기" on storage.objects
    for select to public
    using (bucket_id = 'avatars');

-- 멤버는 **자기 uid 폴더에만** 올린다.
--   경로 규칙: avatars/<auth.uid()>/<uuid>.<ext>
--   lib/uploadAvatar.ts 가 이 형태로 만든다. 경로를 바꾸면 여기도 같이 바꿔야 한다.
--
-- "멤버" 판별은 user_profiles 행의 존재다 — 익명 게스트도 authenticated 롤을 받으므로
-- to authenticated 만으로는 게스트가 통과한다(data-model.md).
drop policy if exists "멤버는 본인 폴더에 아바타 업로드" on storage.objects;
create policy "멤버는 본인 폴더에 아바타 업로드" on storage.objects
    for all to authenticated
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
        and exists (select 1 from public.user_profiles p where p.id = auth.uid())
    )
    with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
        and exists (select 1 from public.user_profiles p where p.id = auth.uid())
    );
