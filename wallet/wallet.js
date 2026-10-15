// States: locked -> closed -> opening (video) -> open -> pulling -> floating-in -> floating -> returning -> open
//         open -> closing (reversed video) -> closed
// The personal card content sits encrypted in vault.json. The key arrives once via the NFC link
// (#key, never sent to the server) and is then kept in localStorage; without it the page stays black.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const body = document.body;
  const stage = $("#stage");
  const vOpen = $("#vOpen");
  const vClose = $("#vClose");
  const float = $("#float");
  const fwrap = $("#fwrap");
  const tilt = $("#tilt");
  const cta = $("#cta");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const STORE = "bb.wallet.key";
  const LINKS = {}; // filled from the vault
  const PULL = "translateY(-80%)"; // card fully above its pocket line

  let state = "locked";
  let current = null;
  let raf = 0;

  const set = (s) => {
    state = s;
    body.dataset.state = s;
  };
  set("locked");
  const anim = (el, frames, opts) => {
    const a = el.animate(frames, { fill: "forwards", ...opts, duration: reduce ? 0 : opts.duration });
    return a.finished.catch(() => {}).then(() => a);
  };

  /* ---------- unlock ---------- */
  const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const stored = () => {
    try {
      return localStorage.getItem(STORE) || "";
    } catch {
      return "";
    }
  };

  const lockMsg = $("#lockMsg");
  const locked = (msg) => {
    lockMsg.textContent = msg;
    return null;
  };

  async function unlock() {
    const fromLink = location.hash.slice(1);
    // WALLET_PREVIEW_KEY is only set by a private preview copy of the page, never in the repo.
    const keys = [...new Set([fromLink, stored(), globalThis.WALLET_PREVIEW_KEY || ""])].filter((k) => /^[A-Za-z0-9_-]{22}$/.test(k));
    if (!keys.length) return locked(fromLink ? "Dieser Link ist ungültig" : "Mit der Karte öffnen");
    if (!globalThis.crypto?.subtle) return locked("Dieser Browser wird nicht unterstützt");
    let vault;
    try {
      vault = await (await fetch("vault.json", { cache: "no-cache" })).json();
    } catch {
      return locked("Keine Verbindung"); // keep any stored key for next time
    }
    for (const k of keys) {
      try {
        const key = await crypto.subtle.importKey("raw", b64u(k), "AES-GCM", false, ["decrypt"]);
        const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64u(vault.iv) }, key, b64u(vault.ct));
        const data = JSON.parse(new TextDecoder().decode(plain));
        try {
          localStorage.setItem(STORE, k);
          if (k === fromLink) history.replaceState(null, "", location.pathname + location.search); // key out of the address bar
        } catch {}
        return data;
      } catch {
        if (k !== fromLink) {
          try {
            localStorage.removeItem(STORE); // stale key, e.g. after the vault was re-encrypted
          } catch {}
        }
      }
    }
    return locked("Dieser Schlüssel passt nicht");
  }

  function fill(data) {
    document.querySelectorAll(".slot .card").forEach((card) => {
      card.innerHTML = data.cards[card.dataset.card] || "";
    });
    document.querySelectorAll(".code[data-mask]").forEach((el) => {
      el.style.setProperty("--mask", `url("${data.images[el.dataset.mask]}")`);
    });
    document.querySelectorAll(".photo").forEach((el) => {
      el.style.setProperty("--photo", `url("${data.images.photo}")`);
    });
    Object.assign(LINKS, data.links);

    // Engraving needs a dark copy and a light ridge of every engraved element.
    document.querySelectorAll(".g").forEach((g) => {
      const dk = document.createElement("span");
      dk.className = "dk";
      while (g.firstChild) dk.append(g.firstChild);
      const hl = dk.cloneNode(true);
      hl.className = "hl";
      hl.setAttribute("aria-hidden", "true");
      g.append(hl, dk);
    });
  }

  unlock().then((data) => {
    if (!data) return;
    fill(data);
    for (const v of [vOpen, vClose]) {
      v.preload = "auto";
      v.load();
    }
    set("closed");
  });

  /* ---------- open and close the wallet ---------- */
  let run = 0; // invalidates the safety timer of an earlier open/close

  // Play a clip and call done once it ends; done also runs if playback is refused or "ended" never fires.
  function playThen(video, done) {
    const id = ++run;
    const finish = () => id === run && done();
    if (reduce) return finish();
    video.addEventListener("ended", finish, { once: true });
    const p = video.play();
    if (p) p.catch(finish);
    setTimeout(finish, 7000);
  }

  function open() {
    if (state !== "closed") return;
    set("opening");
    stage.setAttribute("aria-label", "Geldbeutel");
    playThen(vOpen, () => {
      if (state !== "opening") return;
      set("open");
      rewind(vOpen);
    });
  }

  function close() {
    if (state !== "open") return;
    set("closing"); // engravings fade first, then the flap swings shut
    setTimeout(() => {
      playThen(vClose, () => {
        if (state !== "closing") return;
        set("closed");
        rewind(vClose);
        stage.setAttribute("aria-label", "Geldbeutel öffnen");
      });
    }, reduce ? 0 : 260);
  }

  function rewind(video) {
    video.pause();
    try {
      video.currentTime = 0;
    } catch {}
  }

  $("#flap").addEventListener("click", (e) => {
    e.stopPropagation();
    close();
  });

  stage.addEventListener("click", open);
  stage.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });

  /* ---------- pull a card out and let it float ---------- */
  document.querySelectorAll(".slot .card").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state === "open") pull(card);
    });
  });

  // Center-to-center offset and scale that map rect b onto rect a.
  const flip = (a, b) =>
    `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${a.width / b.width})`;

  // Where the card sits when pulled up, measured from its invisible twin in the slot.
  const pulledRect = (slot) => {
    const r = $(".ghost", slot).getBoundingClientRect();
    return { left: r.left, top: r.top - r.height * 0.8, width: r.width, height: r.height };
  };

  async function pull(card) {
    set("pulling");
    current = card;
    const key = card.dataset.card;
    const slot = card.parentElement;
    $(`.patch[data-patch="${key}"]`).hidden = false;
    slot.classList.add("out");

    const slide = await anim(card, [{ transform: "translateY(0)" }, { transform: PULL }], {
      duration: 520,
      easing: "cubic-bezier(.5,0,.3,1)",
    });

    const link = LINKS[key];
    cta.hidden = !link;
    if (link) {
      cta.href = link.href;
      $("span", cta).textContent = link.label;
    }

    const from = card.getBoundingClientRect();
    tilt.prepend(card);
    slide.cancel();
    set("floating-in");
    stage.classList.add("dim");
    startTilt();
    fwrap.getAnimations().forEach((a) => a.cancel());
    const fly = await anim(fwrap, [{ transform: flip(from, fwrap.getBoundingClientRect()) }, { transform: "none" }], {
      duration: 780,
      easing: "cubic-bezier(.2,.8,.2,1)",
    });
    fly.cancel(); // ends at "none" anyway; dropping the filled animation lets the card re-render sharp at full size
    set("floating");
  }

  async function putBack() {
    if (state !== "floating" || !current) return;
    set("returning");
    stopTilt();
    stage.classList.remove("dim");
    const card = current;
    const slot = $(`.slot[data-slot="${card.dataset.card}"]`);

    fwrap.getAnimations().forEach((a) => a.cancel());
    const home = await anim(fwrap, [{ transform: "none" }, { transform: flip(pulledRect(slot), fwrap.getBoundingClientRect()) }], {
      duration: 620,
      easing: "cubic-bezier(.5,0,.2,1)",
    });

    slot.insertBefore(card, $(".pshade", slot));
    card.style.transform = PULL;
    home.cancel();
    const slide = await anim(card, [{ transform: PULL }, { transform: "translateY(0)" }], {
      duration: 480,
      easing: "cubic-bezier(.3,0,.2,1)",
    });
    card.style.transform = "";
    slide.cancel();
    slot.classList.remove("out");
    $(`.patch[data-patch="${card.dataset.card}"]`).hidden = true;
    current = null;
    set("open");
    card.focus({ preventScroll: true });
  }

  // A tap anywhere puts the card back; a drag only tilts it.
  let down = null;
  float.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY }));
  float.addEventListener("click", (e) => {
    const dragged = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10;
    down = null;
    if (!dragged && !e.target.closest("#cta")) putBack();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") putBack();
  });

  /* ---------- idle sway + finger tilt for the floating card ---------- */
  let target = { x: 0, y: 0 };
  let now = { x: 0, y: 0 };

  function startTilt() {
    cancelAnimationFrame(raf);
    if (reduce) return;
    const t0 = performance.now();
    let amp = 0;
    const loop = (t) => {
      const s = (t - t0) / 1000;
      amp = Math.min(1, amp + 0.02);
      now.x += (target.x - now.x) * 0.08;
      now.y += (target.y - now.y) * 0.08;
      const rx = amp * (8 + Math.sin(s * 0.9) * 5) + now.y;
      const ry = amp * (-10 + Math.sin(s * 0.7 + 1) * 7) + now.x;
      const lift = amp * Math.sin(s * 1.1) * 6;
      tilt.style.transform = `translateY(${lift}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      tilt.style.setProperty("--sx", `${50 + ry * 3}%`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function stopTilt() {
    cancelAnimationFrame(raf);
    target = { x: 0, y: 0 };
    now = { x: 0, y: 0 };
    const from = tilt.style.transform || "none";
    tilt.style.transform = "";
    tilt.style.setProperty("--sx", "50%");
    if (!reduce) tilt.animate([{ transform: from }, { transform: "none" }], { duration: 420, easing: "ease-out" });
  }

  float.addEventListener("pointermove", (e) => {
    if (state !== "floating") return;
    const r = fwrap.getBoundingClientRect();
    target.x = ((e.clientX - (r.left + r.width / 2)) / r.width) * 22;
    target.y = (-(e.clientY - (r.top + r.height / 2)) / r.height) * 22;
  });
  const release = () => (target = { x: 0, y: 0 });
  float.addEventListener("pointerleave", release);
  float.addEventListener("pointerup", release);
  float.addEventListener("pointercancel", release);
})();
