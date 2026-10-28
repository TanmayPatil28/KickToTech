import { useState, useEffect, type FC } from 'react';
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

  useEffect(() => {
    if (!showResetConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowResetConfirm(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResetConfirm]);

  return (
    <>
      <header className="border-b border-zinc-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 h-14 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-2xs">
              <Compass className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm sm:text-base tracking-tight text-zinc-950 font-sans">
                ProblemPilot
              </span>
              <span className="hidden sm:inline-flex text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/80 font-medium">
                Idea Validation Workspace
              </span>
            </div>
          </div>

          {/* Center: Quiet Status Dot (visible on wide screens >= 1024px) */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200/80 px-3 py-1 rounded-full font-sans shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-400 text-[11px] font-medium font-mono">Stage:</span>
            <span className="font-semibold text-zinc-800 text-[11px]">
              {String(currentStage).replace(/_/g, ' ')}
            </span>
          </div>

          {/* Right Controls: Demo Mode & Reset */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Demo Mode Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                aria-haspopup="true"
                aria-expanded={showDemoMenu}
                aria-label="Select demo scenario"
                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 min-h-[36px] rounded-lg border transition-all duration-150 ease-out active:scale-[0.97] cursor-pointer select-none shadow-2xs ${
                  isDemoMode
                    ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100/70'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="hidden sm:inline">
                  {isDemoMode
                    ? demoScenarioId === 'contradictory_study' || demoScenarioId === 'B'
                      ? 'Demo: Contradictions'
                      : 'Demo: Vague Study'
                    : 'Load Demo Scenario'}
                </span>
                <span className="sm:hidden">Demo</span>
                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
              </button>

              {showDemoMenu && (
                <div
                  role="menu"
                  aria-label="Deterministic Demo Scenarios"
                  className="absolute right-0 mt-1.5 w-72 bg-white border border-zinc-200 rounded-xl shadow-premium-dropdown py-1.5 z-50 text-xs animate-stage-enter"
                >
                  <div className="px-3.5 py-1.5 text-[10px] text-zinc-400 font-mono uppercase tracking-wider border-b border-zinc-100 font-semibold">
                    Deterministic Scenarios
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectScenario('vague_study');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-zinc-700 hover:bg-zinc-50 flex flex-col gap-0.5 active:scale-[0.98] cursor-pointer transition-colors"
                  >
                    <span className="font-semibold text-zinc-950 text-xs">Scenario A: Vague Study App</span>
                    <span className="text-[11px] text-zinc-500">
                      Unpacks vague idea & flags unverified assumptions.
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectScenario('contradictory_study');
                      setShowDemoMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-zinc-700 hover:bg-zinc-50 flex flex-col gap-0.5 border-t border-zinc-100 active:scale-[0.98] cursor-pointer transition-colors"
                  >
                    <span className="font-semibold text-zinc-950 text-xs">Scenario B: Contradictory Findings</span>
                    <span className="text-[11px] text-zinc-500">
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
              aria-label="Start new validation case"
              icon={<RotateCcw className="w-3.5 h-3.5 text-zinc-500" />}
              className="text-xs min-h-[36px]"
            >
              <span>New Case</span>
            </TactileButton>
          </div>
        </div>

        {/* Sleek Integrated Demo Mode Ribbon */}
        {isDemoMode && (
          <div className="border-t border-amber-200/80 bg-amber-50/80 px-4 lg:px-8 py-1.5 text-xs text-amber-950 animate-stage-enter">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-semibold tracking-wide uppercase text-[10px] text-amber-950 font-mono">
                  SAMPLE SCENARIO — NOT REAL RESEARCH
                </span>
                <span className="hidden md:inline text-amber-800/80 text-[11px]">
                  (Sample practice case showing how real testing works)
                </span>
              </div>
              <button
                type="button"
                onClick={onReset}
                aria-label="Exit demo scenario"
                className="text-amber-900 font-semibold underline hover:text-amber-950 text-[11px] ml-2 cursor-pointer active:scale-[0.97]"
              >
                Exit Demo
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Confirmation Modal */}
      {showResetConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-stage-enter"
        >
          <div className="bg-white border border-zinc-200/90 rounded-2xl max-w-md w-full p-6 shadow-premium-dropdown space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 id="reset-modal-title" className="font-semibold text-base text-zinc-950">
                  Start New Validation Case?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                aria-label="Close dialog"
                className="text-zinc-400 hover:text-zinc-950 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-600 leading-relaxed font-sans">
              This will start a fresh case and clear all your current problem notes, assumptions, and recorded findings.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
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
