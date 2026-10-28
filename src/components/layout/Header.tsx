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
      <header className="border-b border-slate-200/90 bg-white sticky top-0 z-40 px-4 lg:px-8 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg tracking-tight text-slate-900">
                    ProblemPilot
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                    The Evidence Challenge
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Challenge assumptions. Follow evidence before you build.
                </p>
              </div>
            </div>

            {/* Mobile Stage Badge */}
            <div className="flex md:hidden items-center gap-1.5 text-xs font-mono bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
              <span className="text-slate-500 text-[11px]">Stage:</span>
              <span className="font-semibold text-teal-700 text-[11px]">
                {String(currentStage).replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Center: Desktop Stage Indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-lg shadow-2xs">
            <span className="text-slate-500 font-medium">Active Stage:</span>
            <span className="font-semibold text-teal-700">
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
                className={`flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 min-h-[44px] rounded-lg border transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer select-none shadow-2xs ${
                  isDemoMode
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
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
                <div className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 text-xs animate-stage-enter">
                  <div className="px-3.5 py-1.5 text-[11px] text-slate-400 font-mono uppercase tracking-wider border-b border-slate-100 font-semibold">
                    Deterministic Scenarios
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectScenario('vague_study');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 flex flex-col gap-0.5 active:scale-[0.98] cursor-pointer transition-colors"
                  >
                    <span className="font-semibold text-slate-900">Scenario A: Vague Study App</span>
                    <span className="text-[11px] text-slate-500">
                      Unpacks vague idea & flags unverified assumptions.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectScenario('contradictory_study');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-slate-700 hover:bg-slate-50 flex flex-col gap-0.5 border-t border-slate-100 active:scale-[0.98] cursor-pointer transition-colors"
                  >
                    <span className="font-semibold text-slate-900">Scenario B: Contradictory Findings</span>
                    <span className="text-[11px] text-slate-500">
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
              icon={<RotateCcw className="w-3.5 h-3.5 text-slate-500" />}
              className="text-xs min-h-[44px]"
            >
              <span>New Case</span>
            </TactileButton>
          </div>
        </div>

        {/* Persistent Demo Mode Banner */}
        {isDemoMode && (
          <div className="mt-2.5 max-w-7xl mx-auto flex items-center justify-between bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2 rounded-lg text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold tracking-wide uppercase text-[11px] text-amber-950 font-mono">
                SAMPLE SCENARIO — NOT REAL RESEARCH
              </span>
              <span className="hidden md:inline text-amber-800">
                (Deterministic mock data illustrating evidence-evaluation mechanics)
              </span>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="text-amber-800 font-semibold underline hover:text-amber-950 text-[11px] ml-2 cursor-pointer active:scale-[0.97]"
            >
              Exit Demo
            </button>
          </div>
        )}
      </header>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-stage-enter">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-semibold text-base text-slate-900">
                  Start New Validation Case?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              This action will reset your entered problem statement, analysis critique, validation experiments, and recorded findings ledger. Unsaved evidence will be permanently cleared.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
