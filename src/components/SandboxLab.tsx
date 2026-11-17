import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  SkipForward,
  SkipBack,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Box,
  Layers,
  Terminal,
} from 'lucide-react';
import { SANDBOX_LESSONS, SandboxLesson } from '../data/curriculum';
import { runPythonOop, PythonRunResult, ExecutionStep } from '../engine/pythonOopRunner';
import { CodeEditor } from './CodeEditor';

interface SandboxLabProps {
  completedLessons: string[];
  onMarkLessonComplete: (lessonId: string) => void;
}

export const SandboxLab: React.FC<SandboxLabProps> = ({
  completedLessons,
  onMarkLessonComplete,
}) => {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(SANDBOX_LESSONS[0].id);
  const currentLesson: SandboxLesson = useMemo(
    () => SANDBOX_LESSONS.find((l) => l.id === selectedLessonId) || SANDBOX_LESSONS[0],
    [selectedLessonId]
  );

  const [codeByLesson, setCodeByLesson] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    SANDBOX_LESSONS.forEach((l) => {
      initial[l.id] = l.starterCode;
    });
    return initial;
  });

  const code = codeByLesson[currentLesson.id] ?? currentLesson.starterCode;

  const [runResult, setRunResult] = useState<PythonRunResult>(() =>
    runPythonOop(SANDBOX_LESSONS[0].starterCode)
  );
  const [stepCursor, setStepCursor] = useState<number | null>(null);

  useEffect(() => {
    const result = runPythonOop(code);
    setRunResult(result);
    setStepCursor(result.steps.length > 0 ? result.steps.length - 1 : null);
  }, [selectedLessonId]);

  const handleCodeChange = (nextCode: string) => {
    setCodeByLesson((prev) => ({ ...prev, [currentLesson.id]: nextCode }));
  };

  const handleRunAll = () => {
    const result = runPythonOop(code);
    setRunResult(result);
    setStepCursor(result.steps.length > 0 ? result.steps.length - 1 : null);
    if (result.success) {
      onMarkLessonComplete(currentLesson.id);
    }
  };

  const handleStepForward = () => {
    // Re-evaluate if code changed since last run
    const latest = runPythonOop(code);
    setRunResult(latest);
    if (latest.steps.length === 0) {
      setStepCursor(null);
      return;
    }
    if (stepCursor === null || stepCursor >= latest.steps.length - 1) {
      setStepCursor(0);
    } else {
      const nextIdx = stepCursor + 1;
      setStepCursor(nextIdx);
      if (nextIdx === latest.steps.length - 1 && latest.success) {
        onMarkLessonComplete(currentLesson.id);
      }
    }
  };

  const handleStepBack = () => {
    if (runResult.steps.length === 0) return;
    if (stepCursor === null) {
      setStepCursor(0);
    } else if (stepCursor > 0) {
      setStepCursor(stepCursor - 1);
    }
  };

  const handleResetCode = () => {
    const starter = currentLesson.starterCode;
    setCodeByLesson((prev) => ({ ...prev, [currentLesson.id]: starter }));
    const result = runPythonOop(starter);
    setRunResult(result);
    setStepCursor(result.steps.length > 0 ? result.steps.length - 1 : null);
  };

  const activeStep: ExecutionStep | null =
    stepCursor !== null && runResult.steps[stepCursor] ? runResult.steps[stepCursor] : null;

  const displayClasses = activeStep ? activeStep.classes : runResult.classes;
  const displayInstances = activeStep ? activeStep.instances : runResult.instances;
  const displayVariables = activeStep ? activeStep.variables : runResult.variables;
  const displayOutput = activeStep ? activeStep.output : runResult.output;

  const isSteppingMode =
    stepCursor !== null && runResult.steps.length > 0 && stepCursor < runResult.steps.length - 1;

  return (
    <section aria-label="互動沙盒與記憶體視覺化" className="space-y-6">
      {/* Lesson Segmented Selector */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 p-1.5">
        {SANDBOX_LESSONS.map((lesson) => {
          const isSelected = lesson.id === currentLesson.id;
          const isDone = completedLessons.includes(lesson.id);
          return (
            <button
              key={lesson.id}
              type="button"
              onClick={() => setSelectedLessonId(lesson.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <span className="font-mono text-xs text-blue-700 tabular-nums">{lesson.order}</span>
              <span>{lesson.title.split(' ')[0]}</span>
              {isDone && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-label="已完成" />
              )}
            </button>
          );
        })}
      </div>

      {/* Lesson Header Strip (Clean unboxed metadata) */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span>單元 {currentLesson.order}</span>
            <span aria-hidden="true">·</span>
            <span>{currentLesson.level}</span>
            <span aria-hidden="true">·</span>
            <span>預計 {currentLesson.duration}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
            {currentLesson.order}. {currentLesson.title}
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">{currentLesson.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRunAll}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Play className="h-4 w-4" />
            <span>執行全部</span>
          </button>
          <button
            type="button"
            onClick={handleStepBack}
            disabled={!activeStep || stepCursor === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
          >
            <SkipBack className="h-4 w-4" />
            <span>上一步</span>
          </button>
          <button
            type="button"
            onClick={handleStepForward}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <SkipForward className="h-4 w-4 text-blue-700" />
            <span>{isSteppingMode ? '下一步' : '單步追蹤'}</span>
          </button>
          <button
            type="button"
            onClick={handleResetCode}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
            <span>重置</span>
          </button>
        </div>
      </div>

      {/* Main Two-Zone Split Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Zone: Code Editor + Core Concept Takeaways */}
        <div className="space-y-5 lg:col-span-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-700">Python 程式碼編輯區</span>
              <span>支援 Tab 縮排 · 可自由修改後執行</span>
            </div>
            <CodeEditor
              value={code}
              onChange={handleCodeChange}
              activeLine={activeStep ? activeStep.line : null}
              errorLine={runResult.error ? runResult.error.line : null}
            />
          </div>

          {/* Concept Callout (Clean hairline container, no thick left border) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900">核心觀念解析</h3>
              <p className="text-sm leading-relaxed text-slate-600">{currentLesson.conceptNote}</p>
            </div>
            <div className="border-t border-slate-100 pt-3.5 space-y-2.5">
              {currentLesson.keyTakeaways.map((item) => (
                <div key={item.label} className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-3 text-xs">
                  <span className="font-mono font-semibold text-blue-700">{item.label}</span>
                  <span className="text-slate-600 leading-relaxed">{item.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Zone: Interactive Visual Memory Stage */}
        <div className="space-y-5 lg:col-span-7">
          {/* Execution Step Banner */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span className="text-slate-900 font-semibold">執行軌跡說明</span>
                {activeStep && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-blue-700">
                      第 {activeStep.line} 行
                    </span>
                    {activeStep.activeMethodLabel && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-amber-700">
                          執行中：{activeStep.activeMethodLabel}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
              {runResult.steps.length > 0 && stepCursor !== null && (
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  步驟 {stepCursor + 1} / {runResult.steps.length}
                </span>
              )}
            </div>

            {runResult.error ? (
              <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
                <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-mono text-xs font-semibold text-rose-700">
                    {runResult.error.type}
                    {runResult.error.line > 0 ? ` (第 ${runResult.error.line} 行)` : ''}
                  </div>
                  <p className="mt-0.5 text-sm">{runResult.error.message}</p>
                </div>
              </div>
            ) : activeStep ? (
              <div className="mt-2.5 space-y-1.5">
                <p className="text-sm font-medium text-slate-900">{activeStep.explanation}</p>
                <div className="font-mono text-xs text-slate-500 truncate">{activeStep.code}</div>
              </div>
            ) : (
              <p className="mt-2.5 text-sm text-slate-500">點擊「執行全部」或「單步追蹤」來觀察記憶體變化。</p>
            )}
          </div>

          {/* Blueprint & Memory Canvas */}
          <div className="blueprint-grid rounded-xl border border-slate-200 p-5 space-y-6">
            {/* 1. Class Blueprints */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-700" />
                  <h3 className="text-sm font-semibold text-slate-900">類別藍圖定義 (Class Blueprints)</h3>
                </div>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {displayClasses.length} 個類別
                </span>
              </div>

              {displayClasses.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-xs text-slate-500">
                  目前尚未執行到 class 定義敘述。
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {displayClasses.map((cls) => (
                    <div
                      key={cls.name}
                      className="rounded-lg border border-blue-200 bg-white p-4 space-y-3"
                    >
                      <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="font-mono text-sm font-semibold text-blue-800">
                          class {cls.name}
                        </div>
                        <span className="text-xs text-slate-500">
                          {cls.parentName ? `繼承自 ${cls.parentName}` : '基礎類別'}
                        </span>
                      </div>

                      {cls.classAttributes.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-slate-500">類別共用屬性</div>
                          <div className="space-y-1">
                            {cls.classAttributes.map((ca) => (
                              <div
                                key={ca.key}
                                className="flex items-center justify-between font-mono text-xs bg-slate-50 px-2.5 py-1 rounded"
                              >
                                <span className="text-slate-700">{ca.key}</span>
                                <span className="text-blue-700 font-medium">{ca.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-500">藍圖方法</div>
                        <div className="space-y-1">
                          {cls.methods.map((m) => (
                            <div
                              key={m.name}
                              className="font-mono text-xs text-slate-700 bg-slate-50 px-2.5 py-1 rounded truncate"
                              title={m.signature}
                            >
                              {m.signature}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Variables + Live Heap Instances */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-12 border-t border-slate-200/80 pt-5">
              {/* Global Variable Bindings */}
              <div className="md:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">變數名稱綁定 (References)</h3>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {displayVariables.length} 項
                  </span>
                </div>
                {displayVariables.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-xs text-slate-500">
                    尚未建立頂層變數。
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayVariables.map((v) => (
                      <div
                        key={v.name}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        <span className="font-mono font-semibold text-slate-900">{v.name}</span>
                        <div className="flex items-center gap-1.5 font-mono min-w-0">
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span
                            className={`truncate ${
                              v.valueType === 'instance'
                                ? 'text-amber-700 font-semibold'
                                : 'text-slate-600'
                            }`}
                          >
                            {v.displayValue}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Heap Objects */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-slate-900">記憶體物件實體 (Heap Objects)</h3>
                  </div>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {displayInstances.length} 個實體
                  </span>
                </div>

                {displayInstances.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-xs text-slate-500">
                    尚未透過類別建立物件實體（例如 <code className="font-mono">dog1 = Dog(...)</code>）。
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {displayInstances.map((inst) => {
                      const isSelfActive = activeStep?.activeSelfId === inst.id;
                      return (
                        <div
                          key={inst.id}
                          className={`rounded-lg border bg-white p-3.5 transition-colors ${
                            isSelfActive
                              ? 'border-amber-500 ring-2 ring-amber-500/20'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <span className="font-mono text-xs font-semibold text-slate-900">
                              {inst.className} 實體
                            </span>
                            <span className="font-mono text-xs text-amber-700 tabular-nums">
                              {inst.id}
                            </span>
                          </div>
                          {isSelfActive && (
                            <div className="mt-2 text-xs font-medium text-amber-800">
                              目前 self 指向此物件
                            </div>
                          )}
                          <div className="mt-2.5 space-y-1.5">
                            {inst.attributes.length === 0 ? (
                              <div className="text-xs text-slate-400">尚無實體屬性</div>
                            ) : (
                              inst.attributes.map((attr) => (
                                <div
                                  key={attr.key}
                                  className={`flex items-center justify-between gap-2 rounded px-2 py-1 font-mono text-xs ${
                                    attr.changed
                                      ? 'bg-amber-50 text-amber-950 font-medium'
                                      : 'bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <span className="text-slate-600">.{attr.key}</span>
                                  <span className="truncate text-slate-900">{attr.value}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Terminal Console Output */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <Terminal className="h-3.5 w-3.5 text-slate-400" />
                <span>終端機輸出 (Console Output)</span>
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {displayOutput.length} 行輸出
              </span>
            </div>
            <div className="mt-3 min-h-[76px] space-y-1 font-mono text-xs leading-relaxed">
              {displayOutput.length === 0 ? (
                <div className="text-slate-500">尚無 print() 輸出內容</div>
              ) : (
                displayOutput.map((line, i) => (
                  <div key={i} className="text-emerald-300">
                    <span className="mr-2 select-none text-slate-600">&gt;</span>
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
