import { Component, type ReactNode } from 'react';
import ErrorPage from './ErrorPage';
import { report } from '../lib/errors';

export default class ErrorBoundary extends Component<{ children: ReactNode; full?: boolean }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { report('Render', new Error(error.message.slice(0, 300)), 'render'); }
  render() {
    if (this.state.failed) return <ErrorPage code="500" full={this.props.full} onRetry={() => { this.setState({ failed: false }); window.location.reload(); }} />;
    return this.props.children;
  }
}
