import { skills, employerTargets } from '../skills';
import { diagnostic, reassessment } from '../simulations';
import { lessons } from '../lessons';
import { roleCatalog } from '../role-catalog';
import { skillBank, lessonBank } from './authoring';
import { pythonTopics } from './python-topics';
import { javaTopics } from './java-topics';
import { pythonDiagnostic, pythonReassessment } from './python-simulations';
import { javaDiagnostic, javaReassessment } from './java-simulations';
const pythonSkills = skillBank('py', pythonTopics);
const javaSkills = skillBank('java', javaTopics);
export const tracks = [
  {
    role: roleCatalog[0],
    skills,
    diagnostic,
    reassessment,
    lessons,
    employerTargets,
    employerName: 'Example analytics team',
  },
  {
    role: roleCatalog[1],
    skills: pythonSkills,
    diagnostic: pythonDiagnostic,
    reassessment: pythonReassessment,
    lessons: lessonBank('py', pythonTopics),
    employerTargets: Object.fromEntries(
      pythonSkills.map((s) => [s.id, Math.min(85, s.target + 5)]),
    ),
    employerName: 'Example junior Python engineering team',
  },
  {
    role: roleCatalog[2],
    skills: javaSkills,
    diagnostic: javaDiagnostic,
    reassessment: javaReassessment,
    lessons: lessonBank('java', javaTopics),
    employerTargets: Object.fromEntries(javaSkills.map((s) => [s.id, Math.min(85, s.target + 5)])),
    employerName: 'Example junior Java backend team',
  },
];
