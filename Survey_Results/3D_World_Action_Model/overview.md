# 3D World-Action Model 자료 조사 (초기 정리)

> 상태: **incomplete / scouting survey**. 사용자가 요청한 “서치하고 정리”에 맞춰 최신 자료를 빠르게 수집·분류한 초안이다. 프로젝트 survey guide의 완전 완료 조건(대표 논문별 full paper report, 공식 코드 clone+분석, benchmark reference/cited-by audit)은 아직 모두 충족하지 않았다.

## 1. Scope Lock

### Main Scope
- **3D world-action model / 3D embodied world model**: 현재 관측(주로 RGB-D, point cloud, multi-view, robot state)과 언어/목표/행동 조건을 받아, **3D 상태 변화와 행동 가능성**을 함께 예측하거나 행동 생성에 직접 쓰는 모델.
- 핵심 조건: (1) 3D geometry 또는 depth/point flow를 명시적으로 쓰고, (2) action-conditioned dynamics 또는 action-facing prediction을 포함하며, (3) robotics/embodied AI에서 planning/policy/evaluation에 연결된다.

### Adjacent Branch
- 2D video diffusion 기반 WAM: DreamZero, EA-WM처럼 3D 표현이 중심은 아니지만 world prediction과 action generation을 결합.
- general interactive world generation: Genie/Marble류. 3D persistent world generation에는 중요하지만 robot action grounding이 약하면 보조 범주.
- VLA-only policy: RT-2/OpenVLA 등 reactive action decoder 중심 모델. world prediction이 없으면 comparison background.

### Out-of-Scope
- 순수 3D reconstruction / NeRF / Gaussian Splatting.
- 행동 조건 없는 video generation.
- 텍스트 기반 planning만 수행하는 LLM agent.

## 2. 핵심 자료 지도

| 구분 | 자료 | Venue/Year | 역할 | 핵심 포인트 | 코드/페이지 |
|---|---|---:|---|---|---|
| Survey | World Action Models: The Next Frontier in Embodied AI | arXiv 2026 | WAM 정의/분류 | WAM을 future state와 action의 joint distribution으로 정식화, Cascaded/Joint WAM taxonomy 제시 | https://arxiv.org/abs/2605.12090 |
| Survey | World Model for Robot Learning: A Comprehensive Survey | arXiv 2026 | robotics world model 배경 | action-conditioned dynamics model 관점의 world model 정리 | https://arxiv.org/html/2605.00080v1 |
| Method | 3D-VLA: A 3D Vision-Language-Action Generative World Model | ICML 2024 | 3D VLA/WAM 초기 대표 | 3D-LLM + interaction token + embodied diffusion으로 goal image/point cloud 예측 | https://arxiv.org/abs/2403.09631 / https://github.com/UMass-Embodied-AGI/3D-VLA |
| Method | PointWorld: Scaling 3D World Models for In-The-Wild Robotic Manipulation | CVPR 2026 / OpenReview | 3D action-conditioned dynamics frontier | RGB-D와 low-level robot action을 **3D point flow**로 통일해 per-pixel 3D displacement 예측 | https://point-world.github.io/ / https://github.com/NVlabs/PointWorld |
| Method | DreamZero: World Action Models are Zero-shot Policies | arXiv 2026 | 2D video-WAM frontier | pretrained video diffusion backbone으로 future video와 action을 jointly predict하여 zero-shot policy로 사용 | https://dreamzero0.github.io/ / https://github.com/dreamzero0/dreamzero |
| Benchmark | WorldArena | arXiv/CVPR Challenge 2026 | embodied world model benchmark | video perception 16 metrics + data engine/policy evaluator/action planner 기능 평가 + human eval | https://world-arena.ai/ / https://github.com/tsinghua-fib-lab/WorldArena |
| Method | EA-WM: Event-Aware Generative World Model with Structured Kinematic-to-Visual Action Fields | arXiv 2026 | action-to-video geometry 개선 | kinematic/action을 camera-view visual action field로 투영하고 event-aware fusion 적용 | https://arxiv.org/abs/2605.06192 |
| Method | 3DVLA: Enhancing VLA Models via 3D Spatial Awareness | arXiv 2026 | 3D-aware VLA adjacent | multi-view consistency, 3D instance awareness, masked 3D encoding으로 VLA 강화 | https://arxiv.org/html/2605.29416v1 |
| Industry/System | Marble: A Multimodal World Model | World Labs 2025 | interactive 3D world generation adjacent | reconstruct/generate/simulate 3D worlds, human/agent interaction 지향 | https://www.worldlabs.ai/blog/marble-world-model |

## 3. 방법론 Taxonomy

### A. 3D state/action unification
- 대표: **PointWorld**.
- 상태와 행동을 모두 3D point flow/point displacement 공간에 놓는다.
- 장점: camera pixel보다 robot manipulation의 contact/geometry 변화에 직접적이며, robot embodiment가 달라도 3D displacement라는 공통 인터페이스를 만들 수 있다.
- 주요 리스크: depth 품질, occlusion, long-horizon compounding error, action semantics의 일반화.

### B. 3D VLA + generative goal prediction
- 대표: **3D-VLA**.
- 3D-LLM이 scene/language/action planning을 담당하고 embodied diffusion이 goal image/point cloud를 생성한다.
- 장점: language instruction과 3D grounding을 함께 다룰 수 있다.
- 리스크: 3D embodied instruction dataset 구축 비용, diffusion goal prediction과 low-level control 사이 gap.

### C. Video-diffusion WAM → policy
- 대표: **DreamZero**, **EA-WM**.
- pretrained video/world model backbone을 robot action과 결합해 future video와 action을 같이 예측하거나 action-conditioned video rollout을 강화한다.
- 3D world-action survey에서는 adjacent이지만, WAM이라는 용어와 평가 프로토콜 형성에는 매우 중요하다.

### D. Benchmark/evaluation-first line
- 대표: **WorldArena**.
- 단순 visual fidelity가 아니라 synthetic data engine, policy evaluator, action planner로서의 functional utility를 본다.
- 3D WAM도 결국 “예측 영상/포인트가 그럴듯한가”보다 “행동 선택에 도움이 되는가”가 중요하므로 핵심 축이다.

## 4. Dataset / Benchmark 중심 Coverage Matrix

| Evaluation Axis | Task-defining artifact | Comparison-anchor 후보 | Recent frontier 후보 | 아직 필요한 조사 |
|---|---|---|---|---|
| 3D action-conditioned manipulation dynamics | PointWorld benchmark/protocol, RGB-D manipulation rollout | 3D-VLA, 기존 dynamics model, video WM baselines | PointWorld (CVPR 2026) | 논문 PDF full table/ablation 추출, official code clone 분석 |
| 3D embodied instruction / goal generation | 3D-VLA curated 3D embodied instruction dataset | 3D-LLM, CLIP/2D VLA, embodied diffusion baselines | 3D-VLA, 3DVLA | ICML paper main/ablation 수치 정리, repo 구조 분석 |
| Embodied world model functional evaluation | WorldArena | video generation baselines, policy evaluator/planner baselines | WorldArena, EA-WM | leaderboard snapshot과 challenge metrics 상세 정리 |
| Zero-shot action policy from world model | DreamZero protocol (PolaRiS, Genie Sim 3.0 언급) | VLA baselines, video diffusion baselines | DreamZero | benchmark 수치, few-shot embodiment adaptation 설정 확인 |
| Interactive 3D world generation | Marble/Genie-like systems | Genie/World Labs demos | Marble/Genie 3 | robotics action grounding이 약해 supplementary로 유지 |

## 5. 우선 읽을 순서

1. **World Action Models survey (2026)**: 용어와 taxonomy를 먼저 고정.
2. **PointWorld (CVPR 2026)**: 3D world-action model의 가장 직접적인 frontier.
3. **3D-VLA (ICML 2024)**: 3D VLA + generative world model의 foundational/turning-point 성격.
4. **WorldArena (2026)**: benchmark와 evaluation axis 정리.
5. **DreamZero / EA-WM (2026)**: 2D video-WAM adjacent frontier로 비교 축 확보.

## 6. Open Problems

- **3D representation choice**: point flow, voxel/occupancy, Gaussian/NeRF, latent 3D token 중 어떤 표현이 action planning에 가장 효율적인가?
- **Action abstraction**: low-level joint/EEF action을 그대로 넣을지, 3D displacement/affordance/action field로 lift할지.
- **Long-horizon planning**: world rollout의 compounding error를 policy search에서 어떻게 제어할지.
- **Embodiment transfer**: robot morphology가 바뀔 때 3D world model이 얼마나 재사용되는지.
- **Evaluation**: visual fidelity와 downstream action utility가 불일치할 때 어떤 metric을 신뢰할지.
- **Data bottleneck**: internet video는 풍부하지만 robot action labels와 3D depth/action alignment는 부족하다.

## 7. Overview-only / Deferred Audit

| Candidate | 분류 | 제외/보류 이유 |
|---|---|---|
| Marble / World Labs | adjacent branch | 3D world generation은 중요하지만 robot action-conditioned model 근거가 아직 약함 |
| Genie 3류 interactive worlds | adjacent branch | action-facing simulation에는 관련되나 robotics manipulation benchmark와 직접 연결 부족 |
| RT-2 / OpenVLA 등 VLA-only | background | world prediction 없이 reactive policy 중심이라 main scope 대표 논문은 아님 |
| EA-WM | deferred frontier | WorldArena 강한 결과 주장으로 후속 full report 후보이나 3D 명시성이 PointWorld보다 약함 |
| 3DVLA 2026 | deferred frontier | 3D-aware VLA 강화 논문으로 중요하지만 “world-action model” 정의상 explicit dynamics 여부 추가 확인 필요 |

## 8. 다음 단계

- `PointWorld`, `3D-VLA`, `WorldArena`, `DreamZero` official repo clone 후 `codes/*_analysis.md` 작성.
- 각 대표 논문 PDF에서 main result/ablation table 수치 추출.
- `datasets/WorldArena` 및 3D-VLA/PointWorld 관련 benchmark artifact 문서 작성.
- citation expansion: Semantic Scholar/OpenAlex로 3D-VLA, PointWorld, WAM survey의 cited-by/reference 확인.
