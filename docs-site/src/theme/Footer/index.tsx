import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ThemedImage from '@theme/ThemedImage';
import styles from './styles.module.css';

type FooterLink = {
  name: string;
  href: string;
};

const SERVICES_LINKS: FooterLink[] = [
  {name: 'About', href: 'https://host.wono.co/about'},
  {name: 'Career', href: 'https://host.wono.co/career'},
  {name: 'FAQs', href: 'https://host.wono.co/faq'},
];

const CORPORATE_LINKS: FooterLink[] = [
  {name: 'Privacy', href: 'https://nomad.wono.co/privacy'},
  {name: 'T&C', href: 'https://host.wono.co/terms-and-conditions'},
  {name: 'Contact', href: 'https://host.wono.co/contact'},
];

function GlobeIcon(): React.JSX.Element {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function FacebookIcon(): React.JSX.Element {
  return (
    <svg className={styles.icon} viewBox="0 0 320 512" aria-hidden="true">
      <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
    </svg>
  );
}

function XIcon(): React.JSX.Element {
  return (
    <svg className={styles.icon} viewBox="0 0 512 512" aria-hidden="true">
      <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
    </svg>
  );
}

function InstagramIcon(): React.JSX.Element {
  return (
    <svg className={styles.icon} viewBox="0 0 448 512" aria-hidden="true">
      <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
    </svg>
  );
}

function FooterLinkList({links}: {links: FooterLink[]}): React.JSX.Element {
  return (
    <ul className={styles.linkList}>
      {links.map((link) => (
        <li key={link.name}>
          <a href={link.href} target="_blank" rel="noreferrer">
            {link.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function Footer(): React.JSX.Element {
  const year = new Date().getFullYear();
  const shortNextYear = String(year + 1).slice(-2);

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <a href="https://hostpanel.wono.co">
            <ThemedImage
              className={styles.logo}
              alt="HostPanel"
              sources={{
                light: useBaseUrl('/img/hostpanel-logo.svg'),
                dark: useBaseUrl('/img/hostpanel-logo-dark.svg'),
              }}
            />
          </a>
          <p className={styles.brandText}>
            WONOCO PRIVATE LIMITED - SINGAPORE
            <br />
            <a className={styles.email} href="mailto:response@wono.co">
              response@wono.co
            </a>
          </p>
        </div>

        <div className={styles.links}>
          <FooterLinkList links={SERVICES_LINKS} />
          <FooterLinkList links={CORPORATE_LINKS} />
        </div>
      </div>

      <div className={styles.copyrightRow}>
        <div className={styles.copyright}>
          <span>
            &copy; Copyright {year}-{shortNextYear}
          </span>
          <span className={styles.rights}>
            WONOCO PRIVATE LIMITED - SINGAPORE. All Rights Reserved.
          </span>
        </div>

        <div className={styles.policyLinks}>
          <a
            href="https://host.wono.co/content-and-copyright"
            target="_blank"
            rel="noreferrer">
            Content and Copyright Policy
          </a>
          <a
            href="https://host.wono.co/content-use-removal"
            target="_blank"
            rel="noreferrer">
            Content Use &amp; Removal Policy
          </a>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <span className={styles.selector}>
          <GlobeIcon />
          English (US)
        </span>
        <span className={styles.currency}>
          <span>$</span>
          <span>USD</span>
        </span>
        <span className={styles.social}>
          <FacebookIcon />
        </span>
        <span className={styles.social}>
          <XIcon />
        </span>
        <span className={styles.social}>
          <InstagramIcon />
        </span>
      </div>
    </footer>
  );
}
