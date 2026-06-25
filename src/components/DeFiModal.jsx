import React, { useLayoutEffect, useRef } from 'react';

const syncDeFiModalInsets = (el) => {
  if (!el) return;

  const vh = window.visualViewport?.height ?? window.innerHeight;
  const top = Math.round(Math.max(120, vh * 0.15, 128));
  const bottom = Math.round(Math.max(24, vh * 0.04, 28));

  el.style.top = `${top}px`;
  el.style.bottom = `${bottom}px`;
};

const DeFiModal = ({ title, onClose, children }) => {
  const contentRef = useRef(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return undefined;

    const handleViewportChange = () => syncDeFiModalInsets(el);

    handleViewportChange();
    window.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  return (
    <div className="modal-overlay modal-overlay--defi">
      <div ref={contentRef} className="modal-content modal-content--defi">
        <div className="defi-modal-header">
          <h2>{title}</h2>
          <button type="button" className="compact-btn" onClick={onClose}>Close</button>
        </div>
        <div className="defi-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DeFiModal;