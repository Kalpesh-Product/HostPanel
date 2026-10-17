import React from "react";
import { motion } from "../motion";

export const ChReveal: React.FC<React.PropsWithChildren<{ className?: string; delay?: number }>> = ({ children, className = "", delay = 0 }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 48, clipPath: "inset(0 0 18% 0)" }} whileInView={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}>
    {children}
  </motion.div>
);

export const ChLabel: React.FC<React.PropsWithChildren> = ({ children }) => <p className="ch-label"><span aria-hidden="true">✦</span>{children}</p>;
export const ChArrow = () => <span className="ch-arrow" aria-hidden="true">↗</span>;
export const ChPhoto: React.FC<{ src?: string; alt: string; className?: string; eager?: boolean }> = ({ src, alt, className = "", eager }) => <div className={`ch-photo ${className}`}>{src ? <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} /> : <div className="ch-placeholder">Marea</div>}</div>;

export const ChPageHero: React.FC<{ eyebrow: string; title: string; text?: string; image?: string }> = ({ eyebrow, title, text, image }) => (
  <section className="ch-page-hero"><div className="ch-shell ch-page-hero-grid"><ChReveal className="ch-page-copy"><ChLabel>{eyebrow}</ChLabel><h1>{title}</h1>{text ? <p>{text}</p> : null}</ChReveal>{image ? <ChReveal delay={0.08}><ChPhoto src={image} alt="" className="ch-page-hero-photo" eager /></ChReveal> : null}</div></section>
);
