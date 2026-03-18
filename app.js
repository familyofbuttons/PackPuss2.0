/* PackPuss — Full Working Version */
(function(){
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {

    const $ = id => document.getElementById(id);

    /* ELEMENTS */
    const holidaySelect = $('holidaySelect');
    const newTripBtn = $('newTripBtn');
    const duplicateTripBtn = $('duplicateTripBtn');
    const deleteTripBtnFooter = $('deleteTripBtnFooter');

    const tripNameInput = $('tripName');
    const tripDateInput = $('tripDate');

    const addCategoryLeft = $('addCategoryLeft');
    const newCategoryInput = $('newCategoryInput');
    const addCategoryBtn = $('addCategoryBtn');

    const addName = $('addName');
    const addLuggage = $('addLuggage');
    const addItemBtn = $('addItemBtn');

    const categoriesEl = $('categories');
    const progressFill = $('progressFill');
    const progressLabel = $('progressLabel');

    const filterHand = $('filterHand');
    const filterHold = $('filterHold');
    const filterUnpacked = $('filterUnpacked');

    const saveTripBtn = $('saveTripBtn');
    const exportBtn = $('exportBtn');
    const clearBtn = $('clearBtn');

    const countdownOverlay = $('countdownOverlay');
    const countdownText = $('countdownText');
    const countdownSub = $('countdownSub');
    const dismissOverlayBtn = $('dismissOverlayBtn');

    const viewListBtn = $('viewListBtn');
    const oneListModal = $('oneListModal');
    const oneListContent = $('oneListContent');
    const oneListFilter = $('oneListFilter');
    const closeOneList = $('closeOneList');
    const closeOneListBottom = $('closeOneListBottom');

    const addHolidayModal = $('addHolidayModal');
    const modalHolidayName = $('modalHolidayName');
    const modalHolidayDate = $('modalHolidayDate');
    const addHolidayConfirm = $('addHolidayConfirm');
    const addHolidayCancel = $('addHolidayCancel');

    const suggestionsModal = $('suggestionsModal');
    const suggestionsTitle = $('suggestionsTitle');
    const suggestionsList = $('suggestionsList');
    const closeSuggestions = $('closeSuggestions');

    const categoryTpl = document.getElementById('categoryTpl');
    const itemTpl = document.getElementById('itemTpl');

    const heroHolidayName = $('heroHolidayName');
    const heroHolidayDate = $('heroHolidayDate');

    /* CONSTANTS */
    const DEFAULT_CATEGORIES = ['Clothing','Toiletries','Tech','Documents','Misc'];
    const STORAGE_KEY = 'packpuss_trips_v1';
    const OVERLAY_DISMISSED_KEY = 'packpuss_overlay_dismissed_v1';

    let trips = [];
    let currentTripId = null;

    const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,9);
    const nowISO = () => new Date().toISOString();
    const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));

    function formatDateUK(dateStr){
      if(!dateStr) return '';
      const d = new Date(dateStr);
      if(isNaN(d)) return '';
      return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
    }

    function daysUntil(dateStr){
      if(!dateStr) return null;
      const today = new Date();
      const target = new Date(dateStr + 'T00:00:00');
      return Math.ceil((target - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / (1000*60*60*24));
    }

    /* LOAD & SAVE */
    function loadTrips(){
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        trips = raw ? JSON.parse(raw) : [];
      } catch(e){
        trips = [];
      }

      if(!trips.length){
        const t = createTrip('My Holiday');
        trips.push(t);
      }

      trips.forEach(t => {
        if(!Array.isArray(t.customCategories)) t.customCategories = [];
        if(!t.collapsed) t.collapsed = {};
        if(!Array.isArray(t.hiddenCategories)) t.hiddenCategories = [];
      });

      currentTripId = trips[0].id;
      saveTrips();
    }

    function saveTrips(){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
      renderHolidaySelect();
    }

    function createTrip(name, date){
      return {
        id: uid('trip'),
        name: name || 'New Holiday',
        createdAt: nowISO(),
        date: date || null,
        items: [],
        collapsed: {},
        customCategories: [],
        hiddenCategories: []
      };
    }

    function getCurrentTrip(){
      return trips.find(t => t.id === currentTripId) || trips[0];
    }

    /* HOLIDAY SELECT */
    function renderHolidaySelect(){
      holidaySelect.innerHTML = trips.map(t =>
        `<option value="${t.id}">${escapeHtml(t.name)}${t.date ? ' • ' + formatDateUK(t.date) : ''}</option>`
      ).join('');

      holidaySelect.value = currentTripId;

      const trip = getCurrentTrip();
      heroHolidayName.textContent = trip.name || 'My Holiday';
      heroHolidayDate.textContent = trip.date ? formatDateUK(trip.date) : '';
    }

    holidaySelect.addEventListener('change', () => {
      currentTripId = holidaySelect.value;
      render();
      localStorage.removeItem(OVERLAY_DISMISSED_KEY);
      showCountdownIfNeeded();
    });

    /* SUGGESTIONS */
    const SUGGESTIONS = {
      'Clothing': ['T-shirts','Shorts','Underwear','Socks','Swimwear','Pyjamas','Light jacket','Flip flops','Sandals','Trainers','Dress','Skirt','Jeans','Sun hat','Belt','Evening outfit','Raincoat','Hoodie'],
      'Toiletries': ['Toothbrush','Toothpaste','Deodorant','Shampoo','Conditioner','Shower gel','Razor','Sunscreen','After sun','Hairbrush','Makeup','Moisturiser','Lip balm','Sanitary products','Hand sanitiser','Wet wipes','Perfume'],
      'Tech': ['Phone charger','Power bank','Earphones','Laptop','Laptop charger','Travel adapter','Camera','Camera charger','Kindle','USB cable','Smartwatch charger','Portable speaker','Memory card'],
      'Documents': ['Passport','Boarding pass','Travel insurance','Hotel booking','Driving licence','Emergency contacts','Currency','Bank cards','Itinerary printout'],
      'Misc': ['Sunglasses','Reusable bag','Medications','Plasters','Snacks','Water bottle','Travel pillow','Eye mask','Ear plugs','Beach towel','Playing cards','Notebook','Pen','Tissues','Hand fan']
    };

    function openSuggestions(category){
      suggestionsTitle.textContent = `Suggested for ${category}`;
      suggestionsList.innerHTML = '';

      const items = SUGGESTIONS[category] || SUGGESTIONS['Misc'];

      items.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'pill';
        btn.textContent = name;

        btn.addEventListener('click', () => {
          const trip = getCurrentTrip();
          trip.items.push({
            id: uid('item'),
            category,
            name,
            qty:1,
            packed:false,
            luggage:'hold',
            notes:''
          });

          const original = btn.textContent;
          btn.textContent = 'Added!';
          btn.style.opacity = '0.6';

          setTimeout(() => {
            btn.textContent = original;
            btn.style.opacity = '1';
          }, 700);

          saveTrips();
          render();
        });

        suggestionsList.appendChild(btn);
      });

      suggestionsModal.classList.remove('hidden');
      document.body.classList.add('overlay-blur');
    }

    closeSuggestions.addEventListener('click', () => {
      suggestionsModal.classList.add('hidden');
      document.body.classList.remove('overlay-blur');
    });

    /* ADD CATEGORY */
    addCategoryBtn.addEventListener('click', () => {
      const nameRaw = (newCategoryInput.value || '').trim();
      if (!nameRaw) {
        alert('Enter a category name');
        return;
      }

      const trip = getCurrentTrip();
      if (!trip) return;

      const nameNorm = nameRaw.toLowerCase();
      const existing = buildCategoryList(trip).map(c => c.toLowerCase());

      if (existing.includes(nameNorm)) {
        alert('That category already exists');
        newCategoryInput.value = '';
        newCategoryInput.focus();
        return;
      }

      if (!Array.isArray(trip.customCategories)) trip.customCategories = [];
      trip.customCategories.push(nameRaw);

      if (Array.isArray(trip.hiddenCategories)) {
        trip.hiddenCategories = trip.hiddenCategories.filter(c => c.toLowerCase() !== nameNorm);
      }

      saveTrips();
      render();

      newCategoryInput.value = '';
      newCategoryInput.focus();
    });

    /* CATEGORY LIST */
    function buildCategoryList(trip){
      const used = Array.from(new Set(trip.items.map(i => i.category || 'Misc')));
      const all = Array.from(new Set(DEFAULT_CATEGORIES.concat(trip.customCategories || []).concat(used)));
      return all.filter(c => !(trip.hiddenCategories || []).includes(c));
    }

    function render(){
      const trip = getCurrentTrip();
      if(!trip) return;

      heroHolidayName.textContent = trip.name || 'My Holiday';
      heroHolidayDate.textContent = trip.date ? formatDateUK(trip.date) : '';

      // keep inputs in sync with current trip
      tripNameInput.value = trip.name || '';
      tripDateInput.value = trip.date || '';

      const cats = buildCategoryList(trip);
      const prev = addCategoryLeft.value;

      addCategoryLeft.innerHTML = cats.map(c =>
        `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
      ).join('');

      if(prev && cats.includes(prev)) addCategoryLeft.value = prev;

      categoriesEl.innerHTML = '';

      const handOnly = filterHand.checked;
      const holdOnly = filterHold.checked;
      const unpackedOnly = filterUnpacked.checked;

      cats.forEach(cat => {
        const frag = categoryTpl.content.cloneNode(true);
        const node = frag.querySelector('.category');

        frag.querySelector('.cat-title').textContent = cat;
        const catItems = trip.items.filter(i => i.category === cat);
        frag.querySelector('.cat-stats').textContent = `${catItems.length} items`;

        const toggleBtn = frag.querySelector('.cat-toggle');
        const catBody = frag.querySelector('.cat-body');
        const addBtn = frag.querySelector('.cat-add');
        const removeCatBtn = frag.querySelector('.cat-remove');
        const suggestBtn = frag.querySelector('.cat-suggest');

        const collapsed = !!trip.collapsed[cat];
        catBody.style.display = collapsed ? 'none' : '';
        toggleBtn.textContent = collapsed ? '▸' : '▾';

        toggleBtn.addEventListener('click', () => {
          trip.collapsed[cat] = !trip.collapsed[cat];
          saveTrips();
          render();
        });

        addBtn.addEventListener('click', () => {
          const name = prompt(`Add item to ${cat}`, '');
          if(name){
            trip.items.push({
              id: uid('item'),
              category: cat,
              name: name.trim(),
              qty:1,
              packed:false,
              luggage:'hold',
              notes:''
            });
            saveTrips();
            render();
          }
        });

        removeCatBtn.addEventListener('click', () => {
          const message = DEFAULT_CATEGORIES.includes(cat)
            ? `This is a default category. Press OK to delete "${cat}" for this holiday (removes items and hides the category). Press Cancel to only remove all items in "${cat}".`
            : `Press OK to delete category "${cat}" and all its items. Press Cancel to only remove all items in "${cat}".`;

          if(!confirm(message)) {
            if(!confirm(`Remove all items from "${cat}"? This cannot be undone.`)) return;
            trip.items = trip.items.filter(i => i.category !== cat);
            delete trip.collapsed[cat];
            saveTrips();
            render();
            return;
          }

          trip.items = trip.items.filter(i => i.category !== cat);

          if (trip.customCategories.includes(cat)) {
            trip.customCategories = trip.customCategories.filter(c => c !== cat);
          }

          if (DEFAULT_CATEGORIES.includes(cat)) {
            if(!Array.isArray(trip.hiddenCategories)) trip.hiddenCategories = [];
            if(!trip.hiddenCategories.includes(cat)) trip.hiddenCategories.push(cat);
          }

          delete trip.collapsed[cat];
          saveTrips();
          render();
        });

        suggestBtn.addEventListener('click', () => openSuggestions(cat));

        catItems.forEach(item => {
          if(handOnly && item.luggage !== 'hand') return;
          if(holdOnly && item.luggage !== 'hold') return;
          if(unpackedOnly && item.packed) return;

          const it = itemTpl.content.cloneNode(true);
          it.querySelector('.item-name').textContent = item.name;

          const packedCb = it.querySelector('.item-packed');
          packedCb.checked = !!item.packed;
          packedCb.addEventListener('change', () => {
            item.packed = packedCb.checked;
            saveTrips();
            render();
          });

          const luggageSel = it.querySelector('.item-luggage');
          luggageSel.value = item.luggage || 'hold';
          luggageSel.addEventListener('change', () => {
            item.luggage = luggageSel.value;
            saveTrips();
            render();
          });

          const qty = it.querySelector('.item-qty');
          qty.value = item.qty || 1;
          qty.addEventListener('change', () => {
            item.qty = Math.max(1, Number(qty.value));
            saveTrips();
            render();
          });

          const removeBtn = it.querySelector('.item-remove');
          removeBtn.addEventListener('click', () => {
            trip.items = trip.items.filter(x => x.id !== item.id);
            saveTrips();
            render();
          });

          const notesToggle = it.querySelector('.notes-toggle');
          const notesWrap = it.querySelector('.item-notes');
          const notesField = it.querySelector('.notes-field');
          notesField.value = item.notes || '';

          notesToggle.addEventListener('click', () => {
            const visible = notesWrap.style.display !== 'none';
            notesWrap.style.display = visible ? 'none' : 'block';
            notesToggle.style.opacity = visible ? '0.7' : '1';
          });

          notesField.addEventListener('input', () => {
            item.notes = notesField.value;
            saveTrips();
          });

          catBody.appendChild(it);
        });

        categoriesEl.appendChild(node);
      });

      const total = trip.items.length;
      const packed = trip.items.filter(i => i.packed).length;
      const pct = total ? Math.round((packed / total) * 100) : 0;

      progressFill.style.width = `${pct}%`;
      progressLabel.textContent = `${packed} / ${total} packed`;
    }

    /* ONE LIST */
    function renderOneList(filter = 'all'){
      const trip = getCurrentTrip();
      if(!trip) return;

      oneListContent.innerHTML = '';
      const items = trip.items.slice();

      const filtered = items.filter(i => filter === 'all' || i.luggage === filter);

      if(filtered.length === 0){
        oneListContent.innerHTML = `<div style="color:var(--muted);padding:12px;text-align:center">No items</div>`;
        return;
      }

      filtered.forEach(item => {
        const row = document.createElement('div');
        row.className = 'one-list-row';

        row.innerHTML = `
          <div style="display:flex;align-items:flex-start;gap:12px;flex:1;">
            <input type="checkbox" class="one-list-packed" data-id="${item.id}" ${item.packed ? 'checked' : ''}>
            <div style="flex:1;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div class="one-list-name">${escapeHtml(item.name)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="luggage-pill">${escapeHtml(item.luggage)}</div>
                  <div class="qty-badge">x${item.qty}</div>
                  <button class="notes-toggle-compact" aria-expanded="false">Notes ▾</button>
                </div>
              </div>
              <div class="one-list-notes">${escapeHtml(item.notes || '')}</div>
            </div>
          </div>
        `;

        oneListContent.appendChild(row);

        const cb = row.querySelector('.one-list-packed');
        cb.addEventListener('change', () => {
          item.packed = cb.checked;
          saveTrips();
          render();
        });

        const notesBtn = row.querySelector('.notes-toggle-compact');
        const notesBox = row.querySelector('.one-list-notes');
        notesBtn.addEventListener('click', () => {
          const visible = notesBox.style.display !== 'block';
          notesBox.style.display = visible ? 'block' : 'none';
          notesBtn.setAttribute('aria-expanded', visible ? 'true' : 'false');
        });
      });
    }

    viewListBtn.addEventListener('click', () => {
      oneListModal.classList.remove('hidden');
      document.body.classList.add('overlay-blur');
      renderOneList(oneListFilter.value);
    });

    closeOneList.addEventListener('click', () => {
      oneListModal.classList.add('hidden');
      document.body.classList.remove('overlay-blur');
    });

    closeOneListBottom.addEventListener('click', () => {
      oneListModal.classList.add('hidden');
      document.body.classList.remove('overlay-blur');
    });

    oneListFilter.addEventListener('change', () => {
      renderOneList(oneListFilter.value);
    });

    /* ADD HOLIDAY MODAL */
    newTripBtn.addEventListener('click', () => {
      modalHolidayName.value = '';
      modalHolidayDate.value = '';
      addHolidayModal.classList.remove('hidden');
      document.body.classList.add('overlay-blur');
    });

    /* FIXED BLOCK — this was your fatal bug */
    addHolidayCancel.addEventListener('click', () => {
      addHolidayModal.classList.add('hidden');
      document.body.classList.remove('overlay-blur');
    });

    addHolidayConfirm.addEventListener('click', () => {
      const name = (modalHolidayName.value || '').trim();
      const date = modalHolidayDate.value || null;

      if(!name){
        alert('Enter a holiday name');
        return;
      }

      const t = createTrip(name, date);
      trips.unshift(t);
      currentTripId = t.id;
      saveTrips();
      render();

      addHolidayModal.classList.add('hidden');
      document.body.classList.remove('overlay-blur');

      showCountdownIfNeeded(true);
    });

    /* COUNTDOWN OVERLAY */
    function showCountdownIfNeeded(force=false){
      const dismissed = localStorage.getItem(OVERLAY_DISMISSED_KEY);
      if(!force && dismissed === 'true') return;

      const trip = getCurrentTrip();
      if(!trip || !trip.date) return;

      const d = daysUntil(trip.date);
      if(d === null || d < 0) return;

      const name = (trip.name || 'holiday').toLowerCase();

      countdownText.textContent = `${d} day${d===1?'':'s'} til ${name}, best get packing!`;
      countdownSub.textContent = `don't forget your toothbrush!.....`;

      countdownOverlay.classList.remove('hidden');
      document.body.classList.add('overlay-blur');
    }

    dismissOverlayBtn.addEventListener('click', () => {
      countdownOverlay.classList.add('hidden');
      document.body.classList.remove('overlay-blur');
      localStorage.setItem(OVERLAY_DISMISSED_KEY, 'true');
    });

    /* DUPLICATE HOLIDAY */
    duplicateTripBtn.addEventListener('click', () => {
      const trip = getCurrentTrip();
      if(!trip) return;

      const suggested = trip.name + ' (copy)';
      const newName = prompt('Name for duplicated holiday', suggested);
      if(newName === null) return;

      const copy = JSON.parse(JSON.stringify(trip));
      copy.id = uid('trip');
      copy.name = (newName.trim() || suggested);
      copy.createdAt = nowISO();
      copy.items = copy.items.map(i => ({ ...i, id: uid('item') }));

      // Reset the date so user can choose a new one
      copy.date = null;

      trips.unshift(copy);
      currentTripId = copy.id;
      saveTrips();
      render();
      renderHolidaySelect();
    });

    /* SAVE HOLIDAY */
    saveTripBtn.addEventListener('click', () => {
      const trip = getCurrentTrip();
      if(!trip) return;

      trip.name = (tripNameInput.value || trip.name || 'Holiday').trim();
      trip.date = tripDateInput.value || null;

      saveTrips();
      render();
      renderHolidaySelect();

      alert('Holiday saved');
    });

    /* CLEAR ITEMS */
    clearBtn.addEventListener('click', () => {
      const trip = getCurrentTrip();
      if(!trip) return;

      if(!confirm('Clear all items from this holiday?')) return;

      trip.items = [];
      saveTrips();
      render();
    });

    /* EXPORT */
    function safeFilenamePart(s){
      return (s || '').replace(/[^a-z0-9_\- ]/gi, '').trim().replace(/\s+/g, '-').toLowerCase() || 'holiday';
    }

    function tripToCSV(trip){
      const headers = ['category','name','qty','packed','luggage','notes'];
      const rows = trip.items.map(i => {
        const esc = v => `"${String(v === null || v === undefined ? '' : v).replace(/"/g,'""')}"`;
        return [
          esc(i.category || ''),
          esc(i.name || ''),
          esc(i.qty || 1),
          esc(i.packed ? 'true' : 'false'),
          esc(i.luggage || ''),
          esc(i.notes || '')
        ].join(',');
      });
      return headers.join(',') + '\n' + rows.join('\n');
    }

    exportBtn.addEventListener('click', () => {
      const trip = getCurrentTrip();
      if(!trip) {
        alert('No holiday to export');
        return;
      }

      const fmt = (prompt('Export format: "json" or "csv"', 'json') || '').trim().toLowerCase();
      if(!fmt) return;

      const namePart = safeFilenamePart(trip.name);
      const datePart = trip.date ? safeFilenamePart(trip.date) : '';
      const base = datePart ? `${namePart}_${datePart}` : namePart;

      if(fmt === 'csv'){
        const csv = tripToCSV(trip);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${base}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else if(fmt === 'json'){
        const payload = JSON.stringify(trip, null, 2);
        const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${base}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        alert('Unsupported format. Please enter "json" or "csv".');
      }
    });

    /* DELETE HOLIDAY */
    deleteTripBtnFooter.addEventListener('click', () => {
      if(!confirm('Delete this holiday and all its items?')) return;

      const trip = getCurrentTrip();
      if(!trip) return;

      trips = trips.filter(t => t.id !== trip.id);

      if(!trips.length){
        const t = createTrip('My Holiday');
        trips.push(t);
      }

      currentTripId = trips[0].id;
      saveTrips();
      render();
    });

    /* INITIALISE */
    loadTrips();
    renderHolidaySelect();
    render();
    showCountdownIfNeeded();
  });

  /* SERVICE WORKER */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/PackPuss2.0/service-worker.js')
      .catch(() => {});
  }

})();
