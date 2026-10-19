'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, Save, Send } from 'lucide-react';
import { QuestionCard, QuizQuestion, Notice } from '@/components/UI';
import { api, post } from '@/lib/api-fetch';

type Test = {
  test: {
    id: string;
    title: string;
    date: string;
    questions: QuizQuestion[];
  };
  attempt: {
    status: string;
    answers: { questionId: string; selectedOptionKeys: string[]; isCorrect?: boolean }[];
    score?: number;
    correctCount?: number;
  } | null;
};

export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = () =>
    api<Test>('/api/v1/learner/daily-tests/' + id)
      .then((r) => {
        setInfo(r);
        setAnswers(Object.fromEntries((r.attempt?.answers || []).map((x) => [x.questionId, x.selectedOptionKeys])));
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    refresh();
  }, [id]);

  useEffect(() => {
    if (!info || info.attempt?.status === 'submitted' || Object.keys(answers).length === 0) return;
    const timer = setTimeout(() => {
      post(`/api/v1/learner/daily-tests/${id}/answers`, {
        answers: Object.entries(answers).map(([questionId, selectedOptionKeys]) => ({
          questionId,
          selectedOptionKeys,
        })),
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [answers, info, id]);

  if (!info) {
    return (
      <div className="stack">
        <Notice error={error} />
        <div className="loading">Loading assessment questions...</div>
      </div>
    );
  }

  const qs = info.test.questions;
  const q = qs[index];
  if (!q) return <div className="error">Test has no questions.</div>;

  const submitted = info.attempt?.status === 'submitted';
  const selected = answers[q.id] || [];

  async function save() {
    setBusy(true);
    setError('');
    try {
      await post(`/api/v1/learner/daily-tests/${id}/answers`, {
        answers: Object.entries(answers).map(([questionId, selectedOptionKeys]) => ({
          questionId,
          selectedOptionKeys,
        })),
      });
      setSuccess('Progress saved');
      setTimeout(() => setSuccess(''), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!confirm('Submit your daily test? You cannot modify your answers after submission.')) return;
    setBusy(true);
    setError('');
    try {
      await post(`/api/v1/learner/daily-tests/${id}/submit`, {
        answers: Object.entries(answers).map(([questionId, selectedOptionKeys]) => ({
          questionId,
          selectedOptionKeys,
        })),
      });
      await refresh();
      setSuccess('Your assessment has been submitted and evaluated.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const done = qs.filter((x) => (answers[x.id] || []).length > 0).length;
  const reveal = submitted
    ? {
        isCorrect: !!info.attempt?.answers.find((a) => a.questionId === q.id)?.isCorrect,
        correctOptionKeys: q.correctOptionKeys || [],
        explanation: q.explanation || '',
      }
    : undefined;

  return (
    <div className="stack" style={{ gap: 14 }}>
      {/* COMPACT HEADER */}
      <div className="row between wrap" style={{ gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px', color: '#0f172a' }}>
            {info.test.title}
          </h1>
          <div className="hint" style={{ fontSize: 12 }}>
            {info.test.date} · {qs.length} question{qs.length > 1 ? 's' : ''}
          </div>
        </div>

        {submitted && (
          <span className="badge green" style={{ padding: '5px 12px', fontSize: 12 }}>
            <CheckCircle size={14} /> Submitted · Score: {info.attempt?.score}% ({info.attempt?.correctCount}/{qs.length} correct)
          </span>
        )}
      </div>

      <Notice error={error} success={success} />

      {/* SINGLE INTEGRATED QUESTION CARD: FITS FULLY ON SCREEN */}
      <div className="card" style={{ padding: '20px 24px' }}>
        {/* Progress & Quick Jump Row */}
        <div className="row between wrap" style={{ marginBottom: 12, gap: 10 }}>
          <div className="row wrap" style={{ gap: 8 }}>
            <span className="badge" style={{ background: '#f1f5f9', color: '#1e293b', borderColor: '#cbd5e1' }}>
              Question {index + 1} of {qs.length}
            </span>
            <span className="hint" style={{ fontSize: 12 }}>
              {done} of {qs.length} answered
            </span>
          </div>

          {qs.length > 1 && (
            <div className="row wrap" style={{ gap: 4 }}>
              {qs.map((x, i) => {
                const isAnswered = (answers[x.id] || []).length > 0;
                const isCurrent = i === index;
                return (
                  <button
                    key={x.id}
                    onClick={() => setIndex(i)}
                    className={`btn btnSmall ${isCurrent ? '' : 'btnSecondary'}`}
                    style={{
                      minWidth: 32,
                      height: 30,
                      padding: '2px 8px',
                      fontSize: 11,
                      background: !isCurrent && isAnswered ? '#ecfdf5' : undefined,
                      borderColor: !isCurrent && isAnswered ? '#a7f3d0' : undefined,
                      color: !isCurrent && isAnswered ? '#047857' : undefined,
                      fontWeight: isCurrent ? 800 : 600,
                    }}
                    title={`Question ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="progress" style={{ height: 4, marginBottom: 18 }}>
          <div style={{ width: `${(done / qs.length) * 100}%` }} />
        </div>

        {/* QUESTION AND OPTIONS */}
        <QuestionCard
          q={q}
          selected={selected}
          onSelect={
            submitted
              ? undefined
              : (keys) =>
                  setAnswers((a) => ({
                    ...a,
                    [q.id]: keys,
                  }))
          }
          reveal={reveal}
        />

        <div className="divider" style={{ margin: '20px 0 16px' }} />

        {/* BOTTOM ACTION BUTTONS */}
        <div className="row between wrap" style={{ gap: 10 }}>
          <button
            className="btn btnSecondary"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            <ArrowLeft size={15} /> Previous
          </button>

          <div className="row wrap" style={{ gap: 8 }}>
            {!submitted && (
              <button className="btn btnSecondary" disabled={busy} onClick={save}>
                <Save size={15} /> Save Progress
              </button>
            )}

            {index < qs.length - 1 ? (
              <button className="btn" onClick={() => setIndex((i) => i + 1)}>
                Next Question <ArrowRight size={15} />
              </button>
            ) : !submitted ? (
              <button className="btn" disabled={busy} onClick={submit}>
                <Send size={15} /> Submit Test
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
