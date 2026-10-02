/* Actual recorded SAM masks; the presentation timeline illustrates control flow. */
(() => {
  'use strict';
  const board=document.querySelector('#pipeline-board');
  if(!board)return;
  const $=id=>document.getElementById(id), video=$('pipeline-video'), svg=$('pipeline-connectors');
  const lines=$('connector-lines'), maskPath=$('tracked-mask'), playButton=$('pipeline-play'), seek=$('pipeline-seek');
  const NS='http://www.w3.org/2000/svg';
  // Reading and decision holds belong to the presentation, not the recording.
  // Both robot-motion intervals retain the original clip's playback speed.
  const END=48, GRASP_END=3.45, CLIP_END=6.6;
  const DESCRIPTION=1, DESCRIPTION_DURATION=3, PROMPT=5, PROMPT_DURATION=5;
  // The second card fades in over .5 s, then stays readable for 2 s.
  const VLM=10.5, PLAN=12.5, PLAN_SECOND=13.5, SELECT1=16, TARGET1=17.5, MASK1=19.5;
  const RAIN_INPUT=21.5, ACTION_OUTPUT=22.5, MOTION1=24, HANDOFF=MOTION1+GRASP_END;
  const TRANSITION_DELAY=.5, YES_PULSE_DELAY=1.55;
  const RESULT_DELAY=TRANSITION_DELAY+YES_PULSE_DELAY;
  const ADVANCE=HANDOFF+TRANSITION_DELAY+3.05, SWITCH=32, TARGET2=34;
  const SECOND_MASK=36.5, MOTION2=40, COMPLETE=MOTION2+CLIP_END-GRASP_END;
  let time=0,running=false,userStopped=false,inView=false,raf=0,last=0,masks=null,loading=null;
  let lastMask=-1,lastTarget='',lastPhase='',lastStep=-1;
  let buffering=true;
  function animatedText(selector){
    const root=board.querySelector(selector),letters=[],textNodes=[];
    root.setAttribute('aria-label',root.textContent.replace(/\s+/g,' ').trim());
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode())textNodes.push(walker.currentNode);
    for(const node of textNodes){
      const fragment=document.createDocumentFragment();
      for(const character of node.textContent){
        const span=document.createElement('span');span.className='reveal-letter';
        span.textContent=character;span.setAttribute('aria-hidden','true');fragment.append(span);letters.push(span);
      }
      node.replaceWith(fragment);
    }
    let shown=-1;
    return progress=>{
      const count=Math.round(letters.length*clamp(progress));
      if(count===shown)return;
      letters.forEach((letter,index)=>letter.classList.toggle('visible-letter',index<count));shown=count;
      root.dataset.revealed=String(count);root.dataset.letters=String(letters.length);
    };
  }
  const revealDescription=animatedText('.description-text'),revealPrompt=animatedText('.prompt-text');
  const flows={}, clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
  const state=t=>({
    clip:t<MOTION1?0:t<HANDOFF?t-MOTION1:t<MOTION2?GRASP_END:Math.min(CLIP_END,GRASP_END+t-MOTION2),
    moving:(t>=MOTION1&&t<HANDOFF)||(t>=MOTION2&&t<COMPLETE),
    step:t>=SWITCH?1:0,yes:(t>=HANDOFF+RESULT_DELAY&&t<SWITCH)||t>=COMPLETE+RESULT_DELAY,
    done:t>=COMPLETE+RESULT_DELAY,mask:t>=MASK1&&(t<SWITCH||t>=SECOND_MASK),
    phase:t<DESCRIPTION?'observe':t<PROMPT?'instruction':t<VLM?'prompt':t<PLAN?'planning':t<SELECT1?'sequence':t<TARGET1?'select':t<MASK1?'target':t<RAIN_INPUT?'segment':t<MOTION1?'action':t<HANDOFF?'grasp':t<HANDOFF+TRANSITION_DELAY?'settle':t<HANDOFF+RESULT_DELAY?'deciding':t<SWITCH?'transition':t<TARGET2?'next-select':t<SECOND_MASK?'next-target':t<MOTION2?'next-mask':t<COMPLETE?'release':t<COMPLETE+TRANSITION_DELAY?'settle':t<COMPLETE+RESULT_DELAY?'deciding':'complete'
  });
  async function load(){
    if(!loading)loading=(async()=>{
      video.src=video.dataset.src;video.load();
      const response=await fetch('data/robot_masks.json');
      if(!response.ok)throw new Error('Mask data unavailable');
      masks=await response.json();
      if(masks.width!==720||masks.height!==540||masks.targets.potato.paths.length!==masks.frames||masks.targets.plate.paths.length!==masks.frames)throw new Error('Invalid mask timeline');
      board.dataset.masks='ready';renderMask(video.currentTime,true);
    })().catch(error=>{
      running=false;userStopped=true;board.dataset.masks='error';
      $('live-stage').textContent='Animation could not load. Please reload the page.';
      playButton.textContent='Reload required';console.error(error);
    });
    return loading;
  }
  function renderMask(clipTime,force=false){
    const s=state(time),target=s.step===0?'potato':'plate';
    if(!masks||!s.mask){maskPath.setAttribute('d','');$('target-callout').setAttribute('visibility','hidden');lastMask=-1;return;}
    const index=clamp(Math.floor(clipTime*masks.fps+.0001),0,masks.frames-1);
    if(force||index!==lastMask||target!==lastTarget){
      maskPath.setAttribute('d',masks.targets[target].paths[index]);lastMask=index;lastTarget=target;
      maskPath.dataset.frame=String(index);maskPath.dataset.target=target;
      pointAtTarget();
    }
  }
  function pointAtTarget(){
    const b=maskPath.getBBox(),cx=b.x+b.width/2,cy=b.y+b.height/2;
    if(!b.width||!b.height){$('target-callout').setAttribute('visibility','hidden');return;}
    const x=clamp(cx+(cx>360?-245:45),18,491),y=clamp(cy-131,60,465);
    const startX=x+(cx>360?185:25),startY=y+47,dx=cx-startX,dy=cy-startY;
    // End just outside the mask's bounding box; it points to the mask, not a
    // fixed pixel location. Both targets follow their actual tracked contours.
    const fraction=Math.min((b.width/2+8)/Math.max(.1,Math.abs(dx)),(b.height/2+8)/Math.max(.1,Math.abs(dy)));
    const endX=cx-dx*fraction,endY=cy-dy*fraction;
    const d=`M${startX},${startY} Q${startX},${endY-30} ${endX},${endY}`;
    $('target-pointer').setAttribute('d',d);$('target-pointer-halo').setAttribute('d',d);
    $('target-region-label').setAttribute('transform',`translate(${x},${y})`);
    $('target-callout').setAttribute('visibility','visible');
    $('target-callout').dataset.target=lastTarget;
  }
  if('requestVideoFrameCallback' in video){
    const frame=(_,metadata)=>{renderMask(metadata.mediaTime);paintFlows(metadata.mediaTime);video.requestVideoFrameCallback(frame);};
    video.requestVideoFrameCallback(frame);
  }else video.addEventListener('timeupdate',()=>renderMask(video.currentTime));
  video.addEventListener('seeked',()=>renderMask(video.currentTime,true));
  video.addEventListener('loadedmetadata',()=>render());
  video.addEventListener('playing',()=>{buffering=false;paintFlows();});
  video.addEventListener('waiting',()=>{buffering=true;paintFlows();});
  video.addEventListener('pause',()=>paintFlows());
  const rect=id=>{
    const r=$(id).getBoundingClientRect(),b=board.getBoundingClientRect();
    return {x:r.x-b.x,y:r.y-b.y,w:r.width,h:r.height,cx:r.x-b.x+r.width/2,cy:r.y-b.y+r.height/2};
  };
  function flow(id,d,label='',x=0,y=0,kind=''){
    const g=document.createElementNS(NS,'g');g.setAttribute('class','flow '+kind);g.dataset.flow=id;
    const transport=['segment','observe-sam','rain-input','rain-output'].includes(id);
    if(transport){
      g.classList.add('transport-line');
      const halo=document.createElementNS(NS,'path');halo.setAttribute('d',d);halo.setAttribute('class','flow-halo');g.append(halo);
    }
    const path=document.createElementNS(NS,'path');path.setAttribute('d',d);path.setAttribute('class','flow-path');g.append(path);
    if(label){const text=document.createElementNS(NS,'text');text.textContent=label;text.setAttribute('x',x);text.setAttribute('y',y);text.setAttribute('text-anchor','middle');g.append(text);}
    lines.append(g);flows[id]={g,path,transport,lastClip:-1};
  }
  function draw(){
    lines.replaceChildren();Object.keys(flows).forEach(k=>delete flows[k]);
    svg.setAttribute('viewBox',`0 0 ${board.clientWidth} ${board.clientHeight}`);
    const d=rect('description-node'),p=rect('prompt-node'),v=rect('vlm-node'),q=rect('subtask-sequence');
    const a=rect(state(time).step?'subtask-release':'subtask-grasp'),s=rect('sam-node'),o=rect('observation-node'),r=rect('rain-node');
    const desktop=matchMedia('(min-width:901px)').matches,phone=matchMedia('(max-width:540px)').matches;
    const target=state(time).step?'rightmost plate':'potato';
    if(desktop){
      flow('description',`M${d.x+d.w+5},${d.cy} L${p.x-7},${p.cy}`);
    }else{
      flow('description',`M${d.x+p.w/2},${d.y+d.h+4} L${p.cx},${p.y-6}`);
    }
    flow('prompt',`M${p.x+p.w+5},${p.cy} L${v.x-7},${v.cy}`);
    const planY=Math.max(d.y+d.h,p.y+p.h)+19;
    flow('plan',`M${v.cx},${v.y+v.h+5} V${planY-9} Q${v.cx},${planY} ${v.cx-9},${planY} H${q.cx+9} Q${q.cx},${planY} ${q.cx},${planY+9} V${q.y-7}`);
    if(phone){
      flow('target',`M${a.cx},${a.y+a.h+3} Q${a.cx},${s.y-17} ${s.cx},${s.y-6}`,target,s.cx+65,s.y-14,'target');
    }else{
      const bend=q.x+q.w+(s.x-q.x-q.w)*.28;
      flow('target',`M${a.x+a.w+4},${a.cy} H${bend-9} Q${bend},${a.cy} ${bend},${a.cy-9} V${s.cy+10} Q${bend},${s.cy} ${bend+10},${s.cy} H${s.x-7}`,target,(bend+s.x)/2,s.cy-12,'target');
    }
    const samBottom=s.y+s.h,inset=o.w*.22;
    flow('segment',`M${s.cx-26},${samBottom+4} C${s.cx-55},${samBottom+34} ${o.x+inset},${o.y-47} ${o.x+inset},${o.y-6}`,'Segment and track',o.x+o.w*.24,o.y-27,'target');
    flow('observe-sam',`M${o.x+o.w-inset},${o.y-4} C${o.x+o.w-inset},${o.y-44} ${s.cx+56},${samBottom+35} ${s.cx+26},${samBottom+5}`,'Image',o.x+o.w*.8,o.y-27,'target');
    if(desktop){
      const x=o.x+o.w-25,top=Math.min(o.y,r.y)-36,bottom=Math.max(o.y+o.h,r.y+r.h)+30;
      flow('rain-input',`M${x},${o.y-4} V${top+12} Q${x},${top} ${x+12},${top} H${r.cx-12} Q${r.cx},${top} ${r.cx},${top+12} V${r.y-6}`,'Image · mask · action type',(x+r.cx)/2,top-10);
      flow('rain-output',`M${r.cx},${r.y+r.h+4} V${bottom-12} Q${r.cx},${bottom} ${r.cx-12},${bottom} H${x+12} Q${x},${bottom} ${x},${bottom-12} V${o.y+o.h+4}`,'Action · transition',(x+r.cx)/2,bottom+19,'feedback');
    }else if(phone){
      const y=(o.y+o.h+r.y)/2;
      flow('rain-input',`M${o.x+o.w*.2},${o.y+o.h+4} C${o.x+o.w*.12},${y} ${r.x+r.w*.12},${y} ${r.x+r.w*.2},${r.y-5}`,'Image · mask · action type',o.cx,y-3);
      flow('rain-output',`M${r.x+r.w*.8},${r.y-4} C${r.x+r.w*.93},${y} ${o.x+o.w*.93},${y} ${o.x+o.w*.8},${o.y+o.h+5}`,'Action · transition',o.cx,y+17,'feedback');
    }else{
      const left=o.x-15,bottom=Math.max(o.y+o.h,r.y+r.h)+28;
      flow('rain-input',`M${o.x-3},${o.cy} H${left+5} Q${left},${o.cy} ${left},${o.cy+8} V${r.y-23} Q${left},${r.y-12} ${left-12},${r.y-12} H${r.cx+10} Q${r.cx},${r.y-12} ${r.cx},${r.y-2}`,'Image · mask · action type',r.cx,r.y-21);
      flow('rain-output',`M${r.cx},${r.y+r.h+3} V${bottom-12} Q${r.cx},${bottom} ${r.cx+12},${bottom} H${o.cx-12} Q${o.cx},${bottom} ${o.cx},${bottom-12} V${o.y+o.h+3}`,'Action · transition',(r.cx+o.cx)/2,bottom+18,'feedback');
    }
    const rail=board.querySelector('.pipeline-caption').getBoundingClientRect().top-board.getBoundingClientRect().top-22;
    if(desktop){
      flow('next',`M${r.x+r.w+4},${r.cy} H${board.clientWidth-12} V${rail-12} Q${board.clientWidth-12},${rail} ${board.clientWidth-24},${rail} H${q.cx+12} Q${q.cx},${rail} ${q.cx},${rail-12} V${q.y+q.h+4}`,'Next subtask',(q.cx+r.cx)/2,rail-10,'feedback');
    }else{
      flow('next',`M${r.x+4},${r.cy} H8 V${q.cy} H${q.x-3}`,'',0,0,'feedback');
    }
    paintFlows();
  }
  function paintFlows(mediaTime=video.currentTime){
    const s=state(time),maskStart=s.step?SECOND_MASK:MASK1;
    // Reintroduce these arrows for each target: Image -> .5 s -> segment
    // and track -> .5 s -> the actual mask and target-region callout.
    const starts={description:DESCRIPTION+DESCRIPTION_DURATION,prompt:VLM,plan:PLAN,target:TARGET1,segment:maskStart-.5,'observe-sam':maskStart-1,'rain-input':RAIN_INPUT,'rain-output':ACTION_OUTPUT,next:ADVANCE};
    const moving=running&&s.moving&&!video.paused&&!video.seeking&&!buffering&&video.readyState>=3;
    board.dataset.mediaMotion=String(moving);
    for(const [key,entry] of Object.entries(flows)){
      const {g,path,transport}=entry;
      const visible=key==='next'?time>=ADVANCE&&time<TARGET2:key==='plan'?time>=starts[key]&&time<MASK1:
        key==='target'?time>=(s.step?TARGET2:TARGET1):time>=starts[key];
      g.classList.toggle('shown',visible);
      const active=key==='next'?visible:key==='target'?(time>=TARGET1&&time<MASK1+.5)||(time>=TARGET2&&time<SECOND_MASK+.5):
        ['description','prompt','plan'].includes(key)?time>=starts[key]&&time<starts[key]+1.8:s.mask&&time>=starts[key]&&time<COMPLETE;
      g.classList.toggle('emphasized',visible&&active);
      g.classList.toggle('transport-active',transport&&visible&&moving);
      // Dash phase derives solely from media time. A paused,
      // buffering, or offscreen video therefore freezes the flow exactly.
      if(transport&&entry.lastClip!==mediaTime){
        path.style.strokeDashoffset=String(-mediaTime*42);
        entry.lastClip=mediaTime;
      }
    }
  }
  function pulse(id,start,duration=1){
    const node=$(id),elapsed=time-start,active=elapsed>=0&&elapsed<duration;
    node.classList.toggle('beat',active);
    if(active)node.style.setProperty('--pulse-delay',`${-elapsed}s`);
  }
  function render(){
    const s=state(time);board.dataset.phase=s.phase;board.dataset.step=String(s.step);board.classList.toggle('running',running);
    const stage=time<SELECT1?'plan':(time<RAIN_INPUT||(time>=SWITCH&&time<MOTION2))?'locate':'act';
    board.querySelectorAll('[data-stage]').forEach(node=>{
      node.classList.toggle('active',node.dataset.stage===stage);
      node.classList.toggle('done',s.done || (node.dataset.stage==='plan'&&time>=SELECT1));
    });
    $('stage-name').textContent=time<DESCRIPTION?'Observe':s.done?'Complete':s.yes||s.phase==='deciding'?'Transition':stage==='plan'?'01 · Plan':stage==='locate'?'02 · Locate':'03 · Act';
    const reveal=(id,after)=>$(id).classList.toggle('revealed',time>=after);
    reveal('description-node',DESCRIPTION);reveal('prompt-node',PROMPT);reveal('vlm-node',VLM);reveal('subtask-sequence',PLAN);reveal('sam-node',TARGET1);reveal('rain-node',RAIN_INPUT);
    $('description-node').style.setProperty('--reveal',`${100*clamp((time-DESCRIPTION)/DESCRIPTION_DURATION)}%`);
    revealDescription((time-DESCRIPTION)/DESCRIPTION_DURATION);revealPrompt((time-PROMPT)/PROMPT_DURATION);
    ['subtask-grasp','subtask-release'].forEach((id,index)=>{
      const node=$(id),complete=index<s.step||s.done,current=index===s.step&&!complete&&time>=SELECT1;
      node.classList.toggle('card-visible',time>=(index?PLAN_SECOND:PLAN));node.classList.toggle('is-current',current);node.classList.toggle('is-done',complete);
      node.querySelector('.sequence-state').textContent=complete?'✓ Complete':current?'Current subtask':time<SELECT1?'Planned':'Next subtask';
      if(current)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');
    });
    $('transition-value').textContent=`Transition: ${s.yes?'Yes':'No'}`;$('transition-value').classList.toggle('yes',s.yes);
    pulse('subtask-grasp',SELECT1);pulse('subtask-release',SWITCH);
    const transitionStart=(time>=COMPLETE?COMPLETE:HANDOFF)+TRANSITION_DELAY;
    pulse('transition-head',transitionStart);pulse('transition-value',transitionStart+YES_PULSE_DELAY);
    $('action-output').classList.toggle('active',time>=ACTION_OUTPUT&&time<COMPLETE);
    $('observation-status').textContent=time<MOTION1?'Initial observation':s.moving?'Executing action':s.done?'Task complete':'Paused for transition';
    $('overlay-label').textContent=s.mask?`Target region: ${s.step?'rightmost plate':'potato'}`:'Robot observation';
    const captions={observe:'Start with the robot’s current observation.',instruction:'Read the task description.',prompt:'Ask for target-centered subtasks and their action types.',planning:'The VLM interprets the instruction.',sequence:'Plan two interactions: Grasp the potato, then Release onto the rightmost plate.',select:'Activate subtask 1: Grasp the potato.',target:'Send “potato” to SAM3.',segment:'Segment the potato in the current observation.',action:'RAIN encodes the region and predicts an action.',grasp:'Track the potato while RAIN executes Grasp.',settle:'The robot pauses before the transition decision.',deciding:'The Transition head predicts whether this subtask is complete.',transition:'Transition: Yes. Grasp is complete; the robot pauses before the next subtask.','next-select':'Activate subtask 2: Release onto the rightmost plate.','next-target':'Send “rightmost plate” to SAM3.','next-mask':'Segment the new target and pass Action type: Release to RAIN.',release:'Track the rightmost plate while RAIN executes Release.',complete:'Transition: Yes. Both subtasks are complete.'};
    if(lastPhase!==s.phase){$('live-stage').textContent=captions[s.phase];lastPhase=s.phase;}
    if(lastStep!==s.step){lastStep=s.step;draw();}
    playButton.textContent=running?'Pause':time>=END?'Replay':'Play animation';seek.value=String(time);$('pipeline-time').textContent=`${time.toFixed(1)} / ${END.toFixed(1)} s`;
    paintFlows();renderMask(video.currentTime);
    if(video.readyState>=1){
      if(s.moving&&running){
        if(Math.abs(video.currentTime-s.clip)>.2&&!video.seeking)video.currentTime=s.clip;
        if(video.paused)video.play().catch(()=>stop());
      }else{video.pause();if(Math.abs(video.currentTime-s.clip)>.018&&!video.seeking)video.currentTime=s.clip;}
    }
  }
  function tick(now){
    if(!running)return;
    const delta=Math.min((now-last)/1000,.08);last=now;
    if(!state(time).moving||(video.readyState>=3&&!video.seeking))time=Math.min(END,time+delta);
    if(time>=END){running=false;video.pause();}
    render();if(running)raf=requestAnimationFrame(tick);
  }
  async function start(manual=false){
    await load();if(!masks||document.hidden||(!manual&&(!inView||userStopped)))return;if(time>=END)time=0;
    running=true;last=performance.now();cancelAnimationFrame(raf);render();raf=requestAnimationFrame(tick);
  }
  function stop(){running=false;cancelAnimationFrame(raf);video.pause();render();}
  playButton.addEventListener('click',()=>{userStopped=running;if(running)stop();else start(true);});
  $('pipeline-reset').addEventListener('click',()=>{time=0;userStopped=false;start(true);});
  seek.addEventListener('input',async()=>{const requested=Number(seek.value);userStopped=true;stop();await load();time=requested;render();});
  seek.addEventListener('pointerdown',()=>{userStopped=true;stop();});
  new ResizeObserver(draw).observe(board);
  new IntersectionObserver(entries=>{
    const entry=entries[0];
    inView=entry.isIntersecting && entry.intersectionRect.height>=Math.min(board.clientHeight,innerHeight)*.55;
    if(inView){load();if(!userStopped&&time<END)start();}else stop();
  },{threshold:[0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1]}).observe(board);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stop();else if(inView&&!userStopped&&time<END)start();
  });
  render();
})();
