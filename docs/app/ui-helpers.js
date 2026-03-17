// app/ui-helpers.js
import { filterAndSortRows, toPascalCase } from './core.js';

export function showLoadingOverlay() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('ontology-tabulator-loading-hidden');
}

export function hideLoadingOverlay() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.add('ontology-tabulator-loading-hidden');
}

export function renderFileList(fileInfos) {
  const ul = document.getElementById('ontologyFileList');
  if (!ul) return;
  ul.innerHTML = '';

  fileInfos.forEach(info => {
    const li = document.createElement('li');
    li.className = 'ontology-tabulator-filelist-item';
    li.textContent = `${info.displayName} (${info.quadCount} triples)`;
    ul.appendChild(li);
  });
}

export function printTableOnly(titleText, tableElement) {
  if (!tableElement) return;

  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) return;

  const safeTitle = String(titleText || 'Ontology Table');

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${safeTitle}</title>
      <style>
        @page {
          size: landscape;
          margin: 0.5in;
        }

        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          font-size: 10pt;
          color: #000;
        }

        body {
          padding: 0.35in;
        }

        h1 {
          font-size: 14pt;
          margin: 0 0 0.2in 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        th, td {
          border: 1px solid #000;
          padding: 0.18in 0.08in;
          text-align: left;
          vertical-align: top;
          white-space: normal;
          word-break: normal;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        th {
          font-weight: 700;
          background: #f2f2f2;
        }

        thead {
          display: table-header-group;
        }

        tr, td, th {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Column tuning */
        th[data-col-key="iri"],
        td[data-col-key="iri"] {
          width: 14%;
          font-size: 9pt;
          overflow-wrap: anywhere;
        }

        th[data-col-key="type"],
        td[data-col-key="type"] {
          width: 12%;
          font-size: 9pt;
          overflow-wrap: anywhere;
        }

        th[data-col-key="label"],
        td[data-col-key="label"] {
          width: 8%;
        }

        th[data-col-key="definition"],
        td[data-col-key="definition"] {
          width: 18%;
        }

        th[data-col-key="preferredLabel"],
        td[data-col-key="preferredLabel"] {
          width: 10%;
        }

        th[data-col-key="alternativeLabel"],
        td[data-col-key="alternativeLabel"] {
          width: 10%;
        }

        th[data-col-key="acronym"],
        td[data-col-key="acronym"] {
          width: 6%;
        }

        th[data-col-key="subClassOf"],
        td[data-col-key="subClassOf"] {
          width: 10%;
          font-size: 9pt;
          overflow-wrap: anywhere;
        }

        th[data-col-key="subPropertyOf"],
        td[data-col-key="subPropertyOf"] {
          width: 10%;
          font-size: 9pt;
          overflow-wrap: anywhere;
        }

        th[data-col-key="definitionSource"],
        td[data-col-key="definitionSource"] {
          width: 18%;
        }

        th[data-col-key="isCuratedIn"],
        td[data-col-key="isCuratedIn"] {
          width: 10%;
          font-size: 9pt;
          overflow-wrap: anywhere;
        }
      </style>
    </head>
    <body>
      <h1>${safeTitle}</h1>
      ${tableElement.outerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();

  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

export function createLinkIfUri(value) {
  try {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) {
      return `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
    }
    return value;
  } catch {
    return value;
  }
}

export function renderOntologyCard(container, metadata) {
  const card = document.createElement('article');
  card.className = 'ontology-tabulator-card';

  const title = document.createElement('h3');
  title.className = 'ontology-tabulator-card-title';
  title.textContent = metadata.ontologyName || metadata.ontologyIri || 'Unnamed Ontology';
  card.appendChild(title);

  const table = document.createElement('table');
  table.className = 'ontology-tabulator-card-table';

  const fields = [
    ['Ontology Name', metadata.ontologyName],
    ['Ontology IRI', createLinkIfUri(metadata.ontologyIri)],
    ['Version IRI', createLinkIfUri(metadata.versionIri)],
    ['Version Info', metadata.versionInfo],
    ['Description', metadata.description],
    ['License', metadata.license],
    ['Copyright', metadata.rightsHolder]
  ];

  fields.forEach(([label, value]) => {
    if (!value) return;
    const tr = document.createElement('tr');

    const tdKey = document.createElement('td');
    tdKey.className = 'ontology-tabulator-card-table-cell-key';
    tdKey.textContent = `${label}:`;

    const tdVal = document.createElement('td');
    tdVal.className = 'ontology-tabulator-card-table-cell-value';
    tdVal.innerHTML = String(value);

    tr.appendChild(tdKey);
    tr.appendChild(tdVal);
    table.appendChild(tr);
  });

  card.appendChild(table);
  container.appendChild(card);
}

export function renderOntologyTable(container, ontologyMeta, tableModel) {
  const wrapper = document.createElement('section');
  wrapper.className = 'ontology-tabulator-table-wrapper';

  const headerRow = document.createElement('div');
  headerRow.className = 'ontology-tabulator-table-header-row';

  const title = document.createElement('h3');
  title.className = 'ontology-tabulator-table-title';
  title.textContent = (ontologyMeta.ontologyName || ontologyMeta.ontologyIri || 'Ontology Elements');
  headerRow.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'ontology-tabulator-table-actions';

  const filterInput = document.createElement('input');
  filterInput.type = 'search';
  filterInput.placeholder = 'Filter...';
  filterInput.className = 'ontology-tabulator-table-filter-input';

  const exportBtn = document.createElement('button');
  exportBtn.className = 'ontology-tabulator-button';
  exportBtn.textContent = 'Export CSV';

  const printBtn = document.createElement('button');
  printBtn.className = 'ontology-tabulator-button';
  printBtn.textContent = 'Print';

  actions.appendChild(filterInput);
  actions.appendChild(exportBtn);
  actions.appendChild(printBtn);
  headerRow.appendChild(actions);

  wrapper.appendChild(headerRow);

  const table = document.createElement('table');
  table.className = 'ontology-tabulator-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  tableModel.headers.forEach((h, idx) => {
    const th = document.createElement('th');
    th.className = 'ontology-tabulator-table-header-cell ontology-tabulator-table-header-cell-sortable';
    th.textContent = h;
    th.dataset.sortIndex = String(idx);
    th.dataset.colKey = tableModel.keys[idx];   // NEW
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  wrapper.appendChild(table);
  container.appendChild(wrapper);

  // state
  let sortIndex = 0;
  let sortDirection = 'asc';
  let currentQuery = '';

  function rerenderBody() {
    const rows = filterAndSortRows(tableModel, currentQuery, sortIndex, sortDirection);
    tbody.innerHTML = '';
    rows.forEach(rowModel => {
      const tr = document.createElement('tr');
      tableModel.headers.forEach((h, i) => {
        const td = document.createElement('td');
        td.className = 'ontology-tabulator-table-data-cell';

        const key = tableModel.keys[i];
        td.dataset.colKey = key;                    // NEW

        const value = key ? rowModel[key] : '';
        td.textContent = value || '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  rerenderBody();

  // events
  thead.addEventListener('click', ev => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    const idx = target.dataset.sortIndex;
    if (idx == null) return;

    const i = Number(idx);
    if (i === sortIndex) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortIndex = i;
      sortDirection = 'asc';
    }
    rerenderBody();
  });

  filterInput.addEventListener('input', ev => {
    currentQuery = ev.target.value;
    rerenderBody();
  });

  exportBtn.addEventListener('click', () => {
    const rows = filterAndSortRows(tableModel, currentQuery, sortIndex, sortDirection);
    const csv = tableModelToCsv(tableModel, rows);
    const baseName = toPascalCase(ontologyMeta.ontologyName || ontologyMeta.ontologyIri);
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    const filename = `${baseName}_${timestamp}.csv`;
    downloadCsv(filename, csv);
  });

  printBtn.addEventListener('click', () => {
    printTableOnly(
      ontologyMeta.ontologyName || ontologyMeta.ontologyIri || 'Ontology Elements',
      table
    );
  });
}

export function tableModelToCsv(model, rows) {
  const headerRow = model.headers.join(',');
  const lines = [headerRow];

  rows.forEach(row => {
    const values = model.keys.map(key => {
      const v = key ? (row[key] ?? '') : '';
      const escaped = String(v).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    lines.push(values.join(','));
  });

  return lines.join('\n');
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
