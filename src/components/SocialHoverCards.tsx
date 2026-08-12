import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type FocusEvent,
  type HTMLAttributeAnchorTarget,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { appBreakpoints } from "../app-tokens.stylex";

export interface SocialHoverCardItem {
  value: string;
  label: string;
  icon: ReactNode;
  href?: string;
  content: ReactNode;
  target?: HTMLAttributeAnchorTarget;
  rel?: string;
}

export interface SocialHoverCardsProps {
  items: readonly SocialHoverCardItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  cardOffset?: number;
  iconSize?: number;
  showLabels?: boolean;
  closeDelay?: number;
  contentBlur?: number;
  springStiffness?: number;
  springDamping?: number;
  cardStyle?: StyleXStyles;
  linkStyle?: StyleXStyles;
  style?: StyleXStyles;
}

interface CardLayout {
  x: number;
  width: number;
  height: number;
}

export function SocialHoverCards({
  items,
  value,
  defaultValue = "",
  onValueChange,
  cardOffset = 8,
  iconSize = 24,
  showLabels = false,
  closeDelay = 120,
  contentBlur = 8,
  springStiffness = 420,
  springDamping = 38,
  cardStyle,
  linkStyle,
  style,
}: SocialHoverCardsProps) {
  const controlled = value !== undefined;
  const [localValue, setLocalValue] = useState(defaultValue);
  const activeValue = controlled ? value : localValue;
  const activeItem = items.find((item) => item.value === activeValue);
  const activeIndex = activeItem ? items.indexOf(activeItem) : -1;
  const previousIndex = useRef(activeIndex);
  const direction = previousIndex.current < 0 || activeIndex < 0
    ? 0
    : Math.sign(activeIndex - previousIndex.current);

  const reducedMotion = useReducedMotion();
  const previewId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLElement>());
  const closeTimer = useRef<number | undefined>(undefined);
  const touchWillOpen = useRef(false);
  const [cardLayout, setCardLayout] = useState<CardLayout>({ x: 0, width: 0, height: 0 });

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current === undefined) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  }, []);

  const setActiveValue = useCallback((nextValue: string) => {
    clearCloseTimer();
    if (!controlled) setLocalValue(nextValue);
    if (nextValue !== activeValue) onValueChange?.(nextValue);
  }, [activeValue, clearCloseTimer, controlled, onValueChange]);

  const close = useCallback(() => setActiveValue(""), [setActiveValue]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    if (closeDelay <= 0) {
      close();
      return;
    }
    closeTimer.current = window.setTimeout(close, closeDelay);
  }, [clearCloseTimer, close, closeDelay]);

  const measureCard = useCallback(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    const trigger = activeItem ? triggerRefs.current.get(activeItem.value) : undefined;
    if (!root || !content || !trigger) return;

    const rootBox = root.getBoundingClientRect();
    const triggerBox = trigger.getBoundingClientRect();
    const width = content.offsetWidth;
    const idealX = triggerBox.left - rootBox.left + (triggerBox.width - width) / 2;
    const minimumX = 16 - rootBox.left;
    const maximumX = window.innerWidth - 16 - rootBox.left - width;
    const x = maximumX < minimumX
      ? idealX
      : Math.min(Math.max(idealX, minimumX), maximumX);

    setCardLayout((current) => {
      const next = { x, width, height: content.offsetHeight };
      return current.x === next.x && current.width === next.width && current.height === next.height
        ? current
        : next;
    });
  }, [activeItem]);

  useLayoutEffect(() => {
    previousIndex.current = activeIndex;
  }, [activeIndex]);

  useLayoutEffect(() => {
    if (!activeItem) return;
    measureCard();
    const observer = typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(measureCard);
    if (rootRef.current) observer?.observe(rootRef.current);
    if (contentRef.current) observer?.observe(contentRef.current);
    window.addEventListener("resize", measureCard);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measureCard);
    };
  }, [activeItem, measureCard]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    close();
  };

  const setTriggerRef = (itemValue: string, element: HTMLElement | null) => {
    if (element) triggerRefs.current.set(itemValue, element);
    else triggerRefs.current.delete(itemValue);
  };

  const spring = { type: "spring" as const, stiffness: springStiffness, damping: springDamping };
  const travel = reducedMotion ? 0 : 10;
  const blur = reducedMotion ? "blur(0px)" : `blur(${contentBlur}px)`;
  const contentVariants = {
    enter: (contentDirection: number) => ({
      filter: blur,
      opacity: 0,
      x: contentDirection * travel,
    }),
    center: { filter: "blur(0px)", opacity: 1, x: 0 },
    exit: (contentDirection: number) => ({
      filter: blur,
      opacity: 0,
      x: -contentDirection * travel,
    }),
  };

  return (
    <div
      {...stylex.props(styles.root, style)}
      onBlurCapture={handleBlur}
      onPointerEnter={clearCloseTimer}
      onPointerLeave={scheduleClose}
      ref={rootRef}
    >
      {activeItem ? (
        <motion.div
          {...stylex.props(styles.card, styles.cardOffset(cardOffset), cardStyle)}
          animate={{
            height: cardLayout.height,
            opacity: 1,
            scale: 1,
            width: cardLayout.width,
            x: cardLayout.x,
          }}
          aria-label={`${activeItem.label} preview`}
          id={previewId}
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.98 }}
          onPointerEnter={clearCloseTimer}
          role="group"
          transition={{ ...spring, opacity: { duration: reducedMotion ? 0 : 0.15 } }}
        >
          <AnimatePresence custom={direction} initial={false} mode="popLayout">
            <motion.div
              {...stylex.props(styles.content)}
              animate="center"
              custom={direction}
              exit="exit"
              initial="enter"
              key={activeItem.value}
              ref={(element) => {
                if (element) contentRef.current = element;
                else if (contentRef.current?.dataset.value === activeItem.value) {
                  contentRef.current = null;
                }
              }}
              data-value={activeItem.value}
              transition={spring}
              variants={contentVariants}
            >
              {activeItem.content}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      ) : null}

      {items.map((item) => {
        const active = item.value === activeValue;
        const sharedProps = {
          "aria-controls": active ? previewId : undefined,
          "aria-expanded": active,
          "aria-label": showLabels ? undefined : item.label,
          ...stylex.props(
            styles.trigger,
            showLabels && styles.labeledTrigger,
            active && styles.activeTrigger,
            item.href ? linkStyle : undefined,
          ),
          onFocus: () => setActiveValue(item.value),
          onPointerEnter: (event: PointerEvent<HTMLElement>) => {
            if (event.pointerType !== "touch") setActiveValue(item.value);
          },
          ref: (element: HTMLElement | null) => setTriggerRef(item.value, element),
        };
        const children = (
          <>
            <span
              {...stylex.props(styles.icon, styles.iconSize(iconSize))}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            {showLabels ? <span>{item.label}</span> : null}
          </>
        );

        return item.href ? (
          <a
            {...sharedProps}
            href={item.href}
            key={item.value}
            onClick={(event) => {
              if (!touchWillOpen.current) return;
              event.preventDefault();
              setActiveValue(item.value);
              touchWillOpen.current = false;
            }}
            onPointerDown={(event) => {
              touchWillOpen.current = event.pointerType === "touch" && !active;
            }}
            rel={item.rel ?? "noopener noreferrer"}
            target={item.target ?? "_blank"}
          >
            {children}
          </a>
        ) : (
          <button
            {...sharedProps}
            key={item.value}
            onClick={() => setActiveValue(active ? "" : item.value)}
            type="button"
          >
            {children}
          </button>
        );
      })}
    </div>
  );
}

const styles = stylex.create({
  root: {
    boxSizing: "border-box",
    position: "relative",
    display: "inline-flex",
    maxWidth: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  trigger: {
    boxSizing: "border-box",
    display: "flex",
    width: 44,
    height: 44,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    color: {
      default: "#a0a0a0",
      ":hover": "#e5e5e5",
      ":focus": "#e5e5e5",
    },
    backgroundColor: "transparent",
    borderWidth: 0,
    borderRadius: 10,
    font: "inherit",
    textDecoration: "none",
    cursor: "pointer",
    transitionProperty: "color",
    transitionDuration: { default: "150ms", [appBreakpoints.reducedMotion]: "0s" },
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
    outlineColor: { default: null, ":focus-visible": "#e5e5e5" },
    outlineStyle: { default: null, ":focus-visible": "solid" },
    outlineWidth: { default: null, ":focus-visible": 2 },
    outlineOffset: { default: null, ":focus-visible": 2 },
  },
  activeTrigger: { color: "#e5e5e5" },
  labeledTrigger: { width: "auto" },
  icon: {
    boxSizing: "border-box",
    display: "grid",
    flex: "0 0 auto",
    placeItems: "center",
  },
  iconSize: (size: number) => ({ width: size, height: size }),
  card: {
    boxSizing: "border-box",
    position: "absolute",
    zIndex: 20,
    left: 0,
    overflow: "hidden",
    maxWidth: "calc(100vw - 32px)",
    color: "#e5e5e5",
    backgroundColor: "#171717",
    borderColor: "rgb(255 255 255 / 4%)",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 14,
    transformOrigin: "bottom center",
  },
  cardOffset: (offset: number) => ({ bottom: `calc(100% + ${offset}px)` }),
  content: {
    boxSizing: "border-box",
    width: "max-content",
    maxWidth: "calc(100vw - 32px)",
  },
});
