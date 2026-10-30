import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null; traceId: string | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, traceId: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, traceId: `ui-${Date.now().toString(36)}` };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("KAZ_UI_ERROR", { error: error.message, componentStack: info.componentStack, traceId: this.state.traceId });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="error-boundary" dir="rtl">
        <span className="section-kicker">KAZ / تشخيص الواجهة</span>
        <h1>حدث خطأ في هذه الشاشة</h1>
        <p>{this.state.error.message || "تعذر عرض المحتوى الحالي."}</p>
        <code>{this.state.traceId}</code>
        <div className="error-boundary-actions">
          <button className="primary-cta" type="button" onClick={() => this.setState({ error: null, traceId: null })}>إعادة المحاولة</button>
          <button className="secondary-cta" type="button" onClick={() => { window.history.pushState({}, "", "/diagnostics"); window.dispatchEvent(new PopStateEvent("popstate")); }}>فتح التشخيص</button>
        </div>
      </main>
    );
  }
}
