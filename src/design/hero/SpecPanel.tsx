import type { ReactNode } from 'react'
import { Icon } from '../icons'
import { cx } from '../cx'

export interface SpecSection {
  heading: string
  items: ReactNode[]
}

export interface SpecPanelProps {
  /** Which work package implements this. */
  owner: string
  title: string
  sections: SpecSection[]
  className?: string
}

function Term({ children }: { children: ReactNode }) {
  return <strong className="text-ink">{children}</strong>
}

/**
 * The contract every hero visual ships with: a precise "Implementation
 * spec" that tells the implementing work package exactly what to build —
 * structure, tokens, states, copy, reduced-motion behaviour. Feature agents
 * read this panel; they do not invent design.
 */
export function SpecPanel({ owner, title, sections, className }: SpecPanelProps) {
  return (
    <aside
      className={cx(
        'rounded-xl border border-line-strong bg-surface-muted p-5 sm:p-6',
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
          <Icon name="settings" size={16} pixel />
          Implementation spec
        </h4>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-extrabold text-brand-700 dark:bg-brand-300/20 dark:text-brand-300">
          {owner}
        </span>
      </div>
      <h3 className="mb-4 text-lg font-extrabold text-ink">{title}</h3>
      <div className="flex flex-col gap-4">
        {sections.map((section) => (
          <section key={section.heading}>
            <p className="mb-1.5 text-sm font-extrabold text-ink">{section.heading}</p>
            <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-ink-soft">
              {section.items.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800 dark:bg-brand-300/10 dark:text-brand-300">
        <Icon name="info" size={16} />
        <span>
          Build with <Term>src/design</Term> tokens and primitives only — never invent a colour,
          spacing, or copy tone. The live demo above is the target.
        </span>
      </div>
    </aside>
  )
}
