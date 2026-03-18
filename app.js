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
