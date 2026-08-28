import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Camera } from "lucide-react";
import BackButton from "../components/BackButton";
import TextField from "../components/ui/TextField";
import SelectField from "../components/ui/SelectField";
import Button from "../components/ui/Button";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import { uploadAvatar } from "../lib/uploadAvatar";
import { POSITIONS } from "../constants/worship";

interface FormValues {
  name: string;
  phone: string;
}

export default function MemberProfileSetupPage() {
  const navigate = useNavigate();
  const { user, userProfile, fetchUserProfile } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: userProfile?.name ?? "",
      phone: userProfile?.phone ?? "",
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [positions, setPositions] = useState<string[]>(userProfile?.position ?? []);
  const [team, setTeam] = useState<string>(userProfile?.team ?? "나누리");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userProfile?.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const initial = (userProfile?.name ?? "").slice(0, 1);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setSubmitting(true);

    let avatar_url = userProfile?.avatar_url ?? null;
    if (avatarFile) avatar_url = await uploadAvatar(avatarFile, user.id);

    const { error } = await supabase.from("user_profiles").upsert({
      id: user.id,
      name: values.name,
      team,
      position: positions.length > 0 ? positions : null,
      phone: values.phone || null,
      avatar_url,
    });

    if (error) {
      console.error("[MemberProfileSetupPage] upsert error:", error);
      setSubmitting(false);
      toast.error("저장에 실패했어요");
      return;
    }

    await fetchUserProfile().catch(() => {});
    setSubmitting(false);
    toast.success("저장되었어요!", { icon: "✅" });
    navigate("/profile");
  };

  return (
    <div className="flex-1 flex flex-col">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md mx-auto px-4 pt-4 flex flex-col gap-5"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <BackButton onClick={() => navigate(-1)} />
          <h1 className="text-headline2 font-bold text-label-normal">프로필 편집</h1>
        </div>

        {/* 프로필 사진 */}
        <div className="flex flex-col items-center gap-2 py-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative active:scale-95 transition"
            aria-label="사진 변경"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-status-bg-active text-primary-normal text-title1 font-bold">
              {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" /> : (initial || <Camera size={30} />)}
            </div>
            {/* 편집 어포던스 — 그림자로 면에서 띄운다(테두리 대신, docs/design.md) */}
            <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-normal text-static-white flex items-center justify-center shadow-small">
              <Camera size={15} />
            </span>
          </button>
          <p className="text-label2 text-label-neutral">탭해서 사진 변경</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* 이름 */}
        <TextField
          label="이름"
          placeholder="이름을 입력하세요"
          error={errors.name?.message}
          {...register("name", { required: "이름을 입력해주세요" })}
        />

        {/* 팀 — 선택 = 상호작용이라 Primary 담당(docs/design.md) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-label2 font-medium text-label-normal">팀</span>
          <div className="flex gap-2">
            {["나누리", "섬김이"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTeam(t)}
                className={`flex-1 py-3 rounded-field text-body2 font-semibold transition active:scale-[0.98] ${
                  team === t
                    ? "bg-primary-normal text-static-white"
                    : "bg-bg-normal text-label-neutral shadow-xsmall"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 포지션 — 여러 개 고르면 트리거에 " & " 로 이어 표기된다(어쿠스틱 & 싱어1) */}
        <SelectField
          multiple
          value={positions}
          onChange={setPositions}
          options={POSITIONS}
          placeholder="포지션 선택"
          label={<>포지션 <span className="text-label-neutral font-normal">({positions.length}개)</span></>}
        />

        {/* 연락처 */}
        <TextField
          label="연락처"
          type="tel"
          placeholder="010-0000-0000"
          {...register("phone")}
        />

        {/* 저장 */}
        <Button type="submit" loading={submitting} loadingText="저장 중..." className="mt-2">
          저장하기
        </Button>
      </form>
    </div>
  );
}
