import { CaretUpDownIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useId, useState } from "react";

const MOBILE = "@media (max-width: 760px)";
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

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
    <span {...stylex.props(styles.mark)} aria-hidden="true">
      <img
        {...stylex.props(
          styles.markImage,
          (mark === "vercel" || mark === "stripe") && styles.fullMarkImage,
          mark === "openai" && styles.openaiMarkImage,
        )}
        alt=""
        src={companyLogoSources[mark]}
      />
    </span>
  );
}

export function Experience({ items = exampleExperience }: ExperienceProps) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  return (
    <MotionConfig reducedMotion="user" transition={layoutTransition}>
      <motion.section {...stylex.props(styles.root)} layout aria-labelledby={`${listId}-heading`}>
        <header {...stylex.props(styles.header)}>
          <h2 {...stylex.props(styles.heading)} id={`${listId}-heading`}>Experience</h2>
          <button
            {...stylex.props(styles.toggle)}
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
          {...stylex.props(styles.list, expanded ? styles.expandedList : styles.collapsedList)}
          id={listId}
          layout
        >
          {items.map((item, index) => (
            <motion.li
              {...stylex.props(styles.item, expanded ? styles.expandedItem : styles.collapsedItem)}
              key={`${item.company}-${item.period}`}
              layout
            >
              <AnimatePresence initial={false}>
                {!expanded ? (
                  <motion.span
                    {...stylex.props(styles.dot, index === 0 && styles.currentDot)}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    key="dot"
                  />
                ) : null}
              </AnimatePresence>

              <motion.div
                {...stylex.props(styles.company, expanded && styles.expandedCompany)}
                layout="position"
              >
                <CompanyMark mark={item.mark} />
                <div>
                  <h3 {...stylex.props(styles.companyName)}>{item.company}</h3>
                  <AnimatePresence initial={false} mode="popLayout">
                    {expanded ? (
                      <motion.p
                        {...stylex.props(styles.companyRole)}
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

              <motion.p
                {...stylex.props(styles.period, expanded ? styles.expandedPeriod : styles.collapsedPeriod)}
                layout="position"
              >
                {item.period}{expanded ? ` · ${item.location}` : ""}
              </motion.p>

              <AnimatePresence initial={false} mode="popLayout">
                {expanded ? (
                  <motion.ul
                    {...stylex.props(styles.highlights)}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    initial={{ opacity: 0, y: -6 }}
                    key="highlights"
                  >
                    {item.highlights.map((highlight) => (
                      <li {...stylex.props(styles.highlight)} key={highlight}>{highlight}</li>
                    ))}
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

const styles = stylex.create({
  root: {
    boxSizing: "border-box",
    width: "100%",
    paddingBlock: "clamp(44px, 6vw, 92px)",
    paddingInline: { default: "clamp(20px, 8vw, 172px)", [MOBILE]: 16 },
    color: "#f2f2f2",
    backgroundColor: "#000",
    fontFamily: '"Manrope Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
  },
  heading: {
    boxSizing: "border-box",
    margin: 0,
    fontSize: "clamp(24px, 2.1vw, 36px)",
    fontWeight: 500,
    letterSpacing: "-0.04em",
    lineHeight: 1.2,
  },
  toggle: {
    boxSizing: "border-box",
    display: "inline-flex",
    minHeight: 44,
    paddingInline: 14,
    alignItems: "center",
    gap: 10,
    color: { default: "#d9d9d9", ":hover": "#fff" },
    backgroundColor: { default: "transparent", ":hover": "#161616" },
    borderWidth: 0,
    borderRadius: 6,
    font: "inherit",
    fontSize: "clamp(16px, 1.6vw, 27px)",
    fontWeight: 650,
    cursor: "pointer",
    transitionProperty: "color, background-color",
    transitionDuration: { default: "160ms", [REDUCED_MOTION]: "0s" },
    transitionTimingFunction: "ease",
    outlineColor: { default: null, ":focus-visible": "#d9d9d9" },
    outlineStyle: { default: null, ":focus-visible": "solid" },
    outlineWidth: { default: null, ":focus-visible": 2 },
    outlineOffset: { default: null, ":focus-visible": 3 },
  },
  list: {
    boxSizing: "border-box",
    padding: 0,
    marginBlockStart: "clamp(48px, 6vw, 78px)",
    marginBlockEnd: 0,
    marginInline: 0,
    listStyle: "none",
  },
  collapsedList: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: { default: "repeat(4, minmax(0, 1fr))", [MOBILE]: "repeat(4, minmax(138px, 1fr))" },
    gap: { default: "clamp(18px, 3.1vw, 54px)", [MOBILE]: 16 },
    overflowX: { default: "visible", [MOBILE]: "auto" },
    overscrollBehaviorInline: { default: "auto", [MOBILE]: "contain" },
    scrollSnapType: { default: "none", [MOBILE]: "inline proximity" },
    scrollbarWidth: { default: "auto", [MOBILE]: "none" },
    "::before": {
      position: "absolute",
      top: 10,
      right: 0,
      left: 0,
      height: 1,
      backgroundColor: "#343434",
      content: "",
    },
    "::-webkit-scrollbar": { display: { default: "block", [MOBILE]: "none" } },
  },
  expandedList: { display: "grid", gap: "clamp(42px, 5vw, 68px)" },
  item: { boxSizing: "border-box", position: "relative", minWidth: 0 },
  collapsedItem: { paddingTop: 58, scrollSnapAlign: { default: "none", [MOBILE]: "start" } },
  expandedItem: {
    display: "grid",
    gridTemplateColumns: { default: "auto minmax(0, 1fr) auto", [MOBILE]: "auto minmax(0, 1fr)" },
    columnGap: 24,
  },
  dot: {
    boxSizing: "border-box",
    position: "absolute",
    zIndex: 1,
    top: 0,
    left: 12,
    width: 21,
    height: 21,
    borderColor: "#000",
    borderStyle: "solid",
    borderWidth: 5,
    borderRadius: "50%",
    backgroundColor: "#3b3b3b",
    boxShadow: "0 0 0 5px #000",
  },
  currentDot: {
    backgroundColor: "#f5f5f5",
    boxShadow: "0 0 12px 5px rgb(255 255 255 / 20%)",
  },
  company: {
    boxSizing: "border-box",
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: 18,
  },
  expandedCompany: { gridColumn: "1 / 3" },
  companyName: {
    boxSizing: "border-box",
    margin: 0,
    fontSize: "clamp(18px, 1.8vw, 28px)",
    fontWeight: 500,
    letterSpacing: "-0.035em",
    lineHeight: 1.25,
  },
  companyRole: {
    boxSizing: "border-box",
    marginBlockStart: 4,
    marginBlockEnd: 0,
    color: "#a1a1a1",
    fontSize: "clamp(15px, 1.5vw, 23px)",
    letterSpacing: "-0.025em",
    lineHeight: 1.5,
  },
  mark: {
    boxSizing: "border-box",
    display: "grid",
    width: "clamp(46px, 4vw, 64px)",
    aspectRatio: 1,
    flex: "0 0 auto",
    overflow: "hidden",
    backgroundImage: "linear-gradient(145deg, #313131, #202020)",
    borderColor: "#484848",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 14,
    boxShadow: "inset 0 1px 0 rgb(255 255 255 / 8%)",
    placeItems: "center",
  },
  markImage: { boxSizing: "border-box", width: "56%", height: "56%", objectFit: "contain" },
  fullMarkImage: { width: "100%", height: "100%" },
  openaiMarkImage: { width: "62%", height: "62%", filter: "invert(1)" },
  period: {
    boxSizing: "border-box",
    margin: 0,
    color: "#a1a1a1",
    fontSize: "clamp(15px, 1.5vw, 23px)",
    letterSpacing: "-0.025em",
    lineHeight: 1.5,
  },
  collapsedPeriod: { marginTop: 22 },
  expandedPeriod: {
    gridColumn: { default: 3, [MOBILE]: 2 },
    alignSelf: "start",
    paddingTop: { default: 2, [MOBILE]: 8 },
    whiteSpace: { default: "nowrap", [MOBILE]: "normal" },
  },
  highlights: {
    boxSizing: "border-box",
    display: "grid",
    gridColumn: { default: "2 / 4", [MOBILE]: 2 },
    gap: 8,
    paddingBlockStart: { default: 22, [MOBILE]: 14 },
    paddingBlockEnd: 0,
    paddingLeft: 27,
    margin: 0,
    overflow: "hidden",
    color: "#a1a1a1",
    fontSize: "clamp(15px, 1.5vw, 23px)",
    letterSpacing: "-0.025em",
    lineHeight: 1.5,
    listStyleType: "disc",
  },
  highlight: { boxSizing: "border-box", paddingLeft: 8, "::marker": { color: "#565656" } },
});
