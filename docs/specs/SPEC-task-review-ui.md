# Feature: Task Review UI with Workflow Registry

## Problem

Approvers using the workflow-management UI can currently see a list of pending tasks and perform approve/reject actions inline on cards. However, the cards show minimal context — just a step number, role badge, and pipeline run ID. Approvers don't understand **what** they are approving because:

1. No dedicated review page exists — all actions happen on compact list cards
2. Workflow variables are shown as raw key-value pairs with no grouping, labeling, or markdown rendering
3. There's no approval/rejection history or step timeline visible from the task list
4. The UI is hardwired to one process ID naming convention with no support for multiple workflow types
5. The task list has no filtering or sorting — users see an unsorted flat list

## Solution

Build a **dedicated Task Review page** and a **backend Workflow Registry** so that approvers can navigate from a filterable/sortable task list into a full-context review page showing workflow variables (rendered with markdown), step-by-step node execution timeline, approval history, and rejection feedback — then take approve/reject actions with confidence.

### High-Level Changes

| Layer | What changes |
|-------|-------------|
| Backend — new module | `WorkflowRegistryModule` with config-driven workflow type metadata |
| Backend — new API | `GET /api/workflows/registry` — returns registered workflow configs |
| Backend — enhanced query | `GetPendingTasksQuery` returns enriched data (full node history, workflow metadata) |
| Backend — new query | `GetTaskReviewQuery` — returns all context needed for the review page |
| Frontend — new page | `TaskReviewPage` — dedicated approval review page with full context |
| Frontend — enhanced page | `PendingApprovalsPage` — add filters, sort, navigate to review page instead of inline actions |
| Frontend — new hook | `useWorkflowRegistry` — fetches and caches workflow registry |
| Frontend — new component | `MarkdownRenderer` — renders markdown in variable values |

## Acceptance Criteria

- [ ] **Workflow Registry** — backend module loads workflow type configs from a TypeScript config file and exposes them via `GET /api/workflows/registry`
- [ ] **Registry schema** — each workflow config includes: `processId`, `displayName`, `description`, `variableSchema` (field label, group, isMarkdown, isHidden), `stepLabels` (step number → human name), `approvalNodePattern` (regex)
- [ ] **Task list filtering** — users can filter pending tasks by workflow type (dropdown) and step number (dropdown)
- [ ] **Task list sorting** — users can sort by date (newest/oldest first) and workflow type
- [ ] **Task list cards** — cards show: workflow display name (from registry), step label (from registry), role badge, time waiting, key variable summary (from registry's highlighted fields)
- [ ] **Navigate to review** — clicking a task card (or "Review" button) navigates to `/approvals/:processId/:instanceId/review`
- [ ] **Review page — header** — shows workflow display name, step label, required role, time pending, workflow instance ID with copy button
- [ ] **Review page — variables** — displays workflow variables grouped by registry config, with human-readable labels; markdown-enabled fields rendered as markdown; hidden fields (internal keys) suppressed
- [ ] **Review page — timeline** — shows step-by-step execution history derived from node enter/exit times; each step shows: label (from registry or convention), status (completed/active/pending), duration, detail (approved, rejected with feedback, generating, etc.)
- [ ] **Review page — approval history** — within the timeline, completed approval steps show who approved/rejected and any feedback text from `stepXFeedback` variables
- [ ] **Review page — approve action** — "Approve" button with optional comment textarea; on success, navigates back to task list with success toast
- [ ] **Review page — reject action** — "Reject" button opens feedback textarea (required, min 10 chars); on success, navigates back to task list with success toast
- [ ] **Review page — loading/error/not-found states** — handled gracefully with appropriate UI
- [ ] **Role-filtered** — task list only shows tasks where user's Keycloak roles match the approval step's required role (existing behavior preserved)
- [ ] **Polling** — task list and review page poll every 15 seconds for updates
- [ ] **Convention fallback** — workflows not in the registry still render using existing convention-based detection (`WaitApprovalStep{N}_{ROLE}` pattern)
- [ ] **No inline actions** — remove approve/reject buttons from the task list cards; all actions happen on the review page
- [ ] **URL state** — filters and sort persist in URL search params so they survive page refresh

## Technical Design

### Affected Modules

| Module | Changes |
|--------|---------|
| `src/approval/` | Enhanced pending tasks query, new task review query |
| `src/workflow-registry/` | **New module** — workflow type configuration and API |
| `client/src/pages/` | Enhanced PendingApprovalsPage, new TaskReviewPage |
| `client/src/api/client.ts` | New types and API functions |
| `client/src/hooks/` | New `useWorkflowRegistry` hook |
| `client/src/components/` | New `MarkdownRenderer` component |
| `client/src/App.tsx` | New route for review page |

### Data Model Changes

**No database changes.** All data comes from Kogito GraphQL + the config-driven workflow registry.

#### Workflow Registry Config (TypeScript — `src/workflow-registry/workflow-registry.config.ts`)

```typescript
export interface VariableFieldConfig {
  key: string;            // variable key in Kogito (e.g., "projectId")
  label: string;          // display label (e.g., "Project")
  group: string;          // grouping key (e.g., "identity", "execution", "approval")
  isMarkdown?: boolean;   // render value as markdown
  isHidden?: boolean;     // suppress from UI
  isHighlighted?: boolean; // show on task list card summary
}

export interface WorkflowTypeConfig {
  processId: string;
  displayName: string;
  description: string;
  approvalNodePattern: string;  // regex string, e.g., "WaitApprovalStep(\\d+)_(\\w+)"
  variableSchema: VariableFieldConfig[];
  stepLabels: Record<number, string>;  // step number → human name
  variableGroups: Record<string, string>; // group key → display name
}
```

**Example config for AutoFlux:**

```typescript
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
    { key: 'planningRunId', label: 'Planning Run', group: 'identity', isHighlighted: true },
    { key: 'projectId', label: 'Project', group: 'identity', isHighlighted: true },
    { key: 'createdById', label: 'Created By', group: 'identity' },
    { key: 'brdObjectKey', label: 'BRD Document Path', group: 'context' },
    { key: 'stepNumber', label: 'Current Step', group: 'execution' },
    { key: 'stepStatus', label: 'Step Status', group: 'execution' },
    { key: 'stepOutputPath', label: 'Step Output Path', group: 'execution' },
    { key: 'requiredRole', label: 'Required Role', group: 'execution' },
    { key: 'rejectionFeedback', label: 'Last Rejection Feedback', group: 'feedback', isMarkdown: true },
    { key: 'step1Feedback', label: 'Step 1 Feedback', group: 'feedback', isMarkdown: true },
    { key: 'step2Feedback', label: 'Step 2 Feedback', group: 'feedback', isMarkdown: true },
    // ... step3-8 Feedback follow the same pattern
    { key: '__commandType', label: 'Initiated By', group: 'identity', isHidden: true },
    { key: 'genResult', label: 'Generation Result', group: 'execution', isHidden: true },
    { key: 'approvalResult', label: 'Approval Result', group: 'execution', isHidden: true },
  ],
}
```

### API Changes

#### New Endpoints

**`GET /api/workflows/registry`**

Returns all registered workflow type configs.

```json
{
  "workflows": [
    {
      "processId": "ProjectPlanningOrchestrator",
      "displayName": "Project Planning",
      "description": "AI-assisted project planning with multi-step approval",
      "approvalNodePattern": "WaitApprovalStep(\\d+)_(\\w+)",
      "stepLabels": { "1": "Requirements Analysis", "2": "Architecture Design", ... },
      "variableGroups": { "identity": "Identification", "context": "Planning Context", ... },
      "variableSchema": [ ... ]
    }
  ]
}
```

**`GET /api/approvals/:processInstanceId/review?processId=:processId`**

Returns full context for the task review page.

```json
{
  "task": {
    "processInstanceId": "abc-123",
    "processId": "ProjectPlanningOrchestrator",
    "currentState": "WaitApprovalStep3_PM",
    "requiredRole": "pm",
    "stepNumber": 3,
    "stepLabel": "API Specification",
    "variables": { ... },
    "startedAt": "2026-05-12T10:00:00Z"
  },
  "timeline": [
    {
      "stepNumber": 1,
      "label": "Requirements Analysis",
      "status": "completed",
      "enterTime": "2026-05-12T10:00:00Z",
      "exitTime": "2026-05-12T10:30:00Z",
      "durationMs": 1800000,
      "detail": "Approved",
      "feedback": null,
      "nodes": [
        { "name": "GenerateStep1", "type": "CallActivity", "enter": "...", "exit": "..." },
        { "name": "WaitApprovalStep1_PM", "type": "CatchEvent", "enter": "...", "exit": "..." }
      ]
    },
    {
      "stepNumber": 2,
      "label": "Architecture Design",
      "status": "completed",
      "enterTime": "...",
      "exitTime": "...",
      "durationMs": 2400000,
      "detail": "Rejected then approved",
      "feedback": "Missing security considerations",
      "nodes": [ ... ]
    },
    {
      "stepNumber": 3,
      "label": "API Specification",
      "status": "active",
      "enterTime": "...",
      "exitTime": null,
      "durationMs": null,
      "detail": "Waiting for PM approval",
      "feedback": null,
      "nodes": [ ... ]
    }
  ],
  "workflowConfig": {
    "processId": "ProjectPlanningOrchestrator",
    "displayName": "Project Planning",
    "variableSchema": [ ... ],
    "variableGroups": { ... },
    "stepLabels": { ... }
  }
}
```

#### Modified Endpoints

**`GET /api/approvals/pending`** — enhanced response

Add to `PendingTaskResponseDto`:

```typescript
// Existing fields preserved
processInstanceId: string;
processId: string;
currentState: string;
requiredRole: string;
variables: Record<string, unknown>;
startedAt: string;

// New fields
stepNumber: number;                      // parsed from node name
stepLabel: string;                       // from registry or "Step N" fallback
workflowDisplayName: string;             // from registry or processId fallback
highlightedVariables: Record<string, string>; // key→value for registry-configured highlighted fields
nodeCount: number;                       // total nodes in instance (indicates progress)
```

### Frontend Components

#### `TaskReviewPage` (`client/src/pages/TaskReviewPage.tsx`)

Route: `/approvals/:processId/:instanceId/review`

Layout (top to bottom):
1. **Breadcrumb** — `Pending Approvals > [Workflow Name] > Step [N]: [Label]`
2. **Header card** — workflow name, step label, role badge, time pending, instance ID (copyable)
3. **Variables card** — grouped by `variableGroups`, labeled by `variableSchema`, markdown rendered where `isMarkdown: true`, hidden where `isHidden: true`; unknown variables (not in schema) shown in an "Other" group as raw key-value
4. **Timeline card** — vertical step timeline identical to WorkflowDetailPage but enriched with step labels from registry and feedback text from `stepXFeedback` variables
5. **Action bar** (sticky bottom) — Approve button (primary), Reject button (destructive outline); clicking Reject reveals required feedback textarea above the bar

#### Enhanced `PendingApprovalsPage`

Changes:
- Remove inline approve/reject buttons and rejection textarea
- Add filter bar above task list: workflow type dropdown (from registry), step number dropdown, date sort toggle
- Task cards become clickable, navigating to `TaskReviewPage`
- Card shows: workflow display name, step label, role badge, time waiting, highlighted variable values
- Filters and sort persisted in URL search params (`?type=ProjectPlanningOrchestrator&step=3&sort=newest`)

#### `MarkdownRenderer` (`client/src/components/MarkdownRenderer.tsx`)

Lightweight markdown renderer for variable values. Uses `react-markdown` (new dependency) with:
- Prose styling via Tailwind typography plugin
- No HTML passthrough (sanitized)
- Supports: headings, bold, italic, lists, code blocks, links

### Events

No new events. Existing CloudEvent-based approval flow is unchanged — the `KogitoEventService` continues to publish `approval_decision` CloudEvents when approve/reject actions are taken.

## Edge Cases

| Edge case | Handling |
|-----------|----------|
| **Workflow not in registry** | Fall back to convention-based detection: parse `WaitApprovalStep{N}_{ROLE}` for step/role, show processId as workflow name, display all variables as flat key-value (no grouping) |
| **Task approved/rejected by another user while reviewing** | The review page polls every 15s. If the task is no longer in ACTIVE state or the approval node has exited, show an "already handled" banner and disable action buttons |
| **User lacks required role** | Should never happen (role-filtering prevents it), but if the API returns 403, show "You don't have permission to act on this task" |
| **Kogito GraphQL unavailable** | Both list and review pages show error state with retry button. Existing error handling in `KogitoApiService` surfaces the error |
| **Empty variables** | Show "No workflow data available" in the variables card |
| **Very long markdown content in variables** | Constrain max-height with "Show more" expand toggle to prevent review page from being dominated by one field |
| **Multiple active approval nodes on same instance** | Current logic takes the first `WaitApproval` node. Preserve this behavior — it maps to the current step's approval |
| **Registry config added for an already-running workflow** | Works immediately — registry config is read at query time, not at workflow start |
| **Filter returns zero results** | Show empty state with message: "No tasks match your filters" with a "Clear filters" button |

## Test Plan

### Unit Tests

**Backend:**
- `WorkflowRegistryService` — loads configs, returns by processId, returns null for unknown processId
- `GetPendingTasksHandler` — enriches response with step number, step label, workflow display name, highlighted variables
- `GetTaskReviewHandler` — builds timeline from node history, maps feedback from variables, falls back when no registry config
- `GetTaskReviewHandler` — returns not-found when instance doesn't exist or isn't active

**Frontend:**
- `MarkdownRenderer` — renders headings, lists, code blocks; strips HTML
- `useWorkflowRegistry` hook — caches registry, provides lookup by processId, handles loading/error
- Filter/sort logic — filters by workflow type, step number; sorts by date ascending/descending

### Integration Tests

**Backend:**
- `GET /api/workflows/registry` — returns registered configs with correct shape
- `GET /api/approvals/pending` — returns enriched DTOs with step labels and highlighted variables
- `GET /api/approvals/:id/review` — returns full timeline with node history and feedback
- `GET /api/approvals/:id/review` — returns 404 for non-existent instance
- `POST /api/approvals/:id/approve` — still works (existing test, regression check)
- `POST /api/approvals/:id/reject` — still works with feedback validation

### E2E Tests (Playwright)

| Scenario | What to verify |
|----------|---------------|
| Happy path — task list | Pending tasks appear with workflow name, step label, role badge; click navigates to review page |
| Happy path — review page | Variables displayed with correct labels and grouping; timeline shows step history; approve button works |
| Rejection flow | Reject button reveals textarea; submit disabled until 10+ chars; after reject, navigates back to list |
| Filtering | Select workflow type dropdown → list filters; select step number → list filters; clear filters → all shown |
| Sorting | Toggle sort → order changes (newest/oldest first) |
| Empty state | Mock empty response → "No tasks" message with filter state |
| Error state | Mock 500 → error message with retry button |
| Already handled | Mock task that resolves between list and review → "already handled" banner on review page |
| Loading state | Delay mock → spinner shown on both list and review pages |
| Convention fallback | Task from unknown workflow type → renders with processId as name, flat variables |
