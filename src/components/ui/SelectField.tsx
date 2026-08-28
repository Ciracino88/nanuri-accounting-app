import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown } from "lucide-react";

interface BaseProps {
  options: string[];
  placeholder?: string;
  label?: ReactNode;
}

// 단일/다중을 판별 유니온으로 나눈다 — 다중이면 value·onChange 가 배열로 바뀐다.
// multiple 을 안 주면 기존 단일 선택 그대로다(은행 선택 등 기존 호출 호환).
interface SingleProps extends BaseProps {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}
interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}
type SelectFieldProps = SingleProps | MultiProps;

/** 프로필 포지션 선택용 커스텀 드롭다운 (네이티브 select 아님, 애니메이션 목록).
 *  트리거는 TextField 와 같은 껍데기라 나란히 놔도 어긋나지 않는다.
 *  다중 선택 시 트리거에는 고른 값을 " & " 로 이어 보여준다(예: "어쿠스틱 & 싱어1"). */
export default function SelectField(props: SelectFieldProps) {
  const { options, placeholder = "선택", label } = props;
  const [open, setOpen] = useState(false);

  // 선택 순서를 그대로 쓴다 — 다중일 때 & 표기가 고른 순서를 따른다.
  const selected = props.multiple ? props.value : props.value ? [props.value] : [];
  const display = selected.join(" & ");

  const pick = (o: string) => {
    if (props.multiple) {
      // 다중은 창을 닫지 않는다 — 연속으로 고른다. 이미 있으면 뺀다(토글).
      const next = props.value.includes(o)
        ? props.value.filter((v) => v !== o)
        : [...props.value, o];
      props.onChange(next);
    } else {
      props.onChange(o);
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-label2 font-medium text-label-normal">{label}</span>}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full rounded-field border bg-bg-normal px-4 py-3 text-body1 text-left flex items-center justify-between gap-2 transition-colors ${
          open ? "border-primary-normal" : "border-line-solid"
        }`}
      >
        <span className={`min-w-0 truncate ${display ? "text-label-normal" : "text-label-alternative"}`}>
          {display || placeholder}
        </span>
        <motion.span
          className="text-label-neutral flex shrink-0"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden rounded-field bg-bg-normal border border-line-solid shadow-small"
          >
            {options.map((o, i) => {
              const on = selected.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  className={`w-full px-4 py-2.5 text-body2 font-medium text-left flex items-center justify-between ${
                    on ? "text-primary-normal" : "text-label-neutral"
                  } ${i < options.length - 1 ? "border-b border-line-solid" : ""}`}
                  onClick={() => pick(o)}
                >
                  {o}
                  {on && <Check size={16} strokeWidth={3} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
