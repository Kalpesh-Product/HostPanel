import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./pageTour.css";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useDashboardAccess from "../hooks/useDashboardAccess";
import { getBasicPageTour } from "./basicPageTours";
import type { BasicPageTourStep } from "./basicPageTours";
import { getProfessionalPageTour } from "./professionalPageTours";
import { getCustomPageTour } from "./customPageTours";
import { getTenantPageTour } from "./tenantPageTours";

type TourStatus = "completed" | "skipped";

interface TourProgressEntry {
  version: number;
  status: TourStatus;
  updatedAt?: string;
}

type TourProgress = Record<string, TourProgressEntry>;
type TourDriveStep = DriveStep;

const findVisible = (selector: string): Element | null => {
  const elements = Array.from(document.querySelectorAll(selector));
  return elements.find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) || null;
};

const normalizeElementText = (value: string | null | undefined) =>
  String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

const findStepTarget = (step: BasicPageTourStep): Element | null => {
  if (step.selector) {
    const selected = findVisible(step.selector);
    if (selected) return selected;
  }

  if (!step.text) return null;
  const expected = normalizeElementText(step.text);
  const candidates = Array.from(document.querySelectorAll(
    '[data-tour="page-content"] button, [data-tour="page-content"] a, [data-tour="page-content"] input, [data-tour="page-content"] select, [data-tour="page-content"] [role="button"], [data-tour="page-content"] h1, [data-tour="page-content"] h2, [data-tour="page-content"] h3, [data-tour="page-content"] span, [data-tour="page-content"] p',
  ));

  return candidates.find((element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const candidateText = normalizeElementText(
      element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        element.getAttribute("placeholder") ||
        element.textContent,
    );
    return step.exactText ? candidateText === expected : candidateText.includes(expected);
  }) || null;
};

const buildSteps = (tour: NonNullable<ReturnType<typeof getBasicPageTour>>): TourDriveStep[] => {
  const activeEditorPage = document
    .querySelector('[data-tour="wb-editor-page-tabs"]')
    ?.getAttribute("data-editor-page") || "";
  // Tab-aware pages (Attendance) expose their open tab on the tabs container,
  // so guide replays only walks through the controls of the visible tab.
  const activeTabPage = document
    .querySelector("[data-active-tab]")
    ?.getAttribute("data-active-tab") || "";
  const isEditorTour = tour.id === "basic-website-builder-editor";
  const pageContent = findVisible('[data-tour="page-content"]');
  const pageHeading = findVisible(
    '[data-tour="page-content"] h1, [data-tour="page-content"] h2, [data-tour="page-content"] [role="heading"]',
  );
  const form = findVisible('[data-tour="page-content"] form');
  const records = findVisible(
    '[data-tour="page-content"] table, [data-tour="page-content"] [role="grid"], [data-tour="page-content"] .ag-root',
  );
  const guideButton = findVisible('[data-tour="page-guide-button"]');

  const steps: TourDriveStep[] = isEditorTour && activeEditorPage !== "home" ? [] : [
    {
      element: pageHeading || pageContent || undefined,
      popover: {
        title: tour.title,
        description: tour.description,
        side: "bottom",
        align: "start",
      },
    },
  ];

  if (tour.steps?.length) {
    tour.steps
      .filter((tourStep) => !tourStep.editorPage || tourStep.editorPage === activeEditorPage)
      .filter((tourStep) => !tourStep.tabPage || tourStep.tabPage === activeTabPage)
      .forEach((tourStep) => {
        const target = findStepTarget(tourStep);
        if (!target && !tourStep.textOnly) return;
        steps.push({
          element: target ?? undefined,
          popover: {
            title: tourStep.title,
            description: tourStep.description,
            side: tourStep.side || "bottom",
            align: tourStep.align || "start",
          },
        });
      });

    if (tour.replayHint && guideButton) {
      steps.push({
        element: guideButton,
        popover: {
          title: "Replay any page guide",
          description: "Select Guide beside a page heading whenever you want to replay that page's detailed walkthrough.",
          side: "bottom",
          align: "end",
        },
      });
    }

    return steps;
  }

  if (form && tour.formDescription) {
    steps.push({
      element: form,
      popover: {
        title: "Complete this information",
        description: tour.formDescription,
        side: "top",
        align: "start",
      },
    });
  }

  if (records && tour.recordsDescription) {
    steps.push({
      element: records,
      popover: {
        title: "Work with your records",
        description: tour.recordsDescription,
        side: "top",
        align: "start",
      },
    });
  }

  if (guideButton) {
    steps.push({
      element: guideButton,
      popover: {
        title: "Need this guide again?",
        description: "Select Guide beside the page heading whenever you want to replay this page's tour.",
        side: "bottom",
        align: "end",
      },
    });
  }

  return steps;
};

export default function usePageTour() {
  const location = useLocation();
  const axios = useAxiosPrivate();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const access = useDashboardAccess();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const attemptedRef = useRef<string>("");

  const user = auth?.user as Record<string, any> | null;
  const userScope = String(
    user?._id ||
      user?.id ||
      user?.email ||
      "anonymous",
  );
  const progressQueryKey = useMemo(
    () => ["page-tour-progress", userScope],
    [userScope],
  );
  const currentTour = useMemo(
    () => {
      // Tenant portal users get the tenant registry — their pages are not
      // plan-gated like host workspaces.
      if (user?.tenantRole) return getTenantPageTour(location.pathname);
      if (access.plan === "basic") return getBasicPageTour(location.pathname);
      if (access.plan === "professional") return getProfessionalPageTour(location.pathname);
      if (access.plan === "custom") return getCustomPageTour(location.pathname);
      return null;
    },
    [access.plan, location.pathname, user?.tenantRole],
  );

  const { data: progress = {}, isLoading: isProgressLoading } = useQuery<TourProgress>({
    queryKey: progressQueryKey,
    queryFn: async () => {
      const response = await axios.get("/api/workspaces/tour-progress");
      return response?.data?.data?.progress || {};
    },
    enabled:
      ((access.plan === "basic" || access.plan === "professional" || access.plan === "custom") ||
        Boolean(user?.tenantRole)) &&
      !access.isLoading &&
      !auth?.impersonation,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const saveProgress = useCallback(
    async (tourKey: string, version: number, status: TourStatus) => {
      const entry: TourProgressEntry = {
        version,
        status,
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<TourProgress>(progressQueryKey, (current = {}) => ({
        ...current,
        [tourKey]: entry,
      }));

      try {
        await axios.patch(`/api/workspaces/tour-progress/${encodeURIComponent(tourKey)}`, {
          version,
          status,
        });
      } catch (error) {
        console.error("Unable to save page-tour progress", error);
        void queryClient.invalidateQueries({ queryKey: progressQueryKey });
      }
    },
    [axios, progressQueryKey, queryClient],
  );

  const startCurrentTour = useCallback(
    (automatic = false, allowIntroOnly = false) => {
      const isTenantUser = Boolean(user?.tenantRole);
      if (!currentTour || (!isTenantUser && access.plan !== "basic" && access.plan !== "professional" && access.plan !== "custom") || auth?.impersonation) return false;

      const saved = progress[currentTour.id];
      if (automatic && saved && saved.version >= currentTour.version) return false;

      const hasFunctionalTarget =
        !currentTour.steps?.length ||
        currentTour.steps.some((tourStep) => Boolean(findStepTarget(tourStep)));
      if (automatic && !allowIntroOnly && !hasFunctionalTarget) return false;

      driverRef.current?.destroy();

      const steps = buildSteps(currentTour);
      if (steps.length === 0) return false;
      let outcome: TourStatus | null = null;

      // The app scrolls inside #scrollable-content, so a step that needs the
      // nested container scrolled can be highlighted before that scroll
      // settles, drawing its box over empty space or the page footer. Keep
      // Driver re-aligned while the user scrolls or resizes during a tour.
      const refreshPosition = () => driverRef.current?.refresh();
      const scrollContainer = document.getElementById("scrollable-content");
      scrollContainer?.addEventListener("scroll", refreshPosition, { passive: true });
      window.addEventListener("resize", refreshPosition);

      const instance = driver({
        steps,
        showProgress: true,
        progressText: "{{current}} of {{total}}",
        nextBtnText: "Next",
        prevBtnText: "Previous",
        doneBtnText: "Finish",
        popoverClass: "hostpanel-page-tour",
        overlayColor: "#0f172a",
        overlayOpacity: 0.58,
        // The app scrolls inside #scrollable-content. Animated scrolling lets
        // Driver position the next popover before that nested scroll settles,
        // which leaves distant steps misplaced until they are revisited.
        smoothScroll: false,
        allowClose: true,
        disableActiveInteraction: true,
        onNextClick: (_element, _step, { driver: activeDriver }) => {
          if (activeDriver.hasNextStep()) {
            activeDriver.moveNext();
            return;
          }
          outcome = "completed";
          activeDriver.destroy();
        },
        onCloseClick: (_element, _step, { driver: activeDriver }) => {
          outcome = "skipped";
          activeDriver.destroy();
        },
        onDestroyed: () => {
          driverRef.current = null;
          scrollContainer?.removeEventListener("scroll", refreshPosition);
          window.removeEventListener("resize", refreshPosition);
          void saveProgress(
            currentTour.id,
            currentTour.version,
            outcome || "skipped",
          );
        },
      });

      driverRef.current = instance;
      instance.drive();
      return true;
    },
    [access.plan, auth?.impersonation, currentTour, progress, saveProgress, user?.tenantRole],
  );

  useEffect(() => {
    const isTenantUser = Boolean(user?.tenantRole);
    if (
      access.isLoading ||
      isProgressLoading ||
      (!isTenantUser && access.plan !== "basic" && access.plan !== "professional" && access.plan !== "custom") ||
      !currentTour ||
      // Manual-only tours (autoStart: false) never play on page load;
      // they run only through the Guide button above.
      currentTour.autoStart === false ||
      auth?.impersonation
    ) return;

    const attemptKey = `${userScope}:${currentTour.id}:${currentTour.version}`;
    if (attemptedRef.current === attemptKey) return;
    attemptedRef.current = attemptKey;

    const saved = progress[currentTour.id];
    if (saved && saved.version >= currentTour.version) return;

    let attempts = 0;
    let timer = 0;
    const tryStart = () => {
      attempts += 1;
      const started = startCurrentTour(true, attempts >= 10);
      if (!started && attempts < 10) {
        timer = window.setTimeout(tryStart, 500);
      }
    };
    timer = window.setTimeout(tryStart, 700);
    return () => window.clearTimeout(timer);
  }, [
    access.isLoading,
    access.plan,
    auth?.impersonation,
    currentTour,
    isProgressLoading,
    progress,
    startCurrentTour,
    user?.tenantRole,
    userScope,
  ]);

  useEffect(() => () => {
    driverRef.current?.destroy();
    driverRef.current = null;
  }, [location.pathname]);

  return {
    isTourAvailable: Boolean(
      currentTour &&
      (Boolean(user?.tenantRole) ||
        access.plan === "basic" ||
        access.plan === "professional" ||
        access.plan === "custom") &&
      !auth?.impersonation,
    ),
    startCurrentTour: () => startCurrentTour(false, true),
  };
}
