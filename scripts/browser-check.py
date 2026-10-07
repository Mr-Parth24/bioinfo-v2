"""Browser QA for the local app. Blocks remote images to exercise fallbacks."""
import json
import sys
import os
import subprocess
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
artifacts=root/'artifacts';artifacts.mkdir(exist_ok=True)
env=dict(os.environ,PORT='3003',HOST='127.0.0.1',APP_ORIGIN='http://localhost:3003')
log=(artifacts/'preview-server.log').open('w')
server=subprocess.Popen(['node','src/server.mjs'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
report={'pages':[],'errors':[]}
try:
    ready=False
    for i in range(40):
        if server.poll() is not None:raise RuntimeError('Server failed: '+(artifacts/'preview-server.log').read_text())
        try:
            with urllib.request.urlopen('http://localhost:3003/healthz',timeout=1) as response:ready=response.status==200
            if ready:break
        except Exception:time.sleep(.2)
    if not ready:raise RuntimeError('Server did not become ready')
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'],timeout=15000)
        for width,height in ([(1440,1100),(320,844)] if '--all' in sys.argv else [(1440,1100),(768,1024),(390,844)]):
            page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce')
            page.route('https://**/*',lambda route:route.abort())
            page.route('http://bioinfocore.usu.edu/**',lambda route:route.abort())
            page.on('pageerror',lambda error:report['errors'].append(str(error)))
            routes=sorted('/'+str(f.parent.relative_to(root/'preview')).replace('.', '').strip('/') for f in (root/'preview').rglob('index.html')) if '--all' in sys.argv else ['/','/tools','/publications','/people','/research','/news','/events','/contact','/people/rakesh','/news/avianflufundingnews','/admin']
            for route in routes:
                result=page.goto('http://localhost:3003'+route,wait_until='load')
                assert result.status==200,(route,result.status)
                overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
                assert not overflow,(route,width,'horizontal overflow')
                report['pages'].append({'route':route,'width':width,'status':result.status,'horizontalOverflow':overflow})
                if route in ['/','/tools','/admin']:page.screenshot(path=str(artifacts/(('home' if route=='/' else route[1:])+f'-{width}.png')),full_page=True)
                if route=='/tools':
                    search=page.locator('[data-search-input]');search.fill('StripeNET');assert page.locator('[data-item]:visible').count()==1
                    search.fill('xyz-no-tool');assert page.locator('[data-empty]').is_visible()
                    search.fill('');assert page.locator('[data-item]:visible').count()==36
            if width<=390:
                page.goto('http://localhost:3003/',wait_until='load');page.get_by_role('button',name='Menu').click();assert page.locator('#site-nav').is_visible();page.keyboard.press('Escape');assert not page.locator('#site-nav').is_visible()
            page.close()
        browser.close()
    assert not report['errors'],report['errors']
    report['result']='passed'
finally:
    server.terminate()
    try:server.wait(timeout=5)
    except subprocess.TimeoutExpired:server.kill();server.wait()
    log.close();(artifacts/('browser-all-report.json' if '--all' in sys.argv else 'browser-report.json')).write_text(json.dumps(report,indent=2))
print(json.dumps({'checks':len(report['pages']),'result':report.get('result'),'errors':report['errors']}))
