import Link from 'next/link';
import { ReactNode } from 'react';

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalLayoutProps = {
  title: string;
  updated: string;
  intro?: ReactNode;
  sections: LegalSection[];
  currentPage: 'privacy' | 'terms';
};

function LegalNav({
  sections,
  currentPage,
}: {
  sections: LegalSection[];
  currentPage: 'privacy' | 'terms';
}) {
  const relatedLinks = [
    { href: '/privacy', label: 'Privacy Policy', key: 'privacy' as const },
    { href: '/terms', label: 'Terms of Use', key: 'terms' as const },
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-[#e3e8ef] bg-white/90 p-6 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f8a57]">
          On this page
        </p>
        <nav className="mt-4">
          <ul className="space-y-3">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-[#f2f7f3] hover:text-slate-900"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="rounded-3xl border border-[#e3e8ef] bg-white/90 p-6 shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Related legal pages
        </p>
        <div className="mt-4 space-y-2">
          {relatedLinks.map((link) => {
            const active = currentPage === link.key;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-[#eff8f1] text-[#236a43]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
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
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <LegalNav sections={sections} currentPage={currentPage} />
            </div>
          </aside>

          <main className="min-w-0">
            <div className="rounded-[2rem] border border-[#e3e8ef] bg-white/92 px-6 py-8 shadow-[0_14px_40px_rgba(15,23,42,0.05)] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              <header className="border-b border-[#e8edf2] pb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f8a57]">
                  ClearSlot Legal
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  {title}
                </h1>
                <p className="mt-4 text-sm font-medium text-slate-500">
                  Last updated: {updated}
                </p>
                {intro ? (
                  <div className="mt-6 max-w-3xl text-[1.03rem] leading-8 text-slate-600">
                    {intro}
                  </div>
                ) : null}
              </header>

              <div className="mt-8 lg:hidden">
                <LegalNav sections={sections} currentPage={currentPage} />
              </div>

              <div className="mt-10 space-y-12">
                {sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-28 border-t border-[#edf1f5] pt-10 first:border-t-0 first:pt-0"
                  >
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                      {section.title}
                    </h2>
                    <div className="mt-5 max-w-3xl space-y-5 text-[1.03rem] leading-8 text-slate-700">
                      {section.content}
                    </div>
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
