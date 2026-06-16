SELECT e.cnic,
       left(e."fullName", 22)                          AS name,
       left(coalesce(e."designationName", '-'), 20)    AS designation,
       left(coalesce(e."workplaceName", '-'), 18)      AS workplace,
       (u."faceData" IS NOT NULL)                      AS face,
       coalesce(ft.cnt, 0)                             AS fingers,
       coalesce(a.cnt, 0)                              AS punches,
       to_char(a.last, 'YYYY-MM-DD')                   AS last_punch
FROM employees e
LEFT JOIN users u ON u.cnic = e.cnic
LEFT JOIN (SELECT "userId", count(*) cnt FROM fingerprint_templates GROUP BY "userId") ft ON ft."userId" = u.id
LEFT JOIN (SELECT "userId", count(*) cnt, max(timestamp) last FROM attendances GROUP BY "userId") a ON a."userId" = u.id
WHERE e.cnic IN (
  '3410470904415','3630206148081','3110479345285',
  '3520263773381','3520282925741','3660331319573','3220350825319','3520283712265',
  '3430184704441','3120509163277','3620317654657','3220343333393','3520276022737',
  '3220337340879','3510189715745','3220382635763','3520251292149','6110162634313',
  '3540472289111','1730188814217','3520235568953','3520297543653','3520272066599'
)
ORDER BY e."fullName";
