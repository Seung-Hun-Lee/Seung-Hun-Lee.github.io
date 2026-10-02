# RAIN project page

Project website for **RAIN: Robotic Task Generalization with Region-Aware Interaction Networks**.

Place this folder under `projects/RAIN/` in the academic website. The page uses
the parent site's Jekyll deployment and requires no frontend build step or
external scripts, fonts, or services.

## Pages

- `index.html`: real-world and simulation comparisons, LIBERO-Analogy,
  an animated interaction pipeline, the architecture, RRS, and results.
- `gallery.html`: all 60 evaluation tasks, grouped by Adapt, Compose, and
  Decompose, with instruction search and parallel video playback.
- `assets/`: local styles, scripts, figures, posters, and H.264 videos.
- `data/`: media descriptions, paper results, and frame-synchronized SAM masks.

## Playback

Muted videos play together when visible. Offscreen playback pauses. The gallery
defaults to nine simultaneous videos, with optional three- and six-video modes
for slower devices. Main-page videos retain their individual native controls;
there is no redundant page-wide play button above the first video.
The demonstration videos autoplay even when
the browser has a reduced-motion preference; the gallery provides a Play/Pause
button for visible videos as a group, and the animation has its own pause control.
Individual play controls remain available when the browser blocks autoplay.
Videos use MP4 fast-start and the server must support HTTP Range requests.
In the 60-task gallery, sources are loaded only when visible. Videos well
outside the viewport release their decoder and resume at their saved position
when revisited. Interrupted play requests retry after settling, at most twice;
persistent errors and browser-policy denials expose a visible play/retry control.
New gallery playback begins when at least 60% of the video is visible; an
already playing clip may continue to 35% visibility to avoid edge flicker.
New starts wait until scrolling has settled for 120 ms. A queued visible video
has a Play this video control to prioritize it without exceeding the limit.
The gallery's 512 x 256, 24 fps clips retain their reviewed image quality.
Gallery native control panels activate on hover, keyboard focus, or touch,
instead of updating nine sets of playback controls during passive viewing.
Native seeking, pause/resume, and keyboard access remain available.
Raw recordings and masks are untouched.

The pipeline animation starts with a still image, reveals the plan, then starts
the robot video after showing the action prediction. It pauses at the transition,
passes the next target to SAM3, and resumes execution.
The 48-second presentation reveals the planning prompt over five seconds, pauses
for half a second before VLM input, and holds the fully revealed subtask sequence
for two seconds before highlighting its first step. The
recorded robot motion keeps its original playback rate. Target-region arrows
follow the actual masks. Dashed cycle paths follow video time, so they freeze
during transition holds. Separate heartbeat effects mark the transition head,
the Yes result, and the next subtask, with reading time between them. Each
SAM3 acquisition reveals Image, Segment and track, and the target region at
half-second intervals. The transition head pulses half a second after the
robot video pauses.
The Yes result appears only after the head's emphasis has finished, with its
own subsequent highlight. Completion captions and subtask state use the same
result timing.
Animation controls reserve a fixed button width and a fixed-width time display,
so Play, Pause, and Replay do not resize the buttons or shift the timeline.

Adapt, Compose, and Decompose consistently use purple, orange, and teal across
the examples, gallery filters, task labels, and table headers.

## Content

The architecture and numerical tables follow the archived manuscript. GT-mask
and VLM-mask results remain separate. Baseline venues match the paper.
The umbrella favicon is the original image embedded in Figure 1.

The pipeline overlays are SAM3.1 segmentation and tracking predictions over 199
recorded frames per target. The potato uses a text prompt; the intended plate
uses text plus a visual initialization box. No mask shapes are drawn by hand.
The animation illustrates planning and transition logic; its timing is not a
recorded Transition Head output or an inference-latency measurement.

The simulation videos are qualitative GT-mask examples, not a success-rate
estimate for a single checkpoint. Task-gallery selections and quantitative
tables have separate provenance.

## Maintenance

Styles are in `assets/style.css`. Video playback and gallery filtering are in
`assets/main.js`; animation state and mask rendering are in `assets/pipeline.js`.
Keep `data/robot_masks.json` synchronized with `assets/videos/potato.mp4`.

Paper and Assets buttons await their release URLs. Code links to
https://github.com/Seung-Hun-Lee/RAIN.

Preview through the parent Jekyll build. Check desktop and mobile layouts, gallery
filters, simultaneous playback, and the animated transition before publishing.
Do not edit the generated site.
