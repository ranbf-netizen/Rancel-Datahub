-- ============================================================================
-- One-time cleanup: normalize legacy lowercase network values in DataBundle.
--
-- Context: 34 bundle rows carry old lowercase supplier values ('mtn',
-- 'telecel', 'airteltigo') that predate the Cledanet integration. The customer
-- /data page and Cledanet's API both require the EXACT canonical codes:
--   MTN, TELECEL, AIRTELTIGO_ISHARE, AIRTELTIGO_BIGTIME
-- Anything else silently shows "no bundles" AND fails fulfillment after payment.
--
-- Run this against the DIRECT Postgres connection (NOT the Accelerate proxy URL).
-- Wrapped in a transaction so a mistake rolls back cleanly.
-- ============================================================================

BEGIN;

-- 1. See what you have before changing anything (review the output).
--    Comment this out when running non-interactively.
SELECT network, COUNT(*) AS rows
FROM "DataBundle"
GROUP BY network
ORDER BY network;

-- 2. Unambiguous fixes — these map one-to-one and are always safe.
UPDATE "DataBundle" SET network = 'MTN'     WHERE network = 'mtn';
UPDATE "DataBundle" SET network = 'TELECEL' WHERE network = 'telecel';

-- Also catch any stray casing / whitespace variants, just in case.
UPDATE "DataBundle" SET network = 'MTN'     WHERE lower(btrim(network)) = 'mtn'     AND network <> 'MTN';
UPDATE "DataBundle" SET network = 'TELECEL' WHERE lower(btrim(network)) = 'telecel' AND network <> 'TELECEL';

-- 3. AirtelTigo CANNOT be auto-fixed. Cledanet treats iShare and BigTime as
--    two different products, so each 'airteltigo' row must be assigned to the
--    one it was actually meant to be. List them so you can decide:
SELECT id, "dataSizeGb", "sellingPrice", network
FROM "DataBundle"
WHERE lower(btrim(network)) = 'airteltigo'
ORDER BY "dataSizeGb";

--    Then, for EACH id above, run ONE of these with the real id:
--
--    UPDATE "DataBundle" SET network = 'AIRTELTIGO_ISHARE'  WHERE id = 'PASTE-ID-HERE';
--    UPDATE "DataBundle" SET network = 'AIRTELTIGO_BIGTIME' WHERE id = 'PASTE-ID-HERE';
--
--    (Leave these commented until you've filled in the ids, or run them
--    separately after this script.)

-- 4. Verify nothing invalid remains. This should return ZERO rows once the
--    AirtelTigo rows above are all reassigned.
SELECT id, network
FROM "DataBundle"
WHERE network NOT IN ('MTN', 'TELECEL', 'AIRTELTIGO_ISHARE', 'AIRTELTIGO_BIGTIME');

-- If step 4 still shows airteltigo rows, you haven't reassigned them all yet.
-- ROLLBACK; and redo, or COMMIT; only once step 4 is clean.

COMMIT;
