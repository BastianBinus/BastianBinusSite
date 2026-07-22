(function() {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phrases = [
    'A Computer Scientist',
    'A Web Developer',
    'An Apprentice',
    'A Student',]
  var pi = 0, ci= 0, deleting=false, timer = 0;
  var bodyEl = document.getElementById('sm-body');
  function step() {
    var cur=phrases[pi];
    if(!deleting){
      ci++; bodyEl.textContent=cur.slice(0,ci);
      if(ci>=cur.length){ deleting=true; timer=setTimeout(step,1100); return; }
      timer=setTimeout(step,90+Math.random()*60);
    } else {
      ci--; bodyEl.textContent=cur.slice(0,ci);
      if(ci<=0){ deleting=false; pi=(pi+1)%phrases.length; timer=setTimeout(step,420); return; }
      timer=setTimeout(step,45);
    }}
    function start() { if(!reduce && !timer) step(); }
    function stop(){ clearTimeout(timer); timer=0; }
    document.addEventListener('visibilitychange', function(){ if(document.hidden) stop(); else start(); });
    if(reduce) { bodyEl.textContent = phrases[0]; } else start();
})();