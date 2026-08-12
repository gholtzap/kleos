import { CaretUpDownIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useId, useState } from "react";
import "./experience.css";

export type ExperienceMark = "vercel" | "openai" | "stripe" | "google";

export interface ExperienceItem {
  company: string;
  mark: ExperienceMark;
  role: string;
  period: string;
  location: string;
  highlights: readonly string[];
}

interface ExperienceProps {
  items?: readonly ExperienceItem[];
}

export const exampleExperience: readonly ExperienceItem[] = [
  {
    company: "Vercel",
    mark: "vercel",
    role: "Member of Technical Staff",
    period: "May 24 – Now",
    location: "SF",
    highlights: [
      "Built platform systems and developer tooling that improved the path from code to production.",
      "Led performance and reliability work across globally distributed frontend and edge infrastructure.",
    ],
  },
  {
    company: "OpenAI",
    mark: "openai",
    role: "Software Engineer",
    period: "Jan 22 – May 24",
    location: "SF",
    highlights: [
      "Developed full-stack tools used to evaluate, monitor, and ship new model capabilities.",
      "Led performance work across APIs and internal platforms serving high-volume workloads.",
    ],
  },
  {
    company: "Stripe",
    mark: "stripe",
    role: "Senior Software Engineer",
    period: "Sep 19 – Jan 22",
    location: "SF",
    highlights: [
      "Built payment infrastructure and merchant-facing workflows used across global markets.",
      "Designed resilient services for transaction processing, reconciliation, and operational tooling.",
    ],
  },
  {
    company: "Google",
    mark: "google",
    role: "Software Engineer",
    period: "Jun 16 – Sep 19",
    location: "SF",
    highlights: [
      "Built distributed systems and internal tooling supporting large-scale developer products.",
      "Improved service performance through profiling, caching, and database optimization.",
    ],
  },
];

const layoutTransition = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

const companyLogoSources: Record<ExperienceMark, string> = {
  vercel: "/company-logos/vercel.png",
  openai: "/company-logos/openai.svg",
  stripe: "/company-logos/stripe.svg",
  google: "/company-logos/google.png",
};

function CompanyMark({ mark }: { mark: ExperienceMark }) {
  return (
    <span aria-hidden="true" className={`experience-mark experience-mark--${mark}`}>
      <img alt="" src={companyLogoSources[mark]} />
    </span>
  );
}

export function Experience({ items = exampleExperience }: ExperienceProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  return (
    <MotionConfig reducedMotion="user" transition={layoutTransition}>
      <motion.section className="experience" layout aria-labelledby={`${listId}-heading`}>
        <header className="experience-header">
          <h2 id={`${listId}-heading`}>Experience</h2>
          <button
            aria-controls={listId}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? "See less" : "See more"}
            <CaretUpDownIcon aria-hidden="true" size={18} weight="bold" />
          </button>
        </header>

        <motion.ol
          className={`experience-list experience-list--${expanded ? "expanded" : "collapsed"}`}
          id={listId}
          layout
        >
          {items.map((item) => (
            <motion.li key={`${item.company}-${item.period}`} layout>
              <AnimatePresence initial={false}>
                {!expanded ? (
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    className="experience-dot"
                    exit={{ opacity: 0, scale: 0.5 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    key="dot"
                  />
                ) : null}
              </AnimatePresence>

              <motion.div className="experience-company" layout="position">
                <CompanyMark mark={item.mark} />
                <div>
                  <h3>{item.company}</h3>
                  <AnimatePresence initial={false} mode="popLayout">
                    {expanded ? (
                      <motion.p
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        initial={{ opacity: 0, y: -5 }}
                        key="role"
                      >
                        {item.role}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.div>

              <motion.p className="experience-period" layout="position">
                {item.period}{expanded ? ` · ${item.location}` : ""}
              </motion.p>

              <AnimatePresence initial={false} mode="popLayout">
                {expanded ? (
                  <motion.ul
                    animate={{ opacity: 1, y: 0 }}
                    className="experience-highlights"
                    exit={{ opacity: 0, y: -6 }}
                    initial={{ opacity: 0, y: -6 }}
                    key="highlights"
                  >
                    {item.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}
                  </motion.ul>
                ) : null}
              </AnimatePresence>
            </motion.li>
          ))}
        </motion.ol>
      </motion.section>
    </MotionConfig>
  );
}
