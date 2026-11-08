# Guía para crear juegos con IA

Pegale a la IA **todo este archivo** y después pedile, por ejemplo:

> Hacé un juego de tipo *connections* sobre ropa (nivel A2) para Sofía.

La IA tiene que devolver **un solo archivo JSON**. Guardalo en:

```
games/<carpeta-del-juego>/<alumno>.json
```

- `<carpeta-del-juego>`: una carpeta por juego, en minúsculas y con guiones. Ej: `ropa-connections`.
- `<alumno>`: el nombre del alumno en minúsculas, **sin tildes ni espacios**. Ej: `sofia.json`, `martin.json`.
- Si el mismo juego es para varios alumnos con contenido distinto, ponés un archivo por alumno en la misma carpeta.
- Si querés un juego para **todos** los alumnos, el archivo se llama `todos.json`. (Si además existe el archivo de un alumno en esa carpeta, el del alumno tiene prioridad.)
- El link de cada alumno es `…/#/s/<alumno>` (ej: `#/s/sofia`). El juego aparece solo, dentro de su categoría.

Al subir el archivo a GitHub, una validación automática revisa todo. Si hay un error, **no se publica nada** y GitHub muestra qué archivo y qué falló: se lo pegás a la IA y lo corrige.

---

## Reglas para la IA

- Respondé **solo con el JSON**, sin explicaciones ni bloques de texto alrededor.
- El texto del juego va en inglés. El `student` es el nombre para mostrar (puede llevar tilde, ej. "Sofía").
- No inventes campos. No incluyas `id` ni grillas: se generan solas.
- No repitas palabras donde se indica que deben ser únicas.

## Campos comunes (todos los juegos)

```json
{
  "type": "connections",
  "title": "Clothes connections",
  "description": "Sort 16 clothing words into four groups.",
  "student": "Sofía",
  "level": "A2",
  "topic": "Clothes",
  "difficulty": "Medium",
  "instructions": "Opcional. Si no lo ponés se usa el texto estándar del juego.",
  "content": { }
}
```

- `type` (obligatorio): `connections`, `matching`, `multiple-choice`, `fill-blanks`, `scramble`, `odd-one-out`, `word-search` o `crossword`.
- `title` (obligatorio) · `level` (obligatorio): `A1` `A2` `B1` `B2` `C1` `C2` · `difficulty`: `Easy` `Medium` `Hard`.
- `description`, `student`, `topic`, `instructions`: opcionales.
- `content`: depende del tipo (abajo).

## `content` por tipo

### connections — 4 categorías de 4 palabras (16 palabras distintas)
```json
"content": { "groups": [
  { "name": "Tops", "explanation": "Clothes for the upper body.", "words": ["shirt", "sweater", "jacket", "blouse"] },
  { "name": "Bottoms", "explanation": "...", "words": ["jeans", "skirt", "shorts", "trousers"] },
  { "name": "Footwear", "explanation": "...", "words": ["boots", "sandals", "sneakers", "slippers"] },
  { "name": "Accessories", "explanation": "...", "words": ["scarf", "belt", "gloves", "hat"] }
] }
```

### matching — unir palabra con definición, traducción o imagen
`mode`: `definition`, `translation` o `image`. Mínimo 2 pares; las respuestas no pueden repetirse.
`pairsToShow`: cuántos pares por ronda (`0` = todos).
```json
"content": { "mode": "translation", "pairsToShow": 0, "pairs": [
  { "term": "shirt", "translation": "camisa" },
  { "term": "skirt", "translation": "pollera" }
] }
```
(Con `definition` se usa el campo `definition`; con `image`, el campo `image` con una URL https.)

### multiple-choice — preguntas con opciones
`optionCount` (2–6) es el total de opciones; cada pregunta necesita al menos `optionCount - 1` respuestas incorrectas en `wrong`.
```json
"content": { "optionCount": 4, "allowRetry": true, "questions": [
  { "prompt": "Which word means a piece of clothing for your feet?", "correct": "sock",
    "wrong": ["glove", "scarf", "belt"], "explanation": "Opcional." }
] }
```

### fill-blanks — completar la oración (un solo hueco `___` por oración)
```json
"content": { "items": [
  { "sentence": "I wear a ___ when it rains.", "answer": "raincoat", "alternatives": ["rain coat"], "hint": "Opcional" }
] }
```

### scramble — ordenar letras (mínimo 3 letras por palabra)
```json
"content": { "showHints": true, "words": [
  { "word": "jacket", "hint": "You wear it over a shirt when it is cold." }
] }
```
(Si `showHints` es `true`, cada palabra necesita `hint`.)

### odd-one-out — encontrar la palabra que no pertenece
Cada grupo: de 4 a 5 palabras, y `odd` es **la palabra** intrusa (tiene que estar en `words`).
```json
"content": { "groups": [
  { "words": ["shirt", "skirt", "banana", "jeans"], "odd": "banana", "explanation": "A banana is a fruit." }
] }
```

### word-search — sopa de letras (solo la lista de palabras; la grilla se genera sola)
`size`: `small`, `medium` o `large`. Las palabras tienen que entrar en la grilla.
`directions`: `horizontal`, `vertical`, `diagonal`, `backwards` (true/false).
```json
"content": { "size": "medium", "directions": { "horizontal": true, "vertical": true, "diagonal": true, "backwards": false },
  "words": ["shirt", "skirt", "jacket", "scarf", "boots"] }
```

### crossword — crucigrama (palabras con pista; el diseño se genera solo)
Mínimo 2 palabras, sin repetir, cada una con `clue`.
```json
"content": { "allowReveal": true, "entries": [
  { "word": "scarf", "clue": "You wear it around your neck in winter." },
  { "word": "jacket", "clue": "A short coat." }
] }
```
