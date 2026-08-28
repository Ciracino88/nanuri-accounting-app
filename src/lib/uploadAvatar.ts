// src/lib/uploadAvatar.ts
import imageCompression from "browser-image-compression";
import { supabase } from "./supabase";

const BUCKET = "avatars";

/** 아바타를 Supabase Storage 에 올리고 공개 URL 을 돌려준다.
 *
 *  예전엔 Cloudflare Worker → R2 를 거쳤다. 그 Worker 는 인증이 없어 URL 만 알면 누구나
 *  업로드·삭제할 수 있었고, 청구 기능이 사라진 뒤로는 아바타 하나 때문에 유지되고 있었다.
 *  Storage 로 옮기면서 접근 제어가 RLS 로 들어왔다.
 *
 *  ⚠ 경로의 **첫 폴더가 반드시 본인 uid** 여야 한다. Storage 정책이 그걸 검사한다
 *  (20260828010000_avatar_storage_policy.sql). 경로 규칙을 바꾸면 정책도 같이 바꿔야 하고,
 *  안 그러면 업로드가 통째로 막힌다. */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    // 회전 보정을 끈다. 켜면 EXIF 방향을 두 번 적용해 눕는 사진이 생긴다.
    exifOrientation: -1,
  });

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: compressed.type });

  if (error) {
    console.error("[uploadAvatar] upload error:", error);
    throw new Error("업로드 실패");
  }

  // 공개 버킷이라 서명 없이 URL 이 나온다. 이 문자열이 user_profiles.avatar_url 에 저장된다.
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
