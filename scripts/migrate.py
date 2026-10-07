"""One-time, non-executing import of the supplied Nunjucks content literals."""
import argparse
import hashlib
import html
import json
import re
from pathlib import Path
from collections import Counter
from urllib.parse import urlsplit

MEDIA = 'https://bioinfocore.usu.edu/raikou'

class LiteralParser:
    def __init__(self, source, context):
        self.source, self.context, self.i = source, context, 0

    def space(self):
        while self.i < len(self.source) and self.source[self.i].isspace(): self.i += 1

    def string(self):
        quote = self.source[self.i]; self.i += 1; out = []
        while self.i < len(self.source):
            c = self.source[self.i]; self.i += 1
            if c == quote: return ''.join(out)
            if c == '\\':
                c = self.source[self.i]; self.i += 1
                c = {'n':'\n','r':'\r','t':'\t'}.get(c,c)
            out.append(c)
        raise ValueError('Unterminated string')

    def value(self):
        self.space()
        if self.i >= len(self.source): raise ValueError('Missing value')
        c = self.source[self.i]
        if c in "\"'": return self.string()
        if c in '[{':
            self.i += 1; result = [] if c == '[' else {}; end = ']' if c == '[' else '}'
            while True:
                self.space()
                if self.source[self.i] == end: self.i += 1; return result
                if c == '{':
                    if self.source[self.i] in "\"'": key = self.string()
                    else:
                        m = re.match(r'[\w-]+', self.source[self.i:])
                        if not m: raise ValueError('Invalid property near '+self.source[self.i:self.i+80])
                        key = m[0]; self.i += len(key)
                    self.space()
                    if self.source[self.i] != ':': raise ValueError('Expected colon')
                    self.i += 1; result[key] = self.value()
                else: result.append(self.value())
                self.space()
                if self.source[self.i] == ',': self.i += 1
                elif self.source[self.i] != end: raise ValueError('Expected comma near '+self.source[self.i:self.i+80])
        m = re.match(r'[\w.-]+',self.source[self.i:])
        if not m: raise ValueError('Invalid token near '+self.source[self.i:self.i+80])
        token=m[0]; self.i += len(token)
        if token in self.context: return self.context[token]
        if token in ['true','false','null','none']: return {'true':True,'false':False,'null':None,'none':None}[token]
        if re.fullmatch(r'-?\d+(\.\d+)?',token): return float(token) if '.' in token else int(token)
        raise ValueError('Unresolved reference '+token)


def parse_literal(source, context=None):
    parser = LiteralParser(source,context or {})
    result = parser.value(); parser.space()
    if parser.i != len(source): raise ValueError('Unparsed literal suffix '+source[parser.i:parser.i+80])
    return result


def read_sets(path, report=None):
    source = path.read_text()
    # This exact missing quote is present in the supplied archive. Record the repair.
    broken = "doiTitle:10.1007/s00425-024-04399-x'"
    if broken in source:
        source=source.replace(broken,"doiTitle:'10.1007/s00425-024-04399-x'")
        if report is not None: report['repairs'].append({'file':str(path.name),'reason':'Restored missing opening quote in DOI 10.1007/s00425-024-04399-x; content unchanged.'})
    source = re.sub(r'{#.*?#}', '', source, flags=re.S)
    context = {}
    for match in re.finditer(r'{%\s*set\s+(\w+)\s*=\s*(.*?)\s*%}', source, re.S):
        key, literal = match.groups()
        try: context[key] = parse_literal(literal, context)
        except Exception as e:
            if report is None: raise
            report['parseErrors'].append({'file':str(path),'key':key,'error':str(e)})
    return context


def text(value):
    return html.unescape(re.sub(r'<[^>]*>','',str(value))).strip()


def media_url(value):
    value = str(value or '').strip()
    if value.startswith('/image/'): return MEDIA+value
    if value.startswith('http://bioinfocore.usu.edu/'): return 'https://'+value[7:]
    return value


def body_for(path, views, depth=0):
    if not path.exists() or depth > 8: return ''
    source = path.read_text()
    source = re.sub(r'<!--.*?-->', '', source, flags=re.S)
    source = re.sub(r'{#.*?#}', '', source, flags=re.S)
    source = re.sub(r'<script\b[^>]*>.*?</script>', '', source, flags=re.S|re.I)
    source = re.sub(r'<style\b[^>]*>.*?</style>', '', source, flags=re.S|re.I)
    def inc(m):
        name = m[1]
        if name.startswith(('universal/','components/')) or any(x in name for x in ['template','_contact-form','video-modal']): return ''
        target = (path.parent/name).resolve() if name.startswith('.') else (views/name).resolve()
        if not target.is_relative_to(views.resolve()): return ''
        return body_for(target,views,depth+1)
    source = re.sub(r'{%\s*include\s+[\'"]([^\'"]+)[\'"]\s*%}',inc,source)
    block = re.search(r'{%\s*block content\s*%}(.*?){%\s*endblock\s*%}',source,re.S)
    if block: source=block[1]
    elif '<body' in source:
        source=re.split(r'<body[^>]*>',source,maxsplit=1)[-1].split('</body>')[0]
    source = re.sub(r'{{\s*RaikouServer\s*}}',MEDIA,source)
    source = re.sub(r'{%.*?%}|{{.*?}}','',source,flags=re.S)
    source = source.replace('http://bioinfocore.usu.edu/','https://bioinfocore.usu.edu/')
    return source.strip()


def migrate(root):
    views=root/'src/views'; pages=views/'pages'
    report={'parseErrors':[],'repairs':[],'conflicts':[],'emptyBodies':[],'collections':{},'sourceFiles':[],'unassignedRecords':[],'emptyPlaceholders':[]}
    records=[]
    def add(collection,key,original,**fields):
        record={'id':f'{collection}:{key}','collection':collection,'title':text(original.get('title',original.get('name',original.get('content',original.get('desc',key))))),
          'status':'published','slug':key,'summary':text(original.get('desc',original.get('subtitle',''))),
          'body':original.get('bio',''),'date':str(original.get('date',original.get('year',''))),'year':str(original.get('year','')),
          'image':media_url(original.get('img','')),'imageAlt':original.get('alt_text',''),
          'link':str(original.get('link',original.get('doiLink',''))).strip(),'category':'','source':'','original':original}
        record.update(fields); records.append(record); return record
    tooldata=read_sets(pages/'tools/_tool-data.njk',report)
    groups={'hpi':('Host-Pathogen Interactions','hpi'),'clpt':('Subcellular Localization Prediction','cellularloc'),'dbs':('Databases','db'),'metagenomics':('Metagenomics','metagenomics'),'ngsPackages':('NGS Packages','ngsPack'),'rgenes':('Functional Annotation','rgenes'),'descriptors':('Descriptors','descriptors'),'bioenergy':('Bioenergy','bionrg'),'disease':('Disease Forecasting','disease')}
    for key,value in tooldata.items():
        if not isinstance(value,dict) or key=='template' or not value.get('title'): continue
        categories=[info for group,info in groups.items() if value in tooldata.get(group,[])]
        label,anchor=categories[0] if categories else ('Other tools','other')
        add('tools',key,value,category=label,anchor=anchor,source='pages/tools/_tool-data.njk')
    for collection,filename,categories in [
      ('news','news/data.njk',{'general':'General','science':'Science','media':'Media'}),
      ('events','events/data.njk',{}),
      ('people','people/people-data.njk',{'bioinfoStaff':'Bioinformatics Staff','gradStudents':'Graduate','undergradStudents':'Undergraduate','alumni':'Alumni'}),
      ('research','research/research-areas/articles.njk',{})]:
        data=read_sets(pages/filename,report)
        for key,value in data.items():
            if not isinstance(value,dict) or key=='template' or not (value.get('title') or value.get('name')):continue
            memberships=[label for group,label in categories.items() if value in data.get(group,[])]
            category=' / '.join(memberships) or value.get('type',collection.title())
            route=''
            if collection=='people':route='/people/'+key
            elif value.get('link','').startswith('/'+collection+'/'):route=value['link'].rstrip('/')
            elif collection in ['news','events']:route='/'+collection+'/'+key
            else:route=value.get('link','')
            record=add(collection,key,value,route=route,category=category,source='pages/'+filename,memberships=memberships)
            if collection=='people': record.update(email=value.get('email',''),social=value.get('social',[]))
            if collection in ['events','research','news']:
                folder=pages/route.strip('/')
                # route begins with collection, but pages already is that parent.
                content=folder/'content.njk'
                record['body']=body_for(content,views)
                record['sourceBody']=str(content.relative_to(views)) if content.exists() else ''
                if not record['body'] and collection=='research':report['emptyBodies'].append(route)
                template=folder/(folder.name+'.njk')
                if collection=='events' and template.exists():
                    details=read_sets(template,report).get('event',{})
                    record['gallery']=[media_url(x) for x in details.get('media',[])]
                    record['detailOriginal']=details
                    for field in ['date','location']:
                        if details.get(field) and value.get(field) and details[field]!=value[field]:
                            report['conflicts'].append({'route':route,'field':field,'listing':value[field],'detail':details[field]})
                    record['location']=value.get('location',details.get('location',''))
    pubfiles=[pages/'publications/_data.njk',pages/'publications/subpages/_edit-data.njk']+sorted((pages/'publications/subpages/dates').glob('*.njk'))
    for file in pubfiles:
        data=read_sets(file,report)
        category='Editorials' if '_edit-data' in file.name else ('Conferences' if 'dates' in file.parts else 'Papers')
        for key,value in data.items():
            if not isinstance(value,list):continue
            for i,item in enumerate(value):
                if not isinstance(item,dict):continue
                if not any(item.get(x) for x in ['content','desc','authors','location']):
                    report['emptyPlaceholders'].append({'file':str(file.relative_to(views)),'key':key,'original':item});continue
                slug=f'{file.stem.strip("_")}-{key}-{i+1}'
                year=item.get('year',re.sub(r'\D','',key))
                add('publications',slug,item,category=category,year=str(year),date=str(item.get('date',year)),authors=item.get('authors',''),body=item.get('content',item.get('desc','')),location=item.get('location',''),presentationType=item.get('type',''),source=str(file.relative_to(views)))
    # Keep every standalone article, including entries omitted from listing arrays.
    for collection in ['news','events','research']:
        for content in sorted((pages/collection).glob('*/content.njk')):
            route='/'+str(content.parent.relative_to(pages))
            if any(r.get('route')==route for r in records):continue
            pagefile=next((f for f in content.parent.glob('*.njk') if f.name!='content.njk'),None)
            title=content.parent.name
            if pagefile:
                match=re.search(r'(?:eventPage|newNewsPage|newsPage|researchPage)\([\'"]([^\'"]+)',pagefile.read_text())
                if match:title=match[1]
            body=body_for(content,views)
            if not body and title==content.parent.name:continue
            rec=add(collection,content.parent.name,{},title=title,body=body,route=route,source=str(content.relative_to(views)),category='Archive')
            if pagefile and collection=='events':
                details=read_sets(pagefile,report).get('event',{})
                rec.update(date=details.get('date',''),location=details.get('location',''),image=media_url(details.get('img','')),gallery=[media_url(x) for x in details.get('media',[])],detailOriginal=details)
            report['unassignedRecords'].append(route)
    # Full original home/research/contact/PI text remains reachable in the new presentation.
    for slug,title,file in [
      ('home','Welcome to the KAABiL group','home/home.njk'),('research','Research at KAABiL','research/research.njk'),
      ('contact','Connect with KAABiL','contact/contact.njk'),('rakesh','Dr. Rakesh Kaundal','people/rakesh/rakesh.njk')]:
        add('pages',slug,{},title=title,body=body_for(pages/file,views),route={'home':'/about','rakesh':'/people/rakesh'}.get(slug,'/'+slug),source='pages/'+file)
    # Retain the historical carousel narrative separately from new homepage layout.
    records.append({'id':'pages:history','collection':'pages','slug':'history','title':'Research and lab overview','status':'published','route':'/about/overview','body':body_for(pages/'home/_head-carousel.njk',views),'source':'pages/home/_head-carousel.njk','original':{}})
    # Site administration documentation is preserved as content, never used as a login endpoint.
    for file in sorted((pages/'admin').glob('*/*.njk')):
        add('pages','guide-'+file.stem,{},title=file.stem.replace('-',' ').title(),body=body_for(file,views),route='/guides/'+file.stem,source=str(file.relative_to(views)))
    # Preserve images in source markup and metadata in a manifest for the later asset transfer.
    assets=set()
    for file in sorted(root.rglob('*')):
        if not file.is_file():continue
        report['sourceFiles'].append({'path':str(file.relative_to(root)),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size})
        if file.suffix=='.njk':
            for match in re.finditer(r'(?:https?://bioinfocore\.usu\.edu/raikou)?/image/[^\s\'"<>}]+',file.read_text()): assets.add(media_url(match[0]))
    for record in records:
        if record.get('image'):assets.add(record['image'])
        if not record.get('summary') and record['collection']=='research':record['summary']=record['original'].get('subtitle','')
    report['collections']=dict(Counter(r['collection'] for r in records))
    report['totalRecords']=len(records)
    report['toolDestinations']={r['id']:r['link'] for r in records if r['collection']=='tools'}
    report['assetReferences']=sorted(assets)
    return {'schemaVersion':1,'records':records,'report':report}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);args=parser.parse_args()
    result=migrate(args.source)
    out=Path(__file__).resolve().parents[1]
    (out/'content/seed.json').write_text(json.dumps({'schemaVersion':1,'records':result['records']},indent=2,ensure_ascii=False)+'\n')
    (out/'docs/migration-report.json').write_text(json.dumps(result['report'],indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({k:v for k,v in result['report'].items() if k not in ['sourceFiles','assetReferences','toolDestinations']},indent=2))
    if result['report']['parseErrors']:raise SystemExit(1)
