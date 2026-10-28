import { useState, type FC } from 'react';
import {
  Compass,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';
import type { Stage, WorkflowStage } from '../../types/index.ts';
import { TactileButton } from '../common/TactileButton.tsx';

export interface HeaderProps {
  currentStage: Stage | WorkflowStage;
  isDemoMode: boolean;
  demoScenarioId?: string | null;
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
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg tracking-tight text-slate-100">
                    ProblemPilot
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                    The Evidence Challenge
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Challenge assumptions. Follow evidence before you build.
                </p>
              </div>
            </div>

            {/* Mobile Stage Badge */}
            <div className="flex md:hidden items-center gap-1.5 text-xs font-mono bg-[#181c2a] border border-[#242a3e] px-2.5 py-1 rounded-md">
              <span className="text-slate-400 text-[11px]">Stage:</span>
              <span className="font-medium text-blue-400 text-[11px]">
                {String(currentStage).replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Center: Desktop Stage Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-mono bg-[#181c2a] border border-[#242a3e] px-3 py-1.5 rounded-md">
            <span className="text-slate-500">Active Stage:</span>
            <span className="font-medium text-blue-400">
              {String(currentStage).replace(/_/g, ' ')}
            </span>
          </div>

          {/* Right Controls: Demo Mode & Reset */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Demo Mode Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 min-h-[44px] rounded-lg border transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer select-none ${
                  isDemoMode
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/40'
                    : 'bg-[#181c2a] text-slate-300 border-[#242a3e] hover:bg-[#1e2335]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {isDemoMode
                    ? demoScenarioId === 'contradictory_study' || demoScenarioId === 'B'
                      ? 'Demo: Contradictions'
                      : 'Demo: Vague Study'
                    : 'Load Demo Scenario'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
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
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-[#1e2335] flex flex-col gap-0.5 active:scale-[0.98] cursor-pointer"
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
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-[#1e2335] flex flex-col gap-0.5 border-t border-[#242a3e]/60 active:scale-[0.98] cursor-pointer"
                  >
                    <span className="font-medium text-slate-100">Scenario B: Contradictory Findings</span>
                    <span className="text-[11px] text-slate-400">
                      Demonstrates revision when existing workarounds satisfy users.
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <TactileButton
              variant="secondary"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              title="Reset current validation case"
              icon={<RotateCcw className="w-3.5 h-3.5 text-slate-400" />}
              className="text-xs min-h-[44px]"
            >
              <span>New Case</span>
            </TactileButton>
          </div>
        </div>

        {/* Persistent Demo Mode Banner */}
        {isDemoMode && (
          <div className="mt-2.5 max-w-7xl mx-auto flex items-center justify-between bg-amber-950/50 border border-amber-700/80 text-amber-200 px-3.5 py-1.5 rounded-md text-xs">
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
              className="text-amber-300 underline hover:text-amber-100 text-[11px] ml-2 cursor-pointer active:scale-[0.97]"
            >
              Exit Demo
            </button>
          </div>
        )}
      </header>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#181c2a] border border-[#242a3e] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-base text-slate-100">
                  Start New Validation Case?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              This action will reset your entered problem statement, analysis critique, validation experiments, and recorded findings ledger. Unsaved evidence will be permanently cleared.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <TactileButton
                variant="outline"
                size="md"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </TactileButton>
              <TactileButton
                variant="danger"
                size="md"
                onClick={() => {
                  setShowResetConfirm(false);
                  onReset();
                }}
              >
                Confirm Reset
              </TactileButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
