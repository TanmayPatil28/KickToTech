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
      <header className="border-b border-[#212a45] bg-[#0c0f19]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Compass className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight text-white font-sans">
                ProblemPilot
              </span>
              <span className="hidden sm:inline-flex text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-[#151b2e] text-slate-400 border border-[#212a45] font-medium">
                The Evidence Challenge
              </span>
            </div>
          </div>

          {/* Center: Quiet Status Dot */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-[#101524] border border-[#212a45] px-3 py-1 rounded-full font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-500 text-[11px] font-medium font-mono">Stage:</span>
            <span className="font-semibold text-slate-200 text-[11px]">
              {String(currentStage).replace(/_/g, ' ')}
            </span>
          </div>

          {/* Right Controls: Demo Mode & Reset */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Demo Mode Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 min-h-[36px] rounded-lg border transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer select-none ${
                  isDemoMode
                    ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/40'
                    : 'bg-[#151b2e] text-slate-200 border-[#263152] hover:bg-[#1c243e] hover:border-slate-500'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">
                  {isDemoMode
                    ? demoScenarioId === 'contradictory_study' || demoScenarioId === 'B'
                      ? 'Demo: Contradictions'
                      : 'Demo: Vague Study'
                    : 'Load Demo Scenario'}
                </span>
                <span className="sm:hidden">Demo</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-1.5 w-72 bg-[#101524] border border-[#212a45] rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-stage-enter">
                  <div className="px-3.5 py-1.5 text-[10px] text-slate-400 font-mono uppercase tracking-wider border-b border-[#212a45] font-semibold">
                    Deterministic Scenarios
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectScenario('vague_study');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-300 hover:bg-[#151b2e] flex flex-col gap-0.5 active:scale-[0.98] cursor-pointer transition-colors"
                  >
                    <span className="font-semibold text-slate-100 text-xs">Scenario A: Vague Study App</span>
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
                    className="w-full text-left px-3.5 py-2.5 text-slate-300 hover:bg-[#151b2e] flex flex-col gap-0.5 border-t border-[#212a45] active:scale-[0.98] cursor-pointer transition-colors"
                  >
                    <span className="font-semibold text-slate-100 text-xs">Scenario B: Contradictory Findings</span>
                    <span className="text-[11px] text-slate-400">
                      Demonstrates revision when workarounds satisfy users.
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
              className="text-xs min-h-[36px]"
            >
              <span>New Case</span>
            </TactileButton>
          </div>
        </div>

        {/* Sleek Integrated Demo Mode Ribbon */}
        {isDemoMode && (
          <div className="border-t border-amber-500/30 bg-amber-950/40 px-4 lg:px-8 py-1.5 text-xs text-amber-200 animate-stage-enter">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold tracking-wide uppercase text-[10px] text-amber-300 font-mono">
                  SAMPLE SCENARIO — NOT REAL RESEARCH
                </span>
                <span className="hidden md:inline text-amber-300/80 text-[11px]">
                  (Deterministic mock data illustrating evidence-evaluation mechanics)
                </span>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="text-amber-300 font-semibold underline hover:text-white text-[11px] ml-2 cursor-pointer active:scale-[0.97]"
              >
                Exit Demo
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-stage-enter">
          <div className="bg-[#101524] border border-[#212a45] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#212a45]">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-base text-white">
                  Start New Validation Case?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              This action will reset your entered problem statement, analysis critique, validation experiments, and recorded findings ledger. Unsaved evidence will be permanently cleared.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#212a45]">
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
