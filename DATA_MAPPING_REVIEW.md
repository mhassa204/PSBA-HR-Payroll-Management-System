# Data Mapping — Review Artifacts (designations, education, departments)

Review-only. Approve/correct the merges below; nothing seeded yet.

## A. Designation canonicalization (60 distinct → ~52 clean)

### A1. Clean typo/format merges (recommend: auto-merge)
| Canonical | Variants merged | Total |
|---|---|---|
| Sanitation Attendant | + `Sabitation Attendant` | 339 |
| Sub-Engineer (Civil) | + `Sub Engineer (Civil)` + `Sub Engineer Civil` | 3 |
| Sub-Engineer (Electrical) | + `Sub Engineer (Electrical)` | 2 |
| Sub-Engineer (Maintenance) | + `Sub Engineer (Maintenance)` | 3 |

### A2. Borderline — "Security & Parking" family — DECIDED: merge all 3 into `Security & Parking Attendant`, drop the Welder/Electrician note.
| Variant | Count | |
|---|---|---|
| Security & Parking Attendant | 599 | canonical |
| Security & Parking | 1 | → merge to canonical? |
| Security & Parking Attendant (Working as Electrician) | 1 | → merge + keep "Working as Electrician" as remark? |
| Security & Parking Attendant(Welder) | 1 | → merge + keep "Welder" as remark? |

### A3. NOT merged (distinct roles — keep separate)
`Assistant Director (...)` ×10 specializations, `Additional Director (...)` ×3, etc. — these are
genuinely different positions and stay as-is.

## B. Education levels — proposed expanded master (customized to the data)

The seed's 6 levels don't fit. Proposed set (with counts from 1,105 non-blank rows):
| # | Level (order) | Maps from | Count |
|---|---|---|---|
| 1 | No Formal Education | "Nil Education" | ~1 |
| 2 | Literate | "Literate / can read-write" | 331 |
| 3 | Matric | Matric, SSC, Middle, 8th/10th | 314 |
| 4 | Intermediate (FA/FSc) | Inter, FSc, FA, ICS, I.Com, HSSC | 60 |
| 5 | Diploma (DAE) | DAE, Diploma | 24 |
| 6 | Associate Degree | "Associate Degree in ..." | ~7 |
| 7 | Bachelor | BS, BSc, BA, BCom, BBA, BCS, LLB, Graduation | 170 |
| 8 | Master | MS, MSc, MA, MCom, MBA, LLM, M.Ed | 166 |
| 9 | MPhil | MPhil | 3 |
| 10 | PhD | PhD / Doctorate | 2 |
| 11 | Professional Certification | ACCA, FCCA, ACA, CMA, ICMA | 2 |
| 12 | Religious (Hafiz) | "Hafiz Certificate" | ~1 |

- 442 blank Education rows → **no** EducationQualification record created.
- Original education text always preserved in the qualification record (lossless).
- 13 unmapped distinct strings all fold into the buckets above after rules added.

## C. Departments — replace seed's 19 with Excel's 15 (per decision)

New department master = Excel's 15:
Admin, Operations, Monitoring, Civil, Accounts, Projects & Management Unit, Establishment, IT,
Audit, Devops, Electrical, Home Delivery, Media, Competent Authority, Legal.

Functional user re-link (existing logins → new departments):
| Existing user | Old dept (seed) | New dept (Excel) |
|---|---|---|
| establishment@psba.gop.pk | Establishment | Establishment |
| accounts@psba.gop.pk | Accounts | Accounts |
| operations@psba.gop.pk | Operations | Operations |
| it@psba.gop.pk | IT | IT |
| devops@psba.gop.pk | Software Development & Operations | Devops |
| admin@psba.gop.pk | IT | (Admin? confirm) |

⚠️ Only the 175 Head-Office employees carry a department; the 1,372 field staff have `department_id=null`.
