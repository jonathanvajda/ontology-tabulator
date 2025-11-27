// app/core.js
// Core ontology logic – ES modules, “mostly pure”, with logging & error handling.

/* eslint-disable no-console */

/**
 * Simple event logger for core functions.
 * @param {string} fnName
 * @param {string} message
 * @param {object} [data]
 */
export function logEvent(fnName, message, data) {
  console.info(`[${fnName}] ${message}`, data ?? '');
}

/**
 * Error logger for core functions.
 * @param {string} fnName
 * @param {Error} error
 * @param {object} [context]
 */
export function logError(fnName, error, context) {
  console.error(`[${fnName}] ERROR: ${error.message}`, { error, context });
}

/**
 * Guess RDF format from filename extension for N3 parser.
 * @param {string} filename
 * @returns {'text/turtle'|'application/n-triples'|'application/n-quads'|'application/trig'}
 */
export function detectRdfFormatFromFilename(filename) {
  const fnName = 'detectRdfFormatFromFilename';
  logEvent(fnName, 'start', { filename });

  try {
    const lower = (filename || '').toLowerCase();
    if (lower.endsWith('.ttl') || lower.endsWith('.n3')) {
      return 'text/turtle';
    }
    if (lower.endsWith('.nt')) {
      return 'application/n-triples';
    }
    if (lower.endsWith('.nq')) {
      return 'application/n-quads';
    }
    if (lower.endsWith('.trig')) {
      return 'application/trig';
    }
    // Fallback: Turtle
    return 'text/turtle';
  } catch (err) {
    logError(fnName, err, { filename });
    throw err;
  }
}

/**
 * Check if a term from N3 is a blank node.
 * @param {import('n3').Term} term
 * @returns {boolean}
 */
export function isBlankNode(term) {
  const fnName = 'isBlankNode';
  logEvent(fnName, 'start', { termType: term?.termType, value: term?.value });

  try {
    return !!term && term.termType === 'BlankNode';
  } catch (err) {
    logError(fnName, err, { term });
    throw err;
  }
}

/**
 * Parse RDF text into an N3 Store.
 * NOTE: In browser we get N3 from window.N3; in Jest we use node 'n3' dependency.
 * @param {string} text
 * @param {string} format
 * @returns {Promise<import('n3').Store>}
 */
export async function parseRdfTextToStore(text, format) {
  const fnName = 'parseRdfTextToStore';
  logEvent(fnName, 'start', { format });

  try {
    const N3lib = typeof window !== 'undefined' && window.N3
      ? window.N3
      : await import('n3'); // node / Jest

    const { Parser, Store } = N3lib;
    const parser = new Parser({ format });
    const store = new Store();

    const quads = parser.parse(text);
    store.addQuads(quads);

    logEvent(fnName, 'parsed', { quadCount: quads.length });
    return store;
  } catch (err) {
    logError(fnName, err, { format });
    throw err;
  }
}

// Namespace constants
export const NS = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
  skos: 'http://www.w3.org/2004/02/skos/core#'
};

export const COMMON_PREFIXES = {
  [NS.rdf]: 'rdf',
  [NS.rdfs]: 'rdfs',
  [NS.owl]: 'owl',
  [NS.dc]: 'dc',
  [NS.dcterms]: 'dcterms',
  [NS.skos]: 'skos'
};

/**
 * Pick the ontology subject (IRI) from a store.
 * Strategy: any subject with rdf:type owl:Ontology.
 * @param {import('n3').Store} store
 * @returns {string|null} ontologyIri
 */
export function getOntologySubjectIri(store) {
  const fnName = 'getOntologySubjectIri';
  logEvent(fnName, 'start');

  try {
    const candidates = store.getQuads(
      null,
      store.createNamedNode(NS.rdf + 'type'),
      store.createNamedNode(NS.owl + 'Ontology'),
      null
    );

    if (candidates.length === 0) {
      logEvent(fnName, 'no ontology subject found');
      return null;
    }

    const iri = candidates[0].subject.value;
    logEvent(fnName, 'ontology subject found', { iri });
    return iri;
  } catch (err) {
    logError(fnName, err);
    throw err;
  }
}

/**
 * Pick best literal from a list of literals, preferring 'en' then no language, then others.
 * @param {import('n3').Literal[]} literals
 * @returns {import('n3').Literal|null}
 */
export function pickBestLiteral(literals) {
  const fnName = 'pickBestLiteral';
  logEvent(fnName, 'start', { count: literals?.length ?? 0 });

  try {
    if (!literals || literals.length === 0) return null;

    const withLang = literals.filter(l => l.language);
    const en = withLang.find(l => l.language.toLowerCase() === 'en');
    if (en) return en;

    const noLang = literals.find(l => !l.language);
    if (noLang) return noLang;

    return literals[0];
  } catch (err) {
    logError(fnName, err);
    throw err;
  }
}

/**
 * Helper: get single preferred literal value for subject & predicate.
 * @param {import('n3').Store} store
 * @param {string} subjectIri
 * @param {string[]} predicateIris ordered by preference
 * @returns {string|null}
 */
export function getPreferredLiteralForPredicates(store, subjectIri, predicateIris) {
  const fnName = 'getPreferredLiteralForPredicates';
  logEvent(fnName, 'start', { subjectIri });

  try {
    const subj = store.createNamedNode(subjectIri);

    for (const p of predicateIris) {
      const pred = store.createNamedNode(p);
      const quads = store.getQuads(subj, pred, null, null);
      const literals = quads
        .map(q => q.object)
        .filter(o => o.termType === 'Literal');
      const best = pickBestLiteral(literals);
      if (best) return best.value;
    }

    return null;
  } catch (err) {
    logError(fnName, err, { subjectIri, predicateIris });
    throw err;
  }
}

/**
 * Helper: get preferred IRI/URI object for predicates (e.g. versionIRI, license).
 * @param {import('n3').Store} store
 * @param {string} subjectIri
 * @param {string[]} predicateIris
 * @returns {string|null}
 */
export function getPreferredIriForPredicates(store, subjectIri, predicateIris) {
  const fnName = 'getPreferredIriForPredicates';
  logEvent(fnName, 'start', { subjectIri });

  try {
    const subj = store.createNamedNode(subjectIri);

    for (const p of predicateIris) {
      const pred = store.createNamedNode(p);
      const quads = store.getQuads(subj, pred, null, null);
      const iriObj = quads
        .map(q => q.object)
        .find(o => o.termType === 'NamedNode');
      if (iriObj) return iriObj.value;
    }

    return null;
  } catch (err) {
    logError(fnName, err, { subjectIri, predicateIris });
    throw err;
  }
}

/**
 * Extract ontology-level metadata according to your preference rules.
 * @param {import('n3').Store} store
 * @returns {{
 *   ontologyIri: string|null,
 *   ontologyName: string|null,
 *   versionIri: string|null,
 *   versionInfo: string|null,
 *   description: string|null,
 *   license: string|null,
 *   rightsHolder: string|null
 * }}
 */
export function extractOntologyMetadata(store) {
  const fnName = 'extractOntologyMetadata';
  logEvent(fnName, 'start');

  try {
    const ontologyIri = getOntologySubjectIri(store);
    if (!ontologyIri) {
      return {
        ontologyIri: null,
        ontologyName: null,
        versionIri: null,
        versionInfo: null,
        description: null,
        license: null,
        rightsHolder: null
      };
    }

    const S = ontologyIri;
    const meta = {
      ontologyIri: S,
      ontologyName: getPreferredLiteralForPredicates(store, S, [
        NS.rdfs + 'label',
        NS.dcterms + 'title',
        NS.dc + 'title'
      ]),
      versionIri: getPreferredIriForPredicates(store, S, [
        NS.owl + 'versionIRI',
        NS.dcterms + 'hasVersion'
      ]),
      versionInfo: getPreferredLiteralForPredicates(store, S, [
        NS.owl + 'versionInfo',
        NS.dcterms + 'hasVersion'
      ]),
      description: getPreferredLiteralForPredicates(store, S, [
        NS.skos + 'definition',
        NS.dcterms + 'description',
        NS.dc + 'description'
      ]),
      license: getPreferredIriForPredicates(store, S, [
        NS.dcterms + 'license',
        NS.dcterms + 'rights',
        NS.dc + 'rights',
        NS.dcterms + 'accessRights'
      ]),
      rightsHolder: getPreferredLiteralForPredicates(store, S, [
        NS.dcterms + 'rightsHolder'
      ])
    };

    logEvent(fnName, 'metadata extracted', meta);
    return meta;
  } catch (err) {
    logError(fnName, err);
    throw err;
  }
}

/**
 * Decide if a subject should be included as an "ontology element".
 * We include owl:Class, owl:NamedIndividual, owl:ObjectProperty, owl:DatatypeProperty, owl:AnnotationProperty.
 * Skip blank nodes.
 * @param {import('n3').Store} store
 * @param {import('n3').Term} subject
 * @returns {boolean}
 */
export function shouldIncludeElementSubject(store, subject) {
  const fnName = 'shouldIncludeElementSubject';
  logEvent(fnName, 'start', { subject: subject?.value });

  try {
    if (!subject || subject.termType !== 'NamedNode') return false;

    const typePred = store.createNamedNode(NS.rdf + 'type');
    const types = store.getQuads(subject, typePred, null, null).map(q => q.object.value);

    const interestingTypes = [
      NS.owl + 'Class',
      NS.owl + 'NamedIndividual',
      NS.owl + 'ObjectProperty',
      NS.owl + 'DatatypeProperty',
      NS.owl + 'AnnotationProperty'
    ];

    const include = types.some(t => interestingTypes.includes(t));
    return include;
  } catch (err) {
    logError(fnName, err, { subject });
    throw err;
  }
}

/**
 * Shorten IRI to CURIE using COMMON_PREFIXES if possible.
 * @param {string} iri
 * @returns {string}
 */
export function iriToCurieIfCommon(iri) {
  const fnName = 'iriToCurieIfCommon';
  logEvent(fnName, 'start', { iri });

  try {
    for (const [ns, prefix] of Object.entries(COMMON_PREFIXES)) {
      if (iri.startsWith(ns)) {
        return `${prefix}:${iri.slice(ns.length)}`;
      }
    }
    return iri;
  } catch (err) {
    logError(fnName, err, { iri });
    throw err;
  }
}

/**
 * Convert a free-text name to PascalCase.
 * Used for generating CSV/print filenames.
 * @param {string|null} name
 * @returns {string}
 */
export function toPascalCase(name) {
  const fnName = 'toPascalCase';
  logEvent(fnName, 'start', { name });

  try {
    if (!name) return 'Ontology';
    const parts = String(name)
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/);

    if (parts.length === 0) return 'Ontology';
    return parts
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join('');
  } catch (err) {
    logError(fnName, err, { name });
    throw err;
  }
}

/**
 * Build a columns + rows table model for ontology elements.
 * - First column is 'iri'
 * - Then rdf:type, rdfs:label, skos:altLabel, skos:definition (if present)
 * - Remaining predicates sorted alphabetically by CURIE/IRI
 * - Only include predicates that have at least one non-empty value
 *
 * @param {import('n3').Store} store
 * @returns {{
 *   headers: string[],   // header labels (CURIE or IRI)
 *   predicates: string[],// predicate IRIs aligned with headers (headers[0] is 'iri' with null)
 *   rows: Array<Record<string, string>> // values as string (join multi-values with '; ')
 * }}
 */
export function buildElementTableModel(store) {
  const fnName = 'buildElementTableModel';
  logEvent(fnName, 'start');

  try {
    const rdfType = NS.rdf + 'type';
    const priorityPreds = [
      rdfType,
      NS.rdfs + 'label',
      NS.skos + 'altLabel',
      NS.skos + 'definition'
    ];

    const allQuads = store.getQuads(null, null, null, null);
    const subjectMap = new Map(); // subject IRI -> Map<pred IRI, string[]>

    for (const q of allQuads) {
      if (isBlankNode(q.subject)) continue;
      if (isBlankNode(q.object)) continue; // skip blank-node objects per your preference

      const subjIri = q.subject.value;
      const predIri = q.predicate.value;

      let predMap = subjectMap.get(subjIri);
      if (!predMap) {
        predMap = new Map();
        subjectMap.set(subjIri, predMap);
      }

      const obj = q.object;
      let value;

      if (obj.termType === 'Literal') {
        value = obj.value;
      } else if (obj.termType === 'NamedNode') {
        value = obj.value;
      } else {
        continue;
      }

      let arr = predMap.get(predIri);
      if (!arr) {
        arr = [];
        predMap.set(predIri, arr);
      }
      if (!arr.includes(value)) {
        arr.push(value);
      }
    }

    // Filter subjects to ontology elements
    const elementSubjects = Array.from(subjectMap.keys())
      .map(iri => store.createNamedNode(iri))
      .filter(subj => shouldIncludeElementSubject(store, subj));

    // Collect used predicates (excluding none)
    const usedPredsSet = new Set();
    for (const subj of elementSubjects) {
      const predMap = subjectMap.get(subj.value);
      if (!predMap) continue;
      for (const predIri of predMap.keys()) {
        usedPredsSet.add(predIri);
      }
    }

    // Remove predicates that have no values for any included subject
    const usedPreds = Array.from(usedPredsSet);

    // Build predicate order: priority, then the rest
    const nonPriority = usedPreds.filter(p => !priorityPreds.includes(p));
    nonPriority.sort((a, b) => iriToCurieIfCommon(a).localeCompare(iriToCurieIfCommon(b)));

    const orderedPredicates = [...priorityPreds.filter(p => usedPredsSet.has(p)), ...nonPriority];

    // Build headers (first column is IRI)
    const headers = ['iri', ...orderedPredicates.map(iriToCurieIfCommon)];
    const predicatesAligned = [null, ...orderedPredicates];

    const rows = elementSubjects.map(subj => {
      const predMap = subjectMap.get(subj.value) || new Map();
      const row = {};
      row['iri'] = subj.value;

      for (const p of orderedPredicates) {
        const values = predMap.get(p) || [];
        row[p] = values.join('; ');
      }
      return row;
    });

    logEvent(fnName, 'built', {
      rowCount: rows.length,
      columnCount: headers.length
    });

    return {
      headers,
      predicates: predicatesAligned,
      rows
    };
  } catch (err) {
    logError(fnName, err);
    throw err;
  }
}

/**
 * Simple in-memory filter & sort for the table model.
 * @param {{
 *   headers: string[],
 *   predicates: (string|null)[],
 *   rows: Array<Record<string, string>>
 * }} model
 * @param {string} query global text filter (case-insensitive)
 * @param {number|null} sortIndex column index for sort (0-based), null for none
 * @param {'asc'|'desc'} sortDirection
 * @returns {Array<Record<string, string>>}
 */
export function filterAndSortRows(model, query, sortIndex, sortDirection = 'asc') {
  const fnName = 'filterAndSortRows';
  logEvent(fnName, 'start', { query, sortIndex, sortDirection });

  try {
    const q = (query || '').toLowerCase();

    let filtered = model.rows;
    if (q) {
      filtered = filtered.filter(row => {
        return Object.values(row).some(v => String(v).toLowerCase().includes(q));
      });
    }

    if (sortIndex == null || sortIndex < 0 || sortIndex >= model.headers.length) {
      return filtered;
    }

    const headerKey = sortIndex === 0 ? 'iri' : model.predicates[sortIndex];
    if (!headerKey) return filtered;

    const sorted = [...filtered].sort((a, b) => {
      const va = String(a[headerKey] ?? '');
      const vb = String(b[headerKey] ?? '');
      const cmp = va.localeCompare(vb);
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return sorted;
  } catch (err) {
    logError(fnName, err, { query, sortIndex, sortDirection });
    throw err;
  }
}
