"use client";

import { memo, useState } from "react";
import { createPortal } from "react-dom";

/** The end of the reel, with a VHS rewind back to the first scene. */
function SiteFooter() {
  const [rewinding, setRewinding] = useState(false);

  const rewind = () => {
    if (rewinding) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      window.scrollTo({ top: 0 });
      return;
    }
    setRewinding(true);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 250);
    window.setTimeout(() => setRewinding(false), 1900);
  };

  return (
    <footer className="site-footer">
      <span>PREMIERE 22</span>
      <p>Hecho con recuerdos, cariño y alguna toma de más.</p>
      <button type="button" className="rewind-button" onClick={rewind} data-hee-control>
        ◀◀ REBOBINAR
      </button>
      <span>RAAULINHOO © ESCENA 22</span>
      {rewinding &&
        createPortal(
          <div className="vhs-rewind" aria-hidden="true">
            <b>◀◀ REW</b>
            <span>SP 0:00:22</span>
          </div>,
          document.body,
        )}
    </footer>
  );
}

export default memo(SiteFooter);
