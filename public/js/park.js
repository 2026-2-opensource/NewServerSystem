// ===== 다시오숲 공원 배치 게임 =====

const BOUNDS = { left: 10, top: 22, right: 90, bottom: 88 };

let placedItems = [];
let selectedItem = null;    // 인벤토리 선택
let activeItemId = null;    // 배치 후 선택된 아이템 ID
let itemIdCounter = Date.now();
const IMG_BASE = '/images/park/items/';

const ITEM_IMAGES = {
  bench:        { front:'bench_front.png', back:'bench_back.png', left:'bench_left.png', right:'bench_right.png' },
  wbench:       { front:'wbench_front.png', back:'wbench_back.png', left:'wbench_left.png', right:'wbench_right.png' },
  clock_tower:  { front:'clock_tower_front.png', back:'clock_tower_back.png', left:'clock_tower_left.png', right:'clock_tower_right.png' },
  flower_deco:  { front:'flower_deco_front.png', back:'flower_deco_back.png', left:'flower_deco_left.png', right:'flower_deco_right.png' },
  flowerShop:   { front:'flowerShop_front.png', left:'flowerShop_left.png', right:'flowerShop_right.png' },
  shelter:      { front:'shelter_front.png', back:'shelter_back.png' },
  waterwheel:   { front:'waterwheel_front.png', side:'waterwheel_side.png' },
  bench_log:    { width:'bench_log_width.png', height:'bench_log_height.png' },
  flowerbed:    { width:'flowerbed_width.png', height:'flowerbed_height.png' },
  table:        { width:'table_width.png', height:'table_height.png' },
  dandelion:    { default:'dandelion.png' },
  dandelion2:   { default:'dandelion2.png' },
  flower_ground:{ default:'flower_ground.png' },
  flowerFile:   { default:'flowerFile.png' },
  flowerFile2:  { default:'flowerFile2.png' },
  flowerPot:    { default:'flowerPot.png' },
  foxtail:      { default:'foxtail.png' },
  fountain1:    { default:'fountain1.png' },
  fountain2:    { default:'fountain2.png' },
  lamp1:        { default:'lamp1.png' },
  lamp2:        { default:'lamp2.png' },
  picnic:       { default:'picnic.png' },
  pond:         { default:'pond.png' },
  pot:          { default:'pot.png' },
  stone:        { default:'stone.png' },
  stoneTile:    { default:'stoneTile.png' },
  tree_cherry:  { default:'tree_cherry.png' },
  tree_pine:    { default:'tree_pine.png' },
  tree:         { default:'tree.png' },
  weed:         { default:'weed.png' },
  snowman:      { front:'snowman_front.png', back:'snowman_back.png', left:'snowman_left.png', right:'snowman_right.png' },
  gingerbread:  { front:'gingerbread_front.png', back:'gingerbread_back.png', left:'gingerbread_left.png', right:'gingerbread_right.png' },
  wood_chair:   { default:'wood_chair.png' },
  xmas_light:   { default:'xmas_light.png' },
  xmas_tree:    { default:'xmas_tree.png' },
};

function getImageSrc(itemKey, direction) {
  const imgs = ITEM_IMAGES[itemKey];
  if (!imgs) return '';
  if (direction && imgs[direction]) return IMG_BASE + imgs[direction];
  return IMG_BASE + Object.values(imgs)[0];
}

function getDirections(itemKey) {
  const imgs = ITEM_IMAGES[itemKey];
  if (!imgs) return ['default'];
  return Object.keys(imgs);
}

// ===== 초기화 =====
function initPark(serverItems) {
  placedItems = serverItems || [];
  renderAllItems();
  setupSceneEvents();
  updateStats();
}

// ===== 경계 =====
function clampToBounds(x, y, w, h) {
  // 아이템이 완전히 벗어나지 않도록 (최소 일부는 잔디밭에 걸치도록)
  return {
    x: Math.min(Math.max(x, BOUNDS.left - w + 1), BOUNDS.right - 1),
    y: Math.min(Math.max(y, BOUNDS.top - h + 1), BOUNDS.bottom - 1),
  };
}

function isOutOfBounds(x, y, w, h) {
  // 아이템이 완전히 벗어날 때만 막음 (일부라도 걸쳐있으면 허용)
  return x + w < BOUNDS.left || x > BOUNDS.right || y + h < BOUNDS.top || y > BOUNDS.bottom;
}

// ===== 렌더링 =====
function renderAllItems() {
  const layer = document.getElementById('placedItems');
  layer.innerHTML = '';
  placedItems.forEach((item, i) => {
    createItemEl(item);
    const wrapper = document.querySelector(`.park-item-wrapper[data-id="${item.id}"]`);
    if (wrapper) wrapper.style.zIndex = 1000 + i;
  });
}

function createItemEl(item) {
  const layer = document.getElementById('placedItems');

  const wrapper = document.createElement('div');
  wrapper.className = 'park-item-wrapper';
  wrapper.dataset.id = item.id;
  wrapper.style.cssText = `
    position:absolute;
    left:${item.x}%;
    top:${item.y}%;
    width:${item.w}%;
    height:${item.h}%;
    z-index:${Math.round(item.y * 10)};
    transform-origin:center center;
    transform:rotate(${item.rotate||0}deg);
  `;

  // 아이템 이미지
  const img = document.createElement('img');
  img.className = 'park-item-img';
  img.src = getImageSrc(item.itemKey, item.direction);
  img.draggable = false;
  const itemTransforms = {
  clock_tower:  'perspective(600px) rotateX(20deg)',
  flower_deco:  'perspective(600px) rotateX(18deg)',
  flowerShop:   'perspective(600px) rotateX(18deg)',
  shelter:      'perspective(600px) rotateX(15deg)',
  bench:        'perspective(600px) rotateX(10deg)',
  wbench:       'perspective(600px) rotateX(10deg)',
  picnic:       'perspective(600px) rotateX(-10deg)',
  pond:         'perspective(600px) rotateX(-8deg)',
};
const itemTransform = itemTransforms[item.itemKey] || '';
img.style.cssText = `width:100%;height:100%;object-fit:contain;object-position:bottom;pointer-events:none;display:block;${itemTransform ? 'transform:'+itemTransform+';' : ''}`;
  wrapper.appendChild(img);

  // 선택 박스 (클릭 시 표시)
  const selBox = document.createElement('div');
  selBox.className = 'sel-box';
  selBox.style.display = 'none';
  wrapper.appendChild(selBox);

  // 핸들들
  const handles = [
    { cls:'handle-tl', cursor:'nw-resize', dx:-1, dy:-1 },
    { cls:'handle-tc', cursor:'n-resize',  dx:0,  dy:-1 },
    { cls:'handle-tr', cursor:'ne-resize', dx:1,  dy:-1 },
    { cls:'handle-ml', cursor:'w-resize',  dx:-1, dy:0  },
    { cls:'handle-mr', cursor:'e-resize',  dx:1,  dy:0  },
    { cls:'handle-bl', cursor:'sw-resize', dx:-1, dy:1  },
    { cls:'handle-bc', cursor:'s-resize',  dx:0,  dy:1  },
    { cls:'handle-br', cursor:'se-resize', dx:1,  dy:1  },
  ];

  handles.forEach(h => {
    const hdl = document.createElement('div');
    hdl.className = `sel-handle ${h.cls}`;
    hdl.style.display = 'none';
    hdl.style.cursor = h.cursor;
    hdl.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      startResize(e, item.id, h.dx, h.dy);
    });
    wrapper.appendChild(hdl);
  });

  // 회전 핸들
  const rotHandle = document.createElement('div');
  rotHandle.className = 'sel-rotate-handle';
  rotHandle.style.display = 'none';
  rotHandle.title = '회전';
  rotHandle.innerHTML = '↻';
  rotHandle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    startRotate(e, item.id);
  });
  wrapper.appendChild(rotHandle);

  // 삭제 버튼
  const delBtn = document.createElement('div');
  delBtn.className = 'sel-delete-btn';
  delBtn.style.display = 'none';
  delBtn.innerHTML = '✕';
  delBtn.title = '삭제';
  delBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    deleteItem(item.id);
  });
  wrapper.appendChild(delBtn);

  // 방향 버튼 (방향 있는 아이템만)
  const dirs = getDirections(item.itemKey).filter(d => d !== 'default');
  if (dirs.length > 1) {
    const dirPanel = document.createElement('div');
    dirPanel.className = 'sel-dir-panel';
    dirPanel.style.display = 'none';
    const dirLabels = { front:'정면', back:'후면', left:'왼쪽', right:'오른쪽', width:'가로', height:'세로', side:'측면' };
    dirs.forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'dir-btn' + (item.direction === d ? ' active' : '');
      btn.textContent = dirLabels[d] || d;
      btn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        changeItemDirection(item.id, d);
        dirPanel.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      dirPanel.appendChild(btn);
    });
    wrapper.appendChild(dirPanel);
  }

  // 이동 드래그 (wrapper 클릭)
  wrapper.addEventListener('mousedown', (e) => {
    if (e.target !== img && e.target !== wrapper) return;
    if (selectedItem) return;
    e.stopPropagation();
    selectActiveItem(item.id);
    startMove(e, item.id);
  });

  wrapper.addEventListener('click', (e) => {
    if (selectedItem) return;
    e.stopPropagation();
    selectActiveItem(item.id);
  });

  layer.appendChild(wrapper);
  return wrapper;
}

// ===== 아이템 선택/해제 =====
let zCounter = 1000;

function selectActiveItem(itemId) {
  deactivateAll();
  activeItemId = itemId;

  const wrapper = document.querySelector(`.park-item-wrapper[data-id="${itemId}"]`);
  if (!wrapper) return;

  wrapper.style.zIndex = ++zCounter;
  document.querySelectorAll('.park-item-wrapper').forEach(w => {
    if (w.dataset.id !== String(itemId)) {
      w.style.pointerEvents = 'none';
    }
  });

  wrapper.querySelector('.sel-box').style.display = 'block';
  wrapper.querySelectorAll('.sel-handle').forEach(h => h.style.display = 'block');
  wrapper.querySelector('.sel-rotate-handle').style.display = 'flex';
  wrapper.querySelector('.sel-delete-btn').style.display = 'flex';
  const dirPanel = wrapper.querySelector('.sel-dir-panel');
  if (dirPanel) dirPanel.style.display = 'flex';
}

function deactivateAll() {
  activeItemId = null;
  document.querySelectorAll('.park-item-wrapper').forEach(w => {
    w.style.pointerEvents = 'auto';
  });
  document.querySelectorAll('.park-item-wrapper').forEach(w => {
    w.querySelector('.sel-box').style.display = 'none';
    w.querySelectorAll('.sel-handle').forEach(h => h.style.display = 'none');
    const rh = w.querySelector('.sel-rotate-handle');
    if (rh) rh.style.display = 'none';
    const db = w.querySelector('.sel-delete-btn');
    if (db) db.style.display = 'none';
    const dp = w.querySelector('.sel-dir-panel');
    if (dp) dp.style.display = 'none';
  });
}

// ===== 이동 =====
function startMove(e, itemId) {
  const item = placedItems.find(i => i.id === itemId);
  if (!item) return;

  const scene = document.getElementById('parkScene');
  const rect = scene.getBoundingClientRect();
  const startX = (e.clientX - rect.left) / rect.width * 100 - item.x;
  const startY = (e.clientY - rect.top) / rect.height * 100 - item.y;
  let moved = false;

  const onMove = (e) => {
    moved = true;
    const nx = (e.clientX - rect.left) / rect.width * 100 - startX;
    const ny = (e.clientY - rect.top) / rect.height * 100 - startY;
    const c = clampToBounds(nx, ny, item.w, item.h);
    item.x = c.x; item.y = c.y;
    const wrapper = document.querySelector(`.park-item-wrapper[data-id="${itemId}"]`);
    if (wrapper) {
      wrapper.style.left = c.x + '%';
      wrapper.style.top = c.y + '%';
      wrapper.style.zIndex = ++zCounter;
    }
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ===== 크기 조정 =====
function startResize(e, itemId, dx, dy) {
  e.preventDefault();
  const item = placedItems.find(i => i.id === itemId);
  if (!item) return;

  const scene = document.getElementById('parkScene');
  const rect = scene.getBoundingClientRect();
  const startMouseX = e.clientX;
  const startMouseY = e.clientY;
  const startW = item.w, startH = item.h;
  const startX = item.x, startY = item.y;

  const onMove = (e) => {
    const dxPx = e.clientX - startMouseX;
    const dyPx = e.clientY - startMouseY;
    const dxPct = dxPx / rect.width * 100;
    const dyPct = dyPx / rect.height * 100;

    const ratio = startH / startW;
    let newW = startW + dxPct * dx;
    let newH = startH + dyPct * dy;
    // 비율 고정
    if (dx !== 0 && dy === 0) newH = newW * ratio;
    if (dy !== 0 && dx === 0) newW = newH / ratio;
    if (dx !== 0 && dy !== 0) newH = newW * ratio;
    newW = Math.max(3, newW);
    newH = Math.max(3, newH);

    let newX = startX, newY = startY;
    if (dx === -1) newX = startX + startW - newW;
    if (dy === -1) newY = startY + startH - newH;

    item.w = newW; item.h = newH;
    item.x = newX; item.y = newY;

    const wrapper = document.querySelector(`.park-item-wrapper[data-id="${itemId}"]`);
    if (wrapper) {
      wrapper.style.width = newW + '%';
      wrapper.style.height = newH + '%';
      wrapper.style.left = newX + '%';
      wrapper.style.top = newY + '%';
    }
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ===== 회전 =====
function startRotate(e, itemId) {
  e.preventDefault();
  const item = placedItems.find(i => i.id === itemId);
  if (!item) return;

  const wrapper = document.querySelector(`.park-item-wrapper[data-id="${itemId}"]`);
  const rect = wrapper.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const onMove = (e) => {
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI + 90;
    item.rotate = Math.round(angle);
    wrapper.style.transform = `rotate(${item.rotate}deg)`;
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ===== 방향 변경 =====
function changeItemDirection(itemId, dir) {
  const item = placedItems.find(i => i.id === itemId);
  if (!item) return;
  item.direction = dir;
  const wrapper = document.querySelector(`.park-item-wrapper[data-id="${itemId}"]`);
  if (wrapper) wrapper.querySelector('.park-item-img').src = getImageSrc(item.itemKey, dir);
}

// ===== 삭제 =====
async function deleteItem(itemId) {
  const item = placedItems.find(i => i.id === itemId);
  if (!item) return;

  const wrapper = document.querySelector(`.park-item-wrapper[data-id="${itemId}"]`);
  if (wrapper) {
    wrapper.style.transition = 'all .2s';
    wrapper.style.opacity = '0';
    wrapper.style.transform += ' scale(0.3)';
    setTimeout(() => wrapper.remove(), 200);
  }

  placedItems = placedItems.filter(i => i.id !== itemId);
  deactivateAll();
  updateStats();

  try {
    await fetch('/park/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parkItemId: itemId }),
    });
    updateInvCount(item.templateId, +1);
  } catch(err) { console.error(err); }
}

// ===== 씬 클릭 (새 아이템 배치) =====
function setupSceneEvents() {
  const scene = document.getElementById('parkScene');
  scene.addEventListener('click', (e) => {
    if (e.target.closest('.park-item-wrapper') ||
        e.target.closest('.park-hud-top') ||
        e.target.closest('.park-hud-bottom') ||
        e.target.closest('.park-stats-panel') ||
        e.target.closest('.placement-guide')) {
      return;
    }
    if (selectedItem) {
      placeNewItem(e);
    } else {
      deactivateAll();
    }
  });
}

async function placeNewItem(e) {
  if (!selectedItem) return;
  const scene = document.getElementById('parkScene');
  const rect = scene.getBoundingClientRect();
  const xPct = (e.clientX - rect.left) / rect.width * 100;
  const yPct = (e.clientY - rect.top) / rect.height * 100;
  const defaultW = selectedItem.defaultW || 10;
  const defaultH = selectedItem.defaultH || 12;

  if (isOutOfBounds(xPct, yPct, defaultW, defaultH)) {
    showToast('공원 잔디 위에만 배치할 수 있어요!');
    return;
  }

  const clamped = clampToBounds(xPct - defaultW/2, yPct - defaultH/2, defaultW, defaultH);
  const dirs = getDirections(selectedItem.itemKey);
  const defaultDir = dirs[0];

  const newItem = {
    id: ++itemIdCounter,
    itemKey: selectedItem.itemKey,
    direction: defaultDir,
    x: clamped.x, y: clamped.y,
    w: defaultW, h: defaultH,
    rotate: 0,
    templateId: selectedItem.templateId,
  };

  try {
    const res = await fetch('/park/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: selectedItem.templateId, posX: clamped.x, posY: clamped.y }),
    });
    const data = await res.json();
    if (data.success) {
      newItem.id = data.parkItem.parkItemId;
      placedItems.push(newItem);
      const itemName = selectedItem.name;
      updateInvCount(selectedItem.templateId, -1);
      cancelPlacement();
      createItemEl(newItem);
      // 배치 직후 바로 선택 상태로
      setTimeout(() => selectActiveItem(newItem.id), 50);
      updateStats();
      showToast(`${itemName} 배치! 클릭해서 편집하세요 ✏️`);
    } else {
      showToast(data.message || '배치 실패');
    }
  } catch(err) {
    console.error(err);
    showToast('오류: ' + err.message);
  }
}

// ===== 인벤토리 =====
function selectItem(el) {
  const cnt = parseInt(el.querySelector('.inv-item-count').textContent.replace('x',''));
  if (cnt <= 0) { showToast('아이템이 없어요!'); return; }
  document.querySelectorAll('.inv-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  deactivateAll();
  // 인벤토리 닫기
  const c = document.getElementById('inventoryContent');
  const a = document.getElementById('invArrow');
  c.style.display = 'none';
  a.textContent = '▲';
  selectedItem = {
    templateId: parseInt(el.dataset.templateId),
    itemKey: el.dataset.itemKey,
    name: el.dataset.name,
    defaultW: parseFloat(el.dataset.defaultW) || 10,
    defaultH: parseFloat(el.dataset.defaultH) || 12,
  };
  document.getElementById('placementGuide').style.display = 'flex';
  const guideImg = document.getElementById('guideEmoji');
  const firstImg = ITEM_IMAGES[el.dataset.itemKey];
  if (firstImg) guideImg.src = IMG_BASE + Object.values(firstImg)[0];
  document.getElementById('guideName').textContent = el.dataset.name;
  document.getElementById('parkScene').style.cursor = 'crosshair';
}

function cancelPlacement() {
  selectedItem = null;
  document.querySelectorAll('.inv-item').forEach(i => i.classList.remove('selected'));
  document.getElementById('placementGuide').style.display = 'none';
  document.getElementById('parkScene').style.cursor = 'default';
}

function filterInventory(cat, btn) {
  document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.inv-item').forEach(el => {
    el.style.display = (cat === 'all' || el.dataset.category === cat) ? 'flex' : 'none';
  });
}

function toggleInventory() {
  const c = document.getElementById('inventoryContent');
  const a = document.getElementById('invArrow');
  const open = c.style.display !== 'none';
  c.style.display = open ? 'none' : 'block';
  a.textContent = open ? '▲' : '▼';
}

function updateInvCount(templateId, delta) {
  const el = document.querySelector(`.inv-item[data-template-id="${templateId}"]`);
  if (!el) return;
  const cnt = el.querySelector('.inv-item-count');
  const cur = Math.max(0, parseInt(cnt.textContent.replace('x','')) + delta);
  cnt.textContent = 'x' + cur;
  el.style.opacity = cur <= 0 ? '0.4' : '1';
  el.style.pointerEvents = cur <= 0 ? 'none' : 'auto';
}

function updateStats() {
  const n = placedItems.length;
  const el = document.getElementById('collectionCount');
  const fill = document.getElementById('parkProgressFill');
  if (el) el.textContent = n;
  if (fill) fill.style.width = Math.min(n/24*100,100) + '%';
}

async function savePark() {
  try {
    const res = await fetch('/park/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: placedItems }),
    });
    const data = await res.json();
    return data.success;
  } catch(e) {
    return false;
  }
}

async function saveAndLeave() {
  // zIndex 기준으로 정렬해서 저장
  placedItems.sort((a, b) => {
    const wa = document.querySelector(`.park-item-wrapper[data-id="${a.id}"]`);
    const wb = document.querySelector(`.park-item-wrapper[data-id="${b.id}"]`);
    return (parseInt(wa?.style.zIndex) || 0) - (parseInt(wb?.style.zIndex) || 0);
  });
  showToast('저장 중... 🌳');
  const success = await savePark();
  if (success) {
    window.location.href = '/dashboard';
  } else {
    showToast('저장에 실패했어요. 다시 시도해주세요.');
  }
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'park-toast'; t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}


