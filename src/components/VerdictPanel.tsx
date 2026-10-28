import { Stage5Verdict, type Stage5VerdictProps } from './stages/Stage5Verdict.tsx';

export interface VerdictPanelProps extends Stage5VerdictProps {
  verdict: NonNullable<Stage5VerdictProps['verdict']>;
}
export const VerdictPanel = Stage5Verdict;
export default VerdictPanel;
