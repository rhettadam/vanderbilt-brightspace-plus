import { storeCanvasCourses } from '../../../components/gradescope/utils/store';
import { Course } from '../../../types';
import baseURL from '../../../utils/baseURL';
import { loadCustomColorsWithDefaults } from '../../shared/customColors';
import { brightspaceFetch, getBrightspaceVersions } from '../auth';

type BrightspaceEnrollment = {
  OrgUnit: {
    Id: number;
    Type: {
      Id: number;
      Code: string;
      Name: string;
    };
    Name: string;
    Code: string;
  };
  Access: {
    IsActive: boolean;
    CanAccess: boolean;
    StartDate?: string | null;
    EndDate?: string | null;
    LastAccessed?: string | null;
  };
  PinDate: string | null;
};

type PaginatedAPIResponse<T> =
  | {
      PagingInfo: {
        Bookmark: string;
        HasMoreItems: boolean;
      };
      Items: T[];
    }
  | {
      Objects: T[];
      Next?: string;
    };

export async function getPaginatedRequestBrightspace<T>(
  url: string,
  recurse = false
): Promise<T[]> {
  const response = await brightspaceFetch(url);
  if (!response.ok) {
    throw new Error(`Brightspace API ${url} failed (${response.status})`);
  }
  const res = (await response.json()) as PaginatedAPIResponse<T>;
  if (recurse) {
    if ('Next' in res && res.Next)
      return res.Objects.concat(
        await getPaginatedRequestBrightspace(res.Next, true)
      );
    else if ('PagingInfo' in res && res.PagingInfo.HasMoreItems) {
      const page = new URL(url);
      page.searchParams.set('bookmark', res.PagingInfo.Bookmark);
      return res.Items.concat(
        await getPaginatedRequestBrightspace(page.toString(), true)
      );
    }
  }
  if ('Items' in res) return res.Items || [];
  if ('Objects' in res) return res.Objects || [];
  return Array.isArray(res) ? (res as T[]) : [];
}

async function getCourseColors(
  courses: string[]
): Promise<Record<string, string>> {
  return loadCustomColorsWithDefaults('brightspace_custom', courses);
}

function parseTime(value?: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Academic term for "today" (Vanderbilt-style Fall/Spring/Summer). */
export function currentTerm(now = new Date()): {
  year: number;
  season: 'FALL' | 'SPRING' | 'SUMMER';
  labels: string[];
} {
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  if (month >= 7 && month <= 11) {
    // Aug–Dec
    return {
      year,
      season: 'FALL',
      labels: [
        `${year}.FALL`,
        `${year}FALL`,
        `${year}F`,
        `FALL ${year}`,
        `FALL${year}`,
        `FA${String(year).slice(2)}`,
        `F${String(year).slice(2)}`,
      ],
    };
  }
  if (month >= 0 && month <= 4) {
    // Jan–May
    return {
      year,
      season: 'SPRING',
      labels: [
        `${year}.SPRING`,
        `${year}SPRING`,
        `${year}S`,
        `SPRING ${year}`,
        `SPRING${year}`,
        `SP${String(year).slice(2)}`,
        `S${String(year).slice(2)}`,
      ],
    };
  }
  // May–Jul summer
  return {
    year,
    season: 'SUMMER',
    labels: [
      `${year}.SUMMER`,
      `${year}SUMMER`,
      `SUMMER ${year}`,
      `SUMMER${year}`,
      `SU${String(year).slice(2)}`,
    ],
  };
}

function matchesCurrentTerm(text: string, now = new Date()): boolean {
  const hay = text.toUpperCase().replace(/\s+/g, '');
  const term = currentTerm(now);
  if (term.labels.some((l) => hay.includes(l.replace(/\s+/g, '')))) return true;
  // Year alone is too weak; require year + season-ish token nearby
  const year = String(term.year);
  if (!hay.includes(year) && !hay.includes(String(term.year).slice(2)))
    return false;
  if (term.season === 'FALL' && /FALL|FA\d{2}|[.\-_]F(?:ALL)?/.test(hay))
    return true;
  if (term.season === 'SPRING' && /SPRING|SP\d{2}|[.\-_]S(?:PRING)?/.test(hay))
    return true;
  if (term.season === 'SUMMER' && /SUMMER|SU\d{2}/.test(hay)) return true;
  return false;
}

function offeringActiveNow(enrollment: BrightspaceEnrollment, now = Date.now()) {
  const start = parseTime(enrollment.Access?.StartDate);
  const end = parseTime(enrollment.Access?.EndDate);
  if (end != null && end < now) return false;
  if (start != null && start > now) return false;
  if (start != null || end != null) return true;
  return null; // unknown (no dates)
}

/**
 * Course IDs currently shown on the Brightspace homepage "My Courses" widget.
 * This matches what Tasks for Canvas does on Canvas (dashboard courses).
 */
export async function getHomepageCourseIds(
  timeoutMs = 4000
): Promise<string[]> {
  const started = Date.now();
  const ids = new Set<string>();

  function collect(root: ParentNode | ShadowRoot) {
    root.querySelectorAll('a[href*="/d2l/home/"]').forEach((a) => {
      const href = (a as HTMLAnchorElement).getAttribute('href') || '';
      const m = href.match(/\/d2l\/home\/(\d+)/i);
      if (m) ids.add(m[1]);
    });
    root.querySelectorAll('[href*="/d2l/home/"]').forEach((el) => {
      const href = el.getAttribute('href') || '';
      const m = href.match(/\/d2l\/home\/(\d+)/i);
      if (m) ids.add(m[1]);
    });
    root.querySelectorAll('*').forEach((el) => {
      const sr = (el as HTMLElement).shadowRoot;
      if (sr) collect(sr);
    });
  }

  while (Date.now() - started < timeoutMs) {
    ids.clear();
    collect(document);
    if (ids.size > 0) return Array.from(ids);
    await new Promise((r) => setTimeout(r, 250));
  }
  collect(document);
  return Array.from(ids);
}

export default async function loadBrightspaceCourses() {
  const { lp } = await getBrightspaceVersions();
  const now = new Date();
  const nowIso = now.toISOString();

  const enrollUrl =
    `${baseURL()}/d2l/api/lp/${lp}/enrollments/myenrollments/` +
    `?orgUnitTypeId=3&canAccess=true&isActive=true` +
    `&startDateTime=${encodeURIComponent(nowIso)}` +
    `&endDateTime=${encodeURIComponent(nowIso)}`;

  let res: BrightspaceEnrollment[];
  try {
    res = await getPaginatedRequestBrightspace<BrightspaceEnrollment>(
      enrollUrl,
      true
    );
  } catch {
    res = await getPaginatedRequestBrightspace<BrightspaceEnrollment>(
      `${baseURL()}/d2l/api/lp/${lp}/enrollments/myenrollments/?orgUnitTypeId=3&canAccess=true&isActive=true`,
      true
    );
  }

  const allAccessible = res.filter(
    (c) =>
      c.Access?.CanAccess &&
      c.Access?.IsActive &&
      (c.OrgUnit?.Type?.Id === 3 || !c.OrgUnit?.Type?.Id)
  );

  // 1) Prefer homepage My Courses cards (current term UI — same idea as Canvas dashboard)
  const homepageIds = await getHomepageCourseIds(6000);
  let filtered = allAccessible;

  if (homepageIds.length) {
    const homeSet = new Set(homepageIds);
    const fromHome = allAccessible.filter((c) =>
      homeSet.has(String(c.OrgUnit.Id))
    );
    if (fromHome.length) filtered = fromHome;
  } else {
    // 2) Fall back: offering dates overlap now, or code/name matches current term+year
    filtered = allAccessible.filter((c) => {
      const active = offeringActiveNow(c, now.getTime());
      if (active === false) return false;
      if (active === true) return true;
      const label = `${c.OrgUnit.Name || ''} ${c.OrgUnit.Code || ''}`;
      if (matchesCurrentTerm(label, now)) return true;
      // Last resort: pinned only (still better than every semester)
      return Boolean(c.PinDate);
    });
  }

  // If filters somehow emptied everything, keep pinned + currently dated only
  if (!filtered.length) {
    filtered = allAccessible.filter((c) => {
      const active = offeringActiveNow(c, now.getTime());
      return active === true || Boolean(c.PinDate);
    });
  }

  const colors = await getCourseColors(
    filtered.map((c) => c.OrgUnit.Id.toString())
  );
  const coursesWithColors: Course[] = filtered.map((c) => {
    return {
      id: c.OrgUnit.Id + '',
      name: c.OrgUnit.Name,
      course_code: c.OrgUnit.Code,
      position: !c.PinDate ? 0 : 1,
      color: colors[c.OrgUnit.Id.toString()],
    };
  });

  if (coursesWithColors.length) storeCanvasCourses(coursesWithColors);

  return coursesWithColors;
}
