# Run Validation — 3D World-Action Model

상태: **incomplete scouting run**. 이번 커밋은 사용자의 “자료 서치 및 정리” 요청에 대한 초기 조사 산출물이며, guide의 full survey 완료 조건을 만족한다고 주장하지 않는다.

| 항목 | 결과 |
|---|---|
| overview.md 생성 | yes |
| 대표 논문 수 | 4 primary + 3 deferred/adjacent |
| 생성된 papers/*.md 수 | 0 |
| 생성된 datasets/*.md 수 | 0 |
| code clone 시도 수 | 0 |
| code analysis 수 | 0 |
| recent arXiv/OpenReview sweep | partial |
| top-tier/main-track coverage | partial: ICML 2024 3D-VLA, CVPR 2026 PointWorld 확인 |
| benchmark coverage | partial: WorldArena 확인 |
| citation/high-impact audit | not yet |
| comparison-anchor coverage | partial hypothesis only |
| overview-only audit table | yes |

## Candidate Tracking

| Candidate | Scope | Frontier? | Code Clone | Code Analysis | Full Report | If No, Why |
|---|---|---|---|---|---|---|
| 3D-VLA | main | yes | not yet | none | no | 초기 scouting 단계 |
| PointWorld | main | yes | not yet | none | no | 초기 scouting 단계 |
| WorldArena | main benchmark | yes | not yet | none | no | dataset/benchmark report 미작성 |
| DreamZero | adjacent/main WAM | yes | not yet | none | no | 3D 명시성은 약하나 WAM taxonomy상 중요 |
| EA-WM | adjacent/deferred | yes | not yet | none | no | full PDF/table/code 확인 필요 |
| 3DVLA 2026 | adjacent/deferred | yes | not yet | none | no | explicit world dynamics 여부 확인 필요 |
| Marble/Genie-like systems | adjacent | yes | n/a | none | no | robotics action grounding 부족 |
