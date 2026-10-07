const fs = require('fs');
let code = fs.readFileSync('src/presentation.mjs', 'utf8');

// Replace updates with newsList to fix the bug where events show up in the news column
code = code.replace(/const c=setting\(records,'settings:home'\),updates=selectUpdates\(records,c\)/,
  `const c=setting(records,'settings:home');
  const newsList=records.filter(r=>r.collection==='news'&&r.status==='published').sort((a,b)=>dateValue(b)-dateValue(a)).slice(0,3);`);

code = code.replace(/updates\.length/g, 'newsList.length');
code = code.replace(/updates\.map/g, 'newsList.map');

// Implement Slideshow for welcome-photo
const sliderCode = `<div class="welcome-photo slideshow-container">
  <div class="slideshow">
    \${[c, ...newsList.filter(n=>n.image)].slice(0,4).map((slide, i) => \`<div class="slide \${i===0?'active':''}" style="\${i!==0?'opacity:0;position:absolute;inset:0':''}">\${image(slide, i===0?'home-photo':'slide-photo')}</div>\`).join('')}
  </div>
  <div class="photo-label"><span>THE PEOPLE BEHIND THE SCIENCE</span><a href="/people">Get to know KAABiL \${arrow}</a></div>
</div>`;

code = code.replace(/<div class="welcome-photo">\$\{image\(c,'home-photo'\)\}<div class="photo-label"><span>THE PEOPLE BEHIND THE SCIENCE<\/span><a href="\/people">Get to know KAABiL \$\{arrow\}<\/a><\/div><\/div>/, sliderCode);

fs.writeFileSync('src/presentation.mjs', code, 'utf8');
console.log('Homepage bug and slideshow applied.');
