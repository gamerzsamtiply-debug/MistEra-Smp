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

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error) {
    console.error('[render error]', error);
    report('Render', new Error(String(error?.message ?? 'Unknown render error').slice(0, 300)), 'render');
  }

  render() {
    if (this.state.error) return <ErrorPage code="500" full={this.props.full} onRetry={() => window.location.reload()} />;
    return this.props.children;
  }
}
