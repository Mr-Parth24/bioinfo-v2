"""Representative accessibility, keyboard, motion and visual checks.
Install axe-core in a QA directory and pass its axe.min.js path as argument.
"""
import os,sys,json,time,subprocess,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];axe=Path(sys.argv[1]).read_text();env=dict(os.environ,PORT='3012',HOST='127.0.0.1',APP_ORIGIN='http://localhost:3012')
server=subprocess.Popen(['node','src/server.mjs'],cwd=root,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE);report=[]
try:
 for _ in range(40):
  try:urllib.request.urlopen('http://localhost:3012/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce');page.route('**/assets/axe.js',lambda route:route.fulfill(body=axe,content_type='text/javascript'))
  for route in ['/','/research','/people/rakesh','/tools','/publications','/news','/events','/contact','/opportunities']:
   page.goto('http://localhost:3012'+route,wait_until='networkidle');page.add_script_tag(url='http://localhost:3012/assets/axe.js');result=page.evaluate('async()=>await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})');report.append({'route':route,'violations':[{'id':v['id'],'impact':v['impact'],'nodes':[{'target':n['target'],'failure':n['failureSummary']} for n in v['nodes']]} for v in result['violations']]})
   if route in ['/','/people/rakesh','/research']:page.screenshot(path=str(root/'artifacts'/('revised-'+('home' if route=='/' else route.strip('/').replace('/','-'))+'-desktop.png')),full_page=True)
  page.goto('http://localhost:3012/people/rakesh',wait_until='networkidle');page.locator('.nav-dropdown summary').first.focus();page.keyboard.press('Enter');assert page.locator('.nav-dropdown').first.get_attribute('open') is not None;page.keyboard.press('Escape');assert page.locator('.nav-dropdown').first.get_attribute('open') is None
  image=page.locator('.director-portrait .image-expand');image.focus();page.keyboard.press('Enter');assert page.locator('.image-dialog').is_visible();page.keyboard.press('Escape');assert image.evaluate('(e)=>document.activeElement===e')
  for width in [768,390]:
   page.set_viewport_size({'width':width,'height':844});page.goto('http://localhost:3012/',wait_until='networkidle');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1');page.screenshot(path=str(root/'artifacts'/f'revised-home-{width}.png'),full_page=True)
  nojs=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844});plain=nojs.new_page();plain.goto('http://localhost:3012/people/rakesh');assert plain.get_by_role('heading',name='Education',exact=True).is_visible();assert plain.locator('.image-expand').first.get_attribute('href');nojs.close();browser.close()
finally:
 server.terminate();server.wait(timeout=10)
(root/'artifacts/accessibility-report.json').write_text(json.dumps(report,indent=2));print(json.dumps({'pages':len(report),'violations':[(r['route'],[v['id'] for v in r['violations']]) for r in report if r['violations']]}))
