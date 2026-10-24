export function buildMapHtml(filteredSales) {
  const markersJson = JSON.stringify(
    filteredSales.map((s) => ({
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      // Custom HTML for the popup card
      popup: `
        <div class="custom-popup">
          <h3>📍 ${s.store_name || 'Unknown Store'}</h3>
          <p><strong>Agent:</strong> ${s.agentName || 'Agent'}</p>
          <p><strong>Item:</strong> ${s.productName || 'Product'} × ${s.items_sold}</p>
          <div class="cash">GHS ${Number(s.actual_cash || 0).toFixed(2)}</div>
          <div class="date">${new Date(s.created_at).toLocaleString()}</div>
        </div>
      `,
    }))
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body, html, #map { height: 100%; margin: 0; padding: 0; background-color: #f8fafc; }
        
        /* 🎨 PREMIUM POPUP STYLING */
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          min-width: 180px;
        }
        .custom-popup { padding: 12px; }
        .custom-popup h3 { margin: 0 0 6px 0; font-size: 15px; color: #0f172a; }
        .custom-popup p { margin: 0; font-size: 13px; color: #475569; line-height: 1.4; }
        .custom-popup .cash { font-weight: 800; color: #0b6b43; font-size: 16px; margin-top: 8px; }
        .custom-popup .date { font-size: 11px; color: #94a3b8; margin-top: 4px; }
        
        /* 🎨 CUSTOM GREEN PIN (SVG) */
        .custom-pin {
          background-color: #0b6b43;
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          position: absolute;
          left: -12px;
          top: -12px;
        }
        .custom-pin::after {
          content: '';
          width: 8px;
          height: 8px;
          background: #ffffff;
          position: absolute;
          border-radius: 50%;
          top: 6px;
          left: 6px;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const markers = ${markersJson};
        // Center of Ghana initially
        const map = L.map('map', { zoomControl: false }).setView([7.9465, -1.0232], 7);
        
          // 🗺️ Use the OpenStreetMap style
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 20
        }).addTo(map);

        // Move zoom controls to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // 🟢 Custom Green Icon
        const greenIcon = L.divIcon({
          className: 'custom-marker',
          html: '<div class="custom-pin"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 24],
          popupAnchor: [0, -24]
        });

        const group = [];
        markers.forEach((m) => {
          const marker = L.marker([m.lat, m.lng], { icon: greenIcon }).addTo(map).bindPopup(m.popup);
          group.push(marker);
        });
        
        if (group.length > 0) {
          const bounds = L.featureGroup(group).getBounds();
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
      </script>
    </body>
    </html>
  `;
}