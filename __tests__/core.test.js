// __tests__/core.test.js
import {
  detectRdfFormatFromFilename,
  toPascalCase,
  pickBestLiteral,
  buildElementTableModel,
  NS
} from '../docs/app/core.js';

import { Store, DataFactory } from 'n3';

const { namedNode, literal, quad } = DataFactory;

describe('detectRdfFormatFromFilename', () => {
  test('detects ttl as text/turtle', () => {
    expect(detectRdfFormatFromFilename('example.ttl')).toBe('text/turtle');
  });

  test('detects nt as application/n-triples', () => {
    expect(detectRdfFormatFromFilename('data.nt')).toBe('application/n-triples');
  });
});

describe('toPascalCase', () => {
  test('converts simple phrase', () => {
    expect(toPascalCase('example ontology name')).toBe('ExampleOntologyName');
  });

  test('handles null gracefully', () => {
    expect(toPascalCase(null)).toBe('Ontology');
  });
});

describe('pickBestLiteral', () => {
  test('prefers english literal', () => {
    const store = new Store(); // just for type
    const enLit = literal('English', 'en');
    const frLit = literal('French', 'fr');
    const result = pickBestLiteral([frLit, enLit]);
    expect(result.value).toBe('English');
  });

  test('prefers no-lang if no en', () => {
    const lit1 = literal('Plain');
    const lit2 = literal('Deutsch', 'de');
    const result = pickBestLiteral([lit2, lit1]);
    expect(result.value).toBe('Plain');
  });
});

describe('buildElementTableModel', () => {
  test('builds basic model with rdf:type and label', () => {
    const store = new Store();

    const cls = namedNode('http://example.org/ClassA');
    store.addQuad(quad(cls, namedNode(NS.rdf + 'type'), namedNode(NS.owl + 'Class')));
    store.addQuad(quad(cls, namedNode(NS.rdfs + 'label'), literal('Class A', 'en')));

    const model = buildElementTableModel(store);

    expect(model.headers[0]).toBe('iri');
    expect(model.headers).toContain('rdf:type');
    expect(model.headers).toContain('rdfs:label');
    expect(model.rows.length).toBe(1);
    const row = model.rows[0];
    expect(row.iri).toBe(cls.value);
    expect(row[NS.rdfs + 'label']).toBe('Class A');
  });
});
