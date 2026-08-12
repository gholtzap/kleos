// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SocialHoverCards, type SocialHoverCardItem } from "./SocialHoverCards";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const items: readonly SocialHoverCardItem[] = [
  { value: "code", label: "Code", icon: <span>C</span>, content: <p>Code profile</p> },
  {
    value: "message",
    label: "Message",
    icon: <span>M</span>,
    href: "#message",
    content: <p>Send a message</p>,
  },
];

function render(component: React.ReactNode): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(component));
  return { container, root };
}

function touchPointerDown(element: Element): void {
  const event = new MouseEvent("pointerdown", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "pointerType", { value: "touch" });
  element.dispatchEvent(event);
}

describe("SocialHoverCards", () => {
  afterEach(() => document.body.replaceChildren());

  it("opens on focus and closes when focus leaves", () => {
    const { container, root } = render(<SocialHoverCards items={items} />);
    const button = container.querySelector("button");
    const outside = document.createElement("button");
    document.body.append(outside);

    act(() => button?.focus());
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[role="group"]')?.textContent).toContain("Code profile");

    act(() => outside.focus());
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="group"]')).toBeNull();

    act(() => root.unmount());
  });

  it("closes an open button when it is selected again", () => {
    const { container, root } = render(
      <SocialHoverCards defaultValue="code" items={items} />,
    );
    const button = container.querySelector("button");

    expect(button?.getAttribute("aria-expanded")).toBe("true");
    act(() => button?.click());
    expect(button?.getAttribute("aria-expanded")).toBe("false");

    act(() => root.unmount());
  });

  it("reports controlled changes without owning the value", () => {
    const changes: string[] = [];
    const { container, root } = render(
      <SocialHoverCards items={items} onValueChange={(next) => changes.push(next)} value="" />,
    );
    const button = container.querySelector("button");

    act(() => button?.focus());
    expect(changes).toEqual(["code"]);
    expect(button?.getAttribute("aria-expanded")).toBe("false");

    act(() => root.render(
      <SocialHoverCards items={items} onValueChange={(next) => changes.push(next)} value="code" />,
    ));
    expect(container.querySelector("button")?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[role="group"]')?.textContent).toContain("Code profile");

    act(() => root.unmount());
  });

  it("opens a touch link on the first tap and follows it on the second tap", () => {
    const { container, root } = render(<SocialHoverCards items={items} />);
    const link = container.querySelector("a");
    if (!link) throw new Error("The link was not rendered.");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    let firstTapAllowed = true;
    act(() => {
      touchPointerDown(link);
      firstTapAllowed = link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(firstTapAllowed).toBe(false);
    expect(link.getAttribute("aria-expanded")).toBe("true");

    let secondTapAllowed = false;
    act(() => {
      touchPointerDown(link);
      secondTapAllowed = link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(secondTapAllowed).toBe(true);

    act(() => root.unmount());
  });
});
