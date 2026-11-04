import { createHash } from 'node:crypto';
import { pythonBanks } from '../src/lib/authentic/python-banks';
import { db } from '../src/lib/db';
import { tracks } from '../src/lib/tracks';

async function main() {
  await db.$transaction(
    async (tx) => {
      for (const {
        role,
        skills,
        diagnostic,
        reassessment,
        lessons,
        employerTargets,
        employerName,
      } of tracks) {
        await tx.role.upsert({
          where: { id: role.id },
          create: {
            id: role.id,
            name: role.name,
            description: role.description,
          },
          update: { name: role.name },
        });
        for (const category of new Set(skills.map((s) => s.category)))
          await tx.skillCategory.upsert({
            where: { id: category },
            create: { id: category, name: category },
            update: { name: category },
          });
        for (const s of skills) {
          const data = {
            name: s.name,
            description: s.description,
            categoryId: s.category,
            prerequisites: JSON.stringify(s.prerequisites),
          };
          await tx.skillNode.upsert({
            where: { id: s.id },
            create: { id: s.id, ...data },
            update: data,
          });
          await tx.roleSkillRequirement.upsert({
            where: { roleId_skillId: { roleId: role.id, skillId: s.id } },
            create: {
              roleId: role.id,
              skillId: s.id,
              target: s.target,
              importance: s.importance,
            },
            update: { target: s.target, importance: s.importance },
          });
        }
        for (const [kind, simulations] of Object.entries({ diagnostic, reassessment })) {
          const assessmentId = role.assessmentIds[kind as keyof typeof role.assessmentIds];
          await tx.assessment.upsert({
            where: { id: assessmentId },
            create: { id: assessmentId, roleId: role.id, kind },
            update: { kind },
          });
          for (const [position, s] of simulations.entries()) {
            const { items, ...scenario } = s;
            await tx.scenario.upsert({
              where: { id: s.id },
              create: { ...scenario, assessmentId, position },
              update: { ...scenario, position },
            });
            for (const [i, q] of items.entries()) {
              const { skills: mappings, options, ...item } = q;
              const data = {
                ...item,
                options: JSON.stringify(options),
                scenarioId: s.id,
                position: i,
              };
              await tx.assessmentQuestion.upsert({
                where: { id: q.id },
                create: data,
                update: data,
              });
              await tx.questionSkillMapping.deleteMany({ where: { questionId: q.id } });
              for (const m of mappings)
                await tx.questionSkillMapping.create({ data: { questionId: q.id, ...m } });
            }
          }
        }
        for (const l of lessons) {
          const data = { ...l, content: JSON.stringify(l.content) };
          await tx.lesson.upsert({ where: { id: l.id }, create: data, update: data });
        }
        await tx.employerProfile.upsert({
          where: { id: role.employerId },
          create: {
            id: role.employerId,
            roleId: role.id,
            name: employerName,
            description:
              'Fictional junior role profile. No employer endorsement or interview offer.',
          },
          update: {},
        });
        for (const s of skills)
          await tx.employerSkillRequirement.upsert({
            where: { profileId_skillId: { profileId: role.employerId, skillId: s.id } },
            create: { profileId: role.employerId, skillId: s.id, target: employerTargets[s.id] },
            update: { target: employerTargets[s.id] },
          });
        await tx.college.upsert({
          where: { id: 'demo-college' },
          create: { id: 'demo-college', name: 'Setu Institute of Technology · fictional' },
          update: {},
        });
        await tx.cohort.upsert({
          where: { id: role.cohortId },
          create: {
            id: role.cohortId,
            collegeId: 'demo-college',
            name: `${role.name} · final-year engineering demo cohort`,
            roleId: role.id,
          },
          update: {},
        });
        for (let i = 0; i < 30; i++) {
          const diagnosed = i < 26;
          const initialScores = skills.map((s, j) => ({
            skillId: s.id,
            score: diagnosed ? Math.min(100, 25 + ((i * 13 + j * 17) % 61)) : 0,
            evidence: diagnosed ? 3 : 0,
          }));
          const currentScores = initialScores.map((s, j) => ({
            ...s,
            score: diagnosed
              ? Math.max(
                  i % 6 === 5 ? skills[j].target : 0,
                  Math.max(0, Math.min(100, s.score + (i % 7 === 0 ? -8 : 10 + ((i + j) % 25)))),
                )
              : 0,
          }));
          const modulesAssigned = initialScores.filter((s, j) => s.score < skills[j].target).length;
          const modulesCompleted = diagnosed ? Math.min(modulesAssigned, 2 + (i % 7)) : 0;
          const data = {
            cohortId: role.cohortId,
            alias: `Demo student ${String(i + 1).padStart(2, '0')}`,
            diagnosed,
            initialScores: JSON.stringify(initialScores),
            currentScores: JSON.stringify(currentScores),
            modulesAssigned: diagnosed ? modulesAssigned : 0,
            modulesCompleted,
          };
          await tx.cohortMember.upsert({
            where: { id: `${role.id === 'data-analyst' ? 'cohort' : role.cohortId}-${i}` },
            create: {
              id: `${role.id === 'data-analyst' ? 'cohort' : role.cohortId}-${i}`,
              ...data,
            },
            update: data,
          });
        }
      }
    },
    { timeout: 60000 },
  );
  for (const bank of pythonBanks) {
    const content = JSON.stringify(bank);
    const digest = createHash('sha256').update(content).digest('hex');
    const existing = await db.assessmentBank.findUnique({ where: { id: bank.id } });
    if (existing && existing.digest !== digest)
      throw new Error(`Immutable bank ${bank.id} changed; author a new content version and ID.`);
    await db.assessmentBank.upsert({
      where: { id: bank.id },
      create: {
        id: bank.id,
        roleId: bank.roleId,
        kind: bank.kind,
        version: bank.version,
        contentVersion: bank.contentVersion,
        content,
        digest,
      },
      update: {},
    });
  }
  console.log(
    'Seeded 3 roles, 51 skills, 18 workplace cases (144 actions), 51 lessons (204 practice items), and 90 fictional cohort members. Existing demo sessions preserved.',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
