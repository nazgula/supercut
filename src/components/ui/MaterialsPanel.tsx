import { useState } from "react";
import { MaterialItem } from "./MaterialItem";
import type { MaterialItemData } from "./MaterialItem";

export interface MaterialsPanelTab {
  label: string;
  items: MaterialItemData[];
}

interface MaterialsPanelProps {
  tabs: MaterialsPanelTab[];
  className?: string;
}

export function MaterialsPanel({ tabs, className = "" }: MaterialsPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = tabs[activeIndex] ?? tabs[0];

  return (
    <div className={["bg-surface border border-border rounded-lg overflow-hidden flex flex-col", className].join(" ")}>
      {/* Tab bar */}
      <div className="flex bg-surface-2 border-b border-border flex-shrink-0">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveIndex(i)}
            className={[
              "flex-1 py-3 px-3 text-[12px] font-medium transition-colors border-b-2 -mb-px cursor-pointer",
              i === activeIndex
                ? "text-text bg-surface border-accent"
                : "text-text-secondary border-transparent hover:text-text hover:bg-bone-25",
            ].join(" ")}
          >
            {tab.label}
            <span className={["font-mono ml-1 text-[12px]", i === activeIndex ? "text-accent" : "text-text-muted"].join(" ")}>
              {tab.items.length}
            </span>
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="p-3 flex flex-col gap-2 overflow-y-auto flex-1">
        {activeTab.items.length > 0
          ? activeTab.items.map((item) => (
              <MaterialItem key={item.title} {...item} className="bg-bone-25" />
            ))
          : (
            <div className="py-8 text-center text-[11px] text-text-muted">No items</div>
          )
        }
      </div>
    </div>
  );
}
