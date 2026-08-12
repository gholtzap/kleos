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
import "./social-hover-cards.css";

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
  cardClassName?: string;
  linkClassName?: string;
  className?: string;
}

interface CardLayout {
  x: number;
  width: number;
  height: number;
}

function classNames(...values: Array<string | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(" ");
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
  cardClassName,
  linkClassName,
  className,
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
      className={classNames("social-hover-cards", className)}
      onBlurCapture={handleBlur}
      onPointerEnter={clearCloseTimer}
      onPointerLeave={scheduleClose}
      ref={rootRef}
    >
      {activeItem ? (
        <motion.div
          animate={{
            height: cardLayout.height,
            opacity: 1,
            scale: 1,
            width: cardLayout.width,
            x: cardLayout.x,
          }}
          aria-label={`${activeItem.label} preview`}
          className={classNames("social-hover-cards__card", cardClassName)}
          id={previewId}
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.98 }}
          onPointerEnter={clearCloseTimer}
          role="group"
          style={{ bottom: `calc(100% + ${cardOffset}px)` }}
          transition={{ ...spring, opacity: { duration: reducedMotion ? 0 : 0.15 } }}
        >
          <AnimatePresence custom={direction} initial={false} mode="popLayout">
            <motion.div
              animate="center"
              className="social-hover-cards__content"
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
          className: classNames(
            "social-hover-cards__trigger",
            showLabels ? "social-hover-cards__trigger--labeled" : undefined,
            item.href ? linkClassName : undefined,
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
              aria-hidden="true"
              className="social-hover-cards__icon"
              style={{ height: iconSize, width: iconSize }}
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
