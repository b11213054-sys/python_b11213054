import React, { useMemo, useState } from 'react';
import {
  Play,
  Lightbulb,
  RotateCcw,
  CheckCircle2,
  XCircle,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { CODING_CHALLENGES, EXPECTED_TEST_OUTPUTS } from '../data/curriculum';
import { runPythonOop, PythonRunResult } from '../engine/pythonOopRunner';
import { CodeEditor } from './CodeEditor';

interface ChallengeArenaProps {
  solvedChallenges: string[];
  onMarkChallengeSolved: (challengeId: string) => void;
}

interface TestCaseOutcome {
  description: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export const ChallengeArena: React.FC<ChallengeArenaProps> = ({
  solvedChallenges,
  onMarkChallengeSolved,
}) => {
  const [selectedId, setSelectedId] = useState<string>(CODING_CHALLENGES[0].id);
  const challenge = useMemo(
    () => CODING_CHALLENGES.find((c) => c.id === selectedId) || CODING_CHALLENGES[0],
    [selectedId]
  );

  const [codeByChallenge, setCodeByChallenge] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    CODING_CHALLENGES.forEach((c) => {
      map[c.id] = c.starterCode;
    });
    return map;
  });

  const [showHint, setShowHint] = useState<boolean>(false);
  const [testRunResult, setTestRunResult] = useState<PythonRunResult | null>(null);
  const [outcomes, setOutcomes] = useState<TestCaseOutcome[] | null>(null);

  const code = codeByChallenge[challenge.id] ?? challenge.starterCode;

  const handleSelectChallenge = (id: string) => {
    setSelectedId(id);
    setShowHint(false);
    setTestRunResult(null);
    setOutcomes(null);
  };

  const handleRunTests = () => {
    const combined = `${code}\n${challenge.testScript}`;
    const result = runPythonOop(combined);
    setTestRunResult(result);

    const expectedLines = EXPECTED_TEST_OUTPUTS[challenge.id] || [];
    const testOutputs = result.output.filter((line) => line.startsWith('TEST'));

    const evaluated: TestCaseOutcome[] = expectedLines.map((exp, idx) => {
      const actual = testOutputs[idx] || '（未產生輸出）';
      return {
        description: challenge.testDescriptions[idx] || `測試項目 ${idx + 1}`,
        expected: exp.replace(/^TEST\d+:\s*/, ''),
        actual: actual.replace(/^TEST\d+:\s*/, ''),
        passed: result.success && actual === exp,
      };
    });

    setOutcomes(evaluated);
    if (result.success && evaluated.every((t) => t.passed)) {
      onMarkChallengeSolved(challenge.id);
    }
  };

  const handleReset = () => {
    setCodeByChallenge((prev) => ({ ...prev, [challenge.id]: challenge.starterCode }));
    setTestRunResult(null);
    setOutcomes(null);
  };

  const handleLoadSolution = () => {
    setCodeByChallenge((prev) => ({ ...prev, [challenge.id]: challenge.solutionCode }));
    setTestRunResult(null);
    setOutcomes(null);
  };

  const allPassed = outcomes !== null && outcomes.length > 0 && outcomes.every((o) => o.passed);

  return (
    <section aria-label="Python 類別與物件實戰挑戰" className="space-y-6">
      {/* Challenge Segmented Selector */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1.5">
        {CODING_CHALLENGES.map((item) => {
          const active = item.id === challenge.id;
          const solved = solvedChallenges.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectChallenge(item.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <span className="font-mono text-xs text-blue-700 tabular-nums">{item.order}</span>
              <span>{item.title}</span>
              {solved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Specification & Test Results */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="space-y-1.5 border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>{challenge.order}</span>
                <span aria-hidden="true">·</span>
                <span>難度：{challenge.difficulty}</span>
                {solvedChallenges.includes(challenge.id) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-700 font-semibold">已完成驗證</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{challenge.title}</h2>
              <p className="text-sm leading-relaxed text-slate-600">{challenge.prompt}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-900">實作需求規格</h3>
              <ul className="space-y-2">
                {challenge.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 font-mono text-xs font-semibold text-blue-700 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span className="leading-relaxed">{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                <span>{showHint ? '隱藏提示' : '顯示提示'}</span>
              </button>
              <button
                type="button"
                onClick={handleLoadSolution}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <BookOpen className="h-3.5 w-3.5 text-blue-700" />
                <span>參考解答</span>
              </button>
            </div>

            {showHint && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs leading-relaxed text-amber-950">
                <span className="font-semibold">思考方向：</span>
                {challenge.hint}
              </div>
            )}
          </div>

          {/* Test Assertion Results */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-900">自動化測試驗證結果</h3>
              {outcomes && (
                <span
                  className={`font-mono text-xs font-semibold tabular-nums ${
                    allPassed ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {outcomes.filter((o) => o.passed).length} / {outcomes.length} 通過
                </span>
              )}
            </div>

            {testRunResult?.error && (
              <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-900">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono font-semibold text-rose-700">
                    {testRunResult.error.type}
                    {testRunResult.error.line > 0 ? ` · 第 ${testRunResult.error.line} 行` : ''}
                  </div>
                  <p className="mt-0.5">{testRunResult.error.message}</p>
                </div>
              </div>
            )}

            {outcomes === null ? (
              <p className="text-xs text-slate-500">
                在右側撰寫類別程式後，點擊「執行測試」檢查所有單元測試條件。
              </p>
            ) : (
              <div className="space-y-2.5">
                {outcomes.map((item, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 text-xs space-y-1.5 ${
                      item.passed
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-rose-200 bg-rose-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-slate-900">{item.description}</span>
                      <span className="inline-flex items-center gap-1 font-semibold whitespace-nowrap shrink-0">
                        {item.passed ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">通過</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-rose-600" />
                            <span className="text-rose-700">未通過</span>
                          </>
                        )}
                      </span>
                    </div>
                    {!item.passed && (
                      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        <div className="rounded bg-white/80 px-2 py-1 text-slate-600">
                          預期：<span className="text-slate-900">{item.expected}</span>
                        </div>
                        <div className="rounded bg-white/80 px-2 py-1 text-rose-700">
                          實際：<span>{item.actual}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Code Editor + Action Bar */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-600">
              撰寫區 · 保留類別名稱與方法參數簽名以通過自動測試
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-4 w-4" />
                <span>恢復範本</span>
              </button>
              <button
                type="button"
                onClick={handleRunTests}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4" />
                <span>執行測試</span>
              </button>
            </div>
          </div>

          <CodeEditor
            value={code}
            onChange={(next) =>
              setCodeByChallenge((prev) => ({ ...prev, [challenge.id]: next }))
            }
            errorLine={testRunResult?.error ? testRunResult.error.line : null}
            minHeightClass="min-h-[380px]"
            ariaLabel={`${challenge.title} 程式碼作答區`}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-700">系統驗證腳本預覽</div>
            <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-slate-600">
              {challenge.testScript.trim()}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
};
