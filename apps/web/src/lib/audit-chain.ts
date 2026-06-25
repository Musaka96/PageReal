import { createHash } from "crypto";

export type AuditEntry = {
  index: number;
  timestamp: string;
  data: Record<string, unknown>;
  prevHash: string;
  hash: string;
};

const GENESIS_HASH = "0".repeat(64);

function hashEntry(timestamp: string, data: Record<string, unknown>, prevHash: string): string {
  const payload = timestamp + JSON.stringify(data) + prevHash;
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Builds an append-only hash chain over a sequence of (timestamp, data) records.
 * Mirrors the audit_chain table described in agent_docs/data_model.md:
 * hash = sha256(timestamp + data_json + prev_hash). Demo mode runs this over
 * synthetic snapshots, but the chaining logic is identical to what a live
 * account's worker would write per scrape cycle.
 */
export function buildAuditChain(
  records: { timestamp: string; data: Record<string, unknown> }[]
): AuditEntry[] {
  const chain: AuditEntry[] = [];
  let prevHash = GENESIS_HASH;
  records.forEach((record, i) => {
    const hash = hashEntry(record.timestamp, record.data, prevHash);
    chain.push({ index: i, timestamp: record.timestamp, data: record.data, prevHash, hash });
    prevHash = hash;
  });
  return chain;
}

/** Re-derives every hash from scratch and confirms the chain wasn't tampered with. */
export function verifyAuditChain(chain: AuditEntry[]): boolean {
  let prevHash = GENESIS_HASH;
  for (const entry of chain) {
    if (entry.prevHash !== prevHash) return false;
    const recomputed = hashEntry(entry.timestamp, entry.data, prevHash);
    if (recomputed !== entry.hash) return false;
    prevHash = entry.hash;
  }
  return true;
}
