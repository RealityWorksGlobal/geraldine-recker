/* Géraldine Recker — portfolio
 *
 * Sheet columns are matched by header NAME, not position, so columns
 * can be dragged around freely. FIELDS maps each internal field to
 * the header that feeds it. Headers are stripped to letters and
 * digits before matching, so "Project Title", "project-title" and
 * "projecttitle" are the same thing.
 *
 * Only a title is required; everything else is optional.
 */

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

var COVER_INTERVAL = 2000;   // landing cycle, ms

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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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

// Year, type, medium — the three parts of the hover line.
function metaBits(p) {
  return [p.year, p.type, p.medium].filter(Boolean);
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

function markReady() {
  document.body.classList.add('is-ready');
}

function fail(msg) {
  el('project-index').innerHTML = '';
  var box = el('error');
  box.hidden = false;
  box.querySelector('p').textContent = msg;
  markReady();
}

/* Portrait images are capped by height rather than width, so the
   frame needs to know the orientation. Natural dimensions aren't
   available until the file reports them. */
function tagOrientation(node, frame) {
  function check() {
    var w = node.naturalWidth || node.videoWidth;
    var h = node.naturalHeight || node.videoHeight;
    if (!w || !h) return;
    frame.classList.toggle('is-portrait', h > w);
  }
  check();
  node.addEventListener('load', check);
  node.addEventListener('loadedmetadata', check);
}

/* ---------- state ---------- */

var coverPool = [];
var coverIndex = 0;
var coverTimer = null;
var currentCover = '';     // the photo on screen right now
var landingOver = false;
var hoverArmed = true;

/* ---------- cover photo ---------- */

function buildCoverPool() {
  coverPool = [];
  projects.forEach(function (p) {
    p.covers.forEach(function (c) { coverPool.push(c); });
  });
}

// Loads into memory first, then swaps — no flash of empty frame.
function setCover(path) {
  if (!path) return;
  currentCover = path;
  var img = el('cover-image');
  var loader = new Image();
  loader.onload = function () {
    img.src = loader.src;
    tagOrientation(img, img.closest('.frame'));
  };
  loader.src = imgURL(path);
}

function advanceCover() {
  if (coverPool.length < 2) return;
  coverIndex = (coverIndex + 1) % coverPool.length;
  setCover(coverPool[coverIndex]);
}

// First click anywhere: photo freezes, nav fades in.
function endLanding() {
  if (landingOver) return;
  landingOver = true;
  clearInterval(coverTimer);
  coverTimer = null;
  document.body.classList.remove('is-landing');
}

/* ---------- render ---------- */

function renderIndex() {
  var ul = el('project-index');
  ul.innerHTML = '';
  projects.forEach(function (p) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + p.slug;
    a.textContent = p.title;
    a.dataset.slug = p.slug;
    li.appendChild(a);
    ul.appendChild(li);
  });
}

function renderHome() {
  buildCoverPool();
  if (!coverPool.length) return;

  setCover(coverPool[0]);

  coverPool.forEach(function (c) {
    var pre = new Image();
    pre.src = imgURL(c);
  });

  if (!landingOver && coverPool.length > 1) {
    coverTimer = setInterval(advanceCover, COVER_INTERVAL);
  }
}

function renderProject(p) {
  el('project-title').textContent = p.title;

  // Year / type / medium, one line each, above the description.
  var meta = el('project-meta');
  meta.innerHTML = '';
  metaBits(p).forEach(function (b) {
    var line = document.createElement('p');
    line.textContent = b;
    meta.appendChild(line);
  });

  paragraphs(el('project-text'), p.description);

  // The cover already on screen leads the column, so opening a
  // project continues from it rather than cutting.
  var lead = currentCover || p.covers[0] || p.images[0];
  var coverImg = el('project-cover-image');
  coverImg.src = lead ? imgURL(lead) : '';
  tagOrientation(coverImg, el('project-cover'));

  var box = el('project-images');
  box.innerHTML = '';

  p.images.forEach(function (name, i) {
    var fig = document.createElement('figure');
    fig.className = 'frame';

    var media;
    if (isVideo(name)) {
      // Muted autoplay loop, no controls — behaves like a still.
      media = document.createElement('video');
      media.src = imgURL(name);
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.autoplay = true;
      media.setAttribute('muted', '');          // Safari wants the attribute
      media.setAttribute('playsinline', '');
      media.preload = i === 0 ? 'auto' : 'metadata';
      media.setAttribute('aria-label', p.captions[i] || p.title);
    } else {
      media = document.createElement('img');
      media.src = imgURL(name);
      media.alt = p.captions[i] || p.title;
      media.loading = i === 0 ? 'eager' : 'lazy';
      media.decoding = 'async';
    }

    fig.appendChild(media);
    tagOrientation(media, fig);

    if (p.captions[i]) {
      var cap = document.createElement('figcaption');
      cap.textContent = p.captions[i];
      fig.appendChild(cap);
    }

    box.appendChild(fig);
  });

  document.title = 'Géraldine Recker — ' + p.title;
}

// Opening a project puts you back at the cover; the scroll is the
// visitor's to make.
function resetMediaScroll() {
  var col = document.querySelector('#project .col-content');
  if (col) col.scrollTop = 0;
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
}

/* ---------- hover ---------- */

function wireHover() {
  var list = el('project-index');
  var meta = el('hover-meta');

  // Clicking disarms hover, so the project you just opened isn't
  // wiped by the cursor still resting on its name.
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

    var p = projects.filter(function (x) { return x.slug === a.dataset.slug; })[0];
    if (!p) return;

    // The metadata line always previews, even while reading a
    // project — it costs nothing and answers "what is this one?".
    var bits = metaBits(p);
    if (bits.length) {
      meta.innerHTML = '';
      bits.forEach(function (b) {
        var s = document.createElement('span');
        s.textContent = b;
        meta.appendChild(s);
      });
      placeMeta(a);
      meta.hidden = false;
    } else {
      meta.hidden = true;
    }

    // Swapping the photo is the heavier move, and it waits until
    // hover re-arms. It also only applies on the home view — while
    // a project is open, hovering previews the line and nothing
    // else, so what you're reading stays on screen.
    if (!hoverArmed) return;
    if (el('project').hidden === false) return;

    var shot = p.covers[0] || p.images[0];
    if (shot) setCover(shot);
  });

  list.addEventListener('mouseleave', function () {
    meta.hidden = true;
  });

  // Re-arms only once the cursor has left the whole nav.
  el('sidebar').addEventListener('mouseleave', function () {
    hoverArmed = true;
  });
}

/* Positions the hover line level with the hovered name: starts at
   the left edge of --meta-col and spans --meta-span columns.
   Measured off the live grid, so it follows any change to --gap or
   --cols without edits here. */
function placeMeta(link) {
  var meta = el('hover-meta');
  var view = document.querySelector('.view:not([hidden])');
  if (!view) return;

  var style = getComputedStyle(view);
  var tracks = style.gridTemplateColumns.split(' ').map(parseFloat);
  var gap = parseFloat(style.columnGap) || 0;
  var box = view.getBoundingClientRect();

  var root = getComputedStyle(document.documentElement);
  var col = parseInt(root.getPropertyValue('--meta-col'), 10) || 2;
  var span = parseInt(root.getPropertyValue('--meta-span'), 10) || 2;

  var left = box.left;
  for (var i = 0; i < col - 1 && i < tracks.length; i++) {
    left += tracks[i] + gap;
  }

  var width = 0;
  for (var j = col - 1; j < col - 1 + span && j < tracks.length; j++) {
    width += tracks[j] + gap;
  }
  width -= gap;

  meta.style.top = link.getBoundingClientRect().top + 'px';
  meta.style.left = left + 'px';
  meta.style.width = width + 'px';
}

/* ---------- image focus ---------- */

// Clicking an image clears the nav and text around it; the next
// click anywhere brings them back. Capture phase, so the very first
// click of a session goes to endLanding instead.
function wireFocus() {
  document.addEventListener('click', function (e) {
    if (document.body.classList.contains('is-focus')) {
      document.body.classList.remove('is-focus');
      return;
    }
    if (!landingOver) return;
    if (e.target.closest('.frame img, .frame video')) {
      document.body.classList.add('is-focus');
    }
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.body.classList.remove('is-focus');
  });
}

/* ---------- cursor ---------- */

// A dot following the pointer. Over an image it picks up a label,
// since clicking there clears the page and that isn't guessable.
var CURSOR_LABEL = '[click for silence]';

function wireCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var cursor = el('cursor');
  if (!cursor) return;
  var label = cursor.querySelector('.cursor-label');

  document.body.classList.add('has-cursor');

  var x = window.innerWidth / 2, y = window.innerHeight / 2;
  var cx = x, cy = y;
  var over = false;
  var shown = false;

  document.addEventListener('mousemove', function (e) {
    x = e.clientX;
    y = e.clientY;
    over = !!(e.target.closest && e.target.closest('.frame img, .frame video'));
  });

  function frame() {
    // Trails slightly, so it reads as an object rather than paint.
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    cursor.style.transform = 'translate(' + cx + 'px, ' + cy + 'px)';

    // Only before the click — once everything is cleared, the
    // label would be describing something already done.
    var want = over && !document.body.classList.contains('is-focus');
    if (want !== shown) {
      shown = want;
      if (label) label.textContent = want ? CURSOR_LABEL : '';
      cursor.classList.toggle('has-label', want);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

/* ---------- scroll indicator ---------- */

// A dot travelling down a hairline at the right edge. Indicator
// only — not draggable.
function wireScrollbar() {
  var bar = el('scrollbar');
  if (!bar) return;
  var dot = bar.querySelector('.scroll-dot');
  if (!dot) return;

  // On desktop a column scrolls; on a phone the page itself does.
  // Both expose scrollTop / scrollHeight / clientHeight, so the
  // same maths drives the dot either way.
  function activeColumn() {
    var view = document.querySelector('.view:not([hidden])');
    if (view) {
      var cols = view.querySelectorAll('.col-content');
      for (var i = 0; i < cols.length; i++) {
        if (cols[i].scrollHeight - cols[i].clientHeight > 4) return cols[i];
      }
    }
    var doc = document.scrollingElement || document.documentElement;
    if (doc && doc.scrollHeight - doc.clientHeight > 4) return doc;
    return null;
  }

  function update() {
    var col = activeColumn();

    if (!col) {
      bar.classList.remove('is-live');
      requestAnimationFrame(update);
      return;
    }

    bar.classList.add('is-live');

    var max = col.scrollHeight - col.clientHeight;
    var progress = max > 0 ? col.scrollTop / max : 0;
    var travel = bar.clientHeight - dot.offsetHeight;

    dot.style.transform = 'translateY(' + (progress * travel) + 'px)';
    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

/* ---------- routing ---------- */

function show(id) {
  ['home', 'project', 'info'].forEach(function (v) {
    el(v).hidden = (v !== id);
  });
}

function markActive(slug) {
  var links = document.querySelectorAll('#sidebar a');
  Array.prototype.forEach.call(links, function (a) {
    a.classList.toggle('active', a.dataset.slug === slug || a.dataset.nav === slug);
  });
}

function route() {
  document.body.classList.remove('is-focus');

  var meta = el('hover-meta');
  if (meta) meta.hidden = true;

  var hash = decodeURIComponent(window.location.hash.replace('#', ''));

  if (window.innerWidth <= 800) closeMenu();

  if (!hash) {
    show('home');
    markActive('home');
    document.title = 'Géraldine Recker';
    return;
  }

  if (hash === 'info') {
    show('info');
    markActive('info');
    document.title = 'Géraldine Recker — Info';
    return;
  }

  var p = projects.filter(function (x) { return x.slug === hash; })[0];
  if (p) {
    renderProject(p);
    show('project');
    markActive(hash);
    resetMediaScroll();
  } else {
    show('home');
    markActive('home');
  }
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
window.addEventListener('resize', function () {
  var meta = el('hover-meta');
  if (meta && !meta.hidden) meta.hidden = true;
});

// Landing is a desktop idea: it rewards a cursor and a first click.
// On a phone the list is simply there, and the first tap on an
// image should clear the screen rather than be spent ending the
// landing. A direct project link skips it everywhere.
var isTouch = window.matchMedia('(max-width: 800px)').matches ||
              !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (window.location.hash || isTouch) {
  landingOver = true;
} else {
  document.body.classList.add('is-landing');
  document.addEventListener('click', endLanding);
}

document.querySelectorAll('[data-nav]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    e.preventDefault();
    var target = (a.dataset.nav === 'home') ? '' : a.dataset.nav;
    if (('#' + target) === window.location.hash || (!target && !window.location.hash)) {
      route();
    } else {
      window.location.hash = target;
    }
  });
});

/* Two sheets load in parallel; the page is marked ready once both
   have settled, succeeded or failed. */

var pending = 2;

function settled() {
  pending -= 1;
  if (pending <= 0) markReady();
}

// Last resort: never leave a blank page if something hangs.
setTimeout(function () {
  if (pending > 0) {
    console.warn('Load timed out — showing page anyway.');
    pending = 0;
    markReady();
  }
}, 6000);

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
      settled();
      return;
    }

    renderIndex();
    wireHover();
    wireFocus();
    wireCursor();
    wireScrollbar();
    renderHome();
    route();
    settled();
  },

  error: function (err) {
    console.error('Projects sheet failed:', err);
    fail('The project list didn’t load. Check the sheet is still published to the web.');
    settled();
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
    settled();
  },

  error: function (err) {
    console.error('Info sheet failed:', err);
    settled();   // info is optional — the site works without it
  }
});
