// صبر کن تا HTML کامل لود بشه!
document.addEventListener('DOMContentLoaded', function() {
  
  // کلید API
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

  // لایه‌ها
  const searchSource = new ol.source.Vector();
  const searchLayer = new ol.layer.Vector({source: searchSource});
  map.addLayer(searchLayer);

  const clickSource = new ol.source.Vector();
  const clickLayer = new ol.layer.Vector({source: clickSource});
  map.addLayer(clickLayer);

  // استایل‌ها
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

  // DOM المان‌ها (حالا مطمئناً وجود دارن)
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const statusEl = document.getElementById('status');
  const infoPanel = document.getElementById('infoPanel');
  const infoContent = document.getElementById('infoContent');

  // تست: آیا input پیدا شد؟
  console.log('Search input:', searchInput);
  console.log('Search button:', searchBtn);

  // ========== جستجو ==========
  searchBtn.addEventListener('click', async function() {
    const term = searchInput.value.trim();
    if (!term) return showStatus('نام مکان بنویسید!', 'error');
    
    showStatus('🔍 جستجو...', 'loading');
    
    // نشان + OSM
    try {
      // اول نشان
      const neshanRes = await fetch(
        `https://api.neshan.org/v2/search?term=${encodeURIComponent(term)}`,
        { headers: { 'Api-Key': API_KEY } }
      );
      
      if (neshanRes.ok) {
        const data = await neshanRes.json();
        if (data.items && data.items[0]) {
          const place = data.items[0];
          const coord = ol.proj.fromLonLat([place.location.x, place.location.y]);
          
          searchSource.clear();
          const feature = new ol.Feature(new ol.geom.Point(coord));
          feature.setStyle(blueStyle);
          searchSource.addFeature(feature);
          
          map.getView().animate({center: coord, zoom: 16, duration: 1000});
          showStatus(`✅ ${place.title}`, 'success');
          showInfo(place.title, place.address);
          return;
        }
      }
    } catch(e) {}

    // OSM فال‌بک
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&limit=1`,
        { headers: { 'User-Agent': 'WebGIS-Assignment' } }
      );
      
      const osmData = await osmRes.json();
      if (osmData[0]) {
        const place = osmData[0];
        const coord = ol.proj.fromLonLat([parseFloat(place.lon), parseFloat(place.lat)]);
        
        searchSource.clear();
        const feature = new ol.Feature(new ol.geom.Point(coord));
        feature.setStyle(blueStyle);
        searchSource.addFeature(feature);
        
        map.getView().animate({center: coord, zoom: 14, duration: 1000});
        showStatus(`✅ ${place.display_name.split(',')[0]}`, 'success');
        showInfo(place.display_name.split(',')[0], place.display_name);
        return;
      }
      
      showStatus('❌ پیدا نشد', 'error');
      
    } catch(error) {
      showStatus('❌ خطای اینترنت', 'error');
    }
  });

  // Enter key
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchBtn.click();
  });

  // کلیک
  map.on('singleclick', async function(event) {
    const coord = ol.proj.toLonLat(event.coordinate);
    
    clickSource.clear();
    const feature = new ol.Feature(new ol.geom.Point(event.coordinate));
    feature.setStyle(redStyle);
    clickSource.addFeature(feature);
    
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coord[1]}&lon=${coord[0]}&zoom=18`,
        { headers: { 'User-Agent': 'WebGIS-Assignment' } }
      );
      
      const data = await res.json();
      showInfo('📍 آدرس', data.display_name || 'نامشخص');
      
    } catch(e) {
      showInfo('❌ خطا', 'آدرس‌یابی ناموفق');
    }
  });

  // توابع
  function showStatus(msg, type='') {
    statusEl.textContent = msg;
    statusEl.style.color = type === 'error' ? '#e74c3c' : 
                          type === 'loading' ? '#1976d2' : '#4caf50';
  }

  function showInfo(title, content) {
    infoContent.innerHTML = `<h3>${title}</h3><p>${content}</p>`;
    infoPanel.classList.add('show');
  }

  window.closePanel = function() {
    infoPanel.classList.remove('show');
  };

  console.log('✅ همه چیز آماده - تایپ کار می‌کنه!');
});
