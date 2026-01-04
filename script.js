document.addEventListener('DOMContentLoaded', function() {
  
  // منتظر لود کامل HTML
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const statusEl = document.getElementById('status');
  const infoPanel = document.getElementById('infoPanel');
  const infoContent = document.getElementById('infoContent');
  
  const API_KEY = "web.bd581b817e37448fbd1308580a816dc6";
  
  // نقشه
  const map = new ol.Map({
    target: 'map',
    layers: [new ol.layer.Tile({source: new ol.source.OSM()})],
    view: new ol.View({
      center: ol.proj.fromLonLat([51.389, 35.689]),
      zoom: 11
    })
  });

  const searchSource = new ol.source.Vector();
  const searchLayer = new ol.layer.Vector({source: searchSource});
  map.addLayer(searchLayer);

  const clickSource = new ol.source.Vector();
  const clickLayer = new ol.layer.Vector({source: clickSource});
  map.addLayer(clickLayer);

  const blueStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 14, fill: new ol.style.Fill({color: '#1e88e5'}),
      stroke: new ol.style.Stroke({color: 'white', width: 4})
    })
  });

  const redStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 14, fill: new ol.style.Fill({color: '#e74c3c'}),
      stroke: new ol.style.Stroke({color: 'white', width: 4})
    })
  });

  // ✅ جستجو (تایپ + Enter کار میکنه)
  function searchLocation() {
    const term = searchInput.value.trim();
    if (!term) {
      showStatus('❌ نام شهر بنویس!', 'error');
      return;
    }
    
    showStatus('🔍 جستجو...', 'loading');
    
    // Neshan API
    fetch(`https://api.neshan.org/v2/search?term=${encodeURIComponent(term)}`, {
      headers: { 'Api-Key': API_KEY }
    })
    .then(res => res.json())
    .then(data => {
      if (data.items?.[0]) {
        const place = data.items[0];
        const coord = ol.proj.fromLonLat([place.location.x, place.location.y]);
        showLocation(coord, place.title, 'Neshan');
        searchInput.value = '';
        return;
      }
      // OSM Fallback
      osmSearch(term);
    })
    .catch(() => osmSearch(term));
  }

  // OSM جستجو
  function osmSearch(term) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&limit=1&countrycodes=ir`)
    .then(res => res.json())
    .then(data => {
      if (data[0]) {
        const place = data[0];
        const coord = ol.proj.fromLonLat([parseFloat(place.lon), parseFloat(place.lat)]);
        showLocation(coord, place.display_name.split(',')[0], 'OSM');
        searchInput.value = '';
      } else {
        showStatus('❌ شهر پیدا نشد', 'error');
      }
    })
    .catch(() => showStatus('❌ خطای اینترنت', 'error'));
  }

  // نمایش مکان
  function showLocation(coord, name, source) {
    searchSource.clear();
    const feature = new ol.Feature(new ol.geom.Point(coord));
    feature.setStyle(blueStyle);
    searchSource.addFeature(feature);
    
    map.getView().animate({
      center: coord,
      zoom: source === 'Neshan' ? 16 : 12,
      duration: 1000
    });
    
    showStatus(`✅ ${name} (${source})`, 'success');
  }

  // دکمه جستجو
  searchBtn.onclick = searchLocation;
  
  // Enter key - تایپ شهر!
  searchInput.onkeypress = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchLocation();
    }
  };

  // 🆕 کلیک + آب و هوا
  map.on('singleclick', async function(event) {
    const coord = ol.proj.toLonLat(event.coordinate);
    
    clickSource.clear();
    const feature = new ol.Feature(new ol.geom.Point(event.coordinate));
    feature.setStyle(redStyle);
    clickSource.addFeature(feature);
    
    showStatus('🌤️ بارگذاری...', 'loading');
    
    try {
      const weather = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${coord[1]}&longitude=${coord[0]}&current=temperature_2m,weathercode,is_day&timezone=Asia/Tehran`
      );
      
      const data = await weather.json();
      const current = data.current;
      const temp = Math.round(current.temperature_2m);
      
      const icons = {
        0: '☀️', 1: '🌤️', 3: '☁️', 45: '🌫️', 
        61: '🌦️', 63: '🌧️', 71: '🌨️', 95: '⛈️'
      };
      const icon = icons[current.weathercode] || '🌤️';
      
      showInfo(
        `📍 ${coord[1].toFixed(4)}, ${coord[0].toFixed(4)}`,
        `🌡️ ${temp}°C<br>${icon} ${current.is_day ? 'روز' : 'شب'}<br>🆓 Open-Meteo`
      );
      
      showStatus(`🌡️ ${temp}°C ${icon}`, 'success');
      
    } catch(e) {
      showStatus('❌ خطای هوا', 'error');
    }
  });

  // توابع نمایش
  function showStatus(msg, type='') {
    statusEl.textContent = msg;
    statusEl.style.color = type === 'error' ? '#e74c3c' : 
                          type === 'loading' ? '#1976d2' : '#4caf50';
  }

  function showInfo(title, content) {
    infoContent.innerHTML = `<h3>${title}</h3><p>${content}</p>`;
    infoPanel.classList.add('show');
  }

  window.closePanel = () => infoPanel.classList.remove('show');

  // ✅ تست تایپ
  console.log('✅ تایپ شهر فعال! تست: "اصفهان", "شیراز"');
});
