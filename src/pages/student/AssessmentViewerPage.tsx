/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ReactNode, ErrorInfo } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { AssessmentViewer } from "../../components/AssessmentViewer.js";
import { useAuth } from "../../context/AuthContext.js";

interface AssessmentErrorBoundaryProps {
  children: ReactNode;
  onBack: () => void;
}

interface AssessmentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AssessmentErrorBoundary extends (React.Component as any) {
  state: AssessmentErrorBoundaryState = { hasError: false, error: null };

  constructor(props: AssessmentErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): AssessmentErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Assessment runtime error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-[500px] flex items-center justify-center p-6"
          style={{ backgroundColor: "var(--color-background)" }}
        >
          <div 
            className="max-w-md w-full p-8 rounded-2xl border text-center space-y-4 shadow-xl"
            style={{ 
              backgroundColor: "var(--color-surface)", 
              borderColor: "var(--color-border)",
              color: "var(--color-text-primary)"
            }}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center border border-rose-200 dark:border-rose-900/50">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold">Exam Session Interrupted</h2>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                An unexpected interface issue occurred. Your saved question responses and previous attempt records remain preserved.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="text-[11px] p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--color-border)] text-left font-mono overflow-x-auto max-h-24 text-[var(--color-text-secondary)]">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: "var(--color-button-primary)",
                  color: "var(--color-button-primary-foreground)"
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
              <button
                type="button"
                onClick={this.props.onBack}
                className="px-4 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: "var(--color-surface-elevated)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)"
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Assessments
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function AssessmentViewerPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { authToken } = useAuth();
  const navigate = useNavigate();

  if (!assessmentId) {
    return <Navigate to="/student/assessments" replace />;
  }

  if (!authToken) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-xs font-semibold">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
        Authenticating...
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <AssessmentErrorBoundary onBack={() => navigate("/student/assessments")}>
        <AssessmentViewer
          assessmentId={assessmentId}
          authToken={authToken}
          onBack={() => navigate("/student/assessments")}
          onCompleted={() => navigate("/student/assessments")}
        />
      </AssessmentErrorBoundary>
    </div>
  );
}
