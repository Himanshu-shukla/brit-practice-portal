'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Check,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  HelpCircle,
  RotateCcw,
  BarChart3,
  ArrowRight,
  Search,
  X,
  BookOpen,
  CalendarCheck,
} from 'lucide-react';
import { Notice, Pagination, QuestionText, QuestionCard, QuizQuestion } from '@/components/UI';
import { api, post } from '@/lib/api-fetch';

// Types
type DashboardData = {
  today: string;
  accuracy: number;
  completedTests: number;
  needsRevision: number;
  totalAnswered: number;
  todayTests: {
    id: string;
    title: string;
    count: number;
    status: string;
    score: number | null;
  }[];
};

type CalendarDay = {
  id: string;
  date: string;
  title: string;
  count: number;
  status: string;
};

type QuestionsData = {
  items: QuizQuestion[];
  total: number;
  pageSize: number;
};

type ProgressData = {
  pending: number;
  attempts: {
    testId: string;
    title: string;
    date: string;
    score: number;
    correctCount: number;
    total: number;
  }[];
  topics: {
    subject: string;
    topic: string;
    correct: number;
    total: number;
  }[];
};

const SUBJECTS = [
  { slug: '', label: 'All Subjects' },
  { slug: 'excel', label: 'Excel' },
  { slug: 'sql', label: 'SQL' },
  { slug: 'python', label: 'Python' },
  { slug: 'power_bi', label: 'Power BI' },
  { slug: 'statistics', label: 'Statistics' },
  { slug: 'genai', label: 'GenAI' },
];

export default function Dashboard() {
  // Navigation active tab: 'today' | 'questions' | 'revision' | 'progress'
  const [activeTab, setActiveTab] = useState<'today' | 'questions' | 'revision' | 'progress'>('today');

  // Dashboard Data
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [noticeErr, setNoticeErr] = useState('');

  // Calendar State for Schedule & Timeline
  const [month, setMonth] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit' }).slice(0, 7)
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' })
  );
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calError, setCalError] = useState('');

  // Question Bank State
  const [qSubject, setQSubject] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qDifficulty, setQDifficulty] = useState('');
  const [qPage, setQPage] = useState(1);
  const [qData, setQData] = useState<QuestionsData>({ items: [], total: 0, pageSize: 10 });
  const [qError, setQError] = useState('');

  // Revision (Incorrect Questions) State
  const [revSubject, setRevSubject] = useState('');
  const [revTopic, setRevTopic] = useState('');
  const [revStatus, setRevStatus] = useState('pending');
  const [revPage, setRevPage] = useState(1);
  const [revData, setRevData] = useState<{ items: QuizQuestion[]; total: number; pageSize: number }>({
    items: [],
    total: 0,
    pageSize: 10,
  });
  const [revSelected, setRevSelected] = useState<Record<string, string[]>>({});
  const [revAnswers, setRevAnswers] = useState<
    Record<string, { isCorrect: boolean; correctOptionKeys: string[]; explanation: string }>
  >({});
  const [revError, setRevError] = useState('');
  const [revRefresh, setRevRefresh] = useState(0);

  // Progress State
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [progError, setProgError] = useState('');

  // Quick Search Modal State
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Listen to Layout Custom Event for Quick Search
  useEffect(() => {
    const handleSearchToggle = () => setSearchModalOpen((prev) => !prev);
    window.addEventListener('toggle-quick-search', handleSearchToggle);
    return () => window.removeEventListener('toggle-quick-search', handleSearchToggle);
  }, []);

  // Fetch Dashboard Summary
  useEffect(() => {
    api<DashboardData>('/api/v1/learner/dashboard')
      .then(setDash)
      .catch((e) => setNoticeErr(e.message));
  }, []);

  // Fetch Calendar
  useEffect(() => {
    api<{ days: CalendarDay[] }>('/api/v1/learner/calendar?month=' + month)
      .then((r) => setCalendarDays(r.days))
      .catch((e) => setCalError(e.message));
  }, [month]);

  // Fetch Question Bank
  useEffect(() => {
    const p = new URLSearchParams({ page: String(qPage), pageSize: '10' });
    if (qSubject) p.set('subject', qSubject);
    if (qTopic) p.set('topic', qTopic);
    if (qDifficulty) p.set('difficulty', qDifficulty);
    api<QuestionsData>('/api/v1/learner/questions?' + p)
      .then(setQData)
      .catch((e) => setQError(e.message));
  }, [qSubject, qTopic, qDifficulty, qPage]);

  // Fetch Incorrect Questions
  useEffect(() => {
    const p = new URLSearchParams({ page: String(revPage), pageSize: '10', status: revStatus });
    if (revSubject) p.set('subject', revSubject);
    if (revTopic) p.set('topic', revTopic);
    api<{ items: QuizQuestion[]; total: number; pageSize: number }>('/api/v1/learner/incorrect-questions?' + p)
      .then(setRevData)
      .catch((e) => setRevError(e.message));
  }, [revSubject, revTopic, revStatus, revPage, revRefresh]);

  // Fetch Progress Analytics
  useEffect(() => {
    api<ProgressData>('/api/v1/learner/progress')
      .then(setProgressData)
      .catch((e) => setProgError(e.message));
  }, []);

  // Retest Revision Question
  async function submitRevisionAttempt(q: QuizQuestion) {
    setNoticeErr('');
    try {
      const result = await post<{ isCorrect: boolean; correctOptionKeys: string[]; explanation: string }>(
        '/api/v1/learner/revision-attempts',
        {
          questionId: q.id,
          selectedOptionKeys: revSelected[q.id] || [],
        }
      );
      setRevAnswers((prev) => ({ ...prev, [q.id]: result }));
      if (result.isCorrect) {
        setDash((d) => (d ? { ...d, needsRevision: Math.max(0, d.needsRevision - 1) } : d));
        setProgressData((p) => (p ? { ...p, pending: Math.max(0, p.pending - 1) } : p));
      }
      setRevRefresh((n) => n + 1);
    } catch (e: any) {
      setNoticeErr(e.message);
    }
  }

  // Current Date Calculation for Timeline Strip
  const todayDateStr = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Generate 7 days centered on the current week
  const getTimelineDays = () => {
    const curr = new Date(selectedDate + 'T12:00:00Z');
    // Start of current week (Monday)
    const dayOfWeek = curr.getUTCDay(); // 0 is Sunday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setUTCDate(curr.getUTCDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
      const dayNumber = d.getUTCDate();
      const entries = calendarDays.filter((x) => x.date === dateStr);
      days.push({
        date: dateStr,
        dayName,
        dayNumber,
        isToday: dateStr === todayDateStr,
        isSelected: dateStr === selectedDate,
        hasCompleted: entries.some((x) => x.status === 'submitted'),
        entries,
      });
    }
    return days;
  };

  const timelineDays = getTimelineDays();
  const selectedDayTests = calendarDays.filter((d) => d.date === selectedDate);

  // Quick filtered questions for modal
  const searchResults = searchQuery.trim()
    ? qData.items.filter(
        (x) =>
          x.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
          x.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
          x.subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* NOTICE */}
      <Notice error={noticeErr} />

      {/* TOP TAB NAVIGATION BAR (MATCHING SCREENSHOT) */}
      <nav className="tabBarNav">
        <button
          className={`tabBarBtn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <span>Overview & Today</span>
        </button>

        <button
          className={`tabBarBtn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          <span>Question Bank</span>
        </button>

        <button
          className={`tabBarBtn ${activeTab === 'revision' ? 'active' : ''}`}
          onClick={() => setActiveTab('revision')}
        >
          <span>Revision</span>
          <span className="tabBadge">{dash?.needsRevision ?? 2}</span>
        </button>

        <button
          className={`tabBarBtn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <span>Progress & Stats</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & TODAY */}
      {/* ========================================================================= */}
      {activeTab === 'today' && (
        <div className="stack" style={{ gap: 20 }}>
          {/* 4 KPI METRIC CARDS ROW */}
          <div className="kpiGrid">
            {/* 1. DAILY STREAK */}
            <div className="kpiCard">
              <div className="kpiHeader">
                <span className="kpiLabel">Daily Streak</span>
                <div className="kpiIconWrap" style={{ background: '#fff7ed', color: '#ea580c' }}>
                  <Flame size={15} />
                </div>
              </div>
              <div className="kpiVal">
                4 <span className="kpiSub">days</span>
              </div>
            </div>

            {/* 2. COMPLETED */}
            <div className="kpiCard">
              <div className="kpiHeader">
                <span className="kpiLabel">Completed</span>
                <div className="kpiIconWrap" style={{ background: '#ecfdf5', color: '#10b981' }}>
                  <Check size={15} strokeWidth={3} />
                </div>
              </div>
              <div className="kpiVal">
                {dash?.completedTests ?? 2} <span className="kpiSub">/ 5 tasks</span>
              </div>
            </div>

            {/* 3. MASTERY RATE */}
            <div className="kpiCard">
              <div className="kpiHeader">
                <span className="kpiLabel">Mastery Rate</span>
                <div className="kpiIconWrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <TrendingUp size={15} />
                </div>
              </div>
              <div className="kpiVal">
                {dash?.accuracy !== undefined ? `${dash.accuracy}%` : '100%'}
              </div>
            </div>

            {/* 4. TO REVISE */}
            <div
              className="kpiCard"
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveTab('revision')}
              title="View Revision Bank"
            >
              <div className="kpiHeader">
                <span className="kpiLabel">To Revise</span>
                <div className="kpiIconWrap" style={{ background: '#fef2f2', color: '#ef4444' }}>
                  <AlertTriangle size={15} />
                </div>
              </div>
              <div className="kpiVal" style={{ color: (dash?.needsRevision ?? 2) > 0 ? '#ef4444' : undefined }}>
                {dash?.needsRevision ?? 2} <span className="kpiSub">questions</span>
              </div>
            </div>
          </div>

          {/* MAIN HERO ROW: TODAY'S PRACTICE + COHORT TARGET */}
          <div className="heroRow">
            {/* TODAY'S DAILY PRACTICE HERO CARD */}
            <div className="heroPracticeCard">
              <div>
                <div className="heroPracticeHeader">
                  <div className="heroSparkleIcon">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="heroTagTitle">Today’s Daily Practice</div>
                    <div className="heroTagDate">
                      {new Date().toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <div className="heroPracticeTitle">Today’s Daily Practice</div>

                <p className="heroPracticeDesc">
                  {dash?.todayTests && dash.todayTests.length > 0
                    ? `You have ${dash.todayTests.length} daily assessment assigned for today: "${dash.todayTests[0].title}". Complete it to keep your streak active!`
                    : 'No new mandatory assessment scheduled for today! You are completely on track.'}
                </p>
              </div>

              <div className="heroBtnRow">
                {dash?.todayTests && dash.todayTests.length > 0 && dash.todayTests[0].status !== 'submitted' ? (
                  <Link href={`/test/${dash.todayTests[0].id}`} className="btn">
                    Start Today’s Assessment <ArrowRight size={15} />
                  </Link>
                ) : (
                  <button className="btn" onClick={() => setActiveTab('revision')}>
                    Review Pending Errors ({dash?.needsRevision ?? 2})
                  </button>
                )}

                <button className="btn btnSecondary" onClick={() => setActiveTab('questions')}>
                  Browse Question Bank
                </button>
              </div>
            </div>

            {/* COHORT TARGET CARD */}
            <div className="cohortCard">
              <div>
                <div className="cohortTitle">Cohort target</div>
                <div className="cohortRateVal" style={{ marginTop: 6 }}>
                  80% Mastery Rate
                </div>
                <div className="cohortProgressTrack">
                  <div className="cohortProgressFill" style={{ width: '80%' }} />
                </div>
              </div>

              <button className="cohortLink" onClick={() => setActiveTab('progress')}>
                View Detailed Analytics <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* SCHEDULE & TIMELINE (WEEK STRIP TIMELINE) */}
          <div className="timelineCard">
            <div className="timelineHeader">
              <div className="timelineTitle">Schedule & Timeline</div>
              <div className="row" style={{ gap: 6 }}>
                <button
                  className="btn btnSecondary btnSmall"
                  style={{ padding: '4px 8px' }}
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setUTCDate(d.getUTCDate() - 7);
                    setSelectedDate(d.toISOString().slice(0, 10));
                  }}
                  title="Previous Week"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="btn btnSecondary btnSmall"
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => setSelectedDate(todayDateStr)}
                >
                  Current Week
                </button>
                <button
                  className="btn btnSecondary btnSmall"
                  style={{ padding: '4px 8px' }}
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setUTCDate(d.getUTCDate() + 7);
                    setSelectedDate(d.toISOString().slice(0, 10));
                  }}
                  title="Next Week"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="timelineStrip">
              {timelineDays.map((d) => {
                let statusClass = '';
                let statusLabel = '';

                if (d.hasCompleted) {
                  statusClass = 'completed';
                  statusLabel = 'completed';
                } else if (d.isToday) {
                  statusClass = 'today';
                  statusLabel = 'today';
                }

                return (
                  <div
                    key={d.date}
                    className={`dayCard ${statusClass}`}
                    onClick={() => setSelectedDate(d.date)}
                  >
                    <div className="dayCardName">{d.dayName}</div>
                    <div className="dayCardNum">{d.dayNumber}</div>

                    {statusLabel && <div className="dayCardTag">{statusLabel}</div>}

                    {d.entries.length > 0 && !d.hasCompleted && !d.isToday && (
                      <div className="dayCardTestsList">
                        {d.entries.slice(0, 2).map((t) => (
                          <div key={t.id} className="dayMiniTestTag" title={t.title}>
                            {t.title.length > 11 ? t.title.slice(0, 11) + '…' : t.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* EXPANDED SCHEDULE DETAILS FOR PICKED DAY */}
            {selectedDayTests.length > 0 && (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                  Assessments for {new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}:
                </div>
                <div className="stack" style={{ gap: 8 }}>
                  {selectedDayTests.map((t) => (
                    <div key={t.id} className="listCard" style={{ padding: '10px 0' }}>
                      <div>
                        <strong>{t.title}</strong>
                        <div className="hint">{t.count} questions · {t.status.replace('_', ' ')}</div>
                      </div>
                      {t.status !== 'scheduled' ? (
                        <Link href={`/test/${t.id}`} className="btn btnSmall">
                          {t.status === 'submitted' ? 'Review Test' : 'Open Test'}
                        </Link>
                      ) : (
                        <span className="badge orange">Scheduled</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUESTION BANK */}
      {/* ========================================================================= */}
      {activeTab === 'questions' && (
        <div className="stack" style={{ gap: 18 }}>
          <div className="row between wrap">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>Question Bank</h2>
              <p className="hint" style={{ margin: 0 }}>Explore released questions by subject, topic, and difficulty</p>
            </div>
            <span className="badge">{qData.total} questions found</span>
          </div>

          <Notice error={qError} />

          {/* FILTERS */}
          <div className="card">
            <div className="formGrid">
              <div className="field">
                <label>Subject</label>
                <select
                  className="select"
                  value={qSubject}
                  onChange={(e) => {
                    setQSubject(e.target.value);
                    setQPage(1);
                  }}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Topic Keyword</label>
                <input
                  className="input"
                  placeholder="e.g. pivot_tables, joins, loops"
                  value={qTopic}
                  onChange={(e) => {
                    setQTopic(e.target.value.trim().toLowerCase());
                    setQPage(1);
                  }}
                />
              </div>

              <div className="field">
                <label>Difficulty</label>
                <select
                  className="select"
                  value={qDifficulty}
                  onChange={(e) => {
                    setQDifficulty(e.target.value);
                    setQPage(1);
                  }}
                >
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="field" style={{ justifyContent: 'flex-end' }}>
                <label style={{ visibility: 'hidden' }}>Reset</label>
                <button
                  className="btn btnSecondary"
                  onClick={() => {
                    setQSubject('');
                    setQTopic('');
                    setQDifficulty('');
                    setQPage(1);
                  }}
                >
                  <RotateCcw size={14} /> Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* QUESTIONS LIST */}
          <div className="card">
            {qData.items.length > 0 ? (
              <div>
                {qData.items.map((q) => (
                  <div key={q.id} className="listCard">
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 16 }}>
                      <div className="row wrap" style={{ marginBottom: 8, gap: 6 }}>
                        <span className="badge">
                          {q.subject} / {q.topics.join(', ')}
                        </span>
                        <span className={`badge ${q.difficulty === 'easy' ? 'green' : q.difficulty === 'intermediate' ? '' : 'orange'}`}>
                          {q.difficulty}
                        </span>
                      </div>

                      <QuestionText
                        text={q.questionText.length > 180 ? q.questionText.slice(0, 180) + '…' : q.questionText}
                      />

                      {q.date && <div className="hint" style={{ marginTop: 8 }}>Assigned: {q.date}</div>}
                    </div>

                    {q.testId ? (
                      <Link href={`/test/${q.testId}`} className="btn btnSmall">
                        Open Test <ArrowRight size={14} />
                      </Link>
                    ) : (
                      <span className="badge">Published</span>
                    )}
                  </div>
                ))}

                <Pagination page={qPage} total={qData.total} size={qData.pageSize} onPage={setQPage} />
              </div>
            ) : (
              <div className="empty">No matching questions found. Try adjusting your search filters.</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REVISION BANK (MISTAKE TRACKER) */}
      {/* ========================================================================= */}
      {activeTab === 'revision' && (
        <div className="stack" style={{ gap: 18 }}>
          <div className="row between wrap">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>Revision Bank</h2>
              <p className="hint" style={{ margin: 0 }}>
                {revStatus === 'correct'
                  ? 'Review questions you answered correctly in your tests and practice'
                  : 'Revise and re-attempt questions you missed until you achieve 100% mastery'}
              </p>
            </div>
            <span
              className={`badge ${
                revStatus === 'correct' ? 'green' : (dash?.needsRevision ?? 2) > 0 ? 'red' : 'green'
              }`}
            >
              {revStatus === 'correct'
                ? `${revData.total} answered correctly`
                : `${dash?.needsRevision ?? 2} pending revision`}
            </span>
          </div>

          <Notice error={revError} />

          {/* FILTERS */}
          <div className="card">
            <div className="formGrid">
              <div className="field">
                <label>Status Filter</label>
                <select
                  className="select"
                  value={revStatus}
                  onChange={(e) => {
                    setRevStatus(e.target.value);
                    setRevPage(1);
                  }}
                >
                  <option value="pending">Needs Revision (Pending)</option>
                  <option value="resolved">Resolved (Mistakes Fixed)</option>
                  <option value="correct">Correct (Answered in Tests)</option>
                  <option value="all">Incorrect At Least Once (All)</option>
                </select>
              </div>

              <div className="field">
                <label>Subject</label>
                <select
                  className="select"
                  value={revSubject}
                  onChange={(e) => {
                    setRevSubject(e.target.value);
                    setRevPage(1);
                  }}
                >
                  <option value="">All Subjects</option>
                  {SUBJECTS.filter((s) => s.slug).map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Topic Filter</label>
                <input
                  className="input"
                  placeholder="e.g. window_functions"
                  value={revTopic}
                  onChange={(e) => {
                    setRevTopic(e.target.value.toLowerCase());
                    setRevPage(1);
                  }}
                />
              </div>

              <div className="field" style={{ justifyContent: 'flex-end' }}>
                <label style={{ visibility: 'hidden' }}>Reset</label>
                <button
                  className="btn btnSecondary"
                  onClick={() => {
                    setRevSubject('');
                    setRevTopic('');
                    setRevStatus('pending');
                    setRevPage(1);
                  }}
                >
                  <RotateCcw size={14} /> Reset Filter
                </button>
              </div>
            </div>
          </div>

          {/* REVISION QUESTIONS LIST */}
          <div className="stack" style={{ gap: 16 }}>
            {revData.items.length > 0 ? (
              revData.items.map((q) => {
                const isCorrectView = revStatus === 'correct' || (q as any).isCorrect;
                const selectedKeys =
                  revSelected[q.id] ||
                  (isCorrectView ? (q as any).userSelectedKeys || q.correctOptionKeys || [] : []);
                const answerResult =
                  revAnswers[q.id] ||
                  (isCorrectView
                    ? {
                        isCorrect: true,
                        correctOptionKeys: q.correctOptionKeys || [],
                        explanation: q.explanation || '',
                      }
                    : undefined);

                return (
                  <div key={q.id} className="card">
                    <div className="row between wrap" style={{ marginBottom: 14 }}>
                      <div className="row wrap" style={{ gap: 8 }}>
                        <span className={`badge ${q.needsRevision ? 'red' : 'green'}`}>
                          {q.needsRevision ? 'Needs Revision' : isCorrectView ? '✓ Correct in Test' : 'Resolved'}
                        </span>
                        <span className="badge">
                          {q.subject} / {q.topics.join(', ')}
                        </span>
                      </div>
                      <span className="hint">
                        {isCorrectView ? 'Status: Mastered' : `Revision attempts: ${q.revisionCount ?? 0}`}
                      </span>
                    </div>

                    <QuestionCard
                      q={q}
                      selected={selectedKeys}
                      onSelect={
                        answerResult
                          ? undefined
                          : (keys) => setRevSelected((prev) => ({ ...prev, [q.id]: keys }))
                      }
                      reveal={answerResult}
                    />

                    <div style={{ marginTop: 16 }}>
                      {isCorrectView ? (
                        <div className="row wrap between" style={{ gap: 10 }}>
                          <span className="hint" style={{ color: 'var(--green-dark)', fontWeight: 600 }}>
                            ✓ You answered this question correctly in your assessment!
                          </span>
                          {q.testId && (
                            <Link href={`/test/${q.testId}`} className="btn btnSmall btnSecondary">
                              View Assessment
                            </Link>
                          )}
                        </div>
                      ) : !answerResult ? (
                        <button
                          className="btn"
                          disabled={selectedKeys.length === 0}
                          onClick={() => submitRevisionAttempt(q)}
                        >
                          <Check size={16} /> Check Revision Answer
                        </button>
                      ) : (
                        <button
                          className="btn btnSecondary"
                          onClick={() => {
                            setRevAnswers((prev) => {
                              const copy = { ...prev };
                              delete copy[q.id];
                              return copy;
                            });
                            setRevSelected((prev) => ({ ...prev, [q.id]: [] }));
                          }}
                        >
                          <RotateCcw size={15} /> Try Again
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="card">
                <div className="empty">
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>
                    No questions found!
                  </div>
                  <p className="muted" style={{ margin: 0 }}>
                    {revStatus === 'pending'
                      ? 'Congratulations! You have resolved all pending mistakes in this filter.'
                      : revStatus === 'resolved'
                      ? 'No resolved mistakes found. Questions you missed and then successfully revised will appear here.'
                      : revStatus === 'correct'
                      ? 'No correctly answered questions found yet. Complete a daily test to see questions you answered correctly!'
                      : 'No questions match your current filter criteria.'}
                  </p>
                </div>
              </div>
            )}

            <Pagination page={revPage} total={revData.total} size={revData.pageSize} onPage={setRevPage} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PROGRESS & STATS */}
      {/* ========================================================================= */}
      {activeTab === 'progress' && (
        <div className="stack" style={{ gap: 18 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>My Learning Progress</h2>
            <p className="hint" style={{ margin: 0 }}>Review topic strengths, accuracy breakdown, and assessment history</p>
          </div>

          <Notice error={progError} />

          {/* SUMMARY STATS */}
          <div className="grid">
            <div className="card">
              <div className="hint">Submitted Tests</div>
              <div className="kpiVal" style={{ fontSize: 28, marginTop: 6 }}>{progressData?.attempts.length ?? '—'}</div>
              <div className="hint" style={{ marginTop: 4 }}>Daily assessments logged</div>
            </div>

            <div className="card">
              <div className="hint">Topic Groups Practiced</div>
              <div className="kpiVal" style={{ fontSize: 28, marginTop: 6 }}>{progressData?.topics.length ?? '—'}</div>
              <div className="hint" style={{ marginTop: 4 }}>Unique subject & topic areas</div>
            </div>

            <div className="card">
              <div className="hint">Pending Revisions</div>
              <div className="kpiVal" style={{ fontSize: 28, marginTop: 6, color: (progressData?.pending ?? 0) > 0 ? '#ef4444' : '#10b981' }}>
                {progressData?.pending ?? '—'}
              </div>
              <div className="hint" style={{ marginTop: 4 }}>Mistakes left to resolve</div>
            </div>
          </div>

          {/* TOPIC ACCURACY PROGRESS */}
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Topic Accuracy Breakdown</h3>
            {progressData?.topics && progressData.topics.length > 0 ? (
              <div className="stack" style={{ gap: 16 }}>
                {progressData.topics
                  .slice()
                  .sort((a, b) => a.correct / a.total - b.correct / b.total)
                  .map((t) => {
                    const pct = Math.round((t.correct / t.total) * 100);
                    const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#2563eb' : '#f59e0b';

                    return (
                      <div key={`${t.subject}/${t.topic}`}>
                        <div className="row between">
                          <strong style={{ fontSize: 13, textTransform: 'capitalize' }}>
                            {t.subject.replace('_', ' ')} / {t.topic.replace('_', ' ')}
                          </strong>
                          <span className="hint">
                            {t.correct} / {t.total} · <strong style={{ color: barColor }}>{pct}%</strong>
                          </span>
                        </div>
                        <div className="progress" style={{ marginTop: 8 }}>
                          <div style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="empty">Topic accuracy metrics will appear after your first submitted test.</div>
            )}
          </div>

          {/* ASSESSMENT HISTORY TABLE */}
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Assessment History</h3>
            {progressData?.attempts && progressData.attempts.length > 0 ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Assessment</th>
                      <th>Correct</th>
                      <th>Score</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressData.attempts.map((x) => (
                      <tr key={x.testId}>
                        <td style={{ whiteSpace: 'nowrap' }}>{x.date}</td>
                        <td><strong>{x.title}</strong></td>
                        <td>{x.correctCount} / {x.total}</td>
                        <td>
                          <span className={`badge ${x.score >= 80 ? 'green' : x.score >= 50 ? '' : 'orange'}`}>
                            {x.score}%
                          </span>
                        </td>
                        <td>
                          <Link href={`/test/${x.testId}`} className="btn btnSmall btnSecondary">
                            Review Test
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">No tests submitted yet. Completed tests will appear here.</div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (MATCHING SCREENSHOT) */}
      {/* ========================================================================= */}
      <div className="mobileBottomNav">
        <button
          className={`bottomNavBtn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <CalendarDays size={20} />
          <span>Today</span>
        </button>

        <button
          className={`bottomNavBtn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          <HelpCircle size={20} />
          <span>Questions</span>
        </button>

        <button
          className={`bottomNavBtn ${activeTab === 'revision' ? 'active' : ''}`}
          onClick={() => setActiveTab('revision')}
        >
          <RotateCcw size={20} />
          <span>Revision</span>
          {(dash?.needsRevision ?? 2) > 0 && <span className="bottomNavBadge">{dash?.needsRevision ?? 2}</span>}
        </button>

        <button
          className={`bottomNavBtn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <BarChart3 size={20} />
          <span>Progress</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* QUICK SEARCH MODAL */}
      {/* ========================================================================= */}
      {searchModalOpen && (
        <div className="searchModalBackdrop" onClick={() => setSearchModalOpen(false)}>
          <div className="searchModalCard" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <strong style={{ fontSize: 16 }}>Search Practice Questions</strong>
              <button
                style={{ background: 'none', border: 0, color: 'var(--text-muted)' }}
                onClick={() => setSearchModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="field">
              <input
                className="input"
                placeholder="Search by topic, keyword, or concept (e.g. pivot tables, sql join)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {searchQuery.trim() ? (
                searchResults.length > 0 ? (
                  searchResults.map((q) => (
                    <div key={q.id} className="listCard" style={{ padding: '10px 0' }}>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: 10 }}>
                        <div className="row wrap" style={{ gap: 6, marginBottom: 4 }}>
                          <span className="badge">{q.subject}</span>
                          <span className="badge">{q.difficulty}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {q.questionText.length > 100 ? q.questionText.slice(0, 100) + '…' : q.questionText}
                        </div>
                      </div>
                      {q.testId && (
                        <Link
                          href={`/test/${q.testId}`}
                          className="btn btnSmall"
                          onClick={() => setSearchModalOpen(false)}
                        >
                          Open Test
                        </Link>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty">No questions found matching "{searchQuery}".</div>
                )
              ) : (
                <div className="hint" style={{ textAlign: 'center', padding: '20px 0' }}>
                  Type a concept to instantly search across released questions.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
