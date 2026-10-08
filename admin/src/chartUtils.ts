/**
 * Lightweight SVG Vector Chart Engine for Admin Panel
 * Zero external dependencies, pure DOM & SVG rendering.
 */

export interface ChartSeries {
  id: string;
  name: string;
  color: string;
  values: number[]; // Array of values across X points
  unit?: string;
  dashed?: boolean;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  xLabels: string[];
  yLabel?: string;
  yMin?: number;
  yMax?: number;
  formatY?: (v: number) => string;
  showPoints?: boolean;
  fillArea?: boolean;
  interactive?: boolean;
}

export class SvgChartRenderer {
  /**
   * Render a multi-series line chart into a target DOM container.
   */
  public static renderLineChart(
    container: HTMLElement,
    seriesList: ChartSeries[],
    options: ChartOptions
  ): void {
    container.innerHTML = '';
    if (!seriesList || seriesList.length === 0 || !options.xLabels || options.xLabels.length === 0) {
      container.innerHTML = '<div class="chart-empty-state">Нет данных для построения графика</div>';
      return;
    }

    const padding = { top: 24, right: 30, bottom: 44, left: 65 };
    const chartWidth = options.width || container.clientWidth || 740;
    const chartHeight = options.height || 320;

    const plotWidth = Math.max(100, chartWidth - padding.left - padding.right);
    const plotHeight = Math.max(80, chartHeight - padding.top - padding.bottom);

    // Calculate Min & Max Y
    let minY = options.yMin !== undefined ? options.yMin : Infinity;
    let maxY = options.yMax !== undefined ? options.yMax : -Infinity;

    seriesList.forEach((s) => {
      s.values.forEach((v) => {
        if (!isNaN(v)) {
          if (options.yMin === undefined && v < minY) minY = v;
          if (options.yMax === undefined && v > maxY) maxY = v;
        }
      });
    });

    if (minY === Infinity || maxY === -Infinity) {
      minY = 0;
      maxY = 100;
    }
    if (minY === maxY) {
      minY = Math.max(0, minY - 10);
      maxY = maxY + 10;
    }
    // Add small headroom on top
    maxY = maxY * 1.08;
    if (options.yMin === undefined) {
      minY = 0; // standard baseline at 0 for combat stats
    }

    const xCount = options.xLabels.length;
    const getX = (index: number) => padding.left + (index / Math.max(1, xCount - 1)) * plotWidth;
    const getY = (val: number) => {
      const clamped = Math.max(minY, Math.min(maxY, val));
      const ratio = (clamped - minY) / (maxY - minY);
      return padding.top + plotHeight - ratio * plotHeight;
    };

    const formatY = options.formatY || ((v: number) => {
      if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
      if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
      if (Number.isInteger(v)) return v.toString();
      return v.toFixed(1);
    });

    // Create SVG root
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
    svg.setAttribute('class', 'vector-chart-svg');
    svg.style.width = '100%';
    svg.style.height = `${chartHeight}px`;

    // Grid lines (5 horizontal levels)
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('class', 'chart-grid');
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = minY + (i / yTicks) * (maxY - minY);
      const yPos = getY(val);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(padding.left));
      line.setAttribute('x2', String(padding.left + plotWidth));
      line.setAttribute('y1', String(yPos));
      line.setAttribute('y2', String(yPos));
      line.setAttribute('stroke', '#e2e8f0');
      line.setAttribute('stroke-dasharray', i === 0 ? 'none' : '3,3');
      line.setAttribute('stroke-width', '1');
      gridGroup.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(padding.left - 8));
      text.setAttribute('y', String(yPos + 4));
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('fill', '#94a3b8');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-family', 'var(--font-mono, monospace)');
      text.textContent = formatY(val);
      gridGroup.appendChild(text);
    }
    svg.appendChild(gridGroup);

    // X Axis Labels (sample to avoid overlap if many points)
    const xLabelsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    xLabelsGroup.setAttribute('class', 'chart-x-labels');
    const step = Math.max(1, Math.ceil(xCount / 10));
    for (let i = 0; i < xCount; i++) {
      if (i % step === 0 || i === xCount - 1) {
        const xPos = getX(i);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(xPos));
        text.setAttribute('y', String(padding.top + plotHeight + 20));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#64748b');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-family', 'var(--font-sans, sans-serif)');
        text.textContent = options.xLabels[i];
        xLabelsGroup.appendChild(text);

        // Tick mark
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', String(xPos));
        tick.setAttribute('x2', String(xPos));
        tick.setAttribute('y1', String(padding.top + plotHeight));
        tick.setAttribute('y2', String(padding.top + plotHeight + 5));
        tick.setAttribute('stroke', '#cbd5e1');
        xLabelsGroup.appendChild(tick);
      }
    }
    svg.appendChild(xLabelsGroup);

    // Render Lines and Areas
    seriesList.forEach((s) => {
      if (s.values.length === 0) return;

      const points = s.values.map((v, i) => `${getX(i)},${getY(v)}`);
      const polylinePoints = points.join(' ');

      // Fill Area (optional)
      if (options.fillArea) {
        const areaPoints = `${getX(0)},${getY(minY)} ` + polylinePoints + ` ${getX(s.values.length - 1)},${getY(minY)}`;
        const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        area.setAttribute('points', areaPoints);
        area.setAttribute('fill', s.color);
        area.setAttribute('fill-opacity', '0.08');
        svg.appendChild(area);
      }

      // Main line
      const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      polyline.setAttribute('points', polylinePoints);
      polyline.setAttribute('fill', 'none');
      polyline.setAttribute('stroke', s.color);
      polyline.setAttribute('stroke-width', s.dashed ? '2' : '2.5');
      polyline.setAttribute('stroke-linecap', 'round');
      polyline.setAttribute('stroke-linejoin', 'round');
      if (s.dashed) {
        polyline.setAttribute('stroke-dasharray', '5,4');
      }
      svg.appendChild(polyline);

      // Points (if enabled or if <= 25 points)
      if (options.showPoints !== false && s.values.length <= 25) {
        s.values.forEach((v, i) => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', String(getX(i)));
          circle.setAttribute('cy', String(getY(v)));
          circle.setAttribute('r', '3.5');
          circle.setAttribute('fill', '#ffffff');
          circle.setAttribute('stroke', s.color);
          circle.setAttribute('stroke-width', '2');
          svg.appendChild(circle);
        });
      }
    });

    // Interactive Crosshair & Tooltip Overlay
    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'chart-render-wrapper';
    chartWrapper.style.position = 'relative';
    chartWrapper.appendChild(svg);

    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.style.display = 'none';
    chartWrapper.appendChild(tooltip);

    // Crosshair vertical line
    const crosshair = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    crosshair.setAttribute('y1', String(padding.top));
    crosshair.setAttribute('y2', String(padding.top + plotHeight));
    crosshair.setAttribute('stroke', '#64748b');
    crosshair.setAttribute('stroke-width', '1.5');
    crosshair.setAttribute('stroke-dasharray', '4,3');
    crosshair.style.display = 'none';
    svg.appendChild(crosshair);

    // Mouse overlay handler
    svg.addEventListener('mousemove', (e) => {
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const svgScaleX = chartWidth / rect.width;
      const scaledX = mouseX * svgScaleX;

      if (scaledX < padding.left || scaledX > padding.left + plotWidth) {
        crosshair.style.display = 'none';
        tooltip.style.display = 'none';
        return;
      }

      // Find nearest index
      const relativeX = (scaledX - padding.left) / plotWidth;
      const nearestIdx = Math.max(0, Math.min(xCount - 1, Math.round(relativeX * (xCount - 1))));
      const snapX = getX(nearestIdx);

      crosshair.setAttribute('x1', String(snapX));
      crosshair.setAttribute('x2', String(snapX));
      crosshair.style.display = 'block';

      // Build Tooltip HTML
      let html = `<div class="tooltip-header">${options.xLabels[nearestIdx]}</div>`;
      html += '<div class="tooltip-body">';
      seriesList.forEach((s) => {
        const val = s.values[nearestIdx];
        if (val !== undefined) {
          const formatted = typeof val === 'number' ? (Number.isInteger(val) ? val.toLocaleString() : val.toFixed(1)) : val;
          html += `
            <div class="tooltip-item">
              <span class="tooltip-dot" style="background:${s.color};"></span>
              <span class="tooltip-label">${s.name}:</span>
              <span class="tooltip-val">${formatted} ${s.unit || ''}</span>
            </div>
          `;
        }
      });
      html += '</div>';

      tooltip.innerHTML = html;
      tooltip.style.display = 'block';

      const ttLeft = (snapX / chartWidth) * rect.width;
      const ttTop = e.clientY - rect.top;
      tooltip.style.left = `${Math.min(rect.width - 180, Math.max(10, ttLeft + 12))}px`;
      tooltip.style.top = `${Math.max(10, ttTop - 40)}px`;
    });

    svg.addEventListener('mouseleave', () => {
      crosshair.style.display = 'none';
      tooltip.style.display = 'none';
    });

    container.appendChild(chartWrapper);

    // Append Legend below chart
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    seriesList.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'chart-legend-item';
      item.innerHTML = `
        <span class="legend-swatch" style="background:${s.color};"></span>
        <span class="legend-text">${s.name}</span>
      `;
      legend.appendChild(item);
    });
    container.appendChild(legend);
  }

  /**
   * Render a horizontal segmented share bar (e.g. DPS contribution per weapon).
   */
  public static renderShareBars(
    container: HTMLElement,
    shares: { name: string; value: number; color: string; pct: number }[]
  ): void {
    container.innerHTML = '';
    if (!shares || shares.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); font-size:12px;">Нет активного оружия</div>';
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'share-bar-container';

    // Segmented bar
    const bar = document.createElement('div');
    bar.className = 'share-bar';
    shares.forEach((s) => {
      if (s.pct <= 0) return;
      const seg = document.createElement('div');
      seg.className = 'share-bar-segment';
      seg.style.width = `${s.pct}%`;
      seg.style.background = s.color;
      seg.title = `${s.name}: ${s.pct.toFixed(1)}% (${Math.round(s.value)} DPS)`;
      bar.appendChild(seg);
    });
    wrapper.appendChild(bar);

    // Legend Breakdown
    const legendGrid = document.createElement('div');
    legendGrid.className = 'share-bar-legend';
    shares.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'share-legend-item';
      item.innerHTML = `
        <span class="legend-swatch" style="background:${s.color};"></span>
        <span class="share-name">${s.name}</span>
        <span class="share-pct">${s.pct.toFixed(1)}%</span>
        <span class="share-val">(${Math.round(s.value)} dps)</span>
      `;
      legendGrid.appendChild(item);
    });
    wrapper.appendChild(legendGrid);

    container.appendChild(wrapper);
  }
}
