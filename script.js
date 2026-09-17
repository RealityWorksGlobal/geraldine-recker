/* Géraldine Recker — portfolio
 *
 * Sheet columns are matched by header NAME, not position, so columns
 * can be dragged around freely. FIELDS below maps each internal field
 * to the header(s) that feed it. Headers are stripped to letters and
 * digits before matching, so "Project Title", "project-title" and
 * "projecttitle" are all the same thing.
 *
 * Only a title is required. Everything else is optional.
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

function isVideo(name) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(name).trim());
}

// Year, type, medium — in the order the mockups show them.
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

/* ---------- state ---------- */

var coverPool = [];
var coverIndex = 0;
var coverTimer = null;
var currentCover = '';     // whatever photo is on screen right now
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
  loader.onload = function () { img.src = loader.src; };
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

  // Metadata stacks vertically here, one line each.
  var meta = el('project-meta');
  meta.innerHTML = '';
  metaBits(p).forEach(function (b) {
    var line = document.createElement('p');
    line.textContent = b;
    meta.appendChild(line);
  });

  paragraphs(el('project-text'), p.description);

  // The cover already on screen leads the column, so opening a project
  // scrolls on from it instead of cutting to something new.
  var lead = currentCover || p.covers[0] || p.images[0];
  el('project-cover-image').src = lead ? imgURL(lead) : '';

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

    if (p.captions[i]) {
      var cap = document.createElement('figcaption');
      cap.textContent = p.captions[i];
      fig.appendChild(cap);
    }
    box.appendChild(fig);
  });

  document.title = 'Géraldine Recker — ' + p.title;
}

// Opening a project puts you back at the cover; the cursor invites
// the scroll rather than doing it for you.
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
    if (!landingOver || !hoverArmed) return;

    var a = e.target.closest('a[data-slug]');
    if (!a) return;

    var p = projects.filter(function (x) { return x.slug === a.dataset.slug; })[0];
    if (!p) return;

    // Back to the browsing state: cover photo plus the hover line.
    show('home');

    var shot = p.covers[0] || p.images[0];
    if (shot) setCover(shot);

    var bits = metaBits(p);
    if (!bits.length) { meta.hidden = true; return; }

    meta.innerHTML = '';
    bits.forEach(function (b) {
      var s = document.createElement('span');
      s.textContent = b;
      meta.appendChild(s);
    });

    var col = document.querySelector('.view:not([hidden]) .col-text');
    if (!col) return;

    var linkBox = a.getBoundingClientRect();
    var colBox = col.getBoundingClientRect();
    var pad = parseFloat(getComputedStyle(col).paddingLeft) || 0;

    meta.style.top = linkBox.top + 'px';
    meta.style.left = (colBox.left + pad) + 'px';
    meta.style.width = (colBox.width - pad) + 'px';
    meta.hidden = false;
  });

  list.addEventListener('mouseleave', function () {
    meta.hidden = true;
  });

  // Re-arms only once the cursor has left the whole sidebar.
  el('sidebar').addEventListener('mouseleave', function () {
    hoverArmed = true;
  });
}

/* ---------- image focus ---------- */

// Clicking an image clears the nav and text around it; the next click
// anywhere brings them back. Capture phase, so on the very first click
// of all this runs before endLanding and doesn't fire by accident.
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

  // Escape is the expected way out of anything full-bleed.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.body.classList.remove('is-focus');
  });
}

/* ---------- scroll indicator ---------- */

/* A dot travelling down a hairline at the right edge of the window.
   Indicator only — reports the scroll position of whichever column is
   currently scrollable, and is not draggable. */
function wireScrollbar() {
  var bar = el('scrollbar');
  if (!bar) return;
  var dot = bar.querySelector('.scroll-dot');
  if (!dot) return;

  // The scrollable column of whatever view is showing.
  function activeColumn() {
    var view = document.querySelector('.view:not([hidden])');
    if (!view) return null;
    var cols = view.querySelectorAll('.col-content, .info-body, .col');
    for (var i = 0; i < cols.length; i++) {
      if (cols[i].scrollHeight - cols[i].clientHeight > 4) return cols[i];
    }
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

/* ---------- cursor ---------- */

/* One element that follows the pointer and names whatever a click or
   a scroll would do right here. It replaces every other affordance —
   there are no underlines or zoom cursors to fall back on, so any new
   interaction needs a state added to cursorState() below. */
function wireCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var cursor = el('cursor');
  if (!cursor) return;

  document.body.classList.add('has-cursor');

  var x = window.innerWidth / 2, y = window.innerHeight / 2;
  var cx = x, cy = y;
  var hovered = null;
  var shown = '';

  document.addEventListener('mousemove', function (e) {
    x = e.clientX;
    y = e.clientY;
    hovered = e.target;
  });

  document.addEventListener('mouseleave', function () {
    cursor.style.opacity = '0';
  });

  document.addEventListener('mouseenter', function () {
    cursor.style.opacity = '1';
  });

  // Is there more media below the fold in this column?
  function canScroll(node) {
    var col = node && node.closest ? node.closest('.col-content') : null;
    if (!col) return false;
    return col.scrollHeight - col.clientHeight - col.scrollTop > 40;
  }

  // Priority runs top to bottom: the most specific thing wins.
    // Each state is just a class name; the shape lives in CSS.
  function cursorState() {
    if (document.body.classList.contains('is-focus')) return 'close';
    if (!landingOver) return 'enter';
    if (!hovered || !hovered.closest) return '';
    if (hovered.closest('.frame img, .frame video')) return 'open';
    if (hovered.closest('#sidebar a')) return 'link';
    if (canScroll(hovered)) return 'scroll';
    return '';
  }

  var STATES = ['enter', 'open', 'close', 'link', 'scroll'];

  function frame() {
    cx += (x - cx) * 0.2;
    cy += (y - cy) * 0.2;
    cursor.style.transform = 'translate(' + cx + 'px, ' + cy + 'px)';

    var state = cursorState();
    if (state !== shown) {
      shown = state;
      STATES.forEach(function (s) {
        cursor.classList.toggle('is-' + s, s === state);
      });
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
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
  el('menu-toggle').textContent = 'Index';
}

function toggleMenu() {
  var open = el('sidebar').classList.toggle('open');
  el('menu-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
  el('menu-toggle').textContent = open ? 'Close' : 'Index';
}

/* ---------- boot ---------- */

el('menu-toggle').addEventListener('click', toggleMenu);
window.addEventListener('hashchange', route);

// Landing: nav hidden, photo cycling. A direct project link skips it.
if (window.location.hash) {
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
