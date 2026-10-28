import { useState, type FC } from 'react';
import {
  Compass,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import type { WorkflowStage } from '../types/index.ts';

interface HeaderProps {
  currentStage: WorkflowStage;
  isDemoMode: boolean;
  demoScenarioId?: string;
  onSelectScenario: (scenario: 'vague_study' | 'contradictory_study') => void;
  onReset: () => void;
}

export const Header: FC<HeaderProps> = ({
  currentStage,
  isDemoMode,
  demoScenarioId,
  onSelectScenario,
  onReset,
}) => {
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <>
      <header className="border-b border-[#242a3e] bg-[#12151f] sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg tracking-tight text-slate-100">
                  ProblemPilot
                </span>
                <span className="text-xs uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                  The Evidence Challenge
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Challenge assumptions. Follow evidence before you build.
              </p>
            </div>
          </div>

          {/* Center: Stage Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono bg-[#181c2a] border border-[#242a3e] px-3 py-1.5 rounded-md">
            <span className="text-slate-500">Stage:</span>
            <span className="font-medium text-blue-400">{currentStage.replace(/_/g, ' ')}</span>
          </div>

          {/* Right Controls: Demo Mode & Reset */}
          <div className="flex items-center gap-2.5">
            {/* Demo Mode Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md border transition-all active:scale-[0.98] ${
                  isDemoMode
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/50 hover:bg-amber-900/40'
                    : 'bg-[#181c2a] text-slate-300 border-[#242a3e] hover:bg-[#1e2335]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isDemoMode
                    ? demoScenarioId === 'contradictory_study'
                      ? 'Demo: Contradictions'
                      : 'Demo: Vague App'
                    : 'Load Demo Scenario'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-1 w-64 bg-[#181c2a] border border-[#242a3e] rounded-lg shadow-xl py-1 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[11px] text-slate-400 font-mono uppercase tracking-wider border-b border-[#242a3e]">
                    Deterministic Scenarios
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectScenario('vague_study');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-[#1e2335] flex flex-col gap-0.5"
                  >
                    <span className="font-medium text-slate-100">Scenario A: Vague Study App</span>
                    <span className="text-[11px] text-slate-400">
                      Unpacks vague idea & flags unverified assumptions.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectScenario('contradictory_study');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-[#1e2335] flex flex-col gap-0.5 border-t border-[#242a3e]/60"
                  >
                    <span className="font-medium text-slate-100">Scenario B: Contradictory Findings</span>
                    <span className="text-[11px] text-slate-400">
                      Demonstrates revision when existing tools satisfy users.
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              title="Reset current validation case"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#181c2a] border border-[#242a3e] px-2.5 py-1.5 rounded-md hover:bg-[#1e2335] active:scale-[0.98] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Case</span>
            </button>
          </div>
        </div>

        {/* Persistent Demo Mode Banner */}
        {isDemoMode && (
          <div className="mt-2.5 max-w-7xl mx-auto flex items-center justify-between bg-amber-950/50 border border-amber-800/60 text-amber-200 px-3.5 py-1.5 rounded-md text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold tracking-wide uppercase text-[11px]">
                SAMPLE SCENARIO — NOT REAL RESEARCH
              </span>
              <span className="hidden md:inline text-amber-300/80">
                (Deterministic mock data illustrating evidence-evaluation mechanics)
              </span>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="text-amber-300 underline hover:text-amber-100 text-[11px] ml-2"
            >
              Exit Demo
            </button>
          </div>
        )}
      </header>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-semibold text-base text-slate-100">Start New Validation Case?</h3>
            </div>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              This action will reset your entered problem statement, analysis critique, validation experiments, and recorded findings ledger. Unsaved evidence will be cleared.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-[#12151f] border border-[#242a3e] rounded-lg hover:bg-[#1e2335] active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  onReset();
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg active:scale-[0.98]"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
