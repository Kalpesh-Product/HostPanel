import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface ScrollToTopProps {
  targetId?: string;
}

const ScrollToTop = ({ targetId = "scrollable-content" }: ScrollToTopProps) => {
  const { pathname } = useLocation();

  useEffect(() => {
    const container = document.getElementById(targetId);
    if (container) {
      container.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [pathname, targetId]);

  return null;
};

export default ScrollToTop;