(() => {
  const vandyLinks = [
    {
      id: "brightspace",
      label: "Brightspace home",
      url: "https://brightspace.vanderbilt.edu/d2l/home",
      description: "Course homepage",
    },
    {
      id: "library",
      label: "Jean & Alexander Heard Library",
      url: "https://www.library.vanderbilt.edu/",
      description: "Research, reserves, and study spaces",
    },
    {
      id: "vuit",
      label: "VUIT Help Desk",
      url: "https://it.vanderbilt.edu/",
      description: "Account, Duo, and tech support",
    },
    {
      id: "registrar",
      label: "University Registrar",
      url: "https://registrar.vanderbilt.edu/",
      description: "Registration, transcripts, academic calendar",
    },
    {
      id: "brightspace-support",
      label: "Brightspace support",
      url: "https://www.vanderbilt.edu/brightspace/",
      description: "Guides, FAQ, and EdTech contact",
    },
    {
      id: "student-life",
      label: "Student Affairs",
      url: "https://www.vanderbilt.edu/studentlife/",
      description: "Campus life and student resources",
    },
    {
      id: "career",
      label: "Career Center",
      url: "https://www.vanderbilt.edu/career/",
      description: "Jobs, internships, and advising",
    },
    {
      id: "health",
      label: "Student Health Center",
      url: "https://www.vu.edu/student-health",
      description: "Medical and wellness services",
    },
    {
      id: "financial-aid",
      label: "Financial Aid",
      url: "https://www.vanderbilt.edu/financialaid/",
      description: "Aid, billing, and scholarships",
    },
    {
      id: "academic-calendar",
      label: "Academic calendar",
      url: "https://registrar.vanderbilt.edu/calendars/",
      description: "Key dates and breaks",
    },
  ];

  /** Rate My Professors school id for Vanderbilt (verify at ratemyprofessors.com if results are off). */
  const rateMyProfessorSchoolSid = "1466";

  /** Default nav logo: path relative to extension root. Toggle in extension settings. */
  const customBranding = {
    logoPath: "assets/custom-vandy-logo.png",
  };

  /** Default widget titles hidden on org homepage; overridden by settings. */
  const homepageWidgetsToHide = ["Instructor Announcements"];

  function buildRateMyProfessorSearchUrl(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return null;
    const params = new URLSearchParams({
      q: trimmed,
      sid: rateMyProfessorSchoolSid,
    });
    return `https://www.ratemyprofessors.com/search/professors?${params.toString()}`;
  }

  function buildRateMyProfessorSchoolUrl() {
    return `https://www.ratemyprofessors.com/campus-ratings?sid=${rateMyProfessorSchoolSid}`;
  }

  window.VandyExt = {
    vandyLinks,
    rateMyProfessorSchoolSid,
    customBranding,
    homepageWidgetsToHide,
    buildRateMyProfessorSearchUrl,
    buildRateMyProfessorSchoolUrl,
  };
})();
