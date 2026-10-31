import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@renderer/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@renderer/components/ui/context-menu";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@renderer/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@renderer/components/ui/tooltip";
import { TAB_INFO } from "@renderer/components/NavBar";
import { useSettingsPage } from "@renderer/contexts/SettingsPageContext";
import {
  SINGLE_INSTANCE_TABS,
  TAB_TYPES,
  useTabPreferences,
  useTabs,
  type TabType,
} from "@renderer/contexts/TabsContext";
import { useUpdateStatus } from "@renderer/hooks/useUpdateStatus";
import {
  getTabsNoticeVisible,
  setTabsNoticeVisible,
} from "@renderer/lib/localPreferences";
import { cn } from "@renderer/lib/utils";

const CLOSE_ANIMATION_MS = 150;

const TAB_SHAPE_INSET = 1.5;

const DRAG_THRESHOLD = 5;

const AUTOSCROLL_EDGE = 32;

const AUTOSCROLL_SPEED = 12;

const REORDER_ANIMATION: KeyframeAnimationOptions = {
  duration: 200,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
};

function PlusIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
    >
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

interface DragLayout {
  listLeft: number;
  min: number;
  max: number;
  naturalLeft: number;
  width: number;
  centers: { id: string; left: number; center: number }[];
}

export function TabBar(): React.JSX.Element {
  const {
    tabs,
    activeTab,
    activate,
    open,
    close,
    closeTabs,
    move,
    meta,
    restorable,
    restore,
    dismissRestore,
  } = useTabs();
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const orderedTabs = useMemo(() => {
    if (!dragOrder) return tabs;
    const byId = new Map(tabs.map((tab) => [tab.id, tab]));
    const ordered = dragOrder.flatMap((id) => byId.get(id) ?? []);
    return ordered.length === tabs.length ? ordered : tabs;
  }, [tabs, dragOrder]);
  const settings = useSettingsPage();
  const { newTabType } = useTabPreferences();
  const { status: updateStatus } = useUpdateStatus();
  const updating =
    updateStatus?.state === "downloading" ||
    updateStatus?.state === "downloaded" ||
    (updateStatus?.state === "available" && updateStatus.source === "startup");
  const [noticeOpen, setNoticeOpen] = useState(getTabsNoticeVisible);
  const dismissNotice = (): void => {
    setNoticeOpen(false);
    setTabsNoticeVisible(false);
  };
  const [knownIds, setKnownIds] = useState<ReadonlySet<string>>(
    () => new Set(tabs.map((tab) => tab.id)),
  );
  const [entering, setEntering] = useState<ReadonlySet<string>>(new Set());
  const added = tabs
    .filter((tab) => !knownIds.has(tab.id))
    .map((tab) => tab.id);
  if (added.length) {
    setKnownIds(new Set([...knownIds, ...added]));
    setEntering(new Set([...entering, ...added]));
  }
  const [closing, setClosing] = useState<ReadonlySet<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuHidden, setMenuHidden] = useState(false);
  const openMenu = (open: boolean): void => {
    setPickerOpen(open);
    if (open) setMenuHidden(false);
  };
  const dismissMenu = (): void => {
    setMenuHidden(true);
    setPickerOpen(false);
  };
  const closable = tabs.length - closing.size > 1;
  const tabRefs = useRef(new Map<string, HTMLDivElement>());
  const indicatorRef = useRef<HTMLDivElement>(null);
  const placedOnce = useRef(false);
  const drag = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startLeft: number;
    scroller: HTMLElement | null;
    startScroll: number;
    x: number;
    offset: number;
    moving: boolean;
    frame: number;
    layout: DragLayout | null;
  } | null>(null);
  const lastPositions = useRef(new Map<string, number>());
  const [dragSpace, setDragSpace] = useState<number | null>(null);
  const draggingTabs = dragSpace !== null;
  const plusRef = useRef<HTMLButtonElement>(null);
  const [closedHistory, setClosedHistory] = useState<TabType[]>([]);

  const snap = (value: number): number =>
    Math.round(value * devicePixelRatio) / devicePixelRatio;

  const placeIndicator = (animate: boolean): void => {
    const indicator = indicatorRef.current;
    const el = tabRefs.current.get(activeTab.id);
    const list = el?.parentElement;
    if (!indicator || !el || !list || drag.current?.moving) return;
    const shift = new DOMMatrix(getComputedStyle(el).transform).m41;
    const rect = el.getBoundingClientRect();
    const listLeft = list.getBoundingClientRect().left;
    const left = snap(rect.left - shift + TAB_SHAPE_INSET);
    const right = snap(rect.right - shift - TAB_SHAPE_INSET);
    indicator.style.transition = animate && placedOnce.current ? "" : "none";
    indicator.style.transform = `translateX(${left - listLeft}px)`;
    indicator.style.width = `${right - left}px`;
    indicator.style.visibility = "visible";
    placedOnce.current = true;
  };
  const placeIndicatorRef = useRef(placeIndicator);
  placeIndicatorRef.current = placeIndicator;

  const measureDrag = (): void => {
    const current = drag.current;
    const el = current && tabRefs.current.get(current.id);
    const list = el?.parentElement;
    if (!current || !el || !list) return;
    const style = getComputedStyle(list);
    const last = tabRefs.current.get(orderedTabs[orderedTabs.length - 1].id);
    current.layout = {
      listLeft: list.getBoundingClientRect().left,
      min: parseFloat(style.paddingLeft),
      max:
        Math.max(
          (last ? last.offsetLeft + last.offsetWidth : 0) +
            parseFloat(style.paddingRight),
          list.clientWidth,
        ) -
        parseFloat(style.paddingLeft) -
        el.offsetWidth,
      naturalLeft: el.offsetLeft,
      width: el.offsetWidth,
      centers: orderedTabs.map((tab) => {
        const tabEl = tabRefs.current.get(tab.id);
        return {
          id: tab.id,
          left: tabEl?.offsetLeft ?? 0,
          center: tabEl ? tabEl.offsetLeft + tabEl.offsetWidth / 2 : 0,
        };
      }),
    };
  };

  const updateDrag = (): void => {
    const current = drag.current;
    const layout = current?.layout;
    const el = current && tabRefs.current.get(current.id);
    const indicator = indicatorRef.current;
    if (!current?.moving || !layout || !el) return;
    const scrollLeft = current.scroller?.scrollLeft ?? 0;
    const visibleRight = current.scroller
      ? scrollLeft + current.scroller.clientWidth - layout.min - layout.width
      : layout.max;
    const left = Math.min(
      Math.max(
        current.startLeft +
          current.x -
          current.startX +
          scrollLeft -
          current.startScroll,
        layout.min,
        scrollLeft + layout.min,
      ),
      layout.max,
      visibleRight,
    );
    current.offset = left - layout.naturalLeft;
    el.style.transform = `translateX(${current.offset}px)`;
    el.style.zIndex = "2";
    if (indicator && current.id === activeTab.id) {
      const shapeLeft = snap(layout.listLeft + left + TAB_SHAPE_INSET);
      const shapeRight = snap(
        layout.listLeft + left + layout.width - TAB_SHAPE_INSET,
      );
      indicator.style.transform = `translateX(${shapeLeft - layout.listLeft}px)`;
      indicator.style.width = `${shapeRight - shapeLeft}px`;
    }
    const center = left + layout.width / 2;
    const target = layout.centers.filter(
      (tab) => tab.id !== current.id && tab.center < center,
    ).length;
    if (target === layout.centers.findIndex((tab) => tab.id === current.id))
      return;
    lastPositions.current = new Map(
      layout.centers.map((tab) => [tab.id, tab.left]),
    );
    current.layout = null;
    const ids = layout.centers
      .map((tab) => tab.id)
      .filter((tabId) => tabId !== current.id);
    ids.splice(target, 0, current.id);
    setDragOrder(ids);
  };
  const updateDragRef = useRef(updateDrag);
  updateDragRef.current = updateDrag;
  const measureDragRef = useRef(measureDrag);
  measureDragRef.current = measureDrag;

  useLayoutEffect(() => {
    const previous = lastPositions.current;
    tabRefs.current.forEach((el, id) => {
      const before = previous.get(id);
      if (
        before === undefined ||
        id === drag.current?.id ||
        before === el.offsetLeft
      )
        return;
      el.animate(
        [
          { transform: `translateX(${before - el.offsetLeft}px)` },
          { transform: "none" },
        ],
        REORDER_ANIMATION,
      );
    });
    lastPositions.current = new Map();
    if (drag.current?.moving) {
      measureDragRef.current();
      updateDragRef.current();
    }
    placeIndicatorRef.current(true);
    const observer = new ResizeObserver(() => placeIndicatorRef.current(true));
    tabRefs.current.forEach((tabEl) => observer.observe(tabEl));
    return () => observer.disconnect();
  }, [activeTab.id, orderedTabs, draggingTabs]);

  const onDragMove = (e: PointerEvent): void => {
    const current = drag.current;
    if (!current || current.pointerId !== e.pointerId) return;
    current.x = e.clientX;
    if (!current.moving) {
      if (Math.abs(current.x - current.startX) < DRAG_THRESHOLD) return;
      current.moving = true;
      measureDrag();
      if (indicatorRef.current) indicatorRef.current.style.transition = "none";
      tabRefs.current
        .get(current.id)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
      const scroller = current.scroller;
      const end = scroller?.parentElement?.getBoundingClientRect().right;
      setDragSpace(
        scroller && end !== undefined
          ? Math.max(0, end - scroller.getBoundingClientRect().right + 8)
          : 0,
      );
      dismissMenu();
    }
    if (current.frame) return;
    const tick = (): void => {
      current.frame = 0;
      if (!current.layout) measureDragRef.current();
      const scroller = current.scroller;
      const rect = scroller?.getBoundingClientRect();
      const speed = rect
        ? Math.max(0, Math.min(1, (current.x - rect.right) / AUTOSCROLL_EDGE + 1)) -
          Math.max(0, Math.min(1, (rect.left - current.x) / AUTOSCROLL_EDGE + 1))
        : 0;
      if (scroller && speed) scroller.scrollLeft += speed * AUTOSCROLL_SPEED;
      updateDragRef.current();
      if (speed && drag.current === current)
        current.frame = requestAnimationFrame(tick);
    };
    current.frame = requestAnimationFrame(tick);
  };

  const endDrag = (): void => {
    const current = drag.current;
    drag.current = null;
    if (!current?.moving) return;
    cancelAnimationFrame(current.frame);
    if (dragOrder) move(current.id, dragOrder.indexOf(current.id));
    setDragOrder(null);
    setDragSpace(null);
    const el = tabRefs.current.get(current.id);
    if (!el) return;
    el.style.transform = "";
    el.animate(
      [{ transform: `translateX(${current.offset}px)` }, { transform: "none" }],
      REORDER_ANIMATION,
    ).onfinish = () => (el.style.zIndex = "");
    placeIndicator(true);
  };
  const dragHandlers = useRef({ onDragMove, endDrag });
  dragHandlers.current = { onDragMove, endDrag };

  const startDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
  ): void => {
    const list = e.currentTarget.parentElement;
    const pointerId = e.pointerId;
    drag.current = {
      id,
      pointerId,
      startX: e.clientX,
      startLeft: e.currentTarget.offsetLeft,
      scroller: list?.parentElement ?? null,
      startScroll: list?.parentElement?.scrollLeft ?? 0,
      x: e.clientX,
      offset: 0,
      moving: false,
      frame: 0,
      layout: null,
    };
    const onMove = (ev: PointerEvent): void =>
      dragHandlers.current.onDragMove(ev);
    const onEnd = (ev: PointerEvent): void => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      list?.removeEventListener("lostpointercapture", onEnd);
      dragHandlers.current.endDrag();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    list?.setPointerCapture(pointerId);
    list?.addEventListener("lostpointercapture", onEnd);
  };

  const select = (id: string): void => {
    if (settings.isOpen) settings.close();
    activate(id);
  };

  useLayoutEffect(() => {
    tabRefs.current
      .get(activeTab.id)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTab.id, orderedTabs]);

  const pick = (type: TabType): void => {
    if (settings.isOpen) settings.close();
    dismissMenu();
    open(type, { newTab: true });
  };

  const startClose = (id: string): void => {
    if (closing.has(id) || !closable) return;
    const tabToClose = tabs.find((t) => t.id === id);
    if (tabToClose) {
      setClosedHistory((prev) => [...prev, tabToClose.type]);
    }
    setClosing((prev) => new Set(prev).add(id));
    setTimeout(() => {
      close(id);
      setClosing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, CLOSE_ANIMATION_MS);
  };

  const closeMany = (ids: string[], keepId: string): void => {
    const pending = ids.filter((id) => !closing.has(id));
    if (pending.length === 0) return;
    const typesToPush = tabs
      .filter((t) => pending.includes(t.id))
      .map((t) => t.type);
    setClosedHistory((prev) => [...prev, ...typesToPush]);
    setClosing((prev) => new Set([...prev, ...pending]));
    setTimeout(() => {
      closeTabs(pending, keepId);
      setClosing(
        (prev) => new Set([...prev].filter((id) => !pending.includes(id))),
      );
    }, CLOSE_ANIMATION_MS);
  };

  const restoreClosedTab = (): void => {
    setClosedHistory((prev) => {
      const next = [...prev];
      while (next.length > 0) {
        const type = next.pop()!;
        if (
          SINGLE_INSTANCE_TABS.has(type) &&
          tabs.some((t) => t.type === type)
        ) {
          continue;
        }
        if (settings.isOpen) settings.close();
        open(type, { newTab: true });
        break;
      }
      return next;
    });
  };

  const openDefaultTab = (): void => {
    pick(newTabType);
  };

  const shortcutsRef = useRef({
    activeId: activeTab.id,
    startClose,
    restoreClosedTab,
    openDefaultTab,
  });
  shortcutsRef.current = {
    activeId: activeTab.id,
    startClose,
    restoreClosedTab,
    openDefaultTab,
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;

      const key = e.key.toLowerCase();

      // ctrl/cmd+w -> close tab
      if ((key === "w" || e.code === "KeyW") && !e.shiftKey) {
        e.preventDefault();
        shortcutsRef.current.startClose(shortcutsRef.current.activeId);
      }

      // ctrl/cmd+t -> open new tab type from settings
      if ((key === "t" || e.code === "KeyT") && !e.shiftKey) {
        e.preventDefault();
        shortcutsRef.current.openDefaultTab();
      }

      // ctrl/cmd+shift+t -> reopen closed tab
      if ((key === "t" || e.code === "KeyT") && e.shiftKey) {
        e.preventDefault();
        shortcutsRef.current.restoreClosedTab();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <div
      role="tablist"
      aria-label="Tabs"
      className="relative flex h-full min-w-0 flex-1 pr-10 pl-2"
    >
      <div
        style={{
          flexBasis: draggingTabs
            ? `calc(${orderedTabs.length * 15 + 1}rem + ${dragSpace}px)`
            : `${orderedTabs.length * 15 + 1}rem`,
          marginRight: draggingTabs
            ? `calc(-0.5rem - ${dragSpace}px)`
            : undefined,
          scrollbarWidth: "none",
        }}
        className="-mx-2 h-[calc(100%+1px)] min-w-0 flex-[0_1_auto] scroll-px-2 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:!hidden"
        onWheel={(e) => {
          if (!e.deltaY || e.deltaX) return;
          e.currentTarget.scrollLeft += e.deltaY;
          e.preventDefault();
        }}
        onScroll={(e) => {
          const lastTabId = orderedTabs[orderedTabs.length - 1]?.id;
          if (!lastTabId) return;
          const lastTab = tabRefs.current.get(lastTabId);
          if (!lastTab) return;
          const maxScroll = Math.max(
            0,
            lastTab.offsetLeft +
              lastTab.offsetWidth +
              parseFloat(
                getComputedStyle(lastTab.parentElement!).paddingRight,
              ) -
              e.currentTarget.clientWidth,
          );
          if (e.currentTarget.scrollLeft > maxScroll)
            e.currentTarget.scrollLeft = maxScroll;
        }}
      >
        <div
          style={{
            paddingRight: draggingTabs
              ? `calc(0.5rem + ${dragSpace}px)`
              : undefined,
          }}
          className="relative flex h-[calc(100%-1px)] min-w-full w-full items-end px-2"
        >
          <div
            ref={indicatorRef}
            aria-hidden
            style={{ visibility: "hidden" }}
            className={cn(
              "pointer-events-none absolute bottom-[-2px] left-0 z-[1] h-[32px] rounded-t-lg border border-b-0 border-border-primary bg-primary-bg shadow-[0_2px_0_var(--color-primary-bg)] before:absolute before:bottom-0 before:-left-[8px] before:size-2 before:bg-[radial-gradient(circle_at_0_0,transparent_6.75px,var(--color-border-primary)_7.25px,var(--color-border-primary)_7.75px,var(--color-primary-bg)_8.25px)] after:absolute after:-right-[8px] after:bottom-0 after:size-2 after:bg-[radial-gradient(circle_at_100%_0,transparent_6.75px,var(--color-border-primary)_7.25px,var(--color-border-primary)_7.75px,var(--color-primary-bg)_8.25px)]",
              "transition-[transform,width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
            )}
          />
          {orderedTabs.map((tab, index) => {
            const { Icon, label: typeLabel } = TAB_INFO[tab.type];
            const active = tab.id === activeTab.id;
            const { title, badge } = meta[tab.id] ?? {};
            const label = title || typeLabel;
            return (
              <ContextMenu key={tab.id}>
                <Tooltip delayDuration={500}>
                  <TooltipTrigger asChild>
                    <ContextMenuTrigger asChild>
                      <div
                        ref={(el) => {
                          if (el) tabRefs.current.set(tab.id, el);
                          else tabRefs.current.delete(tab.id);
                        }}
                        role="tab"
                        data-tab-type={tab.type}
                        aria-selected={active}
                        tabIndex={active ? 0 : -1}
                        data-tauri-drag-region="false"
                        onPointerDown={(e) => {
                          if (e.button === 1) e.preventDefault();
                          if (e.button !== 0) return;
                          select(tab.id);
                          startDrag(e, tab.id);
                        }}
                        onAuxClick={(e) => e.button === 1 && startClose(tab.id)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          select(tab.id);
                        }}
                        className={cn(
                          "group relative flex h-full @container min-w-10 flex-[0_1_15rem] overflow-hidden border border-b-0 border-transparent transition-colors duration-200",
                          active && "min-w-12",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-[32px] w-full text-xs font-medium whitespace-nowrap transition-colors duration-200",
                            active
                              ? "z-[2] text-primary-text"
                              : "text-secondary-text group-hover:text-primary-text",
                            closing.has(tab.id)
                              ? "animate-tab-out pointer-events-none overflow-hidden"
                              : entering.has(tab.id) &&
                                  "animate-tab-in overflow-hidden",
                          )}
                          onAnimationEnd={(e) => {
                            if (
                              e.target !== e.currentTarget ||
                              e.animationName !== "tab-in"
                            )
                              return;
                            setEntering((prev) => {
                              const next = new Set(prev);
                              next.delete(tab.id);
                              return next;
                            });
                          }}
                        >
                          {!active && (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-x-[1.5px] top-[4px] bottom-[3px] rounded-lg transition-colors group-hover:bg-quaternary-bg/50"
                            />
                          )}
                          <span
                            className={cn(
                              "relative mb-[-4px] flex min-w-0 flex-1 items-center gap-2 overflow-hidden pr-[7px] pl-3",
                              active
                                ? "@max-[48px]:justify-center @max-[48px]:p-0"
                                : "@max-[40px]:justify-center @max-[40px]:p-0",
                            )}
                          >
                            <span
                              className={cn(
                                "relative flex shrink-0 [&_svg]:h-4 [&_svg]:w-4",
                                active
                                  ? "@max-[48px]:hidden"
                                  : "@max-[40px]:absolute @max-[40px]:inset-0 @max-[40px]:items-center @max-[40px]:justify-center",
                              )}
                            >
                              <Icon />
                              {!!badge && !active && (
                                <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-card-tag-bg px-0.5 text-[8px] font-semibold text-card-tag-text">
                                  {badge > 99 ? "99+" : badge}
                                </span>
                              )}
                            </span>
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate",
                                active
                                  ? "@max-[48px]:hidden"
                                  : "@max-[40px]:hidden",
                              )}
                            >
                              {label}
                            </span>
                            {closable && (
                              <button
                                type="button"
                                aria-label={`Close ${label}`}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startClose(tab.id);
                                }}
                                className={cn(
                                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-tertiary-text hover:bg-quaternary-bg hover:text-primary-text",
                                  active
                                    ? "@max-[48px]:absolute @max-[48px]:inset-0 @max-[48px]:m-auto"
                                    : "@max-[40px]:hidden",
                                )}
                              >
                                <PlusIcon className="h-4 w-4 rotate-45" />
                              </button>
                            )}
                          </span>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                  </TooltipTrigger>
                  {!draggingTabs && (
                    <TooltipContent side="bottom">{label}</TooltipContent>
                  )}
                </Tooltip>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem
                    disabled={closedHistory.length === 0}
                    onSelect={restoreClosedTab}
                  >
                    Reopen closed tab
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    disabled={orderedTabs.length < 2}
                    onSelect={() =>
                      closeMany(
                        orderedTabs
                          .filter((other) => other.id !== tab.id)
                          .map((other) => other.id),
                        tab.id,
                      )
                    }
                  >
                    Close other tabs
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={index === 0}
                    onSelect={() =>
                      closeMany(
                        orderedTabs.slice(0, index).map((other) => other.id),
                        tab.id,
                      )
                    }
                  >
                    Close tabs to the left
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={index === orderedTabs.length - 1}
                    onSelect={() =>
                      closeMany(
                        orderedTabs.slice(index + 1).map((other) => other.id),
                        tab.id,
                      )
                    }
                  >
                    Close tabs to the right
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </div>
      <span
        aria-hidden
        className={cn(
          "h-4 w-px shrink-0 self-center bg-border-primary transition-opacity duration-150 [[role=tab]:hover+&]:opacity-0",
          (orderedTabs[orderedTabs.length - 1]?.id === activeTab.id ||
            draggingTabs) &&
            "opacity-0",
        )}
      />
      <Popover open={pickerOpen} onOpenChange={openMenu}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="New tab"
                ref={plusRef}
                data-tauri-drag-region="false"
                className={cn(
                  "mb-[5px] ml-1 flex h-6 w-6 shrink-0 items-center justify-center self-end rounded-full transition-[color,background-color,transform,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-quaternary-bg hover:text-primary-text motion-reduce:transition-none",
                  draggingTabs && "pointer-events-none opacity-0",
                  pickerOpen
                    ? "bg-quaternary-bg text-primary-text"
                    : "text-secondary-text",
                )}
              >
                <PlusIcon
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    pickerOpen && "rotate-45",
                  )}
                />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">New tab</TooltipContent>
        </Tooltip>
        <PopoverContent
          align="start"
          className={cn("w-60 p-1.5", menuHidden && "invisible")}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {TAB_TYPES.map((type) => {
            const { Icon, title } = TAB_INFO[type];
            const alreadyOpen =
              SINGLE_INSTANCE_TABS.has(type) &&
              tabs.some((tab) => tab.type === type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => pick(type)}
                className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm text-primary-text transition-colors hover:bg-quaternary-bg"
              >
                <span className="flex shrink-0 text-secondary-text [&_svg]:h-4 [&_svg]:w-4">
                  <Icon />
                </span>
                <span className="min-w-0 flex-1 truncate">{title}</span>
                {alreadyOpen && (
                  <span className="text-xs text-tertiary-text">Open</span>
                )}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
      <Popover
        open={noticeOpen && !restorable && !updating}
        onOpenChange={(next) => !next && dismissNotice()}
      >
        <PopoverAnchor
          virtualRef={plusRef as React.RefObject<HTMLButtonElement>}
        />
        <PopoverContent
          arrow
          align="start"
          alignOffset={-12}
          className="w-80 p-4"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="text-sm font-semibold text-primary-text">
            Tabs are here
          </p>
          <p className="mt-1 text-xs text-secondary-text">
            Use the + to open messages, trades, trackers, values, calculators
            and dupe finders. Your tabs are saved, so you can pick up where you
            left off. Prefer the old sidebar? Switch back in App settings
            anytime.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                dismissNotice();
                settings.open("app");
              }}
            >
              App settings
            </Button>
            <Button type="button" size="sm" onClick={dismissNotice}>
              Got it
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Popover
        open={!!restorable && !updating}
        onOpenChange={(next) => !next && dismissRestore()}
      >
        <PopoverAnchor className="pointer-events-none absolute bottom-0 left-2 h-px w-px" />
        <PopoverContent
          arrow
          align="start"
          className="w-72 p-4"
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="text-sm font-semibold text-primary-text">
            Restore your tabs?
          </p>
          <p className="mt-1 text-xs text-secondary-text">
            You also had {restorable?.length === 1 ? "this tab" : "these tabs"}{" "}
            open last time:{" "}
            {restorable?.map((tab) => TAB_INFO[tab.type].label).join(", ")}.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => settings.open("app")}
              className="mr-auto text-xs font-medium text-secondary-text transition-colors hover:text-primary-text hover:underline"
            >
              Configure
            </button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={dismissRestore}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={restore}>
              Restore
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
