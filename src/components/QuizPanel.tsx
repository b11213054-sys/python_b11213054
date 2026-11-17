import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { QUIZ_QUESTIONS } from '../data/curriculum';

interface QuizPanelProps {
  onQuizScoreUpdate: (score: number, total: number) => void;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({ onQuizScoreUpdate }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const question = QUIZ_QUESTIONS[activeIndex];
  const selectedOption = answers[question.id];
  const isAnswered = selectedOption !== undefined;
  const isCorrect = selectedOption === question.correctIndex;

  const answeredCount = Object.keys(answers).length;
  const correctCount = QUIZ_QUESTIONS.filter((q) => answers[q.id] === q.correctIndex).length;

  const handleSelectOption = (optIdx: number) => {
    if (isAnswered) return;
    const nextAnswers = { ...answers, [question.id]: optIdx };
    setAnswers(nextAnswers);
    const nextCorrect = QUIZ_QUESTIONS.filter((q) => nextAnswers[q.id] === q.correctIndex).length;
    onQuizScoreUpdate(nextCorrect, QUIZ_QUESTIONS.length);
  };

  const handleResetQuiz = () => {
    setAnswers({});
    setActiveIndex(0);
    onQuizScoreUpdate(0, QUIZ_QUESTIONS.length);
  };

  return (
    <section aria-label="隨堂觀念測驗" className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-500">
            觀念診斷測驗 · 共 {QUIZ_QUESTIONS.length} 題
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            檢驗你的 Python 物件導向直覺
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right font-mono text-xs tabular-nums">
            <div className="text-slate-500">目前答對題數</div>
            <div className="text-base font-bold text-slate-900">
              {correctCount} / {QUIZ_QUESTIONS.length}
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetQuiz}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>重新測驗</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Question Navigator */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 pb-2 border-b border-slate-100">
            <span>題目清單</span>
            <span className="font-mono tabular-nums">
              已作答 {answeredCount} / {QUIZ_QUESTIONS.length}
            </span>
          </div>
          <div className="space-y-1">
            {QUIZ_QUESTIONS.map((q, idx) => {
              const userChoice = answers[q.id];
              const qAnswered = userChoice !== undefined;
              const qRight = userChoice === q.correctIndex;
              const isCurrent = idx === activeIndex;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                    isCurrent
                      ? 'bg-slate-900 text-white font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono tabular-nums opacity-75">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate">{q.topic}</span>
                  </div>
                  {qAnswered &&
                    (qRight ? (
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isCurrent ? 'text-emerald-300' : 'text-emerald-600'
                        }`}
                      />
                    ) : (
                      <XCircle
                        className={`h-3.5 w-3.5 shrink-0 ${
                          isCurrent ? 'text-rose-300' : 'text-rose-600'
                        }`}
                      />
                    ))}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Question Card */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              第 {activeIndex + 1} 題 · {question.topic}
            </span>
            <span className="font-mono tabular-nums">
              {activeIndex + 1} / {QUIZ_QUESTIONS.length}
            </span>
          </div>

          <h3 className="text-lg font-semibold leading-snug text-slate-900">{question.question}</h3>

          {question.codeSnippet && (
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
              {question.codeSnippet}
            </pre>
          )}

          <div className="space-y-2.5">
            {question.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isTargetCorrect = idx === question.correctIndex;

              let styleClass =
                'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50';
              if (isAnswered) {
                if (isTargetCorrect) {
                  styleClass = 'border-emerald-400 bg-emerald-50/70 text-emerald-950 font-medium';
                } else if (isSelected && !isTargetCorrect) {
                  styleClass = 'border-rose-300 bg-rose-50/70 text-rose-950';
                } else {
                  styleClass = 'border-slate-200 bg-slate-50/60 text-slate-500';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(idx)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors ${styleClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span>{opt}</span>
                  </div>
                  {isAnswered && isTargetCorrect && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>正確答案</span>
                    </span>
                  )}
                  {isAnswered && isSelected && !isTargetCorrect && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 shrink-0">
                      <XCircle className="h-4 w-4" />
                      <span>你的選擇</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div
              className={`rounded-lg border p-4 space-y-1.5 text-sm ${
                isCorrect
                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                  : 'border-amber-200 bg-amber-50/60 text-amber-950'
              }`}
            >
              <div className="font-semibold">
                {isCorrect ? '答對了！觀念非常清楚。' : '這題差一點，來看看原因：'}
              </div>
              <p className="text-sm leading-relaxed opacity-90">{question.explanation}</p>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
            >
              上一題
            </button>

            <button
              type="button"
              disabled={activeIndex === QUIZ_QUESTIONS.length - 1}
              onClick={() => setActiveIndex((i) => Math.min(QUIZ_QUESTIONS.length - 1, i + 1))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
            >
              <span>下一題</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
