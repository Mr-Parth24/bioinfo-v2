"""Reconcile the migration with the supplied source and audit static local links."""
import importlib.util,json,re
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('migration',root/'scripts/migrate.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
source=root.parent/'bioinfo-source/bioinfo-master'
fresh=m.migrate(source);saved=json.loads((root/'content/seed.json').read_text())
assert fresh['records']==saved['records'],'Seed differs from a fresh source migration'
assert not fresh['report']['parseErrors']
checks={}
for collection,file in [('tools','tools/_tool-data.njk'),('people','people/people-data.njk'),('news','news/data.njk'),('events','events/data.njk'),('research','research/research-areas/articles.njk')]:
 data=m.read_sets(source/'src/views/pages'/file)
 originals={k:v for k,v in data.items() if isinstance(v,dict) and k!='template' and (v.get('name') or v.get('title'))}
 imported={r['id'].split(':',1)[1]:r for r in saved['records'] if r['collection']==collection}
 for key,value in originals.items():assert imported[key]['original']==value,(collection,key)
 checks[collection]=len(originals)
class HTML(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.links=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  if tag=='a' and 'href' in a:self.links.append(a['href'])
preview=root/'preview';pages={}
for file in preview.rglob('*.html'):
 parser=HTML();parser.feed(file.read_text());pages[file.resolve()]=parser
errors=[]
for file,parser in pages.items():
 for href in parser.links:
  u=urlsplit(href)
  if u.scheme or u.netloc:continue
  dest=(preview/u.path.lstrip('/')) if u.path.startswith('/') else file.parent/u.path
  if not u.path:dest=file
  if dest.is_dir():dest=dest/'index.html'
  dest=dest.resolve()
  if not dest.exists():errors.append({'page':str(file.relative_to(preview)),'href':href,'reason':'missing file'})
  elif u.fragment and dest in pages and unquote(u.fragment) not in pages[dest].ids:errors.append({'page':str(file.relative_to(preview)),'href':href,'reason':'missing anchor'})
report={'records':len(saved['records']),'originalObjectsMatched':checks,'sourceFilesChecksummed':len(fresh['report']['sourceFiles']),'publicPages':len(pages),'localLinkErrors':errors,'sourceConflicts':fresh['report']['conflicts'],'emptySourceResearchBodies':fresh['report']['emptyBodies']}
(root/'artifacts/content-audit.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ['sourceConflicts','emptySourceResearchBodies']}));assert not errors
