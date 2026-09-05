/**
 * Same-origin Brightspace (Valence) helpers.
 * Uses the page XSRF token + /d2l/lp/auth/oauth2/token (widget-style session auth).
 */
(() => {
  const CACHE_KEY = "vandyextApiCache";
  const TOKEN_SKEW_MS = 60_000;
  const DEFAULT_LP = "1.46";
  const DEFAULT_LE = "1.75";

  let memoryToken = null;

  function getXsrfToken() {
    try {
      return localStorage.getItem("XSRF.Token") || localStorage.getItem("XSRF.Token".toLowerCase()) || "";
    } catch {
      return "";
    }
  }

  async function fetchAccessToken(scope = "*:*:*") {
    if (memoryToken && memoryToken.expiresAt > Date.now() + TOKEN_SKEW_MS) {
      return memoryToken;
    }

    const xsrf = getXsrfToken();
    if (!xsrf) {
      throw new Error("Missing XSRF.Token — are you logged into Brightspace?");
    }

    const response = await fetch("/d2l/lp/auth/oauth2/token", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Csrf-Token": xsrf,
      },
      body: `scope=${encodeURIComponent(scope)}`,
    });

    if (!response.ok) {
      throw new Error(`Token request failed (${response.status})`);
    }

    const data = await response.json();
    const expiresIn = Number(data.expires_in) || 180;
    memoryToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: data.scope || scope,
    };
    return memoryToken;
  }

  async function apiFetch(path, options = {}) {
    const token = await fetchAccessToken(options.scope || "*:*:*");
    const response = await fetch(path, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/json",
        ...(options.headers || {}),
      },
      body: options.body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`API ${path} failed (${response.status}) ${text.slice(0, 120)}`);
    }

    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    return response.text();
  }

  async function getVersions() {
    try {
      return await apiFetch("/d2l/api/versions/");
    } catch {
      return null;
    }
  }

  function pickVersion(versions, productCode, fallback) {
    if (!Array.isArray(versions)) return fallback;
    const entry = versions.find(
      (v) => String(v.ProductCode || v.productCode || "").toLowerCase() === productCode
    );
    const latest = entry?.LatestVersion || entry?.latestVersion;
    return latest ? String(latest) : fallback;
  }

  async function resolveVersions() {
    const versions = await getVersions();
    return {
      lp: pickVersion(versions, "lp", DEFAULT_LP),
      le: pickVersion(versions, "le", DEFAULT_LE),
    };
  }

  async function whoami() {
    const { lp } = await resolveVersions();
    return apiFetch(`/d2l/api/lp/${lp}/users/whoami`);
  }

  async function myEnrollments() {
    const { lp } = await resolveVersions();
    return apiFetch(
      `/d2l/api/lp/${lp}/enrollments/myenrollments/?sortBy=-StartDate&canAccess=true`
    );
  }

  function getStorage() {
    try {
      return globalThis.chrome?.storage?.local ?? null;
    } catch {
      return null;
    }
  }

  function saveCache(payload) {
    const storage = getStorage();
    const record = {
      ...payload,
      updatedAt: Date.now(),
    };
    if (!storage) return Promise.resolve(record);
    return new Promise((resolve) => {
      storage.set({ [CACHE_KEY]: record }, () => resolve(record));
    });
  }

  function loadCache() {
    const storage = getStorage();
    if (!storage) return Promise.resolve(null);
    return new Promise((resolve) => {
      storage.get([CACHE_KEY], (data) => resolve(data?.[CACHE_KEY] || null));
    });
  }

  async function refreshUserData() {
    const [user, enrollments] = await Promise.all([whoami(), myEnrollments()]);
    const items = Array.isArray(enrollments?.Items)
      ? enrollments.Items
      : Array.isArray(enrollments)
        ? enrollments
        : [];

    const courses = items
      .map((item) => {
        const ou = item.OrgUnit || item.orgUnit || {};
        return {
          orgUnitId: ou.Id ?? ou.id ?? null,
          name: ou.Name ?? ou.name ?? "Course",
          code: ou.Code ?? ou.code ?? "",
          type: ou.Type?.Code ?? ou.Type?.code ?? ou.type ?? "",
          homeUrl: ou.Id ? `/d2l/home/${ou.Id}` : null,
        };
      })
      .filter((c) => c.orgUnitId != null);

    const existing = (await loadCache()) || {};
    return saveCache({
      ...existing,
      user: {
        identifier: user?.Identifier ?? user?.identifier ?? null,
        firstName: user?.FirstName ?? user?.firstName ?? "",
        lastName: user?.LastName ?? user?.lastName ?? "",
        uniqueName: user?.UniqueName ?? user?.uniqueName ?? "",
      },
      courses,
      courseCount: courses.length,
    });
  }

  async function myCalendarEvents(orgUnitId, start, end) {
    const { le } = await resolveVersions();
    const params = new URLSearchParams();
    if (start) params.set("startDateTime", start);
    if (end) params.set("endDateTime", end);
    const qs = params.toString() ? `?${params}` : "";
    return apiFetch(`/d2l/api/le/${le}/${orgUnitId}/calendar/events/${qs}`);
  }

  async function refreshAgenda(options = {}) {
    const days = options.days ?? 14;
    const limit = options.limit ?? 8;
    const cache = (await loadCache()) || (await refreshUserData());
    const courses = (cache?.courses || []).slice(0, limit);
    const startIso = new Date().toISOString();
    const endIso = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const batches = await Promise.all(
      courses.map(async (course) => {
        try {
          const raw = await myCalendarEvents(course.orgUnitId, startIso, endIso);
          const list = Array.isArray(raw) ? raw : raw?.Objects || raw?.Items || [];
          return list.map((ev) => ({
            id: ev.CalendarEventId ?? ev.EventId ?? ev.Id ?? null,
            title: ev.Title ?? ev.Name ?? "Event",
            start: ev.StartDateTime ?? ev.StartDate ?? null,
            end: ev.EndDateTime ?? ev.EndDate ?? null,
            orgUnitId: course.orgUnitId,
            courseName: course.name,
          }));
        } catch {
          return [];
        }
      })
    );

    const events = batches
      .flat()
      .filter((e) => e.start)
      .sort((a, b) => String(a.start).localeCompare(String(b.start)))
      .slice(0, 40);

    return saveCache({
      ...(cache || {}),
      agenda: events,
      agendaUpdatedAt: Date.now(),
    });
  }

  globalThis.VandyExtValence = {
    CACHE_KEY,
    getXsrfToken,
    fetchAccessToken,
    apiFetch,
    whoami,
    myEnrollments,
    myCalendarEvents,
    refreshUserData,
    refreshAgenda,
    loadCache,
    saveCache,
  };
})();
