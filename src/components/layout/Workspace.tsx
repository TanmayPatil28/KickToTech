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
    <div className={`max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 flex-1 flex flex-col ${className}`}>
      {/* Mobile Tab Switcher (< 1024px) */}
      <div className="flex lg:hidden mb-4 p-1 rounded-xl bg-[#12151f] border border-[#242a3e] text-xs font-medium">
        <button
          type="button"
          onClick={() => setMobileTab('task')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-lg transition-all duration-150 ease-out active:scale-[0.97] select-none ${
            mobileTab === 'task'
              ? 'bg-blue-600 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Active Stage Task</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('context')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-lg transition-all duration-150 ease-out active:scale-[0.97] select-none ${
            mobileTab === 'context'
              ? 'bg-purple-600 text-white font-semibold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Hypothesis & Evidence</span>
        </button>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
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
