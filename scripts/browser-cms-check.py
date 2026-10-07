"""Exercise real CMS forms against a disposable database and temporary account."""
import re,os,json,secrets,subprocess,tempfile,time,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from PIL import Image
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='bioinfo-cms-') as temp:
 env=dict(os.environ,DATA_DIR=temp,HOST='127.0.0.1',PORT='3001',APP_ORIGIN='http://localhost:3001')
 password=secrets.token_urlsafe(24)
 subprocess.run(['node','scripts/manage.mjs','create-user','qa@example.org'],cwd=root,env=env,input=password,text=True,check=True,capture_output=True)
 image=Path(temp)/'photo.png';Image.new('RGB',(100,100),(34,89,71)).save(image)
 server=subprocess.Popen(['node','src/server.mjs'],cwd=root,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 try:
  for _ in range(50):
   try:
    urllib.request.urlopen('http://localhost:3001/healthz',timeout=1);break
   except Exception:time.sleep(.1)
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.route('https://**/*',lambda r:r.abort())
   page.goto('http://localhost:3001/admin');page.get_by_label('Email address').fill('qa@example.org');page.get_by_label('Password',exact=True).fill(password);page.get_by_role('button',name='Sign in').click()
   page.locator('[data-collection="people"]').click();page.locator('#new-record').click()
   page.locator('#field-title').fill('Browser QA Member');page.locator('#field-summary').fill('A disposable profile used only for testing.')
   page.locator('#field-role').fill('Graduate researcher');page.locator('#field-startYear').fill('2022');page.locator('#field-endYear').fill('2026')
   page.locator('#field-researchInterests').fill('Data science')
   page.locator('#field-dissertationTitle').fill('QA Dissertation');page.locator('#field-dissertationUrl').fill('https://example.edu/thesis')
   page.locator('#field-workLinks [data-add-link]').click();page.locator('#field-workLinks [data-link-label]').fill('Portfolio');page.locator('#field-workLinks [data-link-url]').fill('https://example.edu/work')
   page.locator('#field-publicationIds input[type=checkbox]').first.check();page.locator('#field-toolIds input[type=checkbox]').first.check()
   page.locator('#field-body').fill('Biography entered through the content editor.')
   page.locator('[data-upload="image"]').set_input_files(str(image));expect(page.locator("#field-image")).to_have_value(re.compile(r"^/uploads/"))
   page.locator('#save-record').click();page.get_by_text('Draft saved. Use Preview to review it before publishing.').wait_for()
   assert page.request.get('http://localhost:3001/people/browser-qa-member').status==404
   with page.expect_popup() as popup:page.locator('#preview-record').click()
   preview=popup.value;preview.wait_for_load_state();assert preview.get_by_text('QA Dissertation',exact=True).is_visible();preview.close()
   page.locator('#field-status').select_option('published');page.locator('#save-record').click();page.get_by_text('Published. Your changes are now visible on the website.').wait_for()
   public=browser.new_page();public.goto('http://localhost:3001/people/browser-qa-member');assert public.get_by_role('link',name='QA Dissertation').is_visible();assert public.get_by_role('link',name='Portfolio',exact=True).is_visible()
   assert public.locator('img').evaluate_all('(imgs)=>imgs.filter(i=>i.src.includes("/uploads/")).every(i=>i.complete&&i.naturalWidth>0)')
   public.goto('http://localhost:3001/people/our-team');assert public.get_by_role('link',name='Browser QA Member',exact=True).count()==1
   page.locator('#field-memberStatus').select_option('alumni');page.locator('#save-record').click();page.get_by_text('Published. Your changes are now visible on the website.').wait_for()
   public.reload();assert public.get_by_role('link',name='Browser QA Member',exact=True).count()==0
   public.goto('http://localhost:3001/people/alumni');assert public.get_by_role('link',name='Browser QA Member',exact=True).count()==1
   page.set_viewport_size({'width':390,'height':844});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   page.screenshot(path=str(root/'artifacts/cms-mobile.png'),full_page=True)
   # Verify approved editorial controls without leaving any QA data in the project.
   page.set_viewport_size({'width':1440,'height':1000});page.locator('#back-list').click()
   page.locator('[data-collection="settings"]').click();page.locator('[data-edit="settings:home"]').click()
   page.locator('#field-title').fill('Browser-verified homepage');page.locator('#field-feedMode').select_option('selected')
   choices=page.locator('#field-featuredIds input[type=checkbox]');choices.first.check();choices.nth(1).check()
   page.locator('#field-featuredIds .relation-option').nth(1).locator('[data-order="up"]').click()
   page.locator('#field-imageFit').select_option('contain');page.locator('#field-focalX').fill('25');page.locator('#field-focalY').fill('60')
   page.locator('[data-preview-ratio="portrait"]').click();assert page.locator('.image-placement-preview').get_attribute('data-ratio')=='portrait'
   page.locator('[data-choose-image]').click();page.locator('.media-library-dialog').wait_for();assert page.locator('[data-media-index]').count()>100;page.locator('[data-media-index]').first.click()
   page.locator('#save-record').click();page.get_by_text('Published. Your changes are now visible on the website.').wait_for()
   public.goto('http://localhost:3001/');assert public.get_by_role('heading',name='Browser-verified homepage').is_visible()
   viewer=public.locator('[data-expand-image]').first;viewer.click();assert public.locator('.image-dialog').is_visible();public.keyboard.press('Escape');assert not public.locator('.image-dialog').is_visible()
   page.locator('#back-list').click();page.locator('[data-edit="settings:site"]').click();page.locator('#field-email').fill('changed@example.org');page.locator('#field-footerText').fill('Edited footer from browser test.');page.locator('#save-record').click();page.get_by_text('Published. Your changes are now visible on the website.').wait_for()
   public.goto('http://localhost:3001/contact');assert public.get_by_text('Edited footer from browser test.').is_visible();assert public.locator('a[href="mailto:changed@example.org"]').count()>=2
   page.locator('#back-list').click();page.locator('[data-edit="settings:director"]').click();assert page.locator('#field-education .profile-edit-row').count()==5;assert page.locator('#field-appointments .profile-edit-row').count()==5;assert page.locator('#field-awards .profile-edit-row').count()==4
   page.locator('#field-awards [data-add-row]').click();row=page.locator('#field-awards .profile-edit-row').last;row.locator('[data-row-title]').fill('QA award');row.locator('[data-row-date]').fill('2026');row.locator('[data-row-description]').fill('Temporary test entry');page.locator('#save-record').click();page.get_by_text('Published. Your changes are now visible on the website.').wait_for()
   public.goto('http://localhost:3001/people/rakesh');assert public.get_by_role('heading',name='QA award').is_visible()
   page.locator('#back-list').click();page.locator('[data-collection="opportunities"]').click();page.locator('#new-record').click();page.locator('#field-title').fill('QA research opening');page.locator('#field-summary').fill('Temporary test opening');page.locator('#field-openingStatus').select_option('open');page.locator('#field-status').select_option('published');page.locator('#save-record').click();page.get_by_text('Published. Your changes are now visible on the website.').wait_for()
   public.goto('http://localhost:3001/opportunities');assert public.get_by_role('link',name='QA research opening').is_visible();public.goto('http://localhost:3001/');assert public.get_by_role('heading',name='QA research opening').is_visible()
   page.set_viewport_size({'width':390,'height':844});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   page.locator('#logout').click();page.get_by_role('heading',name='Editor sign in').wait_for()
   assert not errors,errors
   browser.close()
   print(json.dumps({'result':'passed','workflow':'members, uploads, drafts, preview, publish, alumni, homepage selection and ordering, crop preview, media library, image dialog, footer/contact settings, director repeaters, vacancies, mobile, logout','javascriptErrors':errors}))
 finally:
  server.terminate();server.wait(timeout=10)
