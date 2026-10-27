from pathlib import Path
from playwright.sync_api import sync_playwright
from html import escape
folder=Path(__file__).parent
scripts=['data.js','teamfights.js','metric-engine.js','mechanics-ui.js','capture-ui.js','app.js']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':950});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.goto('about:blank')
 page.evaluate('''() => {const d={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>d[k]||null,setItem:(k,v)=>d[k]=v,removeItem:k=>delete d[k]}});Object.defineProperty(window,'sessionStorage',{value:{getItem:k=>d[k]||null,setItem:(k,v)=>d[k]=v}})}''')
 page.set_content('<!doctype html><html><head><title>ADC</title></head><body><div id="app"></div><div id="modal-root"></div><div id="toast"></div></body></html>')
 page.evaluate("(css) => {const st=document.createElement('style');st.textContent=css;document.head.appendChild(st)}",(folder/'styles.css').read_text())
 for script in scripts:page.evaluate('(src) => { (0,eval)(src) }',(folder/script).read_text())
 page.get_by_role('button',name='Mechanics Lab',exact=True).click()
 assert page.locator('h1').inner_text()=='Mechanics Lab'
 assert '45-Metric Automation Coverage' in page.locator('body').inner_text()
 report=(folder/'vision/example-report.json').read_text()
 page.evaluate('(json)=>document.dispatchEvent(new CustomEvent("adc:mechanics-report",{detail:JSON.parse(json)}))',report)
 assert '1' in page.locator('.stat .value').all_text_contents()
 page.get_by_role('button',name='Capture Studio').click()
 assert page.get_by_text('Dodge & Kiting Analysis').count()==1
 page.get_by_role('button',name='Mechanics Lab',exact=True).click()
 page.screenshot(path=str(folder/'preview-mechanics.png'),full_page=True)
 assert not errs,errs
 print('PASS: Mechanics Lab import, 45 coverage rows, capture workflow, no JS errors')
 browser.close()
