-- Enforce append-only at the database level, per CLAUDE.md:
-- "The audit_chain table is append-only. NEVER generate UPDATE or DELETE
-- against it; a DB trigger enforces this." Application code must never rely
-- on this being the only safeguard, but it's the one that can't be bypassed
-- by a bug in application code.

CREATE OR REPLACE FUNCTION reject_audit_chain_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditChainEntry is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_chain_no_update
  BEFORE UPDATE ON "AuditChainEntry"
  FOR EACH ROW
  EXECUTE FUNCTION reject_audit_chain_mutation();

CREATE TRIGGER audit_chain_no_delete
  BEFORE DELETE ON "AuditChainEntry"
  FOR EACH ROW
  EXECUTE FUNCTION reject_audit_chain_mutation();
