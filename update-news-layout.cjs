const fs = require('fs');
let code = fs.readFileSync('src/render.mjs', 'utf8');

const replacement = `\${collection==='news'?\`
      <div class="news-three-col">
        \${['General', 'Science', 'Media'].map(cat => {
          const items = list.filter(r => r.category === cat || (!r.category && cat==='General'));
          if (!items.length) return '';
          return \`<div class="news-category-col" data-col="\${cat}">
            <div style="text-align:center; margin-bottom: 24px;"><h2 style="display:inline-block; border-bottom: 3px solid var(--blue); padding-bottom: 6px; font-size: 22px;">\${cat}</h2></div>
            <div class="story-grid-col">\${items.map((r, i) => \`<div class="news-item-page" style="\${i>=5?'display:none;':''}">\${newsCard(r,records)}</div>\`).join('')}</div>
            \${items.length > 5 ? \`<div style="text-align:center;margin-top:20px;"><button type="button" class="button button-outline load-more-btn">Next page \${arrow}</button></div>\` : ''}
          </div>\`;
        }).join('')}
      </div>
      \`:\`<section class="event-period" data-filter-group><h2>Upcoming events</h2>\${upcoming.length?\`<div class="event-list">\${events(upcoming)}</div>\`:'<p class="event-empty">New events will appear here when announced.</p>'}</section><section class="event-period" data-filter-group><h2>Past events</h2><div class="event-list">\${events(past)}</div></section>\`}`;

code = code.replace(/\$\{collection==='news'\?`<div class="story-grid">\$\{list\.map\(r=>newsCard\(r,records\)\)\.join\(''\)\}<\/div>`:`<section class="event-period" data-filter-group><h2>Upcoming events<\/h2>\$\{upcoming\.length\?`<div class="event-list">\$\{events\(upcoming\)\}<\/div>`:'<p class="event-empty">New events will appear here when announced\.<\/p>'\}<\/section><section class="event-period" data-filter-group><h2>Past events<\/h2><div class="event-list">\$\{events\(past\)\}<\/div><\/section>`\}/, replacement);

code = code.replace(/\$\{filterBar\(list,collection,\{categories:collection==='news',years:collection==='events'\}\)\}/, `\${collection==='news'?'':filterBar(list,collection,{categories:false,years:true})}`);

fs.writeFileSync('src/render.mjs', code, 'utf8');
console.log('Render updated!');
