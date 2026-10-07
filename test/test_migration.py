import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('migration', ROOT / 'scripts/migrate.py')

class MigrationTests(unittest.TestCase):
    def module(self):
        self.assertTrue((ROOT / 'scripts/migrate.py').exists(), 'Migration implementation is required')
        m = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(m)
        return m

    def test_literal_parser_preserves_multiline_text_and_references(self):
        m = self.module()
        obj = m.parse_literal('{title: "A\nB", link: "https://example.org/A/", values: [prior]}', {'prior': {'name': 'Existing'}})
        self.assertEqual(obj['title'], 'A\nB')
        self.assertEqual(obj['values'][0]['name'], 'Existing')

    def test_import_preserves_every_named_tool_destination(self):
        m = self.module()
        data = m.migrate(ROOT.parent / 'bioinfo-source/bioinfo-master')
        tools = [r for r in data['records'] if r['collection'] == 'tools']
        self.assertGreater(len(tools), 30)
        by_id = {r['id'].split(':')[-1]: r for r in tools}
        source = m.read_sets(ROOT.parent / 'bioinfo-source/bioinfo-master/src/views/pages/tools/_tool-data.njk')
        expected = {k:v for k,v in source.items() if isinstance(v,dict) and v.get('title') and k != 'template'}
        self.assertEqual(set(by_id), set(expected))
        for key, original in expected.items():
            self.assertEqual(by_id[key]['link'], original['link'].strip())
            self.assertEqual(by_id[key]['original'], original)

    def test_publications_and_article_bodies_are_not_lost(self):
        m = self.module()
        data = m.migrate(ROOT.parent / 'bioinfo-source/bioinfo-master')
        records = data['records']
        self.assertGreater(len([r for r in records if r['collection']=='publications']), 45)
        self.assertTrue(any('04399' in r.get('link','') for r in records))
        self.assertTrue(any(r.get('route')=='/events/pscShowcase26' and 'Three researchers' in r.get('body','') for r in records))
        self.assertEqual(len({r['id'] for r in records}), len(records))
        self.assertFalse(data['report']['parseErrors'])

if __name__ == '__main__':
    unittest.main()
