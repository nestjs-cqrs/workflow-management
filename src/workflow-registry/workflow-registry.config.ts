export interface VariableFieldConfig {
  key: string;
  label: string;
  group: string;
  isMarkdown?: boolean;
  isHidden?: boolean;
  isHighlighted?: boolean;
}

export interface WorkflowTypeConfig {
  processId: string;
  displayName: string;
  description: string;
  approvalNodePattern: string;
  variableSchema: VariableFieldConfig[];
  stepLabels: Record<number, string>;
  variableGroups: Record<string, string>;
}

export const WORKFLOW_REGISTRY: WorkflowTypeConfig[] = [
  {
    processId: 'ProjectPlanningOrchestrator',
    displayName: 'Project Planning',
    description: 'AI-assisted project planning with multi-step approval',
    approvalNodePattern: 'WaitApprovalStep(\\d+)_(\\w+)',
    stepLabels: {
      1: 'Requirements Analysis',
      2: 'Architecture Design',
      3: 'API Specification',
      4: 'Data Model',
      5: 'Implementation Plan',
      6: 'Test Strategy',
      7: 'Deployment Plan',
      8: 'Final Review',
    },
    variableGroups: {
      identity: 'Identification',
      context: 'Planning Context',
      execution: 'Execution State',
      feedback: 'Feedback & History',
    },
    variableSchema: [
      {
        key: 'planningRunId',
        label: 'Planning Run',
        group: 'identity',
        isHighlighted: true,
      },
      {
        key: 'projectId',
        label: 'Project',
        group: 'identity',
        isHighlighted: true,
      },
      { key: 'createdById', label: 'Created By', group: 'identity' },
      { key: 'brdObjectKey', label: 'BRD Document Path', group: 'context' },
      { key: 'stepNumber', label: 'Current Step', group: 'execution' },
      { key: 'stepStatus', label: 'Step Status', group: 'execution' },
      { key: 'stepOutputPath', label: 'Step Output Path', group: 'execution' },
      { key: 'requiredRole', label: 'Required Role', group: 'execution' },
      {
        key: 'rejectionFeedback',
        label: 'Last Rejection Feedback',
        group: 'feedback',
        isMarkdown: true,
      },
      {
        key: 'step1Feedback',
        label: 'Step 1 Feedback',
        group: 'feedback',
        isMarkdown: true,
      },
      {
        key: 'step2Feedback',
        label: 'Step 2 Feedback',
        group: 'feedback',
        isMarkdown: true,
      },
      {
        key: 'step3Feedback',
        label: 'Step 3 Feedback',
        group: 'feedback',
        isMarkdown: true,
      },
      {
        key: 'step4Feedback',
        label: 'Step 4 Feedback',
        group: 'feedback',
        isMarkdown: true,
      },
      {
        key: 'step5Feedback',
        label: 'Step 5 Feedback',
        group: 'feedback',
        isMarkdown: true,
      },
      {
        key: 'step6Feedback',
        label: 'Step 6 Feedback',
        group: 'feedback',
        isMarkdown: true,
      },
      {
        key: 'step7Feedback',
        label: 'Step 7 Feedback',
        group: 'feedback',
        isMarkdown: true,
      },
      {
        key: 'step8Feedback',
        label: 'Step 8 Feedback',
        group: 'feedback',
        isMarkdown: true,
      },
      {
        key: '__commandType',
        label: 'Initiated By',
        group: 'identity',
        isHidden: true,
      },
      {
        key: 'genResult',
        label: 'Generation Result',
        group: 'execution',
        isHidden: true,
      },
      {
        key: 'approvalResult',
        label: 'Approval Result',
        group: 'execution',
        isHidden: true,
      },
    ],
  },
];
