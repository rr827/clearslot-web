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
    <div className="rounded-[1.75rem] border border-slate-100 bg-[#f7f8fb] p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
          On this page
        </p>
        <nav className="mt-3">
          <ul className="space-y-2.5">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block py-1 text-sm leading-6 text-slate-400 transition hover:text-slate-800"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
          Related legal pages
        </p>
        <div className="mt-3 space-y-1">
          {relatedLinks.map((link) => {
            const active = currentPage === link.key;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block py-1 text-sm transition ${
                  active
                    ? 'font-medium text-slate-900'
                    : 'text-slate-400 hover:text-slate-800'
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
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-18">
        <div className="grid gap-16 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="hidden lg:block">
            <div className="sticky top-24 pt-10">
              <LegalNav sections={sections} currentPage={currentPage} />
            </div>
          </aside>

          <main className="min-w-0">
            <div className="max-w-2xl">
              <header>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f8a57]">
                  ClearSlot Legal
                </div>
                <h1 className="mt-4 text-[42px] font-bold tracking-tight text-slate-950 sm:text-[42px]">
                  {title}
                </h1>
                <p className="mt-3 text-sm italic text-slate-400">
                  Last updated: {updated}
                </p>
                {intro ? (
                  <div className="mt-6 text-[1rem] leading-relaxed text-slate-500">
                    {intro}
                  </div>
                ) : null}
              </header>

              <div className="mt-10 lg:hidden">
                <LegalNav sections={sections} currentPage={currentPage} />
              </div>

              <div className="mt-14">
                {sections.map((section, index) => (
                  <div key={section.id}>
                    {index > 0 ? <hr className="my-10 border-slate-100" /> : null}
                    <section id={section.id} className="scroll-mt-24">
                      <h2 className="mb-4 text-xl font-semibold text-slate-900">
                        {section.title}
                      </h2>
                      <div className="max-w-2xl text-[1rem] leading-relaxed text-slate-600 [&_a]:font-medium [&_a]:text-slate-700 [&_a]:underline [&_a]:decoration-slate-200 [&_a]:underline-offset-4 [&_code]:rounded-full [&_code]:bg-slate-100 [&_code]:px-2 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-mono [&_code]:text-slate-700 [&_li]:text-slate-600 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                        {section.content}
                      </div>
                    </section>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
