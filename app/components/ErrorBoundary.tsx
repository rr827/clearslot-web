'use client';
import { Component, ReactNode } from 'react';

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('[clearslot] client error:', error); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', color: '#111111', fontFamily: 'Inter, system-ui, sans-serif', gap: 16 }}>
          <p style={{ fontSize: 18, color: '#6B7280' }}>Something went wrong.</p>
          <a href="/" style={{ fontSize: 14, color: '#22C55E', textDecoration: 'none' }}>Go home →</a>
        </div>
      );
    }
    return this.props.children;
  }
}
