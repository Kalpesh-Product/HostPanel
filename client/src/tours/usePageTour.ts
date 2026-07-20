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
  const pageContent = findVisible('[data-tour="page-content"]');
  const pageHeading = findVisible(
    '[data-tour="page-content"] h1, [data-tour="page-content"] h2, [data-tour="page-content"] [role="heading"]',
  );
  const form = findVisible('[data-tour="page-content"] form');
  const records = findVisible(
    '[data-tour="page-content"] table, [data-tour="page-content"] [role="grid"], [data-tour="page-content"] .ag-root',
  );
  const guideButton = findVisible('[data-tour="page-guide-button"]');

  const steps: TourDriveStep[] = [
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
    tour.steps.forEach((tourStep) => {
      const target = findStepTarget(tourStep);
      if (!target) return;
      steps.push({
        element: target,
        popover: {
          title: tourStep.title,
          description: tourStep.description,
          side: "bottom",
          align: "start",
        },
      });
    });

    if (tour.id === "basic-dashboard" && guideButton) {
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
  const workspaceScope = String(
    user?.workspaceMembership?.workspace ||
      user?.primaryWorkspace ||
      user?.workspaceId ||
      user?._id ||
      user?.id ||
      user?.email ||
      "anonymous",
  );
  const progressQueryKey = useMemo(
    () => ["page-tour-progress", workspaceScope],
    [workspaceScope],
  );
  const currentTour = useMemo(
    () =>
      access.plan === "basic" && !user?.tenantRole
        ? getBasicPageTour(location.pathname)
        : null,
    [access.plan, location.pathname, user?.tenantRole],
  );

  const { data: progress = {}, isLoading: isProgressLoading } = useQuery<TourProgress>({
    queryKey: progressQueryKey,
    queryFn: async () => {
      const response = await axios.get("/api/workspaces/tour-progress");
      return response?.data?.data?.progress || {};
    },
    enabled:
      access.plan === "basic" &&
      !access.isLoading &&
      !auth?.impersonation &&
      !user?.tenantRole,
    staleTime: 5 * 60 * 1000,
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
      if (!currentTour || access.plan !== "basic" || auth?.impersonation) return false;

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
        smoothScroll: true,
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
    [access.plan, auth?.impersonation, currentTour, progress, saveProgress],
  );

  useEffect(() => {
    if (
      access.isLoading ||
      isProgressLoading ||
      access.plan !== "basic" ||
      !currentTour ||
      auth?.impersonation
    ) return;

    const attemptKey = `${workspaceScope}:${currentTour.id}:${currentTour.version}`;
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
    workspaceScope,
  ]);

  useEffect(() => () => {
    driverRef.current?.destroy();
    driverRef.current = null;
  }, [location.pathname]);

  return {
    isTourAvailable: Boolean(currentTour && access.plan === "basic" && !auth?.impersonation),
    startCurrentTour: () => startCurrentTour(false, true),
  };
}
