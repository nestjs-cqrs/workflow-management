# Specify Feature

## Usage
`/specify <brief-feature-description>`

## Process

### Step 1: Interview
Interview the user about the feature using AskUserQuestion. Cover:
- **What** — exact behavior, inputs, outputs, edge cases
- **Why** — business value, who benefits, what problem it solves
- **Constraints** — performance, security, compatibility, deadlines
- **UX** — user flow, error states, empty states, loading states
- **Technical** — which modules are affected, data model changes, API surface
- **Edge cases** — what happens when things go wrong, concurrent access, partial failures
- **Testing** — how do we verify this works, what are the acceptance criteria

Do not ask obvious questions. Dig into the hard parts the user might not have considered.
Keep interviewing until all ambiguity is resolved.

### Step 2: Write Spec
Write the complete spec to `docs/specs/SPEC-<feature-slug>.md`:

```markdown
# Feature: <name>

## Problem
<why this feature is needed>

## Solution
<what we are building>

## Acceptance Criteria
- [ ] <measurable criterion>
- [ ] ...

## Technical Design
### Affected Modules
### Data Model Changes
### API Changes
### Events

## Edge Cases
<each edge case and how it is handled>

## Test Plan
- Unit tests: <what to test>
- Integration tests: <what to test>
- E2E tests: <what to test>
```

### Step 3: Create Spec PR
After the user confirms the spec:

1. Create a feature slug from the spec name (lowercase, hyphenated)
2. Create branch: `git checkout -b spec/<feature-slug>`
3. Add only the spec file: `git add docs/specs/SPEC-<feature-slug>.md`
4. Commit: `git commit -m "spec: <feature-name>"`
5. Push: `git push -u origin spec/<feature-slug>`
6. Open PR:
   ```bash
   gh pr create \
     --title "Spec: <feature-name>" \
     --body "## Feature Spec: <feature-name>

   <1-2 sentence summary>

   **Spec file:** \`docs/specs/SPEC-<feature-slug>.md\`

   ## Review Checklist
   - [ ] Acceptance criteria are clear and testable
   - [ ] Technical design covers all affected modules
   - [ ] Edge cases are addressed
   - [ ] Test plan is complete

   ---
   Once this PR is merged, implementation can begin." \
     --base main \
     --head "spec/<feature-slug>"
   ```
7. Tell the user: "Spec PR created. Once approved and merged, implementation starts."

## Rules
- NEVER start implementing before the spec PR is merged
- The spec must be detailed enough that someone with no project context can implement it correctly
- Include acceptance criteria that can be turned into tests
- Only the spec file goes in the spec/ branch — no code changes
