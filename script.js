/* Géraldine Recker — portfolio
 *
 * Sheet columns are matched by header NAME, not position, so columns
 * can be dragged around freely. FIELDS maps each internal field to
 * the header that feeds it. Headers are stripped to letters and
 * digits before matching: "Project Title", "project-title" and
 * "projecttitle" are the same thing.
 *
 * Only a title is required; everything else is optional.
 *
 * Sections: config · helpers · media · state · render · hover ·
 * focus · cursor · scroll indicator · videos · routing · boot
 */

/* ---------- config ---------- */

var CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRGHShozHpH9zqXji89-kkpWgNqBSE0-5qX_duOtUYPBBpIHzHEmXbUT5Tw1qXdmA8yxQvS0tjAlqUI/pub?gid=0&single=true&output=csv';
var INFO_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRGHShozHpH9zqXji89-kkpWgNqBSE0-5qX_duOtUYPBBpIHzHEmXbUT5Tw1qXdmA8yxQvS0tjAlqUI/pub?gid=1054162112&single=true&output=csv';
var IMAGE_BASE = 'https://cdn.juliettemartin.org/website_geraldine-recker_portfolio/';

var FIELDS = {
  title:       ['projecttitle'],
  description: ['projectdescription'],
  slug:        ['slug'],
  images:      ['content'],
  coverphoto:  ['coverphoto'],
  published:   ['show'],
  medium:      ['projectmedium'],
  type:        ['projecttype'],
  year:        ['projectyear'],
  captions:    ['captions']
};

var COVER_INTERVAL = 2000;               // landing cycle, ms
var CURSOR_LABEL = '[click for silence]';

// A real mouse. Phones and tablets get no hover, no custom cursor
// and no landing — a tap there should do what it says.
var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
var MOBILE_QUERY = window.matchMedia('(max-width: 800px)');
function isMobile() { return MOBILE_QUERY.matches; }

var projects = [];

/* ---------- helpers ---------- */

function el(id) { return document.getElementById(id); }

// "Project Title " -> "projecttitle"
function key(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function norm(row) {
  var out = {};
  Object.keys(row).forEach(function (k) {
    var v = row[k];
    out[key(k)] = (v == null ? '' : String(v).trim());
  });
  return out;
}

function pick(row, field) {
  var names = FIELDS[field] || [];
  for (var i = 0; i < names.length; i++) {
    if (row[names[i]]) return row[names[i]];
  }
  return '';
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function splitList(v) {
  if (!v) return [];
  return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

function imgURL(name) {
  if (!name) return '';
  var p = String(name).trim();
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  p = p.replace(/^\/+/, '');
  return IMAGE_BASE + p;
}

// A content entry can be a still or a clip; the extension decides.
function isVideo(name) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(name).trim());
}

// Type, medium, year — the order of Géraldine's layout. Used both
// for the hover line and the stack above the description.
function metaBits(p) {
  return [p.type, p.medium, p.year].filter(Boolean);
}

function findProject(slug) {
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].slug === slug) return projects[i];
  }
  return null;
}

function paragraphs(into, text) {
  into.innerHTML = '';
  if (!text) return;
  text.split(/\\n|\n/).forEach(function (para) {
    if (!para.trim()) return;
    var node = document.createElement('p');
    node.textContent = para.trim();
    into.appendChild(node);
  });
}

function fail(msg) {
  el('project-index').innerHTML = '';
  var box = el('error');
  box.hidden = false;
  box.querySelector('p').textContent = msg;
}

/* ---------- media ---------- */

/* Swaps what a cover frame shows — a still or a clip — safely.
 *
 * Every request is remembered on the frame; when the file is ready
 * it is only shown if it is still the latest one asked for. Without
 * this, hovering A then B quickly could end on A, whichever file
 * happened to arrive last.
 *
 * The new file is loaded off-screen and only swapped in once it can
 * be drawn, so the frame never goes blank, and orientation is set in
 * the same step so a portrait never flashes at landscape width.
 *
 * A clip loads into a fresh <video> that replaces the old one, so
 * the file is only downloaded once. */
function swapMedia(frame, path) {
  if (!frame) return;
  var img = frame.querySelector('img');
  var url = imgURL(path);
  frame.dataset.want = url;

  if (!url) { clearMedia(frame); frame.hidden = true; return; }

  frame.hidden = false;
  if (frame.dataset.shown === url) return;

  function reveal(w, h, show) {
    if (frame.dataset.want !== url) return false;     // a newer request won
    frame.classList.toggle('is-portrait', h > w);
    show();
    frame.dataset.shown = url;
    return true;
  }

  if (isVideo(path)) {
    var vid = document.createElement('video');
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.setAttribute('muted', '');
    vid.setAttribute('playsinline', '');
    vid.preload = 'auto';

    vid.addEventListener('loadeddata', function () {
      reveal(vid.videoWidth, vid.videoHeight, function () {
        removeVideo(frame);
        img.hidden = true;
        frame.appendChild(vid);
        var p = vid.play();
        if (p && p.catch) p.catch(function () {});
      });
    }, { once: true });

    vid.addEventListener('error', function () {
      if (frame.dataset.want === url) console.warn('Clip not found:', url);
    }, { once: true });

    vid.src = url;
    return;
  }

  var loader = new Image();
  loader.onload = function () {
    reveal(loader.naturalWidth, loader.naturalHeight, function () {
      removeVideo(frame);
      img.src = url;
      img.hidden = false;
    });
  };
  loader.onerror = function () {
    if (frame.dataset.want === url) console.warn('Image not found:', url);
  };
  loader.src = url;
}

function removeVideo(frame) {
  var old = frame.querySelector('video');
  if (!old) return;
  old.pause();
  old.removeAttribute('src');
  old.load();                 // releases the download
  old.remove();
}

// Empties a frame at once — used when opening a project, so the
// previous project's lead is never on screen while the new one loads.
function clearMedia(frame) {
  removeVideo(frame);
  var img = frame.querySelector('img');
  img.removeAttribute('src');
  img.hidden = false;
  frame.dataset.shown = '';
}

// For content that is built once and never swapped: tag orientation
// the first time the file reports its size. One listener, removed
// after it fires.
function tagOnce(node, frame) {
  function check() {
    var w = node.naturalWidth || node.videoWidth;
    var h = node.naturalHeight || node.videoHeight;
    if (w && h) frame.classList.toggle('is-portrait', h > w);
  }
  if ((node.naturalWidth || node.videoWidth)) { check(); return; }
  node.addEventListener(node.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', check, { once: true });
  node.addEventListener('error', function () {
    console.warn('Media not found:', node.currentSrc || node.src);
  }, { once: true });
}

/* ---------- state ---------- */

var coverPool = [];
var coverIndex = 0;
var coverTimer = null;
var currentCover = '';     // the photo last shown on home
var openSlug = '';         // the project currently open, if any
var openLead = '';         // that project's own lead image
var landingOver = false;
var hoverArmed = true;

/* ---------- render ---------- */

function renderIndex() {
  var ul = el('project-index');
  ul.innerHTML = '';
  projects.forEach(function (p) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    var span = document.createElement('span');

    a.href = '#' + p.slug;
    a.dataset.slug = p.slug;
    // The invisible bold copy the CSS uses to hold the box steady.
    a.dataset.label = p.title;
    span.textContent = p.title;

    a.appendChild(span);
    li.appendChild(a);
    ul.appendChild(li);
  });
}

function buildCoverPool() {
  coverPool = [];
  projects.forEach(function (p) {
    p.covers.forEach(function (c) { coverPool.push(c); });
  });
}

function setCover(path) {
  if (!path) return;
  currentCover = path;
  swapMedia(el('home-cover'), path);
}

function advanceCover() {
  if (coverPool.length < 2) return;
  coverIndex = (coverIndex + 1) % coverPool.length;
  setCover(coverPool[coverIndex]);
}

function renderHome() {
  buildCoverPool();
  if (!coverPool.length) return;

  setCover(coverPool[0]);

  // Warm the cache so the cycle and hover swaps are instant. Stills
  // only — preloading every clip in full would be heavy, and a clip
  // starts drawing from its first frames anyway.
  coverPool.forEach(function (c) {
    if (isVideo(c)) return;
    var pre = new Image();
    pre.src = imgURL(c);
  });

  if (!landingOver && coverPool.length > 1) {
    coverTimer = setInterval(advanceCover, COVER_INTERVAL);
  }
}

function renderProject(p) {
  openSlug = p.slug;

  el('project-title').textContent = p.title;

  // Type / medium / year, one line each, above the description.
  var meta = el('project-meta');
  meta.innerHTML = '';
  metaBits(p).forEach(function (b) {
    var line = document.createElement('p');
    line.textContent = b;
    meta.appendChild(line);
  });

  paragraphs(el('project-text'), p.description);

  // The lead image. If the photo on screen belongs to this project
  // it carries straight through; otherwise the project's own cover.
  // A photo from another project can never lead.
  var own = p.covers.concat(p.images);
  openLead = (currentCover && own.indexOf(currentCover) > -1) ? currentCover : (p.covers[0] || '');

  // Clear first, so the previous project's lead is never on screen
  // for even a moment while the new one loads.
  var leadFrame = el('project-cover');
  clearMedia(leadFrame);
  swapMedia(leadFrame, openLead);

  var box = el('project-images');
  box.innerHTML = '';

  p.images.forEach(function (name, i) {
    var fig = document.createElement('figure');
    fig.className = 'frame';

    var media;
    if (isVideo(name)) {
      // Muted autoplay loop, no controls — behaves like a still.
      media = document.createElement('video');
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.autoplay = true;
      media.setAttribute('muted', '');          // Safari wants the attribute
      media.setAttribute('playsinline', '');
      media.preload = i === 0 ? 'auto' : 'metadata';
      media.setAttribute('aria-label', p.captions[i] || p.title);
      media.src = imgURL(name);
    } else {
      media = document.createElement('img');
      media.alt = p.captions[i] || p.title;
      media.loading = i === 0 ? 'eager' : 'lazy';
      media.decoding = 'async';
      media.src = imgURL(name);
    }

    fig.appendChild(media);
    tagOnce(media, fig);

    if (p.captions[i]) {
      var cap = document.createElement('figcaption');
      cap.textContent = p.captions[i];
      fig.appendChild(cap);
    }

    box.appendChild(fig);
  });

  watchVideos(box);

  document.title = 'Géraldine Recker — ' + p.title;
}

// One block per row: "title" is the heading, "content" the body,
// "number" the order — so the sheet can be rearranged freely.
function renderInfo(rows) {
  var box = el('info-content');
  if (!box) return;
  box.innerHTML = '';

  rows
    .filter(function (r) { return r.title || r.content; })
    .sort(function (a, b) {
      var na = parseFloat(a.number);
      var nb = parseFloat(b.number);
      if (isNaN(na)) return 1;
      if (isNaN(nb)) return -1;
      return na - nb;
    })
    .forEach(function (r) {
      var block = document.createElement('section');
      block.className = 'info-block';

      if (r.title) {
        var h = document.createElement('h2');
        h.textContent = r.title;
        block.appendChild(h);
      }
      if (r.content) {
        var body = document.createElement('div');
        paragraphs(body, r.content);
        block.appendChild(body);
      }
      box.appendChild(block);
    });

  alignText();
}

/* The description shares columns 1–2 with the nav. This measures
   the nav's real height, and the CSS caps the text box to the space
   below it — so a long text scrolls under the list, never over it.
   Measured, so it follows the list's length, --gap and the font. */
function alignText() {
  if (isMobile()) {
    document.documentElement.style.setProperty('--text-top', '0px');
    return;
  }
  var nav = el('sidebar');
  if (!nav) return;
  var gap = parseFloat(getComputedStyle(document.body).rowGap) || 0;
  var h = nav.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--text-top', (h + gap) + 'px');
  fitText();
}

/* A description a few pixels too tall for its space would scroll by
   those few pixels — a "mini scroll" that reads as a glitch. When the
   overflow is no more than the gap between nav and text, the box
   borrows that gap instead: it rises to sit right under the list,
   still clear of it, and doesn't scroll at all. Anything taller is a
   real scroll and keeps the gap. */
function fitText() {
  if (isMobile()) return;
  var nav = el('sidebar');
  if (!nav) return;
  var gap = parseFloat(getComputedStyle(document.body).rowGap) || 0;
  var navH = nav.getBoundingClientRect().height;

  Array.prototype.forEach.call(document.querySelectorAll('.view:not([hidden]) .col-text'), function (c) {
    c.style.maxHeight = '';                          // back to the CSS cap
    var over = c.scrollHeight - c.clientHeight;
    if (over > 0 && over <= gap) {
      c.style.maxHeight = 'calc(100% - ' + navH + 'px)';
    }
  });
}

/* ---------- hover ---------- */

/* Hovering a project title:
 *  - always shows its year / type / medium beside the title;
 *  - on home, swaps the cover photo (and it stays after you leave);
 *  - inside an open project, previews the hovered cover in place of
 *    the open project's images — the text you're reading stays put —
 *    and restores the open project when the cursor leaves the list.
 *
 * After a click, hover is disarmed until the cursor leaves the nav,
 * so the project you just opened isn't replaced by the title the
 * cursor is still resting on. */
function wireHover() {
  if (!FINE_POINTER) return;

  var list = el('project-index');
  var meta = el('hover-meta');

  list.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-slug]');
    if (!a) return;
    hoverArmed = false;
    // Re-clicking the project already in the URL fires no hashchange.
    if (window.location.hash === '#' + a.dataset.slug) route();
  });

  list.addEventListener('mouseover', function (e) {
    if (!landingOver) return;

    var a = e.target.closest('a[data-slug]');
    if (!a) return;

    var p = findProject(a.dataset.slug);
    if (!p) return;

    showMeta(p, a);

    if (!hoverArmed) return;

    var shot = p.covers[0] || p.images[0];
    var projectOpen = !el('project').hidden;
    var infoOpen = !el('info').hidden;

    if (infoOpen) {
      // Info has no image of its own: the hovered cover appears in
      // the media column, and goes again when the cursor leaves.
      if (shot) swapMedia(el('info-cover'), shot);
      return;
    }

    if (projectOpen) {
      if (p.slug === openSlug) { endPreview(); return; }
      if (!shot) return;
      startPreview(shot);
    } else if (shot) {
      setCover(shot);
    }
  });

  list.addEventListener('mouseleave', function () {
    meta.hidden = true;
    endPreview();
    clearInfoCover();
  });

  el('sidebar').addEventListener('mouseleave', function () {
    hoverArmed = true;
  });
}

function showMeta(p, link) {
  var meta = el('hover-meta');
  var bits = metaBits(p);
  if (!bits.length) { meta.hidden = true; return; }

  meta.innerHTML = '';
  bits.forEach(function (b) {
    var s = document.createElement('span');
    s.textContent = b;
    meta.appendChild(s);
  });
  meta.hidden = false;      // visible first, so the words can be measured
  placeMeta(link);
}

/* Level with the hovered title. The box runs from just past the end
   of the title to the right edge of the description column, and the
   three words are packed against that right edge — so the hover line
   and the text below finish on the same vertical.

   On a narrow screen the room between title and edge can be smaller
   than the three words at full spacing. Then the spacing tightens to
   fit; and if even the tightest spacing won't fit, the line runs on
   past the text edge rather than back over the title. */
function placeMeta(link) {
  var meta = el('hover-meta');
  var col = document.querySelector('.view:not([hidden]) .col-text');
  if (!col) return;

  var title = link.querySelector('span') || link;
  var root = getComputedStyle(document.documentElement);
  var fs = parseFloat(getComputedStyle(meta).fontSize) || 14;

  var right = col.getBoundingClientRect().right;
  var left = title.getBoundingClientRect().right + fs;   // 1em clear of the title
  var room = Math.max(0, right - left);

  meta.style.top = link.getBoundingClientRect().top + 'px';
  meta.style.left = left + 'px';
  meta.style.width = room + 'px';

  var spans = meta.querySelectorAll('span');
  var words = 0;
  Array.prototype.forEach.call(spans, function (sp) {
    words += sp.getBoundingClientRect().width;
  });
  var joins = Math.max(1, spans.length - 1);

  var full = toPx(root.getPropertyValue('--meta-gap'), fs, 4 * fs);
  var tight = toPx(root.getPropertyValue('--meta-gap-min'), fs, 0.75 * fs);
  var fits = (room - words) / joins;

  if (fits >= full) {
    meta.style.gap = full + 'px';
    meta.style.justifyContent = 'flex-end';
  } else if (fits >= tight) {
    meta.style.gap = fits + 'px';               // tightened, still on the edge
    meta.style.justifyContent = 'flex-end';
  } else {
    meta.style.gap = tight + 'px';              // runs past the edge instead
    meta.style.justifyContent = 'flex-start';
  }
}

// "4em" or "56px" -> pixels.
function toPx(value, fs, fallback) {
  var v = String(value || '').trim();
  var n = parseFloat(v);
  if (isNaN(n)) return fallback;
  return v.indexOf('em') > -1 ? n * fs : n;
}

var previewScroll = 0;

function startPreview(shot) {
  var col = document.querySelector('#project .col-content');
  if (!document.body.classList.contains('is-previewing')) {
    previewScroll = col ? col.scrollTop : 0;
    document.body.classList.add('is-previewing');
  }
  if (col) col.scrollTop = 0;
  swapMedia(el('project-cover'), shot);
}

function endPreview() {
  if (!document.body.classList.contains('is-previewing')) return;
  document.body.classList.remove('is-previewing');
  swapMedia(el('project-cover'), openLead);
  var col = document.querySelector('#project .col-content');
  if (col) col.scrollTop = previewScroll;
}

function clearInfoCover() {
  var f = el('info-cover');
  if (!f) return;
  f.dataset.want = '';       // cancels anything still loading
  clearMedia(f);
  f.hidden = true;
}

/* ---------- focus ---------- */

// Clicking an image clears everything around it; the next click
// anywhere brings it back. Escape works too. Capture phase, so the
// very first click of a session goes to the landing instead.
function wireFocus() {
  document.addEventListener('click', function (e) {
    if (document.body.classList.contains('is-focus')) {
      document.body.classList.remove('is-focus');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!landingOver) return;
    if (e.target.closest('.frame img, .frame video')) {
      document.body.classList.add('is-focus');
      el('hover-meta').hidden = true;
    }
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.body.classList.remove('is-focus');
  });
}

/* ---------- cursor ---------- */

// A dot that trails the pointer. Over an image, once the landing is
// over, it says what a click there does — it isn't guessable.
function wireCursor() {
  if (!FINE_POINTER) return;

  var cursor = el('cursor');
  if (!cursor) return;
  var label = cursor.querySelector('.cursor-label');

  document.body.classList.add('has-cursor');

  var x = -100, y = -100;
  var cx = x, cy = y;
  var over = false;
  var shown = false;
  var running = false;

  document.addEventListener('mousemove', function (e) {
    x = e.clientX;
    y = e.clientY;
    over = !!(e.target.closest && e.target.closest('.frame img, .frame video'));
    cursor.classList.remove('is-away');
    if (!running) { running = true; requestAnimationFrame(frame); }
  });

  document.documentElement.addEventListener('mouseleave', function () {
    cursor.classList.add('is-away');
  });

  function frame() {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    cursor.style.transform = 'translate(' + cx + 'px, ' + cy + 'px)';

    var want = over && landingOver && !document.body.classList.contains('is-focus');
    if (want !== shown) {
      shown = want;
      if (label) label.textContent = want ? CURSOR_LABEL : '';
      cursor.classList.toggle('has-label', want);
    }

    // Rest once the dot has caught up; the next mousemove wakes it.
    if (Math.abs(x - cx) < 0.1 && Math.abs(y - cy) < 0.1) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }
}

/* ---------- scroll indicator ---------- */

// A dot on a hairline at the right edge. Indicator only. It follows
// whichever column you're scrolling — the images or a long
// description — and falls back to the images. On a phone, the page.
function wireScrollbar() {
  var bar = el('scrollbar');
  if (!bar) return;
  var dot = bar.querySelector('.scroll-dot');
  if (!dot) return;

  var lastY = -1;
  var lastLive = null;
  var current = null;      // the column last scrolled or pointed at

  function scrollable(node) {
    return !!node && node.scrollHeight - node.clientHeight > 1;
  }

  function claim(e) {
    var node = e.target && e.target.closest && e.target.closest('.col-content, .col-text');
    if (node && scrollable(node)) current = node;
  }

  // Scroll events don't bubble, so listen in the capture phase.
  document.addEventListener('scroll', claim, true);
  document.addEventListener('mouseover', claim);

  function activeColumn() {
    if (isMobile()) {
      var doc = document.scrollingElement || document.documentElement;
      return scrollable(doc) ? doc : null;
    }
    var view = document.querySelector('.view:not([hidden])');
    if (!view) return null;
    if (current && view.contains(current) && scrollable(current)) return current;
    var media = view.querySelector('.col-content');
    if (scrollable(media)) return media;
    var text = view.querySelector('.col-text');
    return scrollable(text) ? text : null;
  }

  // Polled rather than event-driven: lazy images change the column's
  // height as they arrive, and no scroll event reports that. Writes
  // only happen when something actually moved.
  function update() {
    var col = activeColumn();
    var live = !!col;

    if (live !== lastLive) {
      bar.classList.toggle('is-live', live);
      lastLive = live;
    }

    if (live) {
      var max = col.scrollHeight - col.clientHeight;
      var y = Math.round((max > 0 ? col.scrollTop / max : 0) * (bar.clientHeight - dot.offsetHeight));
      if (y !== lastY) {
        dot.style.transform = 'translateY(' + y + 'px)';
        lastY = y;
      }
    }

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

/* ---------- videos ---------- */

// Clips play only while on screen. Off-screen ones, and the open
// project's clips hidden during a hover preview, are paused.
var videoWatch = window.IntersectionObserver
  ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) {
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.1 })
  : null;

function watchVideos(root) {
  if (!videoWatch) return;
  videoWatch.disconnect();
  Array.prototype.forEach.call(root.querySelectorAll('video'), function (v) {
    videoWatch.observe(v);
  });
}

/* ---------- routing ---------- */

function show(id) {
  ['home', 'project', 'info'].forEach(function (v) {
    el(v).hidden = (v !== id);
  });

  // Cover clips sit outside the off-screen watcher, so they are
  // paused and resumed with their view.
  ['home-cover', 'project-cover', 'info-cover'].forEach(function (fid) {
    var vid = el(fid).querySelector('video');
    if (!vid) return;
    if (el(fid).closest('.view').hidden) {
      vid.pause();
    } else {
      var p = vid.play();
      if (p && p.catch) p.catch(function () {});
    }
  });
}

// Only project titles carry an active state. The name, info and
// contact stay semibold on every page.
function markActive(slug) {
  var links = document.querySelectorAll('#project-index a');
  Array.prototype.forEach.call(links, function (a) {
    a.classList.toggle('active', a.dataset.slug === slug);
  });
}

function route() {
  document.body.classList.remove('is-focus', 'is-previewing');
  el('hover-meta').hidden = true;
  clearInfoCover();

  var hash = decodeURIComponent(window.location.hash.replace('#', ''));

  if (isMobile()) closeMenu();

  if (!hash) {
    openSlug = '';
    show('home');
    markActive('');
    // Nothing to protect on home, so hover works straight away.
    hoverArmed = true;
    document.title = 'Géraldine Recker';
    return;
  }

  if (hash === 'info') {
    openSlug = '';
    show('info');
    markActive('');
    resetScroll('#info');
    document.title = 'Géraldine Recker — Info';
    return;
  }

  var p = findProject(hash);
  if (p) {
    renderProject(p);
    show('project');
    markActive(p.slug);
    resetScroll('#project');
  } else {
    openSlug = '';
    show('home');
    markActive('');
  }
}

// A newly opened page starts at its top: media at the lead image,
// text at its first line.
function resetScroll(viewSel) {
  fitText();
  ['.col-content', '.col-text'].forEach(function (c) {
    var node = document.querySelector(viewSel + ' ' + c);
    if (node) node.scrollTop = 0;
  });
  if (isMobile()) window.scrollTo(0, 0);
}

/* ---------- mobile menu ---------- */

function closeMenu() {
  el('sidebar').classList.remove('open');
  el('menu-toggle').setAttribute('aria-expanded', 'false');
  el('menu-toggle').textContent = 'index';
}

function toggleMenu() {
  var open = el('sidebar').classList.toggle('open');
  el('menu-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
  el('menu-toggle').textContent = open ? 'close' : 'index';
}

/* ---------- boot ---------- */

el('menu-toggle').addEventListener('click', toggleMenu);
window.addEventListener('hashchange', route);
window.addEventListener('popstate', route);

window.addEventListener('resize', function () {
  el('hover-meta').hidden = true;
  alignText();
});

// The nav's height changes when the webfonts land and whenever the
// list changes; keep the text column measured against it.
if (window.ResizeObserver) {
  new ResizeObserver(alignText).observe(el('sidebar'));
}
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(alignText);
}

// Landing — desktop only: name and cycling photo until the first
// click. A direct project link skips it.
function endLanding() {
  if (landingOver) return;
  landingOver = true;
  clearInterval(coverTimer);
  coverTimer = null;
  document.documentElement.classList.remove('is-landing');
  document.removeEventListener('click', endLanding);
}

// The class itself is set by the small script in <head>, before the
// first paint. This only keeps the two in step.
if (window.location.hash || isMobile() || !FINE_POINTER) {
  landingOver = true;
  document.documentElement.classList.remove('is-landing');
} else {
  document.documentElement.classList.add('is-landing');
  document.addEventListener('click', endLanding);
}

document.querySelectorAll('[data-nav]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    var target = (a.dataset.nav === 'home') ? '' : a.dataset.nav;
    if (('#' + target) === window.location.hash || (!target && !window.location.hash)) {
      route();
    } else if (!target) {
      // Clear the hash without leaving a bare "#" in the address.
      history.pushState('', document.title, window.location.pathname + window.location.search);
      route();
    } else {
      window.location.hash = target;
    }
  });
});

/* --- projects --- */

Papa.parse(CSV_URL + '&t=' + Date.now(), {
  download: true,
  header: true,
  skipEmptyLines: true,

  complete: function (res) {
    console.log('Projects — headers:', res.meta.fields, '· rows:', res.data.length);

    var used = {};

    projects = res.data
      .map(norm)
      .map(function (r) {
        var title = pick(r, 'title');
        if (!title) return null;

        var pub = pick(r, 'published').toLowerCase();
        if (pub === 'no' || pub === 'false') return null;

        var slug = pick(r, 'slug') || slugify(title);
        while (used[slug]) { slug = slug + '-2'; }
        used[slug] = true;

        return {
          slug: slug,
          title: title,
          description: pick(r, 'description'),
          medium: pick(r, 'medium'),
          type: pick(r, 'type'),
          year: pick(r, 'year'),
          images: splitList(pick(r, 'images')),
          captions: splitList(pick(r, 'captions')),
          covers: splitList(pick(r, 'coverphoto'))
        };
      })
      .filter(Boolean);

    if (!projects.length) {
      fail('No projects recognised. Headers found: ' +
           (res.meta.fields || []).join(', '));
      return;
    }

    renderIndex();
    alignText();
    wireHover();
    wireFocus();
    wireCursor();
    wireScrollbar();
    renderHome();
    route();
  },

  error: function (err) {
    console.error('Projects sheet failed:', err);
    fail('The project list didn’t load. Check the sheet is still published to the web.');
  }
});

/* --- info --- */

Papa.parse(INFO_CSV_URL + '&t=' + Date.now(), {
  download: true,
  header: true,
  skipEmptyLines: true,

  complete: function (res) {
    console.log('Info — headers:', res.meta.fields, '· rows:', res.data.length);
    renderInfo(res.data.map(norm));
  },

  error: function (err) {
    console.error('Info sheet failed:', err);   // the site works without it
  }
});
