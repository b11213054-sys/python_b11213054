import { useEffect, useState } from 'react';
import { SandboxLab } from './components/SandboxLab';
import { ConceptExplorer } from './components/ConceptExplorer';
import { ChallengeArena } from './components/ChallengeArena';
import { QuizPanel } from './components/QuizPanel';
import { CODING_CHALLENGES, QUIZ_QUESTIONS, SANDBOX_LESSONS } from './data/curriculum';

type WorkspaceTab = 'sandbox' | 'concepts' | 'challenges' | 'quiz';

const STORAGE_KEY = 'pyclass_learning_progress_v1';

interface LearningProgress {
  completedLessons: string[];
  solvedChallenges: string[];
  bestQuizScore: number;
}

const DEFAULT_PROGRESS: LearningProgress = {
  completedLessons: [],
  solvedChallenges: [],
  bestQuizScore: 0,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('sandbox');
  const [progress, setProgress] = useState<LearningProgress>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<LearningProgress>;
        return {
          completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons : [],
          solvedChallenges: Array.isArray(parsed.solvedChallenges) ? parsed.solvedChallenges : [],
          bestQuizScore: typeof parsed.bestQuizScore === 'number' ? parsed.bestQuizScore : 0,
        };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PROGRESS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore storage errors
    }
  }, [progress]);

  const handleMarkLessonComplete = (lessonId: string) => {
    setProgress((prev) => {
      if (prev.completedLessons.includes(lessonId)) return prev;
      return { ...prev, completedLessons: [...prev.completedLessons, lessonId] };
    });
  };

  const handleMarkChallengeSolved = (challengeId: string) => {
    setProgress((prev) => {
      if (prev.solvedChallenges.includes(challengeId)) return prev;
      return { ...prev, solvedChallenges: [...prev.solvedChallenges, challengeId] };
    });
  };

  const handleQuizScoreUpdate = (score: number) => {
    setProgress((prev) => ({
      ...prev,
      bestQuizScore: Math.max(prev.bestQuizScore, score),
    }));
  };

  const handleResetProgress = () => {
    setProgress(DEFAULT_PROGRESS);
  };

  const navItems: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'sandbox', label: '互動沙盒' },
    { id: 'concepts', label: '觀念圖解' },
    { id: 'challenges', label: '程式挑戰' },
    { id: 'quiz', label: '隨堂測驗' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Single text wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            PyClass 藍圖工坊
          </button>

          {/* Zone 2: 4 single-line nav links */}
          <nav aria-label="主要學習分頁" className="hidden md:flex items-center gap-7">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded ${
                    isActive
                      ? 'text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-1 h-0.5 bg-blue-700 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'challenges' ? 'quiz' : 'challenges')}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {activeTab === 'challenges' ? '前往隨堂測驗' : '開始程式挑戰'}
            </button>
          </div>
        </div>

        {/* Mobile navigation row */}
        <div className="flex md:hidden items-center gap-4 overflow-x-auto border-t border-slate-100 px-6 py-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`text-xs font-medium py-1 whitespace-nowrap shrink-0 ${
                  isActive ? 'text-blue-700 font-semibold underline underline-offset-4' : 'text-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-[1360px] flex-1 px-6 py-8 space-y-8">
        {/* Compact Editorial Intro & Progress Strip */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-balance">
              掌握 Python 類別與物件的記憶體思維
            </h1>
            <p className="text-sm leading-relaxed text-slate-600">
              透過即時程式執行、記憶體參考追蹤與互動式藍圖實驗，把抽象的 <code className="font-mono text-blue-700">class</code>、<code className="font-mono text-blue-700">__init__</code>、<code className="font-mono text-blue-700">self</code> 與繼承機制轉化為直覺模型。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono tabular-nums shrink-0">
            <span>
              沙盒單元 <strong className="text-slate-900">{progress.completedLessons.length}/{SANDBOX_LESSONS.length}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              實戰挑戰 <strong className="text-slate-900">{progress.solvedChallenges.length}/{CODING_CHALLENGES.length}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              測驗最佳 <strong className="text-slate-900">{progress.bestQuizScore}/{QUIZ_QUESTIONS.length}</strong>
            </span>
          </div>
        </div>

        {/* Workspace Views */}
        {activeTab === 'sandbox' && (
          <SandboxLab
            completedLessons={progress.completedLessons}
            onMarkLessonComplete={handleMarkLessonComplete}
          />
        )}
        {activeTab === 'concepts' && <ConceptExplorer />}
        {activeTab === 'challenges' && (
          <ChallengeArena
            solvedChallenges={progress.solvedChallenges}
            onMarkChallengeSolved={handleMarkChallengeSolved}
          />
        )}
        {activeTab === 'quiz' && <QuizPanel onQuizScoreUpdate={handleQuizScoreUpdate} />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-3 px-6 py-5 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span>PyClass 藍圖工坊 · Python 物件導向互動學習教材</span>
          <button
            type="button"
            onClick={handleResetProgress}
            className="text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline whitespace-nowrap"
          >
            重設個人學習紀錄
          </button>
        </div>
      </footer>
    </div>
  );
}
