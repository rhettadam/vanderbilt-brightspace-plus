(() => {
  const { vandyLinks, buildRateMyProfessorSearchUrl, buildRateMyProfessorSchoolUrl } =
    window.VandyExt;

  const list = document.getElementById("popup-links");
  const form = document.getElementById("popup-rmp-form");
  const input = document.getElementById("popup-rmp-input");
  const schoolLink = document.getElementById("popup-rmp-school");
  const settingsLink = document.getElementById("popup-open-settings");

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
})();
