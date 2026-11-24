"use client";

import { useEffect, useState } from "react";
import { FlowingWords } from "./FlowingWords";

/** Tekst som glir inn ord for ord når siden åpnes. */
export const FlowingTitle = ({ text, startMs = 0, stepMs }: { text: string; startMs?: number; stepMs?: number }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return <FlowingWords text={text} visible={visible} startMs={startMs} stepMs={stepMs} />;
};
