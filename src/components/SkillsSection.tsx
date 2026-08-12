import { CaretUpDownIcon } from "@phosphor-icons/react";
import "./skills-section.css";

export interface SkillItem {
  name: string;
  logo: string;
  preserveLogoContrast?: boolean;
}

export interface SkillGroup {
  label: string;
  items: readonly SkillItem[];
}

export const defaultSkillGroups = [
  {
    label: "Language",
    items: [
      { name: "TypeScript", logo: "/skill-logos/typescript.svg" },
      { name: "JavaScript", logo: "/skill-logos/javascript.svg" },
    ],
  },
  {
    label: "Frontend",
    items: [
      { name: "React", logo: "/skill-logos/react.svg" },
      { name: "Next.js", logo: "/skill-logos/nextdotjs.svg" },
      { name: "Tailwind CSS", logo: "/skill-logos/tailwindcss.svg" },
      { name: "shadcn/ui", logo: "/skill-logos/shadcnui.svg" },
      { name: "Motion", logo: "/skill-logos/motion.svg" },
      { name: "Expo", logo: "/skill-logos/expo.svg" },
    ],
  },
  {
    label: "Backend",
    items: [
      { name: "Node.js", logo: "/skill-logos/nodedotjs.svg" },
      { name: "Bun", logo: "/skill-logos/bun.svg" },
      { name: "PostgreSQL", logo: "/skill-logos/postgresql.svg" },
      { name: "Redis", logo: "/skill-logos/redis.svg" },
      { name: "tRPC", logo: "/skill-logos/trpc.svg" },
      { name: "GraphQL", logo: "/skill-logos/graphql.svg" },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { name: "AWS", logo: "/skill-logos/aws.svg" },
      { name: "Vercel", logo: "/skill-logos/vercel.svg" },
      { name: "Cloudflare", logo: "/skill-logos/cloudflare.svg" },
      { name: "Linux", logo: "/skill-logos/linux.svg" },
      { name: "Docker", logo: "/skill-logos/docker.svg" },
    ],
  },
  {
    label: "Workflow",
    items: [
      { name: "Neovim", logo: "/skill-logos/neovim.svg" },
      { name: "Herdr", logo: "/skill-logos/herdr.svg", preserveLogoContrast: true },
      { name: "Codex", logo: "/skill-logos/codex.svg", preserveLogoContrast: true },
      { name: "GitHub", logo: "/skill-logos/github.svg" },
      { name: "Linear", logo: "/skill-logos/linear.svg" },
    ],
  },
  {
    label: "Design",
    items: [
      { name: "Figma", logo: "/skill-logos/figma.svg" },
      { name: "Paper", logo: "/skill-logos/paper.png", preserveLogoContrast: true },
      { name: "Photoshop", logo: "/skill-logos/photoshop.svg", preserveLogoContrast: true },
    ],
  },
] satisfies readonly SkillGroup[];

interface SkillsSectionProps {
  groups?: readonly SkillGroup[];
  initiallyExpanded?: boolean;
}

export function SkillsSection({
  groups = defaultSkillGroups,
  initiallyExpanded = true,
}: SkillsSectionProps) {
  return (
    <section className="skills-section" aria-label="Skills">
      <details open={initiallyExpanded}>
        <summary>
          <h2>Skills</h2>
          <span className="skills-section__control">
            <span className="skills-section__more">See more</span>
            <span className="skills-section__less">See less</span>
            <CaretUpDownIcon aria-hidden="true" size={21} weight="bold" />
          </span>
        </summary>

        <dl className="skills-section__groups">
          {groups.map((group) => (
            <div className="skills-section__group" key={group.label}>
              <dt>{group.label}</dt>
              <dd>
                {group.items.map((item) => (
                  <span className="skills-section__skill" key={item.name}>
                    <img
                      alt=""
                      className={`skills-section__logo${item.preserveLogoContrast ? " skills-section__logo--native" : ""}`}
                      src={item.logo}
                    />
                    {item.name}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
