import { Component, type ReactNode } from 'react';
import ErrorPage from './ErrorPage';
import { report } from '../lib/errors';

interface State { error: Error | null }

/**
 * Catches render errors and shows the error page right away. There is no silent re-mounting or auto-retry:
 * the visitor presses "Try again" themselves. The real error is written to the browser console and sent to the
 * server log (Admin > Logs) so the cause can be found.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode; full?: boolean }, State> {
  state: State = { error: null };
  private retried = false;

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info?: { componentStack?: string | null }) {
    console.error('[render error]', error, info?.componentStack);
    const where = String(info?.componentStack ?? '').trim().split('\n')[0]?.trim().slice(0, 100);
    report('Render', new Error(`${String(error?.message ?? 'Unknown render error').slice(0, 180)}${where ? ` @ ${where}` : ''}`), 'render');
  }

  render() {
    // The real error text is shown (short) so a crash can be diagnosed from a screenshot. "Try again" first re-renders
    // the page in place and only falls back to a full reload if the same error comes straight back.
    if (this.state.error) {
      const detail = String(this.state.error?.message ?? '').slice(0, 300);
      return <ErrorPage code="500" full={this.props.full} detail={detail} onRetry={() => { if (this.retried) window.location.reload(); else { this.retried = true; this.setState({ error: null }); } }} />;
    }
    return this.props.children;
  }
}
