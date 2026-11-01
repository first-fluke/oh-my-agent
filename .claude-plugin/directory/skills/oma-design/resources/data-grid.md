# Data Grids

Use for admin panels, internal tools, and SaaS screens built around a data
table or grid. Pass these rules to the selected supplier with the brief. They
are OMA's floor for grids; a project design system's documented table rules
win where they differ.

## Alignment

- Numbers (amounts, counts, quantities, percentages, durations) align right,
  use `font-variant-numeric: tabular-nums`, and keep one precision per column.
  Put the unit in the header, not in every cell.
- Variable-length text (names, titles, sentences, addresses) aligns left.
- Center only fixed-width values: status badges, icons, checkboxes, booleans,
  and codes of identical length.
- Each header aligns with its column's content; a numeric column's header
  aligns right. Header typography is identical across columns.
- Dates, times, and IDs keep one format per column.

## Filters

- Common filters sit in one toolbar line directly above the grid: search, the
  two or three filters people use most, and actions on the grid. Do not wrap
  them in a bordered panel with its own heading.
- Advanced search folds behind a "More filters" control that expands inline or
  opens a side sheet, not a modal.
- Active filters appear as removable chips in the toolbar, with one clear-all.
  The result count and bulk actions stay in the same line or the grid header.

## Rows

- One line of data per row. Do not stack a bold primary value over a smaller
  secondary line; give secondary information its own column, a tooltip, or the
  row's detail view.
- At most one identity column may pair a name with one muted line (an email
  or handle) when nothing else tells similar rows apart.
- Truncate long text with an ellipsis and expose the full value on hover and
  keyboard focus; rows do not wrap.
- One row height per density setting across the grid (about 32px compact,
  40px default, 48px comfortable).
- Keep the header sticky, show the sort direction on the sorted column, use
  skeleton rows while loading, and give the empty state a way to clear filters.

## Check with real data

Review the grid with the longest real values, the largest and negative
numbers, and many rows, at the narrowest supported width. A grid that scrolls
horizontally pins its identity column.
