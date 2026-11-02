import { ArrowUpRight, Check, ChevronRight } from 'lucide-react';
import { strength } from '@/lib/authentic/grading';
import type { Skill, Score } from '@/lib/types';
export function Meter({
  value,
  target,
  label,
  negative = false,
}: {
  value: number;
  target?: number;
  label: string;
  negative?: boolean;
}) {
  return (
    <div
      className={`meter ${negative ? 'meter-warm' : ''}`}
      role="img"
      aria-label={`${label}: ${value}%${target ? `, target ${target}%` : ''}`}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      {target !== undefined && <i style={{ left: `${target}%` }} />}
    </div>
  );
}
export function Stat({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat ${accent ? 'stat-accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function SkillTable({
  skills,
  scores,
  before,
  employer,
}: {
  skills: Skill[];
  scores: Score[];
  before?: Score[];
  employer?: { skillId: string; target: number }[];
}) {
  return (
    <div className="table-wrap">
      <table className="skill-table">
        <thead>
          <tr>
            <th>Skill</th>
            {before && <th>Baseline</th>}
            <th>Current</th>
            <th>Target</th>
            <th>{employer ? 'Requirement match' : 'Evidence'}</th>
            {!employer && <th>Evidence strength / state</th>}
          </tr>
        </thead>
        <tbody>
          {skills.map((s) => {
            const score = scores.find((x) => x.skillId === s.id);
            const quality =
              score?.quality ??
              strength(score?.evidence ?? 0, {
                types: ['decision'],
                scenarios: [],
                transfer: 0,
                independent: 0,
              });
            const target = employer?.find((r) => r.skillId === s.id)?.target ?? s.target;
            return (
              <tr key={s.id}>
                <td>
                  <b>{s.name}</b>
                  <Meter value={score?.score ?? 0} target={target} label={s.name} />
                </td>
                {before && <td>{before.find((x) => x.skillId === s.id)?.score ?? 0}%</td>}
                <td>
                  <b>{score?.score ?? 0}%</b>
                </td>
                <td>{target}%</td>
                <td>
                  {employer ? (
                    <span
                      className={`badge ${(score?.score ?? 0) >= target ? 'badge-green' : 'badge-warm'}`}
                    >
                      {(score?.score ?? 0) >= target ? 'Meets' : 'Below'}
                    </span>
                  ) : (
                    <span className="evidence-detail">
                      {score?.evidence ?? 0} opportunities
                      {quality.cumulativeCount !== undefined && (
                        <small>
                          {quality.cumulativeCount} unique opportunities across completed banks
                        </small>
                      )}
                      <small>{quality.types.join(', ').replaceAll('-', ' ')}</small>
                      {quality.transfer > 0 && <small>Transfer evidence: {quality.transfer}</small>}
                    </span>
                  )}
                </td>
                {!employer && (
                  <td>
                    <span className="badge">{quality.strength}</span>
                    <small className="evidence-detail">
                      {quality.strength === 'Limited evidence'
                        ? 'Tentative signal'
                        : (score?.score ?? 0) >= target
                          ? quality.strength === 'Stronger evidence'
                            ? 'Strong'
                            : 'Developing'
                          : (score?.score ?? 0) < target - 20
                            ? 'Priority gap'
                            : 'Developing'}
                    </small>
                    <details>
                      <summary>Why this label?</summary>
                      <p>{quality.reason}</p>
                    </details>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
export function Steps({ active = 0 }: { active?: number }) {
  return (
    <div className="journey">
      {['Diagnose', 'Fix your gaps', 'Verify', 'Readiness report'].map((s, i) => (
        <div className={i === active ? 'journey-active' : i < active ? 'journey-done' : ''} key={s}>
          <span>{i < active ? <Check size={14} /> : String(i + 1).padStart(2, '0')}</span>
          <b>{s}</b>
          {i < 3 && <ChevronRight size={14} />}
        </div>
      ))}
    </div>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty card">
      <div className="empty-mark">
        <ArrowUpRight size={26} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
