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

    /* EXPORT: JSON or CSV */
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

    /* DELETE HOLIDAY (FOOTER BUTTON) */
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

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .catch(() => {});
  }

})();
