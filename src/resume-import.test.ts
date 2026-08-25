import { describe, expect, it } from "vitest";
import { parseResumeLines, resumeImportIsEmpty } from "./resume-import.js";
import { linesFromTextItems, type ResumeLine } from "./resume-lines.js";

/** Body lines at height 10; the name is tallest; headers sit in between. */
function lines(
  entries: readonly (string | [text: string, height: number])[],
): ResumeLine[] {
  return entries.map((entry) => {
    const [text, height] = typeof entry === "string" ? [entry, 10] : entry;
    return { text, height, page: 1 };
  });
}

/** A fictional resume in the dated-title-first single-column layout. */
const atsResume = lines([
  ["Jordan Reyes", 17.2],
  "U.S. Citizen | +1 (555) 010-0199 | Springfield, IL & Boston, MA",
  "jordan.reyes@example.com | linkedin.com/in/jordanreyes | jordanreyes.dev | github.com/jordanreyes",
  ["EDUCATION", 12],
  "B.S. Computer Science and Mathematics, Ashford Institute of Technology\tHoboken, NJ",
  "GPA: 3.72\tExpected Graduation: Dec 2027",
  "Activities: Software Engineering Club, Venture Fund, Kappa Chi (Social Chair, Communications Chair)",
  ["EXPERIENCE", 12],
  "Co-Founder & Product Engineer\tMay 2026 – Present",
  "Nimbus (trynimbus.io)\tNew York, NY",
  "• Built and scaled Nimbus to $90K ARR and 40+ paying users. Nimbus is a memory layer that pulls decisions",
  "and context buried across many tools into one searchable graph",
  "database for AI agents",
  "• Designed and shipped the MCP server agents query directly: they ask a question and get back an answer grounded in the",
  "exact PR, thread, ticket, or doc it came from",
  "Software Engineering Intern\tJune 2025 – August 2025",
  "Granite Analytics Consulting, LLC\tGreat Falls, VA",
  "• Optimized the mesh export step of a pipeline that converts drone footage into 3D terrain meshes",
  "for tactical mapping displays, cutting processing on a 1 km2 benchmark from 40 min to 25 min via tiling and",
  "pre-caching",
  "• Wrote a Python validation harness that checks outputs against surveyed ground control points before release,",
  "catching alignment regressions that previously surfaced only in manual review",
  ["PROJECTS", 12],
  "Multi-Agent Hide and Seek via Self-Play PPO [GitHub]\tPyTorch",
  "• Built a multi-agent RL stack from scratch: continuous, discrete, and LSTM PPO with self-play",
  "Drafter: Terminal Multiplexer for Coding Agents [GitHub] [Site]\tRust",
  "• Built Drafter to run multiple coding agents concurrently, each in its own pseudo-terminal, surfacing per-agent state",
  "(blocked, working, done, idle) in a single triaged sidebar",
  ["SKILLS", 12],
  "Languages\tPython, C, C++, Rust, TypeScript, x86 and ARM Assembly",
  "Frameworks\tNext.js, React, FastAPI",
  "AI & Data Science\tPyTorch, LangChain, scikit-learn, Weights & Biases",
]);

describe("parseResumeLines", () => {
  const imported = parseResumeLines(atsResume);

  it("reads the contact block", () => {
    expect(imported.name).toBe("Jordan Reyes");
    expect(imported.email).toBe("jordan.reyes@example.com");
    expect(imported.location).toBe("Springfield, IL & Boston, MA");
    expect(imported.website).toBe("https://jordanreyes.dev");
    expect(imported.githubUsername).toBe("jordanreyes");
  });

  it("never mistakes the email domain for the website", () => {
    const contactOnly = parseResumeLines(
      lines([["Sam Chen", 17], "sam@fastmail.com | +1 (555) 200-3000"]),
    );
    expect(contactOnly.website).toBeUndefined();
    expect(contactOnly.email).toBe("sam@fastmail.com");
  });

  it("parses dated-title-first experience entries", () => {
    expect(imported.experience).toHaveLength(2);
    const [founder, intern] = imported.experience;
    expect(founder).toMatchObject({
      title: "Co-Founder & Product Engineer",
      organization: "Nimbus (trynimbus.io)",
      location: "New York, NY",
      start: "2026-05",
      end: undefined,
    });
    expect(founder?.highlights).toHaveLength(2);
    expect(founder?.highlights[0]).toBe(
      "Built and scaled Nimbus to $90K ARR and 40+ paying users. Nimbus is a memory layer that pulls decisions and context buried across many tools into one searchable graph database for AI agents",
    );
    expect(intern).toMatchObject({
      title: "Software Engineering Intern",
      organization: "Granite Analytics Consulting, LLC",
      location: "Great Falls, VA",
      start: "2025-06",
      end: "2025-08",
    });
    expect(intern?.highlights).toHaveLength(2);
  });

  it("parses organization-first experience entries", () => {
    const flipped = parseResumeLines(
      lines([
        ["EXPERIENCE", 12],
        "Evergreen Robotics, Inc.\tPortland, OR",
        "Firmware Engineer\tJan 2023 – Mar 2024",
        "• Shipped the motor control loop",
      ]),
    );
    expect(flipped.experience).toEqual([
      expect.objectContaining({
        title: "Firmware Engineer",
        organization: "Evergreen Robotics, Inc.",
        location: "Portland, OR",
        start: "2023-01",
        end: "2024-03",
        highlights: ["Shipped the motor control loop"],
      }),
    ]);
  });

  it("splits a single-line header into title and organization", () => {
    const single = parseResumeLines(
      lines([
        ["EXPERIENCE", 12],
        "Data Analyst at Harborview Health\tJun 2021 – Dec 2022",
        "• Automated the weekly reporting pipeline",
      ]),
    );
    expect(single.experience).toEqual([
      expect.objectContaining({
        title: "Data Analyst",
        organization: "Harborview Health",
        start: "2021-06",
        end: "2022-12",
      }),
    ]);
  });

  it("reads education from a combined degree-school line", () => {
    expect(imported.education).toEqual([
      expect.objectContaining({
        school: "Ashford Institute of Technology",
        degree: "B.S. Computer Science and Mathematics",
        start: "2027",
        end: "2027",
      }),
    ]);
  });

  it("leaves education years empty when the resume states none", () => {
    const dateless = parseResumeLines(
      lines([["EDUCATION", 12], "B.A. History, Falls City College"]),
    );
    expect(dateless.education).toEqual([
      expect.objectContaining({
        school: "Falls City College",
        degree: "B.A. History",
        start: "",
        end: undefined,
      }),
    ]);
  });

  it("flattens categorized skills and keeps parenthesized values whole", () => {
    expect(imported.expertise).toEqual([
      "Python",
      "C",
      "C++",
      "Rust",
      "TypeScript",
      "x86 and ARM Assembly",
      "Next.js",
      "React",
      "FastAPI",
      "PyTorch",
      "LangChain",
      "scikit-learn",
      "Weights & Biases",
    ]);
  });

  it("reads activities into interests without splitting parentheses", () => {
    expect(imported.interests).toEqual([
      "Software Engineering Club",
      "Venture Fund",
      "Kappa Chi (Social Chair, Communications Chair)",
    ]);
  });

  it("maps projects to other experience with the stack as the period", () => {
    expect(imported.otherExperience).toEqual([
      expect.objectContaining({
        title: "Multi-Agent Hide and Seek via Self-Play PPO",
        period: "PyTorch",
      }),
      expect.objectContaining({
        title: "Drafter: Terminal Multiplexer for Coding Agents",
        period: "Rust",
        detail:
          "Built Drafter to run multiple coding agents concurrently, each in its own pseudo-terminal, surfacing per-agent state (blocked, working, done, idle) in a single triaged sidebar",
      }),
    ]);
  });

  it("prefers a stated project date range over the stack column", () => {
    const dated = parseResumeLines(
      lines([
        ["PROJECTS", 12],
        "Trailhead Planner\tMar 2024 – Jun 2024",
        "• Route planning for day hikes",
      ]),
    );
    expect(dated.otherExperience).toEqual([
      expect.objectContaining({
        title: "Trailhead Planner",
        period: "Mar 2024 – Jun 2024",
      }),
    ]);
  });

  it("reads a summary section and a headline", () => {
    const summarized = parseResumeLines(
      lines([
        ["Riley Okafor", 17],
        "Staff Platform Engineer",
        ["SUMMARY", 12],
        "Platform engineer focused on developer experience.",
        "Previously built CI infrastructure used by 400 engineers.",
      ]),
    );
    expect(summarized.role).toBe("Staff Platform Engineer");
    expect(summarized.summary).toBe(
      "Platform engineer focused on developer experience. Previously built CI infrastructure used by 400 engineers.",
    );
  });

  it("parses certifications with issuer and years", () => {
    const certified = parseResumeLines(
      lines([
        ["CERTIFICATIONS", 12],
        "AWS Certified Solutions Architect – Amazon Web Services, 2024",
        "CompTIA Security+ | CompTIA | Issued 2022, Expires 2025",
        "Some Course Without A Year – Udemy",
      ]),
    );
    expect(certified.certifications).toEqual([
      expect.objectContaining({
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        issued: "2024",
        expires: undefined,
      }),
      expect.objectContaining({
        name: "CompTIA Security+",
        issuer: "CompTIA",
        issued: "2022",
        expires: "2025",
      }),
    ]);
  });

  it("maps award sections onto other experience", () => {
    const awarded = parseResumeLines(
      lines([
        ["HONORS & AWARDS", 12],
        "First Place, Metro Hackathon (2024)",
        "Dean's List",
      ]),
    );
    expect(awarded.otherExperience).toEqual([
      expect.objectContaining({
        title: "First Place, Metro Hackathon",
        period: "2024",
      }),
      expect.objectContaining({ title: "Dean's List", period: "—" }),
    ]);
  });

  it("routes unknown all-caps headings into other experience", () => {
    const unknown = parseResumeLines(
      lines([
        ["SIDE VENTURES", 12],
        "Farmers market stand\tSummers 2019 – 2021",
      ]),
    );
    expect(unknown.otherExperience).toHaveLength(1);
  });

  it("returns an empty import for no lines", () => {
    expect(parseResumeLines([])).toMatchObject({
      name: "",
      role: "",
      location: "",
      summary: "",
      expertise: [],
      experience: [],
      education: [],
    });
  });
});

describe("parseResumeLines on looser layouts", () => {
  it("reads entries whose dates stand on their own line", () => {
    const stacked = parseResumeLines(
      lines([
        ["EXPERIENCE", 12],
        "Software Engineer",
        "Evergreen Robotics, Inc.",
        "January 2020 – Present",
        "• Shipped the motor control loop",
        "Data Intern",
        "Harborview Health",
        "Jun 2018 – Aug 2018",
        "• Cleaned the intake reports",
      ]),
    );
    expect(stacked.experience).toEqual([
      expect.objectContaining({
        title: "Software Engineer",
        organization: "Evergreen Robotics, Inc.",
        start: "2020-01",
        end: undefined,
        highlights: ["Shipped the motor control loop"],
      }),
      expect.objectContaining({
        title: "Data Intern",
        organization: "Harborview Health",
        start: "2018-06",
        end: "2018-08",
        highlights: ["Cleaned the intake reports"],
      }),
    ]);
  });

  it("reads a single header line above a standalone date", () => {
    const single = parseResumeLines(
      lines([
        ["EXPERIENCE", 12],
        "Data Analyst at Harborview Health",
        "Jun 2021 – Dec 2022",
        "• Automated the weekly reporting pipeline",
      ]),
    );
    expect(single.experience).toEqual([
      expect.objectContaining({
        title: "Data Analyst",
        organization: "Harborview Health",
        start: "2021-06",
        end: "2022-12",
      }),
    ]);
  });

  it("reads seasons and apostrophe years as dates", () => {
    const seasonal = parseResumeLines(
      lines([
        ["EXPERIENCE", 12],
        "Research Assistant\tSummer 2024",
        "Marine Biology Lab",
        "• Collected samples",
        "Barista\tMay '22 – Aug '23",
        "Corner Coffee",
        "• Poured espresso",
      ]),
    );
    expect(seasonal.experience).toEqual([
      expect.objectContaining({
        title: "Research Assistant",
        organization: "Marine Biology Lab",
        start: "2024-06",
        end: "2024-06",
      }),
      expect.objectContaining({
        title: "Barista",
        organization: "Corner Coffee",
        start: "2022-05",
        end: "2023-08",
      }),
    ]);
  });

  it("recognizes a reworded heading set in larger type", () => {
    const reworded = parseResumeLines(
      lines([
        ["Career History", 13],
        "Staff Engineer\tJan 2019 – Present",
        "Nimbus",
        "• Kept the lights on",
      ]),
    );
    expect(reworded.experience).toHaveLength(1);
    expect(reworded.experience[0]?.title).toBe("Staff Engineer");
  });

  it("reads identity details from a contact section", () => {
    const sidebar = parseResumeLines(
      lines([
        ["CONTACT", 12],
        "jordan.reyes@example.com",
        "Portland, OR",
        "github.com/jordanreyes",
        "jordanreyes.dev",
        ["EXPERIENCE", 12],
        "Engineer\tJan 2020 – Present",
        "Nimbus",
        "• Built things",
      ]),
    );
    expect(sidebar.email).toBe("jordan.reyes@example.com");
    expect(sidebar.location).toBe("Portland, OR");
    expect(sidebar.githubUsername).toBe("jordanreyes");
    expect(sidebar.website).toBe("https://jordanreyes.dev");
  });

  it("drops category labels that stand alone above a skill list", () => {
    const labeled = parseResumeLines(
      lines([
        ["SKILLS", 12],
        "Languages",
        "Python, Rust",
        "Frameworks",
        "React",
      ]),
    );
    expect(labeled.expertise).toEqual(["Python", "Rust", "React"]);
  });

  it("reads a whole two-column page, sidebar and main", () => {
    const sidebar = [
      "CONTACT",
      "jordan@example.com",
      "Portland, OR",
      "SKILLS",
      "Python",
      "Rust",
      "Go",
      "SQL",
      "Docker",
      "Figma",
    ].map((text, index) => ({
      str: text,
      x: 30,
      y: 700 - index * 20,
      width: 120,
      height: 10,
    }));
    const main = [
      { str: "EXPERIENCE", x: 220, y: 700, width: 90, height: 10 },
      { str: "Firmware Engineer", x: 220, y: 680, width: 120, height: 10 },
      { str: "Jan 2023 – Mar 2024", x: 470, y: 680, width: 110, height: 10 },
      { str: "Evergreen Robotics, Inc.", x: 220, y: 660, width: 160, height: 10 },
      ...Array.from({ length: 6 }, (_, index) => ({
        str: `• Did the thing number ${index}`,
        x: 220,
        y: 640 - index * 20,
        width: 300,
        height: 10,
      })),
    ];
    const imported = parseResumeLines(
      linesFromTextItems(
        [
          { str: "Jordan Reyes", x: 200, y: 760, width: 180, height: 16 },
          ...sidebar,
          ...main,
        ],
        1,
      ),
    );
    expect(imported.name).toBe("Jordan Reyes");
    expect(imported.email).toBe("jordan@example.com");
    expect(imported.location).toBe("Portland, OR");
    expect(imported.expertise).toEqual([
      "Python",
      "Rust",
      "Go",
      "SQL",
      "Docker",
      "Figma",
    ]);
    expect(imported.experience).toEqual([
      expect.objectContaining({
        title: "Firmware Engineer",
        organization: "Evergreen Robotics, Inc.",
        start: "2023-01",
        end: "2024-03",
      }),
    ]);
    expect(imported.experience[0]?.highlights).toHaveLength(6);
  });
});

describe("resumeImportIsEmpty", () => {
  it("reports an import with no substance", () => {
    expect(resumeImportIsEmpty(parseResumeLines([]))).toBe(true);
    expect(
      resumeImportIsEmpty(
        parseResumeLines(lines([["Sam Chen", 17], "sam@fastmail.com"])),
      ),
    ).toBe(true);
    expect(resumeImportIsEmpty(parseResumeLines(atsResume))).toBe(false);
  });
});
