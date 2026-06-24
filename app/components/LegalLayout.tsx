'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
  children?: { id: string; title: string }[];
};

type LegalLayoutProps = {
  title: string;
  updated: string;
  intro?: ReactNode;
  sections: LegalSection[];
  currentPage: 'privacy' | 'terms';
};

const proseClasses =
  'mt-5 max-w-3xl text-[15px] leading-7 text-slate-600 ' +
  '[&_p]:mb-6 [&_p:last-child]:mb-0 ' +
  '[&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-[11px] [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-[0.18em] [&_h3]:text-slate-400 [&_h3:first-child]:mt-0 ' +
  '[&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-5 [&_ul]:mb-6 [&_li]:text-slate-600 ' +
  '[&_a]:font-medium [&_a]:text-[#2F7B49] [&_a]:underline [&_a]:decoration-[#CFE3D5] [&_a]:underline-offset-4 [&_a:hover]:decoration-[#2F7B49] ' +
  '[&_code]:break-all [&_code]:rounded-md [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:font-mono [&_code]:text-slate-700';

function TocList({
  sections,
  showChildren,
}: {
  sections: LegalSection[];
  showChildren: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <ul className="space-y-5">
      {sections.map((section) => {
        const hasChildren = showChildren && section.children && section.children.length > 0;
        const isExpanded = expanded[section.id];

        return (
          <li key={section.id}>
            <div className="flex items-start gap-3">
              <a
                href={`#${section.id}`}
                className="min-w-0 flex-1 text-[15px] leading-6 text-slate-500 transition hover:text-slate-900"
              >
                {section.title}
              </a>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((current) => ({
                      ...current,
                      [section.id]: !current[section.id],
                    }))
                  }
                  className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={`${isExpanded ? 'Hide' : 'Show'} subsections for ${section.title}`}
                  aria-expanded={isExpanded ? 'true' : 'false'}
                >
                  <span
                    className="text-sm transition-transform duration-200"
                    style={{ transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)' }}
                  >
                    +
                  </span>
                </button>
              ) : null}
            </div>

            {hasChildren && isExpanded ? (
              <ul className="mt-3 space-y-2 border-l border-slate-100 pl-4">
                {section.children!.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`#${child.id}`}
                      className="block text-[13px] leading-5 text-slate-400 transition hover:text-slate-700"
                    >
                      {child.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function RelatedLinks({ currentPage }: { currentPage: 'privacy' | 'terms' }) {
  const relatedLinks = [
    { href: '/privacy', label: 'Privacy Policy', key: 'privacy' as const },
    { href: '/terms', label: 'Terms of Use', key: 'terms' as const },
  ];

  return (
    <ul className="space-y-3">
      {relatedLinks.map((link) => {
        const active = currentPage === link.key;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`block text-[15px] leading-6 transition ${
                active ? 'font-medium text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function LegalNav({
  sections,
  currentPage,
  showChildren,
}: {
  sections: LegalSection[];
  currentPage: 'privacy' | 'terms';
  showChildren: boolean;
}) {
  return (
    <nav className="space-y-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
          On this page
        </p>
        <div className="mt-5">
          <TocList sections={sections} showChildren={showChildren} />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-7">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
          Related legal pages
        </p>
        <div className="mt-5">
          <RelatedLinks currentPage={currentPage} />
        </div>
      </div>
    </nav>
  );
}

export default function LegalLayout({
  title,
  updated,
  intro,
  sections,
  currentPage,
}: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="px-8 pb-28 pt-10 sm:px-12 sm:pt-12 lg:pl-12 lg:pr-20">
        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="hidden lg:block lg:border-r lg:border-slate-100 lg:pr-12">
            <Link
              href="/"
              className="block text-sm font-medium text-slate-400 transition hover:text-slate-700"
            >
              ← ClearSlot
            </Link>
            <div className="mt-10">
              <LegalNav sections={sections} currentPage={currentPage} showChildren />
            </div>
          </aside>

          <main className="min-w-0 lg:pl-12">
            <div className="no-scrollbar max-w-3xl lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
              <Link
                href="/"
                className="text-sm font-medium text-slate-400 transition hover:text-slate-700 lg:hidden"
              >
                ← ClearSlot
              </Link>

              <header className="mt-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2F7B49]">
                  ClearSlot Legal
                </p>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 sm:text-[2.75rem]">
                  {title}
                </h1>
                <p className="mt-4 text-sm text-slate-400">Last updated {updated}</p>
                {intro ? (
                  <div className="mt-6 max-w-3xl text-base leading-7 text-slate-500">{intro}</div>
                ) : null}
              </header>

              <details className="mt-10 rounded-xl border border-slate-100 px-4 py-3 lg:hidden">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  Contents
                </summary>
                <div className="mt-4">
                  <LegalNav sections={sections} currentPage={currentPage} showChildren={false} />
                </div>
              </details>

              <div className="mt-16 divide-y divide-slate-100">
                {sections.map((section) => (
                  <section key={section.id} id={section.id} className="py-12 first:pt-0 scroll-mt-28">
                    <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                    <div className={proseClasses}>{section.content}</div>
                  </section>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
