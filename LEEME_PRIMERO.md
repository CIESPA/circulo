# CI.ES.PA — versión Netlify con SEO avanzado y CMS

Esta versión es **estática**: no usa servidores ni adaptadores. Netlify ejecuta `npm run build` y publica la carpeta `dist`.

## Incluye

- URLs limpias y páginas individuales para cada integrante, libro y texto.
- SEO editable por contenido: título, descripción, imagen social e indexación.
- Open Graph 1200×630 para WhatsApp, Facebook, LinkedIn y X.
- Schema.org: Organization, WebSite, AboutPage, CollectionPage, ProfilePage, Person, Book, CreativeWork y BreadcrumbList.
- `sitemap.xml`, `robots.txt`, RSS (`feed.xml`) y `llms.txt` generados automáticamente.
- Carrusel de “Las voces del presente” con bucle automático, ambas flechas, pausa al leer y soporte táctil.
- Formulario de contacto detectado por Netlify Forms y página de agradecimiento no indexable.
- Panel de edición Decap CMS en `/admin/`.
- Redirecciones desde las antiguas páginas `.html`.

## Publicación recomendada — con panel para la editora

El CMS necesita un repositorio Git para guardar los cambios.

1. Subí **todo el contenido de esta carpeta** a un repositorio privado o público de GitHub, GitLab o Bitbucket. La rama debe llamarse `main`.
2. En Netlify elegí **Add new project → Import an existing project** y conectá el repositorio.
3. Netlify leerá automáticamente `netlify.toml`:
   - comando: `npm run build`
   - carpeta publicada: `dist`
4. En **Domain management**, agregá `ciespa.com.ar` y `www.ciespa.com.ar`; elegí `www.ciespa.com.ar` como dominio principal.
5. Como el DNS está en Cloudflare, entrá en Netlify → Domain management → Pending DNS verification y copiá exactamente los registros que Netlify te indique. No uses direcciones IP encontradas en tutoriales viejos.
6. Cuando el dominio funcione, verificá:
   - `https://www.ciespa.com.ar/robots.txt`
   - `https://www.ciespa.com.ar/sitemap.xml`
   - `https://www.ciespa.com.ar/integrantes/nadia-costa/`
   - `https://www.ciespa.com.ar/libros/el-miedo-esta-en-mi-sangre/`

## Activar el panel `/admin/`

1. En Netlify: **Identity → Enable Identity**.
2. En Registration preferences elegí **Invite only**.
3. Activá **Git Gateway**.
4. Invitá a la persona que editará el sitio.
5. Esa persona ingresa a `https://www.ciespa.com.ar/admin/`.

Desde allí puede editar páginas, integrantes, biografías, libros, portadas, enlaces de compra, textos, Escritos paivenses y todos los campos SEO. Cada guardado crea un cambio en Git y Netlify reconstruye el sitio automáticamente.

## Prueba local

Doble clic en `PREPARAR_Y_PROBAR.bat`. También podés ejecutar:

```bash
npm run build
npx serve dist
```

## Publicación rápida por CLI

`PUBLICAR_EN_NETLIFY.bat` publica el sitio, pero el CMS solamente podrá guardar si el proyecto está conectado a Git y tiene Identity + Git Gateway activos.

## Google

Después de que el dominio esté operativo:

1. Añadí `https://www.ciespa.com.ar` a Google Search Console.
2. Enviá `https://www.ciespa.com.ar/sitemap.xml`.
3. Solicitá indexación para Inicio, Integrantes, Librería virtual y las primeras fichas de autores y libros.
4. Mantené el antiguo `ciespa.netlify.app` dentro del mismo sitio de Netlify. Las canónicas apuntan al dominio definitivo.

## Importante

- Los enlaces de compra están vacíos a propósito: se cargan desde `/admin/` cuando sean confirmados.
- Las biografías históricas iniciales son editables y deben ampliarse con la documentación disponible.
- El proyecto no requiere dependencias para generar el sitio; no aparecerá el problema del adaptador de Astro.
