'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Users } from 'lucide-react';
import { roleCatalog } from '@/lib/role-catalog';
import type { CohortView } from '@/lib/types';
import { meetsRequirements, readiness } from '@/lib/engine';
import { Meter, Stat } from './ui';
export function Cohort() {
  const [roleId, setRoleId] = useState('data-analyst');
  const [data, setData] = useState<CohortView | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    fetch(`/api/demo?view=cohort&roleId=${encodeURIComponent(roleId)}`)
      .then(async (r) => {
        if (!r.ok)
          throw new Error('Could not load the cohort. Check that the seed process has run.');
        const d = await r.json();
        if (live) {
          setData(d);
          setError('');
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [reload, roleId]);
  if (error)
    return (
      <div className="card empty">
        <h2>Could not load the demo cohort.</h2>
        <p role="alert">{error}</p>
        <button className="btn btn-primary" onClick={() => setReload(reload + 1)}>
          Retry
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="loading" role="status">
        Loading placement insights…
      </div>
    );
  const diagnosed = data.members.filter((m) => m.diagnosed);
  const average = (values: number[]) =>
    values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const initial = average(diagnosed.map((m) => readiness(m.initialScores, data.skills)));
  const current = average(diagnosed.map((m) => readiness(m.currentScores, data.skills)));
  const assigned = diagnosed.reduce((n, m) => n + m.modulesAssigned, 0);
  const completed = diagnosed.reduce((n, m) => n + m.modulesCompleted, 0);
  const ready = diagnosed.filter((m) =>
    meetsRequirements(
      m.currentScores,
      data.skills.map((s) => ({ skillId: s.id, target: s.target })),
    ),
  ).length;
  const distribution = [
    {
      label: 'Needs development (<45)',
      count: diagnosed.filter((m) => readiness(m.currentScores, data.skills) < 45).length,
    },
    {
      label: 'Developing (45–74)',
      count: diagnosed.filter((m) => {
        const n = readiness(m.currentScores, data.skills);
        return n >= 45 && n < 75;
      }).length,
    },
    {
      label: 'Higher indicator (75+)',
      count: diagnosed.filter((m) => readiness(m.currentScores, data.skills) >= 75).length,
    },
  ];
  const improvement = {
    improved: diagnosed.filter(
      (m) => readiness(m.currentScores, data.skills) > readiness(m.initialScores, data.skills),
    ).length,
    declined: diagnosed.filter(
      (m) => readiness(m.currentScores, data.skills) < readiness(m.initialScores, data.skills),
    ).length,
    flat: diagnosed.filter(
      (m) => readiness(m.currentScores, data.skills) === readiness(m.initialScores, data.skills),
    ).length,
  };
  const gaps = data.skills
    .map((s) => ({
      ...s,
      count: diagnosed.filter(
        (m) => (m.currentScores.find((x) => x.skillId === s.id)?.score ?? 0) < s.target,
      ).length,
      initial: average(
        diagnosed.map((m) => m.initialScores.find((x) => x.skillId === s.id)?.score ?? 0),
      ),
      current: average(
        diagnosed.map((m) => m.currentScores.find((x) => x.skillId === s.id)?.score ?? 0),
      ),
    }))
    .sort((a, b) => b.count - a.count);
  return (
    <>
      <div className="page-heading">
        <label className="role-switch">
          <span>Cohort role</span>
          <select
            aria-label="Cohort role"
            value={roleId}
            onChange={(e) => {
              if (e.target.value !== roleId) {
                setRoleId(e.target.value);
                setData(null);
                setError('');
              }
            }}
          >
            {roleCatalog.map((role) => (
              <option value={role.id} key={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="eyebrow">PLACEMENT CELL · {data.role.name.toUpperCase()}</span>
          <h1>See the gaps. Track the change.</h1>
          <p>
            {data.college}
            <br />
            {data.cohort}
          </p>
        </div>
        <span className="badge badge-warm">
          <Users size={14} />
          Fictional seeded data
        </span>
      </div>
      <div className="dashboard-note">
        This dashboard demonstrates a placement-cell view using 30 fictional students. It is
        separate from your live student demo; these figures are illustrative fixtures, not real
        learning outcomes.
      </div>
      <div className="stats-grid">
        <Stat
          label="Students in cohort"
          value={data.members.length}
          detail={`${diagnosed.length} completed diagnostics`}
        />
        <Stat
          label="Average initial indicator"
          value={`${initial}%`}
          detail="Diagnosed students only"
        />
        <Stat
          label="Average current indicator"
          value={`${current}%`}
          detail={`${current - initial > 0 ? '+' : ''}${current - initial} points vs initial average`}
          accent
        />
        <Stat
          label="Meets every role target"
          value={`${ready} / ${diagnosed.length}`}
          detail="Prototype threshold, not employability"
        />
      </div>
      <section className="card">
        <div className="section-title">
          <h2>Cohort evidence and next actions</h2>
          <span className="badge badge-warm">Fictional fixtures only</span>
        </div>
        <div className="stats-grid">
          <Stat
            label="Incomplete diagnostics"
            value={data.members.length - diagnosed.length}
            detail="Invite these learners to establish a baseline"
          />
          <Stat
            label="Repair activity complete"
            value={
              diagnosed.filter(
                (m) => m.modulesAssigned > 0 && m.modulesCompleted >= m.modulesAssigned,
              ).length
            }
            detail="Candidate group for fresh reassessment"
          />
          <Stat
            label="Improvement distribution"
            value={`${improvement.improved} ↑ / ${improvement.declined} ↓`}
            detail={`${improvement.flat} unchanged; fictional sample scores`}
          />
          <Stat
            label="Evidence strength"
            value="Limited"
            detail="Fixture summaries lack task-type and scenario diversity; confidence is not inferred"
          />
        </div>
        <div className="tags">
          {distribution.map((d) => (
            <span className="tag" key={d.label}>
              {d.label}: {d.count}
            </span>
          ))}
        </div>
      </section>
      <div className="results-columns">
        <section className="card">
          <div className="section-title">
            <div>
              <span className="eyebrow">WHERE TO FOCUS SUPPORT</span>
              <h2>Common skill gaps</h2>
            </div>
            <span className="muted small">Below role target</span>
          </div>
          {gaps.slice(0, 8).map((g) => (
            <div className="distribution-row" key={g.id}>
              <div>
                <span>{g.name}</span>
                <b>{g.count} students</b>
              </div>
              <Meter
                value={(g.count / diagnosed.length) * 100}
                label={`Students below ${g.name} target`}
                negative
              />
            </div>
          ))}
        </section>
        <section className="card">
          <span className="eyebrow">TARGETED LEARNING</span>
          <h2>Participation with a purpose.</h2>
          <div className="dashboard-big">
            {assigned ? Math.round((completed / assigned) * 100) : 0}
            <small>%</small>
          </div>
          <p>
            {completed} of {assigned} assigned gap-repair modules mastered.
          </p>
          <Meter
            value={assigned ? (completed / assigned) * 100 : 0}
            label="Cohort learning completion"
          />
          <div className="dashboard-insight">
            <h3>One clear placement-cell action</h3>
            <p>
              Prioritize a focused workshop on {gaps[0]?.name.toLowerCase()}. Then reassess with
              equivalent tasks to see whether the gap actually narrowed.
            </p>
          </div>
          <div className="dashboard-insight">
            <h3>Read improvement honestly</h3>
            <p>
              Some sample students decline. Average improvement should always be considered
              alongside skill-level gaps and assessment coverage.
            </p>
          </div>
        </section>
      </div>
      <section className="card">
        <div className="section-title">
          <h2>Skill-gap distribution</h2>
          <span className="small muted">Averages across {diagnosed.length} diagnosed students</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Skill</th>
                <th>Initial average</th>
                <th>Current average</th>
                <th>Below target</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((g) => (
                <tr key={g.id}>
                  <td>
                    <b>{g.name}</b>
                  </td>
                  <td>{g.initial}%</td>
                  <td>{g.current}%</td>
                  <td>
                    {g.count} / {diagnosed.length}
                    <Meter
                      value={(g.count / diagnosed.length) * 100}
                      label={`${g.name} gap distribution`}
                      negative
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <div className="section-title">
          <h2>Cohort overview</h2>
          <span className="small muted">Anonymous fictional aliases</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Diagnostic</th>
                <th>Initial → current</th>
                <th>Change</th>
                <th>Modules</th>
                <th>Prototype targets</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => {
                const b = readiness(m.initialScores, data.skills);
                const a = readiness(m.currentScores, data.skills);
                const meets = meetsRequirements(
                  m.currentScores,
                  data.skills.map((s) => ({ skillId: s.id, target: s.target })),
                );
                return (
                  <tr key={m.alias}>
                    <td>
                      <b>{m.alias}</b>
                    </td>
                    <td>
                      <span className={`badge ${m.diagnosed ? 'badge-green' : ''}`}>
                        {m.diagnosed ? 'Complete' : 'Not started'}
                      </span>
                    </td>
                    <td>
                      {m.diagnosed ? (
                        <span className="inline-change">
                          {b}%<ArrowRight size={13} />
                          {a}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{m.diagnosed ? `${a - b > 0 ? '+' : ''}${a - b} pts` : '—'}</td>
                    <td>
                      {m.modulesCompleted} / {m.modulesAssigned}
                    </td>
                    <td>{!m.diagnosed ? 'No evidence' : meets ? 'All met' : 'Gaps remain'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <p className="disclaimer">
        Readiness indicators are estimates based on prototype assessment performance. They do not
        guarantee placement, employability, or hiring outcomes.
      </p>
    </>
  );
}
