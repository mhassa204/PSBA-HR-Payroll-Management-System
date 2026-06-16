\set cnics '''3410470904415'',''3630206148081'',''3110479345285'',''3520263773381'',''3520282925741'',''3660331319573'',''3220350825319'',''3520283712265'',''3430184704441'',''3120509163277'',''3620317654657'',''3220343333393'',''3520276022737'',''3220337340879'',''3510189715745'',''3220382635763'',''3520251292149'',''6110162634313'',''3540472289111'',''1730188814217'',''3520235568953'',''3520297543653'',''3520272066599'''
BEGIN;
SELECT count(*) AS employees_before FROM employees WHERE cnic IN (:cnics);
SELECT count(*) AS users_before     FROM users     WHERE cnic IN (:cnics);
-- users cascade to any attendances/fingerprint_templates (there are none for these)
DELETE FROM users     WHERE cnic IN (:cnics);
DELETE FROM employees WHERE cnic IN (:cnics);
SELECT count(*) AS employees_remaining FROM employees WHERE cnic IN (:cnics);
COMMIT;
