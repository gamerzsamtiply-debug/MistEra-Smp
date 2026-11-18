import { Component, Fragment, type ReactNode } from 'react';
import ErrorPage from './ErrorPage';
import { Spinner } from './States';
import { report } from '../lib/errors';

const MAX_AUTO_RETRIES = 5;

interface State { failed: boolean; attempt: number; nonce: number }

/**
 * Catches render errors. Instead of showing the error page straight away it silently re-mounts the failed part
 * up to 5 times (a short loading indicator is shown meanwhile); only if every try fails does the visitor see the
 * "Something went wrong" page with its manual "Try again" button.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode; full?: boolean }, State> {
  state: State = { failed: false, attempt: 0, nonce: 0 };
  private timer: ReturnType<typeof setTimeout> | undefined;
  private settle: ReturnType<typeof setTimeout> | undefined;

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error) {
    console.error('[render error]', error);
    if (this.state.attempt < MAX_AUTO_RETRIES) {
      const wait = Math.min(300 * (this.state.attempt + 1), 1500);
      this.timer = setTimeout(() => this.setState((s) => ({ failed: false, attempt: s.attempt + 1, nonce: s.nonce + 1 })), wait);
    } else {
      report('Render', new Error(error.message.slice(0, 300)), 'render');
    }
  }

  componentDidUpdate(_prev: unknown, prevState: State) {
    // once a retry has stayed healthy for a few seconds, forgive the earlier failures
    if (prevState.failed && !this.state.failed && this.state.attempt > 0) {
      clearTimeout(this.settle);
      this.settle = setTimeout(() => { if (!this.state.failed) this.setState({ attempt: 0 }); }, 5000);
    }
  }

  componentWillUnmount() { clearTimeout(this.timer); clearTimeout(this.settle); }

  render() {
    if (this.state.failed) {
      if (this.state.attempt < MAX_AUTO_RETRIES) {
        const spin = <Spinner />;
        return this.props.full ? <div className="grid min-h-screen place-items-center">{spin}</div> : spin;
      }
      return <ErrorPage code="500" full={this.props.full} onRetry={() => window.location.reload()} />;
    }
    return <Fragment key={this.state.nonce}>{this.props.children}</Fragment>;
  }
}
