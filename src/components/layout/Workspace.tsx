import { useState, type FC, type ReactNode } from 'react';
import { Layers, FileText } from 'lucide-react';

export interface WorkspaceProps {
  mainContent: ReactNode;
  sidebarContent: ReactNode;
  className?: string;
}

export const Workspace: FC<WorkspaceProps> = ({
  mainContent,
  sidebarContent,
  className = '',
}) => {
  const [mobileTab, setMobileTab] = useState<'task' | 'context'>('task');

  return (
    <div className={`max-w-7xl mx-auto w-full px-3 sm:px-4 lg:px-8 py-4 sm:py-6 flex-1 flex flex-col ${className}`}>
      {/* Mobile Tab Switcher (< 1024px) */}
      <div className="flex lg:hidden mb-5 p-1 rounded-xl bg-zinc-100 border border-zinc-200/90 text-xs font-medium shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileTab('task')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2.5 min-h-[44px] rounded-lg transition-all duration-150 ease-out active:scale-[0.97] select-none text-[11px] sm:text-xs ${
            mobileTab === 'task'
              ? 'bg-white text-zinc-950 font-semibold shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span className="truncate">Active Stage Task</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('context')}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2.5 min-h-[44px] rounded-lg transition-all duration-150 ease-out active:scale-[0.97] select-none text-[11px] sm:text-xs ${
            mobileTab === 'context'
              ? 'bg-white text-zinc-950 font-semibold shadow-xs'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="truncate">Hypothesis & Evidence</span>
        </button>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
        {/* Main Column */}
        <section
          className={`lg:col-span-8 space-y-6 ${
            mobileTab === 'task' ? 'block' : 'hidden lg:block'
          }`}
        >
          {mainContent}
        </section>

        {/* Secondary Column */}
        <section
          className={`lg:col-span-4 space-y-6 ${
            mobileTab === 'context' ? 'block' : 'hidden lg:block'
          }`}
        >
          {sidebarContent}
        </section>
      </div>
    </div>
  );
};

export default Workspace;
