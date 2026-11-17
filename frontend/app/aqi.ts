/* =====================================================
   ГАЗРЫН ЗУРАГ ДЭЭР ДАРАХАД — МЭДЭЭЛЭЛ ШИНЭЧЛЭГДЭХ
   Энэ файлыг agaarchanar.css-ийн ДАРАА импортолно.
===================================================== */

/* Карт шинэчлэгдэх үед товч анивчина */
@keyframes aq-card-flash {
  0% {
    box-shadow: 0 0 0 0 rgb(20 184 166 / 55%);
    transform: scale(0.985);
    border-color: var(--aq-primary);
  }
  60% {
    box-shadow: 0 0 0 10px rgb(20 184 166 / 0%);
    transform: scale(1);
  }
  100% {
    box-shadow: 0 3px 10px rgb(15 23 42 / 6%);
    border-color: var(--aq-border);
  }
}

.aq-page .aq-selected-station-card.aq-flash {
  animation: aq-card-flash 0.7s ease-out;
}

/* Газрын зургийн AQI тэмдэглэгээ */
.aq-map-container .aq-aqi-marker {
  background: transparent !important;
  border: 0 !important;
  cursor: pointer;
}

.aq-map-container .aq-aqi-marker > div {
  transition: transform 0.15s ease;
}

.aq-map-container .aq-aqi-marker:hover > div {
  transform: scale(1.18);
}

/* Сонгосон станцын PM утгууд */
.aq-quick-values {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.aq-quick-values > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 7px 8px;
  border: 1px solid var(--aq-border);
  border-radius: 8px;
  background: var(--aq-soft-bg);
}

.aq-quick-values span {
  color: var(--aq-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.aq-quick-values strong {
  color: var(--aq-strong);
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.aq-quick-values small {
  color: var(--aq-muted);
  font-size: 9px;
  font-weight: 600;
}

/* Tooltip */
.aq-page .leaflet-tooltip .aq-map-tooltip strong {
  color: var(--aq-strong);
}

/* Жижиг дэлгэц дээр картыг толгойн доор гүйлгэхэд зай үлдээнэ */
.aq-details-column {
  scroll-margin-top: 12px;
}

@media (max-width: 900px) {
  .aq-aqi-panel {
    min-height: 110px;
  }

  .aq-aqi-number {
    font-size: 44px;
  }

  .aq-quick-values strong {
    font-size: 17px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aq-page .aq-selected-station-card.aq-flash {
    animation: none;
  }
}