import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const contentDir = path.join(root, 'content');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');


const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const stripHtml = (v='') => String(v).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const inlineMd = (v='') => {
  let s=escapeHtml(v);
  s=s.replace(/`([^`]+)`/g,'<code>$1</code>');
  s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  s=s.replace(/\*([^*]+)\*/g,'<em>$1</em>');
  s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,'<a href="$2">$1</a>');
  return s;
};
const md = (v='') => {
  const text=String(v).replace(/\r/g,'').trim();
  if(!text) return '';
  const blocks=text.split(/\n{2,}/);
  return blocks.map(block=>{
    const lines=block.split('\n');
    const h=lines[0].match(/^(#{1,3})\s+(.+)$/);
    if(h) return `<h${h[1].length}>${inlineMd(h[2])}</h${h[1].length}>`;
    if(lines.every(l=>/^[-*]\s+/.test(l))) return `<ul>${lines.map(l=>`<li>${inlineMd(l.replace(/^[-*]\s+/,''))}</li>`).join('')}</ul>`;
    const body=lines.map((line,i)=>{
      const hard=/\s{2}$/.test(line);
      const clean=line.replace(/\s{2}$/,'');
      return inlineMd(clean)+(i<lines.length-1?(hard?'<br>':' '):'');
    }).join('');
    return `<p>${body}</p>`;
  }).join('\n');
};
const abs = (site, url='') => url.startsWith('http') ? url : `${site.domain}${url.startsWith('/') ? url : '/' + url}`;
const routeUrl = (site, route) => site.domain + (route === '/' ? '/' : route.replace(/\/?$/, '/'));
const ensureArray = (v) => Array.isArray(v) ? v : [];
const loadFolder = (name) => {
  const dir = path.join(contentDir, name);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>readJson(path.join(dir,f))).filter(x=>x.visible !== false).sort((a,b)=>(a.order||999)-(b.order||999));
};
const page = (name) => readJson(path.join(contentDir,'pages',`${name}.json`));

function copyDir(src,dst){
  if(!fs.existsSync(src)) return;
  fs.mkdirSync(dst,{recursive:true});
  for(const entry of fs.readdirSync(src,{withFileTypes:true})){
    const s=path.join(src,entry.name), d=path.join(dst,entry.name);
    entry.isDirectory()?copyDir(s,d):fs.copyFileSync(s,d);
  }
}
function writeRoute(route, html){
  const clean = route === '/' ? '' : route.replace(/^\//,'').replace(/\/$/,'');
  const dir = path.join(distDir,clean);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),html,'utf8');
}
function writeFile(rel, body){const p=path.join(distDir,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body,'utf8');}

const site=readJson(path.join(contentDir,'site.json'));
const authors=loadFolder('integrantes');
const books=loadFolder('libros');
const texts=loadFolder('textos');
const community=loadFolder('escritos');
const authorBySlug=Object.fromEntries(authors.map(x=>[x.slug,x]));

function breadcrumbs(items){
  return {
    '@type':'BreadcrumbList',
    itemListElement:items.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.name,item:routeUrl(site,x.url)}))
  };
}
function organization(){return {'@type':'Organization','@id':`${site.domain}/#organization`,name:site.name,alternateName:site.shortName,url:`${site.domain}/`,logo:{'@type':'ImageObject',url:abs(site,site.logo)},description:site.description,email:site.email,address:{'@type':'PostalAddress',addressLocality:'Laguna Paiva',addressRegion:'Santa Fe',addressCountry:'AR'}};}
function website(){return {'@type':'WebSite','@id':`${site.domain}/#website`,url:`${site.domain}/`,name:`${site.shortName} — ${site.name}`,alternateName:site.shortName,inLanguage:'es-AR',publisher:{'@id':`${site.domain}/#organization`}};}
function baseSchema(data, crumbs=[]){
 const type=data.schemaType||'WebPage';
 return {'@context':'https://schema.org','@graph':[organization(),website(),{'@type':type,'@id':`${routeUrl(site,data.route)}#webpage`,url:routeUrl(site,data.route),name:stripHtml(data.seoTitle||data.title),description:data.seoDescription||'',inLanguage:'es-AR',isPartOf:{'@id':`${site.domain}/#website`},about:{'@id':`${site.domain}/#organization`},breadcrumb:{'@id':`${routeUrl(site,data.route)}#breadcrumb`}},Object.assign({'@id':`${routeUrl(site,data.route)}#breadcrumb`},breadcrumbs(crumbs))]};
}
function head(data, schema, opts={}){
  const canonical=routeUrl(site,data.route);
  const title=data.seoTitle||stripHtml(data.title)||site.name;
  const desc=data.seoDescription||site.description;
  const image=abs(site,data.socialImage||site.defaultSocialImage);
  const robots=data.indexable===false?'noindex, nofollow':'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const ogType=opts.ogType||'website';
  return `<!doctype html><html lang="es-AR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(desc)}"><meta name="robots" content="${robots}"><meta name="author" content="${escapeHtml(site.name)}">
<link rel="canonical" href="${canonical}"><link rel="alternate" type="application/rss+xml" title="Textos de ${escapeHtml(site.shortName)}" href="${site.domain}/feed.xml">
<meta property="og:locale" content="es_AR"><meta property="og:type" content="${ogType}"><meta property="og:site_name" content="${escapeHtml(site.shortName)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(desc)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${image}"><meta property="og:image:secure_url" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${escapeHtml(opts.imageAlt||title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(desc)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="${escapeHtml(opts.imageAlt||title)}">
<meta name="theme-color" content="#8b3a2a"><link rel="icon" href="/images/quill.png"><link rel="apple-touch-icon" href="/images/quill.png"><link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>
</head>`;
}
function header(active=''){
 const nav=site.nav.map(x=>`<li><a ${x.url===active?'class="active" aria-current="page"':''} href="${x.url}">${escapeHtml(x.label)}</a></li>`).join('');
 return `<body><a class="skip-link" href="#contenido">Saltar al contenido</a><header class="site-header"><div class="container header-inner"><a class="site-brand" href="/" aria-label="${escapeHtml(site.shortName)}, inicio"><span class="site-brand-main">${escapeHtml(site.shortName)}</span><span class="site-brand-sep"> - </span><span class="site-brand-sub">Círculo de escritores paivenses</span></a><button class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Abrir menú"><span></span><span></span><span></span></button><nav class="site-nav" id="site-nav" aria-label="Navegación principal"><ul>${nav}</ul></nav></div></header>`;
}
function footer(){return `<footer class="site-footer"><div class="container footer-inner"><img class="footer-logo" src="${site.footerLogo}" alt="${escapeHtml(site.name)}"><p>${escapeHtml(site.footerText).replace(/\n/g,'<br>')}</p></div></footer><script defer src="/assets/js/main.js"></script><script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script><script>if(window.netlifyIdentity){window.netlifyIdentity.on('init',u=>{if(!u)window.netlifyIdentity.on('login',()=>location.href='/admin/');});}</script></body></html>`;}
function pageHero(p){return `<section class="page-hero"><div class="container page-hero-inner"><div><p class="page-hero-label">${escapeHtml(p.eyebrow||p.label||'')}</p><h1>${p.title}</h1></div><div class="page-hero-deco" aria-hidden="true">${escapeHtml(p.deco||'CI.ES.PA')}</div></div></section>`;}
function cardLink(title,text,label,url){return `<article class="feature-card"><span aria-hidden="true" class="card-quill">✒</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p><a class="text-link" href="${url}">${escapeHtml(label)} <span aria-hidden="true">→</span></a></article>`;}
function authorCard(a, current=false){
 const image=a.image?`<div class="author-card-image"><img src="${a.image}" alt="${escapeHtml(a.imageAlt||a.name)}" loading="lazy" decoding="async" style="object-position:${escapeHtml(a.imagePosition||'center')}"></div>`:`<div class="author-placeholder" aria-hidden="true"><span>${escapeHtml(a.name.charAt(0))}</span></div>`;
 return `<article class="author-card ${current?'author-slide':''}">${image}<div class="author-card-body"><p class="card-kicker">${escapeHtml(a.genre||a.group)}</p><h3>${escapeHtml(a.name)}</h3><p>${escapeHtml(a.summary)}</p><a class="text-link" href="/integrantes/${a.slug}/">Ver ficha completa <span aria-hidden="true">→</span></a></div></article>`;
}
function bookCard(b){return `<article class="book-card"><a class="book-cover-link" href="/libros/${b.slug}/"><img src="${b.cover}" alt="${escapeHtml(b.coverAlt||b.title)}" loading="lazy" decoding="async"></a><div class="book-card-body"><p class="card-kicker">${escapeHtml(b.genre)}</p><h3><a href="/libros/${b.slug}/">${escapeHtml(b.title)}</a></h3><p class="book-author">${escapeHtml(b.authorName)}</p><p>${escapeHtml(b.synopsis)}</p><a class="text-link" href="/libros/${b.slug}/">Leer sinopsis <span aria-hidden="true">→</span></a></div></article>`;}
function textCard(t, prefix='/relatos'){return `<article class="text-card"><p class="card-kicker">${escapeHtml(t.type)}</p><h3><a href="${prefix}/${t.slug}/">${escapeHtml(t.title)}</a></h3><p class="text-author">${escapeHtml(t.authorName)}</p><p>${escapeHtml(t.summary)}</p><a class="text-link" href="${prefix}/${t.slug}/">Leer obra <span aria-hidden="true">→</span></a></article>`;}
function shell(p, body, schema=baseSchema(p,[{name:'Inicio',url:'/'},{name:p.label,url:p.route}]), opts={}){return head(p,schema,opts)+header(p.active)+`<main id="contenido">${body}</main>`+footer();}

fs.rmSync(distDir,{recursive:true,force:true});fs.mkdirSync(distDir,{recursive:true});copyDir(publicDir,distDir);

// Home
{
 const p=page('inicio');
 const schema=baseSchema(p,[{name:'Inicio',url:'/'}]);
 schema['@graph'][2]['@type']='WebPage';
 const body=`<section class="home-hero" style="--hero:url('${p.heroImage}')"><div class="home-hero-overlay"></div><div class="container hero-grid hero-grid-single"><div class="hero-copy"><p class="hero-eyebrow">${escapeHtml(p.heroEyebrow)}</p><h1>${p.heroTitle}</h1><p>${escapeHtml(p.heroText)}</p><a class="btn-primary" href="${p.ctaUrl}">${escapeHtml(p.ctaLabel)}</a></div></div></section><section class="feature-section"><div class="container feature-grid">${p.cards.map(c=>cardLink(c.title,c.text,c.label,c.url)).join('')}</div></section><section class="welcome-section"><div class="container welcome-grid"><div><p class="section-label">${escapeHtml(p.welcomeEyebrow)}</p><h2 class="section-heading">${p.welcomeTitle}</h2><div class="prose">${md(p.welcomeBody)}</div></div><figure><img src="${p.welcomeImage}" alt="${escapeHtml(p.welcomeImageAlt)}" loading="lazy" decoding="async"><figcaption>Literatura, memoria y comunidad.</figcaption></figure></div></section>`;
 writeRoute('/',head(p,schema)+header('/')+`<main id="contenido">${body}</main>`+footer());
}
// Historia
{
 const p=page('historia'); const body=`${pageHero(p)}<section class="content-section"><div class="container history-grid"><div class="prose lead-prose"><p class="page-intro">${escapeHtml(p.intro)}</p>${md(p.body)}</div><figure class="history-hero-image"><img src="${p.heroImage}" alt="${escapeHtml(p.heroImageAlt)}" loading="eager" decoding="async"></figure></div><div class="container gallery-grid">${p.gallery.map(g=>`<figure><img src="${g.image}" alt="${escapeHtml(g.alt)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(g.caption)}</figcaption></figure>`).join('')}</div></section>`; writeRoute(p.route,shell(p,body));
}
// Integrantes
{
 const p=page('integrantes'); const founders=authors.filter(a=>a.group==='Fundadores'), former=authors.filter(a=>a.group==='Antiguos integrantes'), current=authors.filter(a=>a.group==='Las voces del presente');
 const carousel=`<div class="carousel" data-carousel data-autoplay="5200"><div class="carousel-head"><p>${escapeHtml(p.sliderHelp)}</p><div class="carousel-controls"><button type="button" data-carousel-prev aria-label="Integrante anterior">←</button><button type="button" data-carousel-next aria-label="Integrante siguiente">→</button></div></div><div class="carousel-viewport"><div class="carousel-track">${current.map(a=>authorCard(a,true)).join('')}</div></div><div class="carousel-dots" aria-hidden="true"></div></div>`;
 const body=`${pageHero(p)}<section class="content-section"><div class="container"><p class="page-intro">${escapeHtml(p.intro)}</p><div class="section-block"><p class="section-label">Fundadores</p><h2 class="section-heading">${p.foundersTitle}</h2><p class="section-intro">${escapeHtml(p.foundersIntro)}</p><div class="authors-grid compact">${founders.map(a=>authorCard(a)).join('')}</div></div><div class="section-block"><p class="section-label">Memoria</p><h2 class="section-heading">${p.formerTitle}</h2><p class="section-intro">${escapeHtml(p.formerIntro)}</p><div class="authors-grid compact">${former.map(a=>authorCard(a)).join('')}</div></div><div class="section-block"><p class="section-label">Actualidad</p><h2 class="section-heading">${p.currentTitle}</h2><p class="section-intro">${escapeHtml(p.currentIntro)}</p>${carousel}</div><aside class="cta-box"><p>${escapeHtml(p.cta)}</p><a class="btn-secondary" href="/contacto/">Contactar</a></aside></div></section><script defer src="/assets/js/carousel.js"></script>`;
 writeRoute(p.route,shell(p,body));
}
// Archive
{
 const p=page('archivo'); const body=`${pageHero(p)}<section class="content-section"><div class="container"><p class="page-intro">${escapeHtml(p.intro)}</p><div class="timeline">${p.entries.map(e=>`<article class="timeline-entry"><div class="timeline-year">${escapeHtml(e.year)}</div><div><h2>${escapeHtml(e.title)}</h2>${md(e.body)}</div></article>`).join('')}</div><aside class="cta-box"><p>${escapeHtml(p.cta)}</p><a class="btn-secondary" href="/contacto/">Donar material</a></aside></div></section>`; writeRoute(p.route,shell(p,body));
}
// Relatos
{
 const p=page('relatos'); const groups=[...new Set(texts.map(t=>t.type))]; const content=groups.map(g=>`<section class="section-block"><p class="section-label">${escapeHtml(g)}</p><div class="texts-grid">${texts.filter(t=>t.type===g).map(t=>textCard(t)).join('')}</div></section>`).join(''); const body=`${pageHero(p)}<section class="content-section"><div class="container"><p class="page-intro">${escapeHtml(p.intro)}</p>${content}</div></section>`; writeRoute(p.route,shell(p,body));
}
// Community writings
{
 const p=page('escritos-paivenses'); const list=community.length?`<div class="texts-grid">${community.map(t=>textCard(t,'/escritos-paivenses')).join('')}</div>`:`<div class="empty-state"><span aria-hidden="true">✦</span><h2>${escapeHtml(p.emptyTitle)}</h2><p>${escapeHtml(p.emptyText)}</p><a class="btn-primary" href="/contacto/">Enviar un escrito</a></div>`; const body=`${pageHero(p)}<section class="content-section"><div class="container"><p class="page-intro">${escapeHtml(p.intro)}</p>${list}</div></section>`; writeRoute(p.route,shell(p,body));
}
// Library
{
 const p=page('libreria-virtual'); const body=`${pageHero(p)}<section class="content-section"><div class="container"><p class="page-intro">${escapeHtml(p.intro)}</p><div class="library-grid">${books.map(bookCard).join('')}</div></div></section>`; writeRoute(p.route,shell(p,body));
}
// Events
{
 const p=page('eventos'); const body=`${pageHero(p)}<section class="content-section"><div class="container"><div class="coming-soon"><span aria-hidden="true">✦</span><p class="section-label">${escapeHtml(p.overline)}</p><h2>${escapeHtml(p.messageTitle)}</h2><p>${escapeHtml(p.message)}</p><a class="btn-primary" href="${p.ctaUrl}">${escapeHtml(p.ctaLabel)}</a></div></div></section>`; writeRoute(p.route,shell(p,body));
}
// Contact
{
 const p=page('contacto'); const body=`${pageHero(p)}<section class="content-section"><div class="container contact-grid"><div><p class="section-label">CI.ES.PA</p><h2 class="section-heading">${escapeHtml(p.heading)}</h2><p class="page-intro">${escapeHtml(p.intro)}</p><dl class="contact-details"><div><dt>Correo</dt><dd><a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></dd></div><div><dt>Ubicación</dt><dd>${escapeHtml(p.location)}</dd></div></dl></div><form class="contact-form" name="contacto-ciespa" method="POST" action="/gracias/" data-netlify="true" netlify-honeypot="sitio-web"><input type="hidden" name="form-name" value="contacto-ciespa"><p class="honeypot"><label>No completar: <input name="sitio-web"></label></p><h2>${escapeHtml(p.formTitle)}</h2><label>Nombre y apellido<input type="text" name="nombre" autocomplete="name" required></label><label>Correo electrónico<input type="email" name="email" autocomplete="email" required></label><label>Motivo<select name="motivo" required><option value="">Elegí una opción</option><option>Participar en CI.ES.PA</option><option>Publicar un escrito paivense</option><option>Agregar un libro</option><option>Donar material al archivo</option><option>Proponer un evento</option><option>Otro</option></select></label><label>Mensaje<textarea name="mensaje" rows="7" required></textarea></label><label>Archivo opcional<input type="file" name="archivo" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"></label><label class="consent"><input type="checkbox" required> Confirmo que tengo autorización para enviar este contenido.</label><button class="btn-primary" type="submit">Enviar mensaje</button></form></div></section>`; writeRoute(p.route,shell(p,body));
}
// Gracias
{
 const p=page('gracias'); const body=`${pageHero(p)}<section class="content-section"><div class="container"><div class="empty-state"><span aria-hidden="true">✦</span><h2>Mensaje recibido</h2><p>${escapeHtml(p.message)}</p><a class="btn-primary" href="/">Volver al inicio</a></div></div></section>`; writeRoute(p.route,shell(p,body));
}
// Author pages
for(const a of authors){
 const p={route:`/integrantes/${a.slug}/`,active:'/integrantes/',label:a.name,title:escapeHtml(a.name),seoTitle:a.seoTitle,seoDescription:a.seoDescription,socialImage:a.socialImage,indexable:a.indexable,schemaType:'ProfilePage'};
 const relatedBooks=books.filter(b=>b.authorSlug===a.slug), relatedTexts=texts.filter(t=>t.authorSlug===a.slug);
 const person={'@type':'Person','@id':`${routeUrl(site,p.route)}#person`,name:a.name,url:routeUrl(site,p.route),description:a.summary,image:a.socialImage?abs(site,a.socialImage):undefined,memberOf:{'@id':`${site.domain}/#organization`},knowsAbout:a.genre};
 const schema={'@context':'https://schema.org','@graph':[organization(),website(),{'@type':'ProfilePage','@id':`${routeUrl(site,p.route)}#webpage`,url:routeUrl(site,p.route),name:a.seoTitle,description:a.seoDescription,inLanguage:'es-AR',isPartOf:{'@id':`${site.domain}/#website`},mainEntity:{'@id':`${routeUrl(site,p.route)}#person`},breadcrumb:{'@id':`${routeUrl(site,p.route)}#breadcrumb`}},person,Object.assign({'@id':`${routeUrl(site,p.route)}#breadcrumb`},breadcrumbs([{name:'Inicio',url:'/'},{name:'Integrantes',url:'/integrantes/'},{name:a.name,url:p.route}]))]};
 const image=a.image?`<figure class="profile-photo"><img src="${a.image}" alt="${escapeHtml(a.imageAlt||a.name)}" style="object-position:${escapeHtml(a.imagePosition||'center')}"></figure>`:`<div class="profile-photo placeholder"><span>${escapeHtml(a.name.charAt(0))}</span></div>`;
 const booksHtml=relatedBooks.length?`<section class="section-block"><p class="section-label">Libros</p><h2 class="section-heading">Obras publicadas</h2><div class="library-grid mini">${relatedBooks.map(bookCard).join('')}</div></section>`:'';
 const textsHtml=relatedTexts.length?`<section class="section-block"><p class="section-label">Textos</p><h2 class="section-heading">Leer a ${escapeHtml(a.name)}</h2><div class="texts-grid">${relatedTexts.map(t=>textCard(t)).join('')}</div></section>`:'';
 const body=`<nav class="breadcrumbs container" aria-label="Migas de pan"><a href="/">Inicio</a><span>/</span><a href="/integrantes/">Integrantes</a><span>/</span><span>${escapeHtml(a.name)}</span></nav><section class="profile-hero"><div class="container profile-grid">${image}<div><p class="page-hero-label">${escapeHtml(a.group)}</p><h1>${escapeHtml(a.name)}</h1><p class="profile-summary">${escapeHtml(a.summary)}</p><p class="card-kicker">${escapeHtml(a.genre)}</p>${a.contactUrl?`<a class="btn-secondary" href="${a.contactUrl}">${escapeHtml(a.contactLabel||'Contacto')}</a>`:''}</div></div></section><section class="content-section"><div class="container profile-content"><article class="prose"><p class="section-label">Biografía</p>${md(a.biography)}</article>${textsHtml}${booksHtml}</div></section>`;
 writeRoute(p.route,head(p,schema,{ogType:'profile',imageAlt:`${a.name}, integrante de CI.ES.PA`})+header('/integrantes/')+`<main id="contenido">${body}</main>`+footer());
}
// Book pages
for(const b of books){
 const author=authorBySlug[b.authorSlug]; const p={route:`/libros/${b.slug}/`,active:'/libreria-virtual/',label:b.title,title:escapeHtml(b.title),seoTitle:b.seoTitle,seoDescription:b.seoDescription,socialImage:b.socialImage,indexable:b.indexable,schemaType:'Book'};
 const bookSchema={'@type':'Book','@id':`${routeUrl(site,p.route)}#book`,name:b.title,url:routeUrl(site,p.route),image:abs(site,b.cover),description:b.synopsis,inLanguage:'es-AR',genre:b.genre,author:{'@type':'Person',name:b.authorName,url:author?routeUrl(site,`/integrantes/${author.slug}/`):undefined},publisher:b.publisher?{'@type':'Organization',name:b.publisher}:undefined,isbn:b.isbn||undefined,datePublished:b.publicationYear||undefined};
 const schema={'@context':'https://schema.org','@graph':[organization(),website(),{'@type':'WebPage','@id':`${routeUrl(site,p.route)}#webpage`,url:routeUrl(site,p.route),name:b.seoTitle,description:b.seoDescription,inLanguage:'es-AR',isPartOf:{'@id':`${site.domain}/#website`},mainEntity:{'@id':`${routeUrl(site,p.route)}#book`},breadcrumb:{'@id':`${routeUrl(site,p.route)}#breadcrumb`}},bookSchema,Object.assign({'@id':`${routeUrl(site,p.route)}#breadcrumb`},breadcrumbs([{name:'Inicio',url:'/'},{name:'Librería virtual',url:'/libreria-virtual/'},{name:b.title,url:p.route}]))]};
 const links=ensureArray(b.purchaseLinks).length?`<div class="purchase-links">${b.purchaseLinks.map(x=>`<a class="btn-primary" href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(x.label)}</a>`).join('')}</div>`:`<p class="notice">Los enlaces de compra se incorporarán cuando el autor o la editorial los confirme.</p>`;
 const body=`<nav class="breadcrumbs container" aria-label="Migas de pan"><a href="/">Inicio</a><span>/</span><a href="/libreria-virtual/">Librería virtual</a><span>/</span><span>${escapeHtml(b.title)}</span></nav><section class="book-detail"><div class="container book-detail-grid"><figure><img src="${b.cover}" alt="${escapeHtml(b.coverAlt||b.title)}"></figure><div><p class="page-hero-label">${escapeHtml(b.genre)}</p><h1>${escapeHtml(b.title)}</h1><p class="book-author">de <a href="/integrantes/${b.authorSlug}/">${escapeHtml(b.authorName)}</a></p><div class="prose">${md(b.synopsis)}</div><dl class="book-meta">${b.publisher?`<div><dt>Editorial</dt><dd>${escapeHtml(b.publisher)}</dd></div>`:''}${b.publicationYear?`<div><dt>Año</dt><dd>${escapeHtml(b.publicationYear)}</dd></div>`:''}${b.isbn?`<div><dt>ISBN</dt><dd>${escapeHtml(b.isbn)}</dd></div>`:''}</dl>${links}</div></div></section>`;
 writeRoute(p.route,head(p,schema,{ogType:'book',imageAlt:b.coverAlt})+header('/libreria-virtual/')+`<main id="contenido">${body}</main>`+footer());
}
// Text pages
for(const t of texts){
 const p={route:`/relatos/${t.slug}/`,active:'/relatos/',label:t.title,title:escapeHtml(t.title),seoTitle:t.seoTitle,seoDescription:t.seoDescription,socialImage:t.socialImage,indexable:t.indexable,schemaType:'CreativeWork'};
 const schema={'@context':'https://schema.org','@graph':[organization(),website(),{'@type':'WebPage','@id':`${routeUrl(site,p.route)}#webpage`,url:routeUrl(site,p.route),name:t.seoTitle,description:t.seoDescription,inLanguage:'es-AR',isPartOf:{'@id':`${site.domain}/#website`},mainEntity:{'@id':`${routeUrl(site,p.route)}#work`},breadcrumb:{'@id':`${routeUrl(site,p.route)}#breadcrumb`}},{'@type':'CreativeWork','@id':`${routeUrl(site,p.route)}#work`,name:t.title,description:t.summary,url:routeUrl(site,p.route),inLanguage:'es-AR',author:{'@type':'Person',name:t.authorName,url:routeUrl(site,`/integrantes/${t.authorSlug}/`)},dateModified:t.updated||undefined},Object.assign({'@id':`${routeUrl(site,p.route)}#breadcrumb`},breadcrumbs([{name:'Inicio',url:'/'},{name:'Relatos',url:'/relatos/'},{name:t.title,url:p.route}]))]};
 const body=`<nav class="breadcrumbs container" aria-label="Migas de pan"><a href="/">Inicio</a><span>/</span><a href="/relatos/">Relatos</a><span>/</span><span>${escapeHtml(t.title)}</span></nav><article class="literary-work"><header><p class="page-hero-label">${escapeHtml(t.type)}</p><h1>${escapeHtml(t.title)}</h1><p>Por <a href="/integrantes/${t.authorSlug}/">${escapeHtml(t.authorName)}</a></p></header><div class="prose literary-prose">${md(t.body)}</div></article>`;
 writeRoute(p.route,head(p,schema,{ogType:'article',imageAlt:t.title})+header('/relatos/')+`<main id="contenido">${body}</main>`+footer());
}
// Community work pages
for(const t of community){
 const p={route:`/escritos-paivenses/${t.slug}/`,active:'/escritos-paivenses/',label:t.title,title:escapeHtml(t.title),seoTitle:t.seoTitle||`${t.title} — ${t.authorName} | Escritos paivenses`,seoDescription:t.seoDescription||t.summary,socialImage:t.socialImage||site.defaultSocialImage,indexable:t.indexable!==false,schemaType:'CreativeWork'};
 const schema=baseSchema(p,[{name:'Inicio',url:'/'},{name:'Escritos paivenses',url:'/escritos-paivenses/'},{name:t.title,url:p.route}]);
 const body=`<nav class="breadcrumbs container" aria-label="Migas de pan"><a href="/">Inicio</a><span>/</span><a href="/escritos-paivenses/">Escritos paivenses</a><span>/</span><span>${escapeHtml(t.title)}</span></nav><article class="literary-work"><header><p class="page-hero-label">${escapeHtml(t.type||'Escrito paivense')}</p><h1>${escapeHtml(t.title)}</h1><p>Por ${escapeHtml(t.authorName)}</p></header><div class="prose literary-prose">${md(t.body)}</div></article>`;
 writeRoute(p.route,head(p,schema,{ogType:'article',imageAlt:t.title})+header('/escritos-paivenses/')+`<main id="contenido">${body}</main>`+footer());
}
// 404
writeFile('404.html',head({route:'/404/',seoTitle:'Página no encontrada | CI.ES.PA',seoDescription:'La página solicitada no existe.',socialImage:site.defaultSocialImage,indexable:false},baseSchema({route:'/404/',seoTitle:'Página no encontrada',seoDescription:'La página solicitada no existe.',schemaType:'WebPage'},[{name:'Inicio',url:'/'}]))+header('')+`<main id="contenido"><section class="content-section"><div class="container"><div class="empty-state"><span aria-hidden="true">404</span><h1>Página no encontrada</h1><p>La página que buscás no existe o cambió de dirección.</p><a class="btn-primary" href="/">Volver al inicio</a></div></div></section></main>`+footer());
// sitemap
const routes=[];
for(const name of ['inicio','historia','integrantes','archivo','relatos','escritos-paivenses','libreria-virtual','eventos','contacto']){const p=page(name);if(p.indexable!==false)routes.push(p.route);}
authors.filter(x=>x.indexable!==false).forEach(x=>routes.push(`/integrantes/${x.slug}/`));books.filter(x=>x.indexable!==false).forEach(x=>routes.push(`/libros/${x.slug}/`));texts.filter(x=>x.indexable!==false).forEach(x=>routes.push(`/relatos/${x.slug}/`));community.filter(x=>x.indexable!==false).forEach(x=>routes.push(`/escritos-paivenses/${x.slug}/`));
writeFile('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(r=>`  <url><loc>${routeUrl(site,r)}</loc></url>`).join('\n')}\n</urlset>`);
writeFile('robots.txt',`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${site.domain}/sitemap.xml\n`);
// Feed
const feedItems=[...texts.map(t=>({...t,url:`/relatos/${t.slug}/`})),...community.map(t=>({...t,url:`/escritos-paivenses/${t.slug}/`}))];
writeFile('feed.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${escapeHtml(site.shortName)} — Textos</title><link>${site.domain}/relatos/</link><description>${escapeHtml(site.description)}</description><language>es-ar</language>${feedItems.map(t=>`<item><title>${escapeHtml(t.title)}</title><link>${routeUrl(site,t.url)}</link><guid>${routeUrl(site,t.url)}</guid><description>${escapeHtml(t.summary)}</description>${t.updated?`<pubDate>${new Date(/T/.test(t.updated)?t.updated:t.updated+'T12:00:00Z').toUTCString()}</pubDate>`:''}</item>`).join('')}</channel></rss>`);
writeFile('llms.txt',`# ${site.shortName} — ${site.name}\n\nSitio institucional y archivo literario de Laguna Paiva, Santa Fe, Argentina.\n\n## Secciones\n- ${site.domain}/historia/\n- ${site.domain}/integrantes/\n- ${site.domain}/archivo/\n- ${site.domain}/relatos/\n- ${site.domain}/escritos-paivenses/\n- ${site.domain}/libreria-virtual/\n- ${site.domain}/eventos/\n- ${site.domain}/contacto/\n`);
console.log(`Sitio generado: ${routes.length} URLs indexables en ${distDir}`);
