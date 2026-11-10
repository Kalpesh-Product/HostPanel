import React, { useEffect, useRef } from "react";

const CURSOR_STATES = ["is-opaque", "is-text", "is-lg", "is-hidden"];

export const CoboxCursor: React.FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      typeof window.matchMedia !== "function" ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }
    const label = node.querySelector<HTMLElement>(".cbx-cursor-text");

    const pos = { x: -window.innerWidth, y: -window.innerHeight };
    const target = { x: pos.x, y: pos.y };
    let frame = 0;
    let visible = false;

    const render = () => {
      pos.x += (target.x - pos.x) * 0.18;
      pos.y += (target.y - pos.y) * 0.18;
      node.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      frame = window.requestAnimationFrame(render);
    };

    const handleMove = (event: MouseEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!visible) {
        visible = true;
        node.classList.add("is-visible");
      }
    };

    const handleLeave = () => {
      visible = false;
      node.classList.remove("is-visible");
    };

    const handleOver = (event: MouseEvent) => {
      const targetNode = event.target as Element | null;
      if (!targetNode || typeof targetNode.closest !== "function") return;
      node.classList.toggle(
        "is-pointer",
        Boolean(targetNode.closest("a, input, textarea, button"))
      );
      CURSOR_STATES.forEach((state) => node.classList.remove(state));
      const stateTarget = targetNode.closest<HTMLElement>("[data-cursor]");
      const state = stateTarget?.dataset.cursor;
      if (state) node.classList.add(`is-${state.replace(/^-/, "")}`);
      const textTarget = targetNode.closest<HTMLElement>("[data-cursor-text]");
      const text = textTarget?.dataset.cursorText || "";
      if (label) label.textContent = text;
      node.classList.toggle("is-text", Boolean(text));
    };

    const handleDown = () => node.classList.add("is-active");
    const handleUp = () => node.classList.remove("is-active");

    frame = window.requestAnimationFrame(render);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("mouseup", handleUp);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("mouseup", handleUp);
    };
  }, []);

  return (
    <div className="cbx-cursor" ref={ref} aria-hidden="true">
      <div className="cbx-cursor-text" />
    </div>
  );
};
