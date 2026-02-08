import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg mb-3 bg-bg-secondary">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-text-primary cursor-pointer select-none"
      >
        <ChevronRight
          size={12}
          className={`transition-transform duration-300 ${isExpanded ? "rotate-90" : ""}`}
        />
        {title}
      </button>
      <div
        // Note: max-h-[1000px] should accommodate most content. If content exceeds this,
        // consider using a ref-based dynamic height solution.
        className={`overflow-hidden transition-[max-height] duration-300 ${isExpanded ? "max-h-[1000px]" : "max-h-0"}`}
      >
        <div className="px-3 pb-2.5">{children}</div>
      </div>
    </div>
  );
}
