(() => {
  const { vandyLinks, buildRateMyProfessorSearchUrl, buildRateMyProfessorSchoolUrl } =
    window.VandyExt;

  const list = document.getElementById("popup-links");
  const form = document.getElementById("popup-rmp-form");
  const input = document.getElementById("popup-rmp-input");
  const schoolLink = document.getElementById("popup-rmp-school");
  const settingsLink = document.getElementById("popup-open-settings");
  const userLine = document.getElementById("popup-user");
  const agendaList = document.getElementById("popup-agenda");
  const agendaEmpty = document.getElementById("popup-agenda-empty");

  settingsLink?.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  for (const link of vandyLinks) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link.label;
    li.appendChild(a);
    list.appendChild(li);
  }

  schoolLink.href = buildRateMyProfessorSchoolUrl();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const url = buildRateMyProfessorSearchUrl(input.value);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  });

  function formatWhen(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function renderAgenda(cache) {
    if (!agendaList || !agendaEmpty) return;
    agendaList.replaceChildren();
    const events = Array.isArray(cache?.agenda) ? cache.agenda.slice(0, 6) : [];
    if (!events.length) {
      agendaEmpty.hidden = false;
      return;
    }
    agendaEmpty.hidden = true;
    for (const event of events) {
      const li = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = event.title || "Event";
      const meta = document.createElement("span");
      meta.textContent = `${formatWhen(event.start)}${event.courseName ? ` · ${event.courseName}` : ""}`;
      li.append(title, meta);
      agendaList.appendChild(li);
    }
  }

  function renderUserCache(cache) {
    if (userLine && cache?.user) {
      const name = [cache.user.firstName, cache.user.lastName].filter(Boolean).join(" ");
      const count = cache.courseCount ?? cache.courses?.length;
      if (name && count != null) {
        userLine.textContent = `Hi ${name} · ${count} course${count === 1 ? "" : "s"} synced`;
      } else if (name) {
        userLine.textContent = `Hi ${name}`;
      }
    }
    renderAgenda(cache);
  }

  chrome.runtime.sendMessage({ type: "vandyext-get-api-cache" }, (response) => {
    if (chrome.runtime.lastError) {
      chrome.storage.local.get(["vandyextApiCache"], (data) => {
        renderUserCache(data?.vandyextApiCache);
      });
      return;
    }
    renderUserCache(response?.data);
  });
})();
