# Qué ha cambiado en Premiere 22 (y dónde está cada cosa)

> **Lo primero: no se ha borrado código.** Las ~2.000 líneas de `page.tsx` y las
> ~8.700 de `globals.css` no se han tirado. Se han **repartido en archivos más
> pequeños**, uno por sección, para que sea fácil encontrar y tocar cada parte.
> Si sumas los archivos nuevos, sale lo mismo o más.

Commit: `516d7a7 · Mejora masiva de la premiere y pack de bromas` (más el merge de
GitHub `ecdca63`, que no contiene cambios propios).

---

## 1. Dónde ha ido el CSS (las «8.000 líneas»)

Antes todo el estilo vivía en **un solo archivo** de 8.737 líneas: `app/globals.css`.

Ahora `globals.css` tiene **21 líneas** y solo hace una cosa: importar, **en el
mismo orden de siempre**, los trozos en los que se ha partido:

```css
@import "tailwindcss";
@import "./styles/01-base.css";
@import "./styles/02-cold-open-hero.css";
/* … */
@import "./styles/18-micro-lab.css";
@import "./styles/19-polish.css";   /* ← esto sí es nuevo */
```

El corte se hizo **línea a línea, sin cambiar nada**: el trozo 01 son las líneas
1–203 del archivo original, el 02 las 204–517, y así hasta el final. El orden de
los imports es idéntico al original, así que la cascada de CSS no cambia y la
web se ve igual que con el archivo único.

| Archivo en `app/styles/` | Líneas | Qué contiene (del `globals.css` original) |
|---|---:|---|
| `01-base.css` | 200 | Fuentes, colores, `body`, grano, barra superior |
| `02-cold-open-hero.css` | 313 | Intro negra y portada (hero, entrada, título) |
| `03-portrait.css` | 217 | «Una sola persona. Demasiados créditos.» |
| `04-filmography.css` | 180 | La videoteca y la tira de cintas |
| `05-behind.css` | 152 | Hoja de contactos (detrás de las cámaras) |
| `06-dossier.css` | 174 | El expediente de Raúl |
| `07-reference-room.css` | 146 | Cabecera de la sala de referentes |
| `08-friends-trailer-finale.css` | 429 | Amigos, cartel del Corte 22, claqueta, mensaje final y footer |
| `09-trailer-modal.css` | 550 | El montaje interactivo (modal del tráiler) |
| `10-recovered.css` | 514 | Tarjeta «Material recuperado» |
| `11-worlds.css` | 1.786 | Los 4 mundos: MJ, FNAF, microtonal… |
| `12-poitrine.css` | 353 | Angine de Poitrine (parte visual del 24 TET) |
| `13-moonwalk-chase.css` | 463 | El pasadizo M00NW4LK de la portada |
| `14-video-hee.css` | 459 | Modal de YouTube y panel del hee-hee |
| `15-responsive.css` | 887 | Todas las reglas de móvil/tablet |
| `16-secret-extras.css` | 1.078 | Los 4 secretos (consola EXTRAS, FNAF, continuidad…) |
| `17-spielberg.css` | 405 | El mundo Spielberg y la inversión del scroll |
| `18-micro-lab.css` | 412 | Laboratorio 24 TET a pantalla completa |
| **Subtotal (lo que había)** | **8.718** | ≈ las 8.737 originales (solo se movió la línea de `tailwindcss`) |
| `19-polish.css` | 1.446 | **Nuevo**: todas las mejoras visuales de esta tanda |

Además, `app/pranks/pranks.css` (1.483 líneas) tiene el estilo de las bromas
nuevas, y se importa desde `app/layout.tsx`.

---

## 2. Dónde ha ido el TSX (las «2.000 líneas»)

Antes `app/page.tsx` tenía **2.579 líneas** que mezclaban cuatro cosas:

1. **Datos y textos**: listas de proyectos, películas de Spielberg, cámaras, gritos…
2. **Todas las secciones** de la página, en un único `return` gigante.
3. **Los modales** (vídeo, tráiler, material recuperado, pasadizo).
4. **La lógica**: hee-hee, banda sonora, sustos, etc.

Ahora `page.tsx` tiene **512 líneas**: solo hace de director de orquesta, con el
estado que comparten varias partes (hee-hee, modales, claqueta…), y coloca cada
pieza en su sitio. El resto se ha movido así:

### 2.1 Datos y textos → `app/content.ts` (653 líneas)

Todas las constantes que estaban al principio de `page.tsx` (`credits`,
`projects`, `trailerScenes`, `cameraFeeds`, `michaelEras`, `spielbergFilms`,
`animatronicArchive`, `recoveredFragments`, `microtonalTracks`, `behindFrames`,
`dossier`, `heeButtonLabels`…) están ahora aquí, **con el mismo contenido**.

👉 **Para cambiar un texto ya no hace falta tocar ningún componente**: se
cambia en `content.ts` y listo.

### 2.2 Cada sección → su propio archivo en `app/sections/`

| Sección de la web | Archivo nuevo | Líneas |
|---|---|---:|
| Intro negra + «Comenzar proyección» | `sections/ColdOpen.tsx` | 105 |
| Portada (PREMIERE 22) | `sections/Hero.tsx` | 83 |
| Reparto y créditos | `sections/Portrait.tsx` | 55 |
| La videoteca de Raúl | `sections/Filmography.tsx` | 147 |
| Detrás de las cámaras | `sections/Behind.tsx` | 125 |
| El expediente | `sections/Dossier.tsx` | 101 |
| Cuatro obsesiones (pestañas) | `sections/ReferenceRoom.tsx` | 147 |
| ↳ Michael Jackson | `sections/worlds/MjWorld.tsx` | 118 |
| ↳ Spielberg | `sections/worlds/SpielbergWorld.tsx` | 133 |
| ↳ Five Nights (FNAF) | `sections/worlds/FnafWorld.tsx` | 226 |
| ↳ 24 TET / Angine de Poitrine | `sections/worlds/MicroWorld.tsx` | 212 |
| Amigos | `sections/Friends.tsx` | 56 |
| Cartel «Corte 22» | `sections/TrailerTeaser.tsx` | 45 |
| Claqueta + mensaje final + postcréditos | `sections/Finale.tsx` | 161 |
| Footer | `sections/SiteFooter.tsx` | 42 |

### 2.3 Modales → `app/modals/`

| Modal | Archivo |
|---|---|
| Reproductor de YouTube | `modals/VideoModal.tsx` |
| Montaje interactivo «Corte 22» | `modals/TrailerModal.tsx` |
| Material recuperado (desbloquea el juego) | `modals/RecoveredModal.tsx` |
| Pasadizo M00NW4LK de la portada | `modals/MoonwalkChase.tsx` |

### 2.4 Elementos fijos en pantalla → `app/hud/`

- `hud/Topbar.tsx`: la barra de arriba (menú, reloj FNAF, banda sonora, tira de escenas).
- `hud/HeeHud.tsx`: el panel que se escapa al intentar silenciar el hee-hee, las palabras «HEE-HEE» y los avisos de silencio.

### 2.5 Piezas compartidas (nuevas)

| Archivo | Para qué sirve |
|---|---|
| `app/audio/engine.ts` | **Un solo motor de audio** para toda la web: banda sonora, hee-hee, notas microtonales y efectos. |
| `app/ui/useModal.ts` | Lo que hacen todos los modales: cerrar con Escape, no dejar que el foco se escape y bloquear el scroll de detrás. |
| `app/ui/useReveal.ts` | Las animaciones de aparición al hacer scroll. |
| `app/ui/Toasts.tsx` | Una sola cola de avisos, para que no se pisen unos con otros. |
| `app/ui/nightStore.ts` | Reloj y energía de la noche FNAF compartidos (barra de arriba y consola de cámaras). |

### 2.6 Las bromas → `app/pranks/` + `app/prank-system.mjs`

`NightSystem.tsx` (reloj, energía, apagón, pestaña vigilada), `HauntedExtras.tsx`
(vaso, linterna, fotos, nave, pan, calor, palabras secretas…), `DirectorMic.tsx`
(¡CORTEN!), `EndCredits.tsx` (créditos + diploma), `Achievements.tsx` (logros),
`audio.ts` (sonidos sintetizados) y `bus.ts` (avisos entre piezas).
`prank-system.mjs` tiene la lógica pura con tests.

### 2.7 Lo que no se ha tocado

- `app/walk-exe/` (**el juego M00NW4LK.EXE**): solo se añadió que el móvil vibre en los sustos.
- `app/SecretExtras.tsx` (los 4 secretos) **sigue en su sitio**. Solo se ha conectado a los avisos compartidos, al reloj de arriba y al audio único.

---

## 3. Por qué se ha hecho así

- **Encontrar las cosas**: antes, para cambiar el texto de una película había que bucear en un archivo de 2.600 líneas. Ahora está en `content.ts`.
- **Que no se rompan unas partes al tocar otras**: cada sección es independiente.
- **Rendimiento**: con todo en un componente, cada % de scroll volvía a pintar la página entera. Ahora las secciones que no cambian no se repintan.
- **Audio**: antes cada nota del teclado microtonal creaba un `AudioContext` nuevo (Chrome tiene un límite) y cada hee-hee era un `new Audio()`, hasta 48 a la vez. Ahora hay uno solo, compartido.

---

## 4. Fallos que había y se han arreglado

| Fallo | Arreglo |
|---|---|
| El **hero** salía roto: la foto a la izquierda y el «22» saliéndose por la derecha. | Una regla de los secretos (`[data-secret-anchor] { position: relative }`) sacaba la foto de su sitio. Vuelve a verse como estaba diseñado. |
| La **persecución M00NW4LK** de la portada estaba programada pero nunca se activaba. | Ahora se abre pulsando la pista «MOONWALK» en la tarjeta de MJ. |
| Los modales de vídeo, material recuperado y persecución **no se cerraban con Escape**. | Todos usan `useModal`: Escape, foco atrapado y foco devuelto al cerrar. |
| El beacon **24 TET** tapaba siempre la parte derecha de la pantalla. | Solo aparece dentro del mundo microtonal. |
| El panel de **«Turno nocturno»** y varios avisos se pisaban entre sí. | Los objetivos pasan al reloj de arriba y los avisos van a una sola cola. |
| La **energía** de la consola de cámaras era un número inventado. | Ahora es la energía real de la noche. |
| La **luz del cursor** no seguía al cursor. | Ahora sí. |
| `og.png` pesaba **2 MB**. | `og.jpg` de 180 KB. Las miniaturas de YouTube pasan a `.webp` (la mitad de peso). |

---

## 5. Mejoras visibles

- **Intro** con cuenta atrás de film leader (3·2·1 con pitidos), que se puede saltar. A quien ya la ha visto se le ofrece «Saltar intro».
- **Barra de arriba** con tira de película de las 9 escenas, la sección actual resaltada y control de volumen.
- **Etiquetas «ESC 01…09»** y animaciones de aparición al hacer scroll.
- **Videoteca**: se navega con las flechas del teclado, la cinta elegida lleva un sello «EN SALA» y el reproductor tiene anterior/siguiente. La música baja sola mientras ves un vídeo.
- **Detrás de las cámaras**: las fotos se abren en grande, con flechas o deslizando el dedo.
- **Expediente**: medidores animados, sello que cae de golpe y barras negras que se «desclasifican» con chistes.
- **Referentes en 4 pestañas** en lugar de 6.700 px de scroll. La página pasa de 16.600 a 11.200 px de alto. Cada mundo tiene enlace propio, por ejemplo `#referentes-fnaf`.
  - MJ: las luces van al ritmo de la banda sonora.
  - Spielberg: carrusel con las 37 películas por décadas.
  - Microtonal: se puede tocar con el teclado del ordenador.
- **Amigos**: fichas de reparto nuevas.
- **Final**: franjas de cine que se abren y el mensaje aparece línea a línea.
- **Footer**: botón «◀◀ REBOBINAR» con efecto VHS.

---

## 6. Lo único que tienes que hacer tú: los amigos

En `app/content.ts`, busca `friendTestimonials` y rellena cada amigo:

```ts
{
  number: "01",
  name: "Nombre real",          // ← su nombre
  role: "AYUDANTE DE DIRECCIÓN EMOCIONAL",
  quote: "La frase que quiera decirle a Raúl.",
  image: "/archive/friends-01.webp",
  alt: "Descripción de la foto",
  pending: false,               // ← pásalo a false para que se vea la frase
},
```

Mientras `pending` sea `true`, en la web sale una claqueta de «TOMA PENDIENTE»
en lugar de la frase de relleno.

---

## 7. Cómo comprobar que todo funciona

```bash
npm run dev      # web en local
npm test         # compila y pasa los 56 tests
npm run lint     # 0 errores
```

Si añades `?qa=pranks` al final de la dirección, el reloj, la energía y los
demás temporizadores van 20 veces más rápido, para enseñar las bromas sin esperar.
