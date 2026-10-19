'use client';
import {useState} from 'react';
import type {ReactNode} from 'react';
export function Header({title,subtitle,action}:{title:string,subtitle?:string,action?:ReactNode}){return <div className="pageHead"><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>}
export function Box({children,title}:{children:ReactNode,title?:string}){return <section className="card">{title&&<h2>{title}</h2>}{children}</section>}
export function Notice({error,success}:{error?:string,success?:string}){return <>{error&&<div className="error">{error}</div>}{success&&<div className="success">{success}</div>}</>}
export function Pagination({page,total,size,onPage}:{page:number,total:number,size:number,onPage:(p:number)=>void}){return <div className="pagination"><span className="hint">{total} results · Page {page} of {Math.max(1,Math.ceil(total/size))}</span><button className="btn btnSecondary btnSmall" disabled={page<=1} onClick={()=>onPage(page-1)}>Previous</button><button className="btn btnSecondary btnSmall" disabled={page>=Math.ceil(total/size)} onClick={()=>onPage(page+1)}>Next</button></div>}
function renderInline(str: string): ReactNode[] {
  const parts = str.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          style={{
            background: 'var(--brand-light, #eff6ff)',
            color: 'var(--brand, #2563eb)',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: '0.9em',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'var(--text, #0f172a)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function GoogleSheetsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: 'middle', flexShrink: 0 }}
    >
      <rect x="2" y="1.5" width="20" height="21" rx="3.5" fill="#0F9D58" />
      <path d="M14 1.5V7.5H22" fill="#87CEAB" />
      <path d="M14 1.5H5C3.9 1.5 3 2.4 3 3.5V20.5C3 21.6 3.9 22.5 5 22.5H19C20.1 22.5 21 21.6 21 20.5V8.5L14 1.5Z" fill="#0F9D58" />
      <rect x="5.5" y="9.5" width="13" height="9.5" rx="1.2" fill="#FFFFFF" />
      <path d="M5.5 13H18.5M5.5 16H18.5M10.2 9.5V19M14.5 9.5V19" stroke="#0F9D58" strokeWidth="1" />
    </svg>
  );
}

function copyToClipboard(text: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  } catch {}

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function TableBlock({
  headers,
  bodyRows,
  templateUrl,
}: {
  headers: string[];
  bodyRows: string[][];
  templateUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const tsv = [
    headers.join('\t'),
    ...bodyRows.map((r) => r.join('\t')),
  ].join('\n');

  const handleOpenSheets = () => {
    // If a direct Google Sheet template URL is provided, open it directly
    if (templateUrl) {
      const copyUrl = templateUrl.includes('/copy')
        ? templateUrl
        : templateUrl.replace(/\/edit.*$/, '') + '/copy';
      window.open(copyUrl, '_blank');
      return;
    }

    // 1. Synchronously copy TSV to clipboard (guarantees clipboard data is set)
    copyToClipboard(tsv);
    setCopied(true);

    // 2. Open new Google Sheet
    if (typeof window !== 'undefined') {
      window.open('https://sheets.new', '_blank');
    }

    // 3. Show clear instructions modal
    setShowModal(true);

    setTimeout(() => setCopied(false), 5000);
  };

  const handleDownloadCSV = () => {
    const csv = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...bodyRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_transactions_dataset.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        margin: '14px 0',
        border: '1px solid var(--border, #e2e8f0)',
        borderRadius: 'var(--radius-sm, 8px)',
        overflow: 'hidden',
        background: 'var(--card, #fff)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Top Table Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'var(--card-subtle, #f8fafc)',
          borderBottom: '1px solid var(--border, #e2e8f0)',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <GoogleSheetsIcon size={18} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #475569)' }}>
            Data Table · {bodyRows.length} rows
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={handleOpenSheets}
            title="Open in Google Sheets"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 13px',
              fontSize: 12,
              fontWeight: 700,
              background: copied ? '#ecfdf5' : '#ffffff',
              borderColor: copied ? '#059669' : '#cbd5e1',
              color: copied ? '#047857' : '#0f172a',
              borderWidth: 1,
              borderStyle: 'solid',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <GoogleSheetsIcon size={15} />
            <span>{copied ? '✓ Copied & Opened!' : 'Open in Google Sheets'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCSV}
            title="Download table data as CSV file"
            style={{
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 600,
              background: 'transparent',
              color: 'var(--text-muted, #64748b)',
              border: '1px solid var(--border, #e2e8f0)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            CSV
          </button>
        </div>
      </div>

      {/* Guidance Modal when opening sheets.new */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              maxWidth: 480,
              width: '100%',
              padding: '24px 26px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <GoogleSheetsIcon size={32} />
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                  Google Sheet Opened in New Tab
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>
                  Follow this quick step to paste your data
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: 10,
                padding: '14px 16px',
                margin: '16px 0',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 14, color: '#065f46', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✅</span> All {bodyRows.length} rows have been copied to your clipboard!
              </div>
              <div style={{ fontSize: 13, color: '#047857', lineHeight: 1.6 }}>
                Google protects your account by requiring you to paste into the sheet:
                <ol style={{ margin: '8px 0 0 18px', padding: 0 }}>
                  <li>Switch to the newly opened <strong>Google Sheets tab</strong>.</li>
                  <li>Click on cell <strong>A1</strong> (top-left).</li>
                  <li>
                    Press{' '}
                    <strong
                      style={{
                        background: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid #a7f3d0',
                        fontFamily: 'monospace',
                      }}
                    >
                      Ctrl + V
                    </strong>{' '}
                    (or{' '}
                    <strong
                      style={{
                        background: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid #a7f3d0',
                        fontFamily: 'monospace',
                      }}
                    >
                      Cmd + V
                    </strong>
                    ) to paste all data instantly!
                  </li>
                </ol>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(tsv);
                  alert('Data copied to clipboard again!');
                }}
                className="btn btnSecondary btnSmall"
                style={{ fontSize: 12 }}
              >
                📋 Re-copy Data
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="btn btnSecondary btnSmall"
                  style={{ fontSize: 12 }}
                >
                  📥 Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btnSmall"
                  style={{
                    background: '#10b981',
                    borderColor: '#059669',
                    color: '#ffffff',
                    fontWeight: 700,
                  }}
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Element */}

      <div className="tableWrap" style={{ overflowX: 'auto' }}>
        <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--card-subtle, #f8fafc)' }}>
              {headers.map((h, hi) => (
                <th
                  key={hi}
                  style={{
                    padding: '9px 12px',
                    borderBottom: '2px solid var(--border, #cbd5e1)',
                    fontWeight: 700,
                    fontSize: 12,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-muted, #475569)',
                  }}
                >
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid var(--border, #f1f5f9)' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: '8px 12px', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderContentBlock(rawText: string, keyPrefix: string | number) {
  const sheetMatch = rawText.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const detectedTemplateUrl = sheetMatch
    ? `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/copy`
    : undefined;
  const envTemplate = process.env.NEXT_PUBLIC_GOOGLE_SHEET_TEMPLATE_URL;
  const effectiveTemplateUrl = detectedTemplateUrl || (envTemplate ? (envTemplate.includes('/copy') ? envTemplate : envTemplate.replace(/\/edit.*$/, '') + '/copy') : undefined);

  const lines = rawText.split('\n');
  const elements: ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (k: number) => {
    if (tableBuffer.length >= 2) {
      const rows = tableBuffer.map((l) =>
        l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
      );
      const isSep = rows[1]?.every((c) => /^:?-+:?$/.test(c));
      const headers = rows[0];
      const bodyRows = isSep ? rows.slice(2) : rows.slice(1);

      elements.push(
        <TableBlock
          key={`tbl-${k}`}
          headers={headers}
          bodyRows={bodyRows}
          templateUrl={effectiveTemplateUrl}
        />
      );
    }
    tableBuffer = [];
    inTable = false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableBuffer.push(trimmed);
      return;
    }
    if (inTable) {
      flushTable(idx);
    }

    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} style={{ height: 6 }} />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${idx}`} style={{ margin: '14px 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--text, #0f172a)' }}>
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${idx}`} style={{ margin: '16px 0 8px', fontSize: 16, fontWeight: 800, color: 'var(--brand, #2563eb)' }}>
          {renderInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    if (/^(\d+\.|\-|\*)\s/.test(trimmed)) {
      const bulletText = trimmed.replace(/^(\d+\.|\-|\*)\s+/, '');
      elements.push(
        <div key={`li-${idx}`} style={{ display: 'flex', gap: 8, margin: '3px 0', fontSize: 14, lineHeight: 1.5 }}>
          <span style={{ color: 'var(--brand, #2563eb)', fontWeight: 700 }}>•</span>
          <span style={{ flex: 1 }}>{renderInline(bulletText)}</span>
        </div>
      );
      return;
    }

    elements.push(
      <p key={`p-${idx}`} style={{ margin: '4px 0', fontSize: 14.5, lineHeight: 1.6 }}>
        {renderInline(line)}
      </p>
    );
  });

  if (inTable) {
    flushTable(lines.length);
  }

  return <div key={keyPrefix}>{elements}</div>;
}

export function QuestionText({text}:{text:string}){
  const parts=text.split(/```([\w+-]*)\n([\s\S]*?)```/g);
  return (
    <div className="questionStack" style={{ color: 'var(--text, #0f172a)' }}>
      {parts.map((p, i) =>
        i % 3 === 2 ? (
          <pre
            className="codeBlock"
            key={i}
            style={{
              margin: '10px 0',
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm, 8px)',
              background: '#0f172a',
              color: '#f8fafc',
              overflowX: 'auto',
              fontSize: 13,
            }}
          >
            <code style={{ background: 'none', padding: 0, color: 'inherit', fontFamily: 'monospace' }}>{p}</code>
          </pre>
        ) : i % 3 === 1 ? null : (
          renderContentBlock(p, i)
        )
      )}
    </div>
  );
}
export type QuizQuestion={id:string,type:'single_choice'|'multiple_choice'|'true_false',subject:string,topics:string[],tags:string[],difficulty:string,questionText:string,mediaIds:string[],options:{key:string,text:string,mediaId?:string}[],correctOptionKeys?:string[],explanation?:string,testId?:string,date?:string,needsRevision?:boolean,revisionCount?:number};
export function QuestionCard({q,selected,onSelect,reveal}:{q:QuizQuestion,selected:string[],onSelect?:(keys:string[])=>void,reveal?:{isCorrect:boolean,correctOptionKeys:string[],explanation:string}}){
 return <div className="stack" style={{gap:14}}><div className="row wrap"><span className="badge">{q.subject} / {q.topics.join(', ')}</span><span className="badge">{q.difficulty}</span></div><QuestionText text={q.questionText}/>
 {q.mediaIds?.map(id=><img key={id} className="qImage" alt="Question illustration" src={'/api/v1/media/'+id}/>)}
 <div>{q.options?.map(o=><label key={o.key} className={'option '+(selected.includes(o.key)?'selected':'')}><input type={q.type==='multiple_choice'?'checkbox':'radio'} checked={selected.includes(o.key)} disabled={!onSelect} onChange={()=>{
 if(!onSelect)return;onSelect(q.type==='multiple_choice'?(selected.includes(o.key)?selected.filter(x=>x!==o.key):[...selected,o.key]):[o.key]);}}/><div><strong>{o.key}.</strong> {o.text}{o.mediaId&&<img alt={'Option '+o.key} src={'/api/v1/media/'+o.mediaId}/>}</div></label>)}</div>
 {reveal&&<div className={reveal.isCorrect?'success':'error'}><strong>{reveal.isCorrect?'Correct':'Incorrect'}.</strong> Correct: {reveal.correctOptionKeys.join(', ')}<div style={{marginTop:9,whiteSpace:'pre-wrap'}}>{reveal.explanation}</div></div>}
 </div>
}
