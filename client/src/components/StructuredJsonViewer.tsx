import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'

function snakeCaseToTitle(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const BADGE_VARIANTS: Record<string, 'destructive' | 'warning' | 'success' | 'secondary'> = {
  high: 'destructive',
  critical: 'destructive',
  medium: 'warning',
  'in progress': 'warning',
  low: 'success',
  completed: 'success',
  yes: 'success',
  true: 'success',
  active: 'success',
  enabled: 'success',
  defined: 'secondary',
  no: 'secondary',
  false: 'secondary',
  pending: 'secondary',
  tbd: 'secondary',
  'to be determined': 'secondary',
  'rom estimate': 'secondary',
}

function getBadgeVariant(value: string): 'destructive' | 'warning' | 'success' | 'secondary' | null {
  if (value.length > 30 || value.split(' ').length > 4) return null
  return BADGE_VARIANTS[value.toLowerCase()] ?? null
}

function isLongText(value: string): boolean {
  return value.length > 120 || value.includes('\n')
}

function isUniformObjectArray(
  arr: unknown[],
): { items: Record<string, unknown>[]; columns: string[] } | null {
  if (arr.length === 0) return null
  const objects = arr.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  )
  if (objects.length !== arr.length) return null

  const allKeys = new Set<string>()
  const keySets = objects.map((obj) => {
    const keys = Object.keys(obj)
    keys.forEach((k) => allKeys.add(k))
    return new Set(keys)
  })

  const columnArray = Array.from(allKeys)
  const threshold = columnArray.length * 0.6
  const isUniform = keySets.every(
    (ks) => columnArray.filter((k) => ks.has(k)).length >= threshold,
  )
  if (!isUniform) return null

  return { items: objects, columns: columnArray }
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>
  }
  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'success' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>
  }
  if (typeof value === 'number') {
    return <span className="font-mono text-xs">{value.toLocaleString()}</span>
  }
  if (typeof value === 'string') {
    const badgeVariant = getBadgeVariant(value)
    if (badgeVariant) {
      return <Badge variant={badgeVariant}>{value}</Badge>
    }
    if (isLongText(value)) {
      return <p className="whitespace-pre-wrap text-sm">{value}</p>
    }
    return <span className="text-sm">{value}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>
    if (value.every((v) => typeof v === 'string')) {
      return (
        <ul className="list-inside list-disc space-y-0.5 text-sm">
          {value.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    }
    return <span className="font-mono text-xs">{JSON.stringify(value)}</span>
  }
  if (typeof value === 'object') {
    return <span className="font-mono text-xs">{JSON.stringify(value)}</span>
  }
  return <span className="text-sm">{String(value)}</span>
}

function ArrayTable({
  items,
  columns,
}: {
  items: Record<string, unknown>[]
  columns: string[]
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? items : items.slice(0, 20)

  return (
    <div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="border-b bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                  {snakeCaseToTitle(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={i} className="border-b last:border-b-0">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 align-top">
                    <PrimitiveValue value={row[col]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length > 20 && !showAll && (
        <button
          className="mt-1 text-xs text-primary hover:underline"
          onClick={() => setShowAll(true)}
        >
          Show all {items.length} items
        </button>
      )}
    </div>
  )
}

function ArrayCards({ items }: { items: Record<string, unknown>[] }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? items : items.slice(0, 10)

  return (
    <div className="space-y-2">
      {visible.map((item, i) => (
        <div key={i} className="rounded-md border px-4 py-3">
          <div className="space-y-1.5">
            {Object.entries(item).map(([key, val]) => (
              <div key={key} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 text-muted-foreground">
                  {snakeCaseToTitle(key)}
                </span>
                <div className="text-right ml-auto">
                  <PrimitiveValue value={val} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length > 10 && !showAll && (
        <button
          className="text-xs text-primary hover:underline"
          onClick={() => setShowAll(true)}
        >
          Show all {items.length} items
        </button>
      )}
    </div>
  )
}

function MetadataStrip({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{snakeCaseToTitle(key)}:</span>
          <span className="font-medium text-foreground">
            {val === null || val === undefined ? '—' : String(val)}
          </span>
        </div>
      ))}
    </div>
  )
}

function JsonSection({
  title,
  data,
  depth,
  defaultCollapsed,
}: {
  title: string
  data: Record<string, unknown>
  depth: number
  defaultCollapsed?: boolean
}) {
  const shouldCollapse =
    defaultCollapsed ??
    (depth >= 2 || (depth >= 1 && Object.keys(data).length > 5))
  const [collapsed, setCollapsed] = useState(shouldCollapse)

  const entries = Object.entries(data)
  if (entries.length === 0) {
    return (
      <div className="mb-3">
        <SectionHeader title={title} depth={depth} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        {!collapsed && <p className="pl-6 text-sm text-muted-foreground">No data</p>}
      </div>
    )
  }

  return (
    <div className={depth === 0 ? 'mb-4' : 'mb-3'}>
      <SectionHeader title={title} depth={depth} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      {!collapsed && (
        <div className={depth > 0 ? 'pl-6' : ''}>
          <div className="space-y-3">
            {entries.map(([key, value]) => (
              <JsonEntry key={key} entryKey={key} value={value} depth={depth} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({
  title,
  depth,
  collapsed,
  onToggle,
}: {
  title: string
  depth: number
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <button
      className="flex w-full items-center gap-2 text-left"
      onClick={onToggle}
    >
      {collapsed ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      {depth === 0 ? (
        <h3 className="text-sm font-semibold">{snakeCaseToTitle(title)}</h3>
      ) : (
        <h4 className="text-sm font-medium text-muted-foreground">
          {snakeCaseToTitle(title)}
        </h4>
      )}
    </button>
  )
}

function JsonEntry({
  entryKey,
  value,
  depth,
}: {
  entryKey: string
  value: unknown
  depth: number
}) {
  if (value === null || value === undefined) return null

  if (Array.isArray(value)) {
    if (value.length === 0) return null

    if (value.every((v) => typeof v === 'string')) {
      return (
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            {snakeCaseToTitle(entryKey)}
          </span>
          <div className="mt-1">
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {value.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )
    }

    const uniform = isUniformObjectArray(value)
    if (uniform) {
      return (
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            {snakeCaseToTitle(entryKey)}
          </span>
          <div className="mt-1">
            <ArrayTable items={uniform.items} columns={uniform.columns} />
          </div>
        </div>
      )
    }

    const objectItems = value.filter(
      (v): v is Record<string, unknown> =>
        typeof v === 'object' && v !== null && !Array.isArray(v),
    )
    if (objectItems.length === value.length) {
      return (
        <div>
          <span className="text-xs font-medium text-muted-foreground">
            {snakeCaseToTitle(entryKey)}
          </span>
          <div className="mt-1">
            <ArrayCards items={objectItems} />
          </div>
        </div>
      )
    }

    return (
      <div>
        <span className="text-xs font-medium text-muted-foreground">
          {snakeCaseToTitle(entryKey)}
        </span>
        <div className="mt-1">
          <PrimitiveValue value={value} />
        </div>
      </div>
    )
  }

  if (typeof value === 'object') {
    return (
      <JsonSection
        title={entryKey}
        data={value as Record<string, unknown>}
        depth={depth + 1}
      />
    )
  }

  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">
        {snakeCaseToTitle(entryKey)}
      </span>
      <div className="ml-auto text-right">
        <PrimitiveValue value={value} />
      </div>
    </div>
  )
}

interface StructuredJsonViewerProps {
  data: Record<string, unknown>
  maxHeight?: number
}

export function StructuredJsonViewer({
  data,
  maxHeight,
}: StructuredJsonViewerProps) {
  const [expanded, setExpanded] = useState(false)

  const { title, content } = useMemo(() => {
    const keys = Object.keys(data)
    if (
      keys.length === 1 &&
      typeof data[keys[0]] === 'object' &&
      data[keys[0]] !== null &&
      !Array.isArray(data[keys[0]])
    ) {
      return {
        title: keys[0],
        content: data[keys[0]] as Record<string, unknown>,
      }
    }
    return { title: null, content: data }
  }, [data])

  const metadata =
    typeof content['metadata'] === 'object' &&
    content['metadata'] !== null &&
    !Array.isArray(content['metadata'])
      ? (content['metadata'] as Record<string, unknown>)
      : null

  const entries = Object.entries(content).filter(
    ([key]) => key !== 'metadata',
  )

  return (
    <div className="relative">
      <div
        className="overflow-hidden"
        style={!expanded && maxHeight ? { maxHeight } : undefined}
      >
        {title && (
          <h2 className="mb-3 text-base font-semibold">
            {snakeCaseToTitle(title)}
          </h2>
        )}
        {metadata && <MetadataStrip data={metadata} />}
        <div className="space-y-1">
          {entries.map(([key, value]) => (
            <JsonEntry key={key} entryKey={key} value={value} depth={0} />
          ))}
        </div>
      </div>
      {maxHeight && (
        <button
          className="mt-1 text-xs text-primary hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
