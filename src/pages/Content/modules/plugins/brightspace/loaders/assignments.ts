import {
  AssignmentType,
  Course,
  FinalAssignment,
  Options,
} from '../../../types';
import baseURL from '../../../utils/baseURL';
import loadBrightspaceCourses, {
  getPaginatedRequestBrightspace,
} from './courses';
import { AssignmentDefaults } from '../../../constants';
import { processAssignmentList } from '../../shared/useAssignments';
import { BrightspaceLMSConfig } from '..';
import { loadCustomTasks } from '../../shared/customTask';
import { applyCustomOverrides } from '../../shared/customOverride';
import loadGradescopeAssignments from '../../shared/loadGradescope';
import {
  brightspaceFetch,
  getBrightspaceUserId,
  getBrightspaceVersions,
} from '../auth';

type BrightspaceItem = {
  UserId?: string;
  OrgUnitId: string | number;
  ItemId: number | string;
  ItemName: string;
  ItemType?: number;
  ItemUrl?: string;
  StartDate?: string | null;
  EndDate?: string | null;
  DueDate?: string | null;
  CompletionType?: number;
  DateCompleted?: string | null;
  ActivityType?: number;
  IsExempt?: boolean;
};

type BrightspaceCalendarEvent = {
  CalendarEventId?: number;
  EventId?: number;
  Id?: number;
  Title?: string;
  Name?: string;
  StartDateTime?: string;
  EndDateTime?: string;
  StartDate?: string;
  EndDate?: string;
  OrgUnitId?: number | string;
  AssociatedEntityType?: string;
  AssociatedEntityId?: number | string;
  EventType?: number;
  CalendarEventType?: number;
};

/** Brightspace CONTENTACTIVITYTYPE_T values that are real graded work. */
const TASK_ACTIVITY_TYPES = new Set([
  3, // Dropbox (assignment)
  4, // Quiz
  5, // DiscussionForum
  6, // DiscussionTopic
  7, // LTI (legacy external learning tool)
  27, // LTI Advantage (external learning tool)
]);

function isTaskActivity(item: BrightspaceItem): boolean {
  const t = Number(item.ActivityType);
  if (TASK_ACTIVITY_TYPES.has(t)) return true;
  // Fallback when ActivityType is missing: infer from URL
  const url = String(item.ItemUrl || '').toLowerCase();
  return (
    url.includes('dropbox') ||
    url.includes('quiz') ||
    url.includes('discuss') ||
    url.includes('lti') ||
    url.includes('external') ||
    url.includes('/d2l/le/lti/') ||
    url.includes('quicklink') && url.includes('lti')
  );
}

function filterTaskItems(items: BrightspaceItem[]): BrightspaceItem[] {
  return items.filter(isTaskActivity);
}

async function le(): Promise<string> {
  return (await getBrightspaceVersions()).le;
}

async function getMyItems(
  start: string,
  end: string,
  courses: Course[],
  completion?: 1 | 2 | 3
): Promise<BrightspaceItem[]> {
  if (!courses.length) return [];
  const version = await le();
  const params = new URLSearchParams({
    startDateTime: start,
    endDateTime: end,
    orgUnitIdsCSV: courses.map((c) => c.id).join(','),
  });
  if (completion) params.set('completion', String(completion));
  const url = `${baseURL()}/d2l/api/le/${version}/content/myItems/?${params}`;
  try {
    return await getPaginatedRequestBrightspace<BrightspaceItem>(url, true);
  } catch (err) {
    console.warn('Tasks: content/myItems failed', err);
    return [];
  }
}

async function getCompletedItems(
  from: string,
  to: string,
  courses: Course[]
): Promise<BrightspaceItem[]> {
  if (!courses.length) return [];
  const version = await le();
  const params = new URLSearchParams({
    orgUnitIdsCSV: courses.map((c) => c.id).join(','),
    completedFromDateTime: from,
    completedToDateTime: to,
  });
  const url = `${baseURL()}/d2l/api/le/${version}/content/myItems/completions/?${params}`;
  try {
    const items = await getPaginatedRequestBrightspace<BrightspaceItem>(
      url,
      true
    );
    return items.map((i) => ({
      ...i,
      // completions endpoint implies completed even if DateCompleted missing
      DateCompleted: i.DateCompleted || to,
    }));
  } catch (err) {
    console.warn('Tasks: myItems/completions failed', err);
    return [];
  }
}

async function getCalendarDueItems(
  startIso: string,
  endIso: string,
  courses: Course[]
): Promise<BrightspaceItem[]> {
  if (!courses.length) return [];
  const version = await le();
  const url = `${baseURL()}/d2l/api/le/${version}/calendar/events/myEvents/?startDateTime=${encodeURIComponent(
    startIso
  )}&endDateTime=${encodeURIComponent(endIso)}&orgUnitIdsCSV=${courses
    .map((c) => c.id)
    .join(',')}`;
  try {
    const events =
      await getPaginatedRequestBrightspace<BrightspaceCalendarEvent>(url, true);
    return events
      .filter((ev) => {
        const assoc = String(ev.AssociatedEntityType || '').toLowerCase();
        // Real work only — assignments, quizzes, discussions, external tools
        return (
          assoc.includes('dropbox') ||
          assoc.includes('quiz') ||
          assoc.includes('discuss') ||
          assoc.includes('lti') ||
          assoc.includes('external')
        );
      })
      .map((ev) => {
        const id =
          ev.AssociatedEntityId ??
          ev.CalendarEventId ??
          ev.EventId ??
          ev.Id ??
          `${ev.OrgUnitId}-${ev.Title}`;
        const assoc = String(ev.AssociatedEntityType || '').toLowerCase();
        let activityType = 3; // Dropbox
        if (assoc.includes('quiz')) activityType = 4;
        else if (assoc.includes('discuss')) activityType = 5;
        else if (assoc.includes('lti') || assoc.includes('external'))
          activityType = 27;

        return {
          OrgUnitId: String(ev.OrgUnitId ?? ''),
          ItemId: id,
          ItemName: ev.Title || ev.Name || 'Untitled',
          DueDate:
            ev.EndDateTime ||
            ev.StartDateTime ||
            ev.EndDate ||
            ev.StartDate ||
            null,
          ItemUrl: buildCalendarItemUrl(ev),
          ActivityType: activityType,
          DateCompleted: null,
        } as BrightspaceItem;
      });
  } catch (err) {
    console.warn('Tasks: calendar/myEvents failed', err);
    return [];
  }
}

type DropboxFolder = {
  Id: number;
  CategoryId?: number | null; // null = Uncategorized — still a real assignment
  Name: string;
  DueDate?: string | null;
  IsHidden?: boolean;
  Availability?: {
    StartDate?: string | null;
    EndDate?: string | null;
  } | null;
};

function dropboxDueIso(folder: DropboxFolder): string | null {
  return (
    folder.DueDate ||
    folder.Availability?.EndDate ||
    folder.Availability?.StartDate ||
    null
  );
}

function dateInWindow(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t < end.getTime();
}

/**
 * Assignments tool folders (including Uncategorized / CategoryId null).
 * These often never appear in content/myItems if not linked into Content.
 */
async function getDropboxFoldersForCourses(
  start: Date,
  end: Date,
  courses: Course[]
): Promise<BrightspaceItem[]> {
  if (!courses.length) return [];
  const version = await le();

  const perCourse = await mapPool(courses, 4, async (course) => {
    try {
      const url = `${baseURL()}/d2l/api/le/${version}/${course.id}/dropbox/folders/`;
      const res = await brightspaceFetch(url);
      if (!res.ok) return [] as BrightspaceItem[];
      const data = await res.json();
      const folders: DropboxFolder[] = Array.isArray(data)
        ? data
        : data?.Objects || data?.Items || data?.Folders || [];

      return folders
        .filter((folder) => {
          if (folder.IsHidden) return false;
          const due = dropboxDueIso(folder);
          // Keep dated assignments in the selected week; category does not matter
          if (!due) return false;
          return dateInWindow(due, start, end);
        })
        .map(
          (folder) =>
            ({
              OrgUnitId: course.id,
              ItemId: folder.Id,
              ItemName: folder.Name || 'Assignment',
              DueDate: dropboxDueIso(folder),
              ItemUrl: `/d2l/lms/dropbox/user/folder_submit_files.d2l?db=${folder.Id}&ou=${course.id}`,
              ActivityType: 3, // Dropbox
              DateCompleted: null,
              CategoryId: folder.CategoryId ?? null,
            }) as BrightspaceItem
        );
    } catch (err) {
      console.warn(`Tasks: dropbox folders failed for course ${course.id}`, err);
      return [] as BrightspaceItem[];
    }
  });

  return perCourse.flat();
}

type BrightspaceQuiz = {
  QuizId?: number;
  Id?: number;
  Name: string;
  IsActive?: boolean;
  DueDate?: string | null;
  StartDate?: string | null;
  EndDate?: string | null;
  CategoryId?: number | null;
};

function quizDueIso(quiz: BrightspaceQuiz): string | null {
  return quiz.DueDate || quiz.EndDate || quiz.StartDate || null;
}

/**
 * Quizzes tool items (including uncategorized). Same gap as Assignments —
 * often missing from content/myItems unless linked into Content.
 */
async function getQuizzesForCourses(
  start: Date,
  end: Date,
  courses: Course[]
): Promise<BrightspaceItem[]> {
  if (!courses.length) return [];
  const version = await le();

  const perCourse = await mapPool(courses, 4, async (course) => {
    try {
      const url = `${baseURL()}/d2l/api/le/${version}/${course.id}/quizzes/`;
      const quizzes = await getPaginatedRequestBrightspace<BrightspaceQuiz>(
        url,
        true
      );

      return quizzes
        .filter((quiz) => {
          if (quiz.IsActive === false) return false;
          const due = quizDueIso(quiz);
          if (!due) return false;
          return dateInWindow(due, start, end);
        })
        .map((quiz) => {
          const id = quiz.QuizId ?? quiz.Id;
          return {
            OrgUnitId: course.id,
            ItemId: id as number | string,
            ItemName: quiz.Name || 'Quiz',
            DueDate: quizDueIso(quiz),
            ItemUrl: `/d2l/lms/quizzing/user/quiz_summary.d2l?qi=${id}&ou=${course.id}`,
            ActivityType: 4, // Quiz
            DateCompleted: null,
          } as BrightspaceItem;
        });
    } catch (err) {
      console.warn(`Tasks: quizzes failed for course ${course.id}`, err);
      return [] as BrightspaceItem[];
    }
  });

  return perCourse.flat();
}

function buildCalendarItemUrl(ev: BrightspaceCalendarEvent): string {
  const ou = ev.OrgUnitId;
  const entityId = ev.AssociatedEntityId;
  const type = String(ev.AssociatedEntityType || '').toLowerCase();
  if (ou && entityId != null) {
    if (type.includes('dropbox')) {
      return `/d2l/lms/dropbox/user/folder_submit_files.d2l?db=${entityId}&ou=${ou}`;
    }
    if (type.includes('quiz')) {
      return `/d2l/lms/quizzing/user/quiz_summary.d2l?qi=${entityId}&ou=${ou}`;
    }
    if (type.includes('discuss')) {
      return `/d2l/le/${ou}/discussions/topics/${entityId}`;
    }
    if (type.includes('lti') || type.includes('external')) {
      return `/d2l/le/ltiadvantage/${ou}/deepLinks/${entityId}`;
    }
    if (type.includes('content')) {
      return `/d2l/le/content/${ou}/viewContent/${entityId}/View`;
    }
  }
  return ou ? `/d2l/home/${ou}` : '/d2l/home';
}

function parseActivityType(t?: number) {
  if (t === 4) return AssignmentType.QUIZ;
  if (t === 5 || t === 6) return AssignmentType.DISCUSSION;
  // Dropbox (3) and LTI external tools (7, 27) show as assignments
  return AssignmentType.ASSIGNMENT;
}

function resolveDueDate(assignment: BrightspaceItem): string {
  const raw =
    assignment.DueDate || assignment.EndDate || assignment.StartDate || '';
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function parseAssignments(assignments: BrightspaceItem[]): FinalAssignment[] {
  return assignments.map((assignment) => ({
    ...AssignmentDefaults,
    name: assignment.ItemName,
    id: String(assignment.ItemId),
    plannable_id: String(assignment.ItemId),
    type: parseActivityType(assignment.ActivityType),
    html_url: assignment.ItemUrl || '/',
    due_at: resolveDueDate(assignment),
    course_id: String(assignment.OrgUnitId),
    // Official Tasks for Canvas Brightspace logic:
    submitted: Boolean(assignment.DateCompleted),
    graded: false,
    points_possible: 0,
    score: 0,
  }));
}

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

function isBetterLink(url?: string) {
  if (!url || url === '/') return false;
  return !/\/d2l\/home\/\d+\/?$/i.test(url);
}

/**
 * Merge calendar + myItems. Same assignment often has different IDs.
 * Completion from myItems/completions always wins (official behavior).
 */
function dedupeAssignments(list: FinalAssignment[]): FinalAssignment[] {
  const map = new Map<string, FinalAssignment>();
  for (const a of list) {
    const key = `${a.course_id}:${normalizeName(a.name)}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...a });
      continue;
    }
    const submitted = Boolean(prev.submitted || a.submitted);
    const graded = Boolean(prev.graded || a.graded);
    map.set(key, {
      ...prev,
      submitted,
      graded,
      // Keep content/myItems id when available (better for overrides)
      id: prev.submitted || isBetterLink(prev.html_url) ? prev.id : a.id,
      plannable_id: prev.plannable_id || a.plannable_id,
      html_url: isBetterLink(prev.html_url)
        ? prev.html_url
        : isBetterLink(a.html_url)
          ? a.html_url
          : prev.html_url || a.html_url,
      type:
        prev.type !== AssignmentType.ASSIGNMENT
          ? prev.type
          : a.type !== AssignmentType.ASSIGNMENT
            ? a.type
            : prev.type,
      due_at: prev.due_at || a.due_at,
    });
  }
  return Array.from(map.values());
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, () =>
      worker()
    )
  );
  return results;
}

function extractDropboxId(a: FinalAssignment): string | null {
  const fromUrl = a.html_url?.match(/[?&]db=(\d+)/i);
  if (fromUrl) return fromUrl[1];
  return null;
}

function extractQuizId(a: FinalAssignment): string | null {
  const fromUrl = a.html_url?.match(/[?&]qi=(\d+)/i);
  if (fromUrl) return fromUrl[1];
  if (a.type === AssignmentType.QUIZ && /^\d+$/.test(a.id)) return a.id;
  return null;
}

async function hasDropboxSubmission(
  orgUnitId: string,
  folderId: string
): Promise<boolean> {
  const version = await le();
  try {
    const url = `${baseURL()}/d2l/api/le/${version}/${orgUnitId}/dropbox/folders/${folderId}/submissions/mysubmissions/`;
    const res = await brightspaceFetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.some((entry) => {
        if (Array.isArray(entry?.Submissions)) return entry.Submissions.length > 0;
        return Boolean(entry?.Id || entry?.SubmissionId);
      });
    }
    const list = data?.Objects || data?.Items || data?.Submissions;
    return Array.isArray(list) && list.length > 0;
  } catch {
    return false;
  }
}

async function hasQuizAttempt(
  orgUnitId: string,
  quizId: string,
  userId: string | null
): Promise<boolean> {
  const version = await le();
  try {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const url = `${baseURL()}/d2l/api/le/${version}/${orgUnitId}/quizzes/${quizId}/attempts/${qs}`;
    const res = await brightspaceFetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    const list = Array.isArray(data)
      ? data
      : data?.Objects || data?.Items || [];
    return (
      Array.isArray(list) &&
      list.some(
        (attempt: { Completed?: string | null; IsPublished?: boolean }) =>
          Boolean(attempt?.Completed) || attempt?.IsPublished === true
      )
    );
  } catch {
    return false;
  }
}

async function enrichSubmissionStatus(
  assignments: FinalAssignment[]
): Promise<FinalAssignment[]> {
  const pending = assignments.filter((a) => !a.submitted && !a.graded);
  if (!pending.length) return assignments;

  const userId = await getBrightspaceUserId();
  const checks = await mapPool(pending, 5, async (a) => {
    const quizId = extractQuizId(a);
    if (quizId) {
      return {
        key: `${a.course_id}:${normalizeName(a.name)}`,
        submitted: await hasQuizAttempt(a.course_id, quizId, userId),
      };
    }
    const folderId = extractDropboxId(a);
    if (folderId) {
      return {
        key: `${a.course_id}:${normalizeName(a.name)}`,
        submitted: await hasDropboxSubmission(a.course_id, folderId),
      };
    }
    return { key: `${a.course_id}:${normalizeName(a.name)}`, submitted: false };
  });

  const done = new Set(checks.filter((c) => c.submitted).map((c) => c.key));
  return assignments.map((a) => {
    if (a.submitted || a.graded) return a;
    if (done.has(`${a.course_id}:${normalizeName(a.name)}`)) {
      return { ...a, submitted: true };
    }
    return a;
  });
}

export default async function loadBrightspaceAssignments(
  startDate: Date,
  endDate: Date,
  options: Options
) {
  /* Expand bounds by 1 day for TZ skew — same as official plugin. */
  const st = new Date(startDate);
  st.setDate(startDate.getDate() - 1);
  const en = new Date(endDate);
  en.setDate(en.getDate() + 1);

  // Completions: look back far enough that work turned in earlier still counts
  const completedFrom = new Date(st);
  completedFrom.setFullYear(completedFrom.getFullYear() - 1);

  const startStr = st.toISOString().split('T')[0];
  const endStr = en.toISOString().split('T')[0];

  const courses = await loadBrightspaceCourses();

  // Official path = myItems (+ dropbox/quizzes tools, completions, calendar)
  const [
    openOrAny,
    completedOnly,
    completedFeed,
    calendarItems,
    dropboxFolders,
    quizzes,
  ] = await Promise.all([
    getMyItems(startStr, endStr, courses, 1), // Any
    getMyItems(startStr, endStr, courses, 2), // CompletedOnly
    getCompletedItems(
      completedFrom.toISOString(),
      en.toISOString(),
      courses
    ),
    getCalendarDueItems(st.toISOString(), en.toISOString(), courses),
    getDropboxFoldersForCourses(st, en, courses),
    getQuizzesForCourses(st, en, courses),
  ]);

  // Order matters: completed sources first so DateCompleted wins in merge
  let fromApi = parseAssignments(
    filterTaskItems([
      ...completedOnly,
      ...completedFeed,
      ...openOrAny,
      ...dropboxFolders,
      ...quizzes,
      ...calendarItems,
    ])
  );
  fromApi = dedupeAssignments(fromApi);
  fromApi = await enrichSubmissionStatus(fromApi);

  const assignmentSources = await Promise.all([
    Promise.resolve(fromApi),
    loadCustomTasks('brightspace_custom'),
    loadGradescopeAssignments(st, en, options),
  ]);
  const assignments = dedupeAssignments(
    Array.prototype.concat(...assignmentSources)
  );
  const marked = await applyCustomOverrides(assignments, 'brightspace_custom');
  // Always restrict to the current-term course set we resolved (homepage/term filter).
  const allowed = new Set(courses.map((c) => c.id).concat(['0']));
  const scoped = marked.filter((a) => allowed.has(String(a.course_id)));
  return processAssignmentList(
    scoped,
    startDate,
    endDate,
    { ...options, dash_courses: true },
    BrightspaceLMSConfig.onCoursePage,
    BrightspaceLMSConfig.dashCourses(courses)
  );
}
