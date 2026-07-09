'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { BusyBlock } from '@/lib/calendar';
import BusyGrid from '../components/BusyGrid';

function getWeekDates(base: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(base, i));
}

export default function ManualPage() {
  const router = useRouter();
  const ran = useRef(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [weekBase, setWeekBase] = useState<Date | null>(null);
  const [blocks, setBlocks] = useState<BusyBlock[]>([]);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (sessionStorage.getItem('aligned_provider') !== 'manual') {
      router.replace('/connect');
      return;
    }
    const qRaw = sessionStorage.getItem('aligned_questionnaire');
    const q = qRaw ? JSON.parse(qRaw) : null;
    const start = q?.range?.start ?? format(new Date(), 'yyyy-MM-dd');
    const end = q?.range?.end ?? format(addDays(new Date(), 14), 'yyyy-MM-dd');
    setRangeStart(start);
    setRangeEnd(end);
    setWeekBase(startOfWeek(parseISO(start), { weekStartsOn: 1 }));
  }, [router]);

  if (!weekBase || !rangeStart || !rangeEnd) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#fff' }} />;
  }

  const weekDates = getWeekDates(weekBase);
  const rangeStartDate = new Date(rangeStart + 'T00:00:00');
  const rangeEndDate = new Date(rangeEnd + 'T23:59:59');

  const disabledDates = weekDates
    .filter(d => d < rangeStartDate || d > rangeEndDate)
    .map(d => format(d, 'yyyy-MM-dd'));

  const firstDayOfRange = startOfWeek(parseISO(rangeStart), { weekStartsOn: 1 });
  const atRangeStart = weekBase <= firstDayOfRange;
  const atRangeEnd = addDays(weekBase, 7) > rangeEndDate;

  const weekLabel = `${format(weekDates[0], 'MMM d')} – ${format(weekDates[6], 'MMM d, yyyy')}`;

  const handleContinue = () => {
    setLaunching(true);
    sessionStorage.setItem('aligned_manual_blocks', JSON.stringify(blocks));
    router.push('/connect?resume=1');
  };

  const blockCount = blocks.length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{
        padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, backgroundColor: '#FFFFFF', zIndex: 10,
        borderBottom: '1px solid #F3F4F6',
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#6B7280', padding: '6px 0', fontFamily: 'inherit' }}
        >
          ← Back
        </button>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#111111', margin: 0 }}>
          Mark your busy times
        </p>
        <button
          onClick={handleContinue}
          disabled={launching}
          style={{
            backgroundColor: '#22C55E', color: '#fff', border: 'none', borderRadius: 10,
            padding: '8px 16px', fontSize: 14, fontWeight: 600,
            cursor: launching ? 'default' : 'pointer', opacity: launching ? 0.7 : 1,
            fontFamily: 'inherit',
          }}
        >
          {launching ? 'Loading…' : 'Continue →'}
        </button>
      </div>

      {/* Scrollable grid */}
      <div style={{ padding: '20px 24px 140px', overflowX: 'auto' }}>
        <BusyGrid
          weekDates={weekDates}
          value={blocks}
          onChange={setBlocks}
          disabledDates={disabledDates}
          onPrevWeek={atRangeStart ? undefined : () => setWeekBase(w => addDays(w!, -7))}
          onNextWeek={atRangeEnd ? undefined : () => setWeekBase(w => addDays(w!, 7))}
          weekLabel={weekLabel}
        />
      </div>

      {/* Sticky bottom continue */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '16px 24px', backgroundColor: '#FFFFFF',
        borderTop: '1px solid #F3F4F6', boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
      }}>
        <button
          onClick={handleContinue}
          disabled={launching}
          style={{
            width: '100%', backgroundColor: '#22C55E', color: '#fff', border: 'none',
            borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 600,
            cursor: launching ? 'default' : 'pointer', opacity: launching ? 0.7 : 1,
            fontFamily: 'inherit',
          }}
        >
          {launching
            ? 'Loading…'
            : blockCount === 0
            ? "I'm free — Continue →"
            : `Continue with ${blockCount} busy block${blockCount !== 1 ? 's' : ''} →`}
        </button>
      </div>
    </div>
  );
}
