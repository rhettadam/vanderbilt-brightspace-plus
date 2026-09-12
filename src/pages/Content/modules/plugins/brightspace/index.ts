import { Course } from '../../types';
import { LMSConfig } from '../../types/config';
import { makeMarkAssignment } from '../shared/customOverride';
import { makeCreateCustomTask } from '../shared/customTask';
import { DEFAULT_ICON_SET } from '../shared/icons';
import { makeUseAssignments } from '../shared/useAssignments';
import { makeUseCourses } from '../shared/useCourses';
import BrightspaceEntrypoint from './entry';
import loadBrightspaceAssignments from './loaders/assignments';
import loadBrightspaceCourses from './loaders/courses';

export const isBrightspace = document.body.classList.contains('d2l-body');

export const BrightspaceLMSConfig: LMSConfig = {
  isActive: isBrightspace,
  name: 'Brightspace',
  storageKey: 'brightspace_custom',
  useAssignments: makeUseAssignments(loadBrightspaceAssignments),
  useCourses: makeUseCourses(loadBrightspaceCourses),
  createAssignment: makeCreateCustomTask('brightspace_custom'),
  markAssignment: makeMarkAssignment('brightspace_custom'),
  dashCourses: (courses?: Course[]) => {
    // Always scope rings/list to the courses we loaded (homepage / current term).
    if (!courses?.length) return undefined;
    return new Set(courses.map((c) => c.id));
  },
  onCoursePage: () => false,
  iconSet: DEFAULT_ICON_SET,
};

export { BrightspaceEntrypoint };
