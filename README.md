# English Vocabulary Games

Sitio estático (GitHub Pages) con juegos de vocabulario en inglés para los alumnos. **Los juegos son archivos JSON**: agregar un archivo agrega el juego, sin tocar el código de la página.

## Cómo funciona

```
games/<juego>/<alumno>.json     un juego por carpeta, un archivo por alumno ("todos.json" = para todos)
index.html + js/ + css/         sitio de los alumnos (solo lectura, sin ningún código de edición)
scripts/build.mjs               valida todos los JSON y genera index/<alumno>.json
.github/workflows/deploy.yml    en cada push: valida → si todo está bien, publica
teacher/                        editor LOCAL (nunca se publica)
GUIA-PARA-IA.md                 formato de cada juego, para pegarle a una IA
```

- Cada alumno tiene su link: `https://<usuario>.github.io/<repo>/#/s/<alumno>` (ej. `#/s/sofia`). Ve **solo sus juegos**, agrupados por categoría (tipo de juego). La portada no lista nada.
- Sopas de letras y crucigramas guardan solo las palabras; la grilla se genera al abrir, **al azar cada vez** (cada alumno e intento ve una distinta). El build prueba varias semillas para asegurar que siempre se pueda generar.
- Si un JSON tiene errores, el workflow falla con el archivo y el motivo, y **no se publica nada**: el sitio anterior sigue funcionando.

## Flujo de la profesora

1. Pegarle `GUIA-PARA-IA.md` a una IA y pedir el juego para el alumno.
2. En GitHub: *Add file → Create new file*, escribir la ruta `games/<juego>/<alumno>.json`, pegar el JSON y *Commit*.
3. En 1–2 minutos aparece en el link del alumno. Si falla, en la pestaña *Actions* se ve el error para pegárselo a la IA.

## Configuración inicial (una vez)

1. Subir esta carpeta a un repositorio de GitHub (rama `main`).
2. *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
3. Dar acceso de escritura al repo solo a quien deba editar: **la seguridad de la edición la da GitHub, no la página**.

## Probar en local

```
node scripts/build.mjs --check     solo validar
preview.bat                        validar, construir y servir en http://localhost:8000/#/s/sofia
```
(`fetch` no funciona abriendo `index.html` con doble clic; hace falta un servidor, por eso `preview.bat`.)

## Editor local (solo para vos)

Abrí `teacher/index.html` con doble clic (o desde localhost). Es el creador de juegos de siempre (biblioteca, banco de vocabulario, editor, vista previa) y guarda en el navegador de esa computadora. Para publicar un juego: botón **Export**, que copia o descarga el JSON y te dice en qué ruta guardarlo.

No se puede editar online por tres motivos: el sitio publicado no incluye ningún código de edición; `teacher/` no se copia al sitio (el build solo publica `index.html`, `css/`, `js/`, `games/` e `index/`); y aunque alguien abriera esa página online, `teacher/index.html` se niega a cargar fuera de `file://` o `localhost`.

## Límites a tener en cuenta

- Todo lo que está en el sitio es público: los JSON (con las respuestas) se pueden ver desde el navegador, y quien conozca el link de otro alumno puede abrirlo. Usá solo nombres de pila o alias.
- Un juego en `todos.json` solo aparece a alumnos que tengan al menos un archivo propio en algún juego.
- Los juegos de ejemplo de `games/` (Sofía y Martín) se pueden borrar.

## Agregar un tipo de juego nuevo

Copiá un archivo de `js/games/`, cambiá `type`/`label` y las funciones `blank`, `validate`, `editor`, `player`, `fromVocab`; agregá su `<script>` en `index.html` y `teacher/index.html`, su nombre en la lista de `scripts/build.mjs`, y su `normalize` en `js/lib/loader.js`.
