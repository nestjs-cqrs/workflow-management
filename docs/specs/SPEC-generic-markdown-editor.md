# Feature: Generic Markdown File Editor

## Problem

When reviewing workflow steps, users see a `.md` file path (e.g., `planning-runs/.../step-1.md`) but have no way to edit the content. Changes require direct S3/MinIO access. There is no version history, so edits are destructive and unauditable. This slows down iterative review workflows where reviewers need to annotate, correct, or refine step outputs before approving.

## Solution

A generic, reusable markdown editor component that can be attached to any `.md` file path in the UI. When a user clicks the edit button next to a `.md` path, a large modal opens with a TipTap WYSIWYG editor showing the file content. Saves create new versions via MinIO native bucket versioning. A version history panel lets users browse past versions and restore them into the editor.

The component is **not** tied to any specific workflow, step, or process concept. It receives a file path and an optional required role, and handles everything else.

## Acceptance Criteria

- [ ] An edit button (pencil icon) appears next to any `.md` file path rendered in the UI
- [ ] Clicking the edit button opens a large modal (80% viewport) with the file content loaded in a TipTap WYSIWYG editor
- [ ] The editor supports standard markdown: headings, bold, italic, lists, code blocks, tables, links, blockquotes
- [ ] Users can save edits, which creates a new version in MinIO (native bucket versioning)
- [ ] Optimistic locking: if the file was modified by someone else since it was loaded, save returns 409 Conflict with a user-friendly message and option to reload
- [ ] A "History" tab/panel in the modal shows past versions with timestamps
- [ ] Clicking a past version loads its content into the editor (user must explicitly save to restore)
- [ ] The edit button is conditionally shown based on a `requiredRole` prop — if the current user's role doesn't match, the button is hidden
- [ ] The editor gracefully handles: loading state, save errors, empty files, and files that no longer exist
- [ ] The component is generic and reusable — it accepts `filePath: string` and `requiredRole?: string` props, nothing else

## Technical Design

### Affected Modules

| Module | Changes |
|--------|---------|
| `src/approval` (backend) | Add PUT endpoint, version listing endpoint, enable MinIO bucket versioning |
| `client/src/components` (frontend) | New `MarkdownEditorModal` component, new `MarkdownEditButton` component |
| `client/package.json` | Add TipTap dependencies |

### Backend API Changes

#### 1. Enable MinIO Bucket Versioning

On application startup, `MinioStorageService.onModuleInit()` calls `setBucketVersioning(bucket, { Status: 'Enabled' })` to enable native versioning on the configured bucket. This is idempotent.

#### 2. `PUT /api/files/:path(*)` — Save File

Updates a markdown file in MinIO. Creates a new version automatically (MinIO native versioning).

**Request:**

```
PUT /api/files/planning-runs/56e169a9-.../step-1.md
Content-Type: application/json
If-Match: "etag-from-get-response"

{
  "content": "# Updated markdown content\n\nBody here..."
}
```

**Response (200):**

```json
{
  "path": "planning-runs/56e169a9-.../step-1.md",
  "versionId": "minio-version-id",
  "etag": "new-etag",
  "lastModified": "2026-05-14T10:30:00Z"
}
```

**Error Responses:**

| Status | Condition |
|--------|-----------|
| 400 | Empty content or invalid path |
| 401 | Not authenticated |
| 403 | User role doesn't match required role (passed as query param `?requiredRole=pm`) |
| 404 | Bucket or path prefix doesn't exist |
| 409 | `If-Match` header doesn't match current ETag (concurrent edit detected) |

#### 3. `GET /api/files/:path(*)` — Get File Content

Fetches the current version of a file. Returns content + ETag for optimistic locking.

**Response (200):**

```json
{
  "content": "# Markdown content here...",
  "etag": "current-etag",
  "versionId": "current-version-id",
  "lastModified": "2026-05-14T10:00:00Z"
}
```

#### 4. `GET /api/files/:path(*)/versions` — List File Versions

Returns version history for a file, ordered newest first.

**Response (200):**

```json
{
  "versions": [
    {
      "versionId": "v3",
      "lastModified": "2026-05-14T10:30:00Z",
      "size": 2048,
      "isLatest": true
    },
    {
      "versionId": "v2",
      "lastModified": "2026-05-14T09:15:00Z",
      "size": 1856,
      "isLatest": false
    }
  ]
}
```

#### 5. `GET /api/files/:path(*)/versions/:versionId` — Get Specific Version

Fetches content of a specific version.

**Response (200):**

```json
{
  "content": "# Old markdown content...",
  "versionId": "v2",
  "lastModified": "2026-05-14T09:15:00Z"
}
```

### Backend Implementation

#### New `FilesController`

A new controller (`src/approval/controllers/files.controller.ts`) handles all file endpoints. Uses CQRS — dispatches to `GetFileQuery`, `SaveFileCommand`, `GetFileVersionsQuery`, `GetFileVersionQuery`.

#### MinioStorageService Extensions

Add methods to the existing service:

- `putObject(key: string, content: string): Promise<{ versionId: string; etag: string }>` — upload with UTF-8 encoding
- `getObjectWithMeta(key: string): Promise<{ content: string; etag: string; versionId: string; lastModified: Date }>` — fetch content + metadata
- `listObjectVersions(key: string): Promise<VersionInfo[]>` — list all versions of an object
- `getObjectVersion(key: string, versionId: string): Promise<{ content: string; versionId: string; lastModified: Date }>` — fetch specific version
- `enableBucketVersioning(): Promise<void>` — called once on startup

#### Optimistic Locking Flow

1. `GET /api/files/:path` returns the current `etag` in the response body
2. Frontend stores the `etag` when loading
3. `PUT /api/files/:path` requires `If-Match` header with the stored etag
4. Backend calls `statObject(key)` before writing — if the current ETag differs from `If-Match`, return 409
5. On 409, frontend shows: "This file was modified by someone else. Reload to see the latest version?"

#### Authorization

The `PUT` endpoint accepts an optional `requiredRole` query parameter. The endpoint checks the authenticated user's roles (from JWT/session) against this value. If the user lacks the role, return 403.

### Frontend Implementation

#### New Dependencies

```
@tiptap/react
@tiptap/starter-kit
@tiptap/extension-placeholder
@tiptap/extension-table
@tiptap/extension-link
@tiptap/extension-code-block
```

#### Component: `MarkdownEditButton`

```typescript
interface MarkdownEditButtonProps {
  filePath: string;
  requiredRole?: string;
}
```

- Small pencil icon button (using Lucide `Pencil` icon)
- Conditionally rendered: hidden if `requiredRole` is set and current user's role doesn't match (check via `useAuth()` hook)
- On click: opens `MarkdownEditorModal`

**Usage anywhere in the app:**

```tsx
<span className="font-mono text-sm">{stepOutputPath}</span>
<MarkdownEditButton filePath={stepOutputPath} requiredRole="pm" />
```

#### Component: `MarkdownEditorModal`

Large modal (80vw x 80vh) with two tabs:

**Editor Tab:**
- TipTap WYSIWYG editor filling the modal body
- Toolbar at top: bold, italic, headings (H1-H3), bullet list, ordered list, code block, table, link, blockquote
- "Save" button in modal footer — disabled while saving, shows spinner
- "Cancel" button — if unsaved changes exist, confirm before closing ("You have unsaved changes. Discard?")

**History Tab:**
- Scrollable list of past versions
- Each entry shows: relative timestamp (e.g., "2 hours ago"), version ID (truncated), file size
- Click a version → fetches that version's content → switches to Editor tab with content loaded
- Info banner: "Viewing version from {date}. Click Save to restore this version."

**States:**

| State | UI |
|-------|-----|
| Loading | Centered spinner in modal body |
| Loaded | Editor with content, toolbar, save/cancel buttons |
| Saving | Save button disabled with spinner, editor read-only |
| Save success | Toast notification "File saved", modal stays open, etag updated |
| Conflict (409) | Alert dialog: "File was modified by someone else. Reload?" with Reload/Cancel buttons |
| Error | Toast notification with error message, editor remains editable |
| Empty file | Editor with empty state, placeholder text "Start writing..." |
| File not found | Error message in modal body, no editor |
| Unsaved + close | Confirm dialog: "You have unsaved changes. Discard?" |

**Data fetching (TanStack Query):**

```typescript
// Fetch file content
useQuery({
  queryKey: ['files', filePath],
  queryFn: () => api.get(`/files/${filePath}`),
  enabled: isOpen,
});

// Fetch version history
useQuery({
  queryKey: ['files', filePath, 'versions'],
  queryFn: () => api.get(`/files/${filePath}/versions`),
  enabled: isOpen && activeTab === 'history',
});

// Save mutation
useMutation({
  mutationFn: ({ content, etag }) =>
    api.put(`/files/${filePath}`, { content }, {
      headers: { 'If-Match': etag },
    }),
  onSuccess: (data) => {
    // Update stored etag
    // Invalidate file query
    // Show success toast
  },
  onError: (error) => {
    if (error.status === 409) { /* show conflict dialog */ }
  },
});
```

### Integration Points

#### TaskReviewPage

In the "Workflow Data" section where `stepOutputPath` is displayed, add `MarkdownEditButton` next to the path value. The `requiredRole` comes from the task's `requiredRole` variable (already available in the page data).

#### ArtifactSection

Optionally add the edit button in the `ArtifactSection` header, next to the collapse toggle. This lets users edit from the rendered preview too.

#### Any Future Use

Any component that displays a `.md` path can add `<MarkdownEditButton filePath={path} />` — no other integration needed.

## Edge Cases

| Edge Case | Handling |
|-----------|----------|
| User edits while another user saves | Optimistic locking: 409 on save, user prompted to reload |
| File deleted between load and save | 404 on save, show error "File no longer exists" |
| Very large markdown file (>1MB) | TipTap handles large documents well; no special handling needed. MinIO has no practical size limit for text. |
| User navigates away with unsaved changes | `beforeunload` event + modal close confirmation |
| MinIO unavailable | Existing error handling in MinioStorageService logs warning; API returns 503 |
| Empty file (0 bytes) | Editor loads with placeholder "Start writing..." |
| Non-markdown file at .md path | Render as-is — TipTap will display raw text if it can't parse markdown |
| Bucket versioning not yet enabled | `enableBucketVersioning()` runs on startup; if it fails, log error but don't crash — versions list returns empty |
| User without required role clicks edit area | Button is hidden entirely, not disabled — no affordance shown |
| Save with identical content | MinIO still creates a new version (expected behavior with native versioning) |
| Network timeout during save | Mutation error handler shows toast "Save failed. Your changes are preserved in the editor. Try again." |

## Test Plan

### Unit Tests (Jest — Backend)

- `MinioStorageService.putObject`: verify it calls `client.putObject` with correct args and returns versionId/etag
- `MinioStorageService.getObjectWithMeta`: verify content + metadata extraction
- `MinioStorageService.listObjectVersions`: verify version list parsing and sort order
- `SaveFileHandler`: verify 409 when etag mismatch, 403 when role mismatch, 200 on success
- `GetFileHandler`: verify content + etag returned, 404 on missing file
- `GetFileVersionsHandler`: verify version list returned, empty list when no versions

### Unit Tests (Vitest — Frontend)

- `MarkdownEditButton`: renders when user has required role, hidden when not, opens modal on click
- `MarkdownEditorModal`: renders editor with loaded content, shows loading state, shows error state
- `MarkdownEditorModal` save flow: calls PUT with correct etag, updates etag on success, shows conflict dialog on 409
- `MarkdownEditorModal` history tab: renders version list, clicking version loads content into editor, shows restore banner
- `MarkdownEditorModal` unsaved changes: confirm dialog on close, no dialog if no changes
- Toolbar actions: bold, italic, headings, lists, code blocks render correctly

### Integration Tests (Jest + Supertest — Backend)

- `PUT /api/files/:path` with valid content → 200, new version created in MinIO
- `PUT /api/files/:path` with stale etag → 409 Conflict
- `PUT /api/files/:path` without auth → 401
- `PUT /api/files/:path` with wrong role → 403
- `GET /api/files/:path` → 200 with content and etag
- `GET /api/files/:path` for missing file → 404
- `GET /api/files/:path/versions` → list of versions sorted newest first
- `GET /api/files/:path/versions/:versionId` → specific version content

### E2E Tests (Playwright — Frontend)

- **Happy path**: Click edit button → editor loads → type content → save → success toast → close → reopen → new content shown
- **Conflict**: Load editor → mock 409 on save → conflict dialog shown → reload loads new content
- **Version history**: Open editor → switch to History tab → version list shown → click version → content loaded in editor → save restores it
- **Unsaved changes**: Open editor → type content → click cancel → confirm dialog shown → confirm discard → modal closes
- **Permission**: Render edit button with `requiredRole="pm"` → mock user without `pm` role → button not in DOM
- **Error**: Mock 500 on save → error toast shown → editor still editable
- **Empty file**: Mock empty content → editor shows placeholder
- **Loading**: Delay API response → loading spinner shown
