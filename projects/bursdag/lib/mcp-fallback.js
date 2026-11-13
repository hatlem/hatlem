'use strict';

/**
 * Reserve for MCP-arbeideren: når skal en film lages via Higgsfield-API-et i stedet?
 * - «unclaimed»: ingen arbeider har tatt jobben innen fristen (Macen er av, løkka står, eller køen er lang)
 * - «stuck»: arbeideren tok jobben, men leverte ikke
 */

const minutes = (value, fallback) => {
  const n = Number(value);
  return (Number.isFinite(n) && n >= 0 ? n : fallback) * 60 * 1000;
};

function settings(env = process.env) {
  return {
    unclaimedMs: minutes(env.MCP_FALLBACK_MIN, 4),
    stuckMs: minutes(env.MCP_STUCK_MIN, 12),
  };
}

/** @returns {'unclaimed' | 'stuck' | null} */
function fallbackReason(job, now, { unclaimedMs, stuckMs }) {
  const p = job.provider || {};
  if (p.name !== 'mcp' || p.stage === 'finishing' || job.status !== 'processing' || !unclaimedMs) return null;
  if (p.fallbackRetryAt && now < p.fallbackRetryAt) return null;
  if (p.claimedAt) return now - p.claimedAt >= stuckMs ? 'stuck' : null;
  return now - (job.startedAt || job.createdAt) >= unclaimedMs ? 'unclaimed' : null;
}

module.exports = { settings, fallbackReason };
