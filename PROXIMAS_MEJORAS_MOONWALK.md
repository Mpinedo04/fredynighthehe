# Próximas mejoras · M00NW4LK.EXE

Plan para la siguiente tanda del juego 3D (`/walk-exe`): **diseño del enemigo (Sujeto M-22)** y **su inteligencia**. Todavía no está hecho; aquí queda apuntado qué cambiar, dónde y en qué orden.

> **El pasadizo de la portada ya está rehecho** (escena 3D con el modelo real). Este documento es solo para el juego del laberinto.

---

## 0. Cómo es hoy el Sujeto M

**El modelo.**
- `public/models/subject-m22.glb`, 3,7 MB, unas 213 piezas sin esqueleto, cada pieza con su nombre: `hips`, `head`, `jaw`, `hat`, `facePlateLeft`/`Right`, `eyeGlowLeft`/`Right`, brazos, piernas, guante de cristal…
- 4 animaciones: `idle`, `moonwalk`, `investigate` y `chase`.
- Las texturas PBR están en `public/models/subject-m22-materials` y se aplican desde `subject-materials.ts`.

**La IA** (`decideEnemyState` en `game-core.ts`) es una máquina de estados:
- **Estados:** `patrol`, `listen`, `investigate`, `search`, `chase`, `lure`, `vent-watch`, `ambush` y `recover`.
- **Oído:** escucha ruidos con memoria (`ACOUSTIC_PROFILES`): agacharse, andar, correr, conductos, golpes metálicos y la alarma de la salida.
- **Vista:** tiene línea de visión por el pasillo (`corridorLineOfSight`) y predice hacia dónde corres (`extrapolateAcousticTrailCell`).
- **Movimiento:** usa el camino más corto por la cuadrícula (`mazePath`), con velocidades por estado.

**Sus límites hoy.**
- Ve en línea recta por todo el pasillo sin importar la luz. No tiene cono de visión ni memoria de dónde suele esconderse el jugador.
- Patrulla entre celdas al azar (`spread`) y no tiene «personalidad».
- No reacciona a la linterna ni a las cámaras de forma diferente.
- Nunca se esconde ni tiende emboscadas lejos de los conductos.
- No aprende de la partida: la dificultad es la misma al minuto 1 y al minuto 10.
- Las 4 animaciones se cortan entre sí con un fundido básico. No hay animaciones de acecho, de quedarse quieto como una estatua ni de girar la cabeza buscando.

---

## 1. Diseño del enemigo (modelo y presencia)

### 1.1 Modelo y materiales
- [ ] **Siluetas a distancia:** variante LOD del modelo con la silueta exagerada (sombrero más ancho y hombros más marcados) para que se reconozca a 20 m en la niebla.
- [ ] **Traje más sucio y roto:** desgarros en la chaqueta marfil que dejen ver el endoesqueleto; manchas de aceite que bajan desde el cuello.
- [ ] **Guante de cristal que brilla de verdad:** material emisivo con parpadeo propio, para que se vea antes que el resto del cuerpo en la oscuridad.
- [ ] **Ojos:** pupilas que se contraen bajo la linterna (escalar `eyeGlow` según el foco) y un rastro de luz roja cuando se mueve rápido.
- [ ] **Sombrero:** física al perderlo (si se le cae, se queda en el suelo y el jugador puede verlo: «pasó por aquí»).

### 1.2 Animación
- [ ] **Animaciones nuevas** (en el GLB o procedurales sobre los nodos):
  - `stalk`: avanzar agachado y lento;
  - `freeze`: pose de estatua, inmóvil;
  - `head-scan`: barrido lento de la cabeza;
  - `spin-turn`: giro de MJ antes de echar a correr;
  - `lean`: la inclinación de Smooth Criminal mientras escucha.
- [ ] **Mezcla por capas:** piernas con la locomoción y torso/cabeza con la búsqueda, usando `AnimationMixer` con pesos por capa en vez de fundidos completos.
- [ ] **Movimiento según la velocidad real**, para que no patine: `timeScale` de la animación ligado a la velocidad efectiva.
- [ ] **Moonwalk como amenaza:** cuando patrulla de espaldas al jugador, que se acerque en moonwalk (como en el pasadizo) en lugar de andar normal.

### 1.3 Sonido y señales
- [ ] **Firma sonora por estado:** servo agudo al investigar, zumbido grave al acechar y metal arrastrado al perseguir.
- [ ] **El hee-hee como herramienta de la IA:** en vez de reírse al azar, que lo use para **asustar y hacer correr** al jugador (y así oírle correr).
- [ ] **Pasos falsos:** reproducir pasos en otro pasillo para despistar (la IA «miente»).

---

## 2. Inteligencia (IA)

### 2.1 Percepción más realista
- [ ] **Cono de visión** de unos 110° y alcance según la luz:
  - con la linterna encendida (`F`), el jugador se ve desde muy lejos;
  - apagada, solo de cerca;
  - agachado, el alcance se reduce a la mitad.
- [ ] **Medidor de detección** en lugar del «te veo / no te veo»: sube con el tiempo dentro del cono y se muestra en el HUD como una «señal» que se llena (estilo sigilo).
- [ ] **Oclusión del sonido:** los ruidos atraviesan peor las paredes. Usar la distancia por pasillos (ya existe con `mazeDistances`) en lugar de la distancia en línea recta.

### 2.2 Memoria y aprendizaje dentro de la partida
- [ ] **Mapa de calor del jugador:** guardar por celda cuánto tiempo pasa ahí el jugador y patrullar con más frecuencia las zonas «calientes».
- [ ] **Recordar escondites:** si el jugador se libra entrando a un conducto, revisar esa salida más adelante.
- [ ] **Recordar cintas:** cuando el jugador coge una cinta, M sabe que vendrá a por las demás y vigila las celdas de las cintas que quedan (las tiene `runtimeTapes`).
- [ ] **Dificultad adaptativa:** subir la velocidad base con cada cinta recogida (de 1 a 3 a 5, cada vez más agresivo) y bajarla un poco si el jugador muere muy rápido.

### 2.3 Comportamientos nuevos
- [ ] **Acecho (`stalk`):** si oye al jugador pero no lo ve, se acerca despacio y en silencio, sin pasos audibles.
- [ ] **Estatua (`freeze`):** si la linterna le apunta directamente, se queda quieto como un maniquí. Si el jugador aparta la luz, avanza (guiño a FNAF y a los Weeping Angels).
- [ ] **Emboscada en cruces:** calcular hacia qué cruce va el jugador (ya hay predicción) y llegar antes por otra ruta.
- [ ] **Cortar el paso a la salida:** con 3 cintas, a veces patrulla cerca de la puerta.
- [ ] **Uso de conductos por parte de M:** que también pueda entrar en un conducto y salir por el otro lado.
- [ ] **Reacción a las cámaras:** si el jugador lo mira mucho por CCTV, M «nota» la cámara, la mira de frente y la rompe (esa cámara pasa a mostrar estática).

### 2.4 Director de tensión (estilo Left 4 Dead)
- [ ] **Bucle de tensión:** un módulo `tension-director.ts` que mida el estrés (cercanía, tiempo sin verle, pulso) y alterne entre picos y momentos de calma.
  - Tras un susto fuerte, M se aleja un rato (fase de calma).
  - Si el jugador lleva mucho tranquilo, M «se entera» de dónde está (fase de presión).
- [ ] **Sustos programados por el director:** luces que fallan, una risa lejana o el sombrero en el suelo, en los momentos de calma, para que nunca baje del todo la tensión.

---

## 3. Arquitectura propuesta

| Pieza | Archivo | Qué hace |
|---|---|---|
| Percepción | `app/walk-exe/perception.ts` (nuevo, puro y con tests) | Cono de visión, medidor de detección, oclusión de sonido |
| Memoria | `app/walk-exe/enemy-memory.ts` (nuevo, puro) | Mapa de calor, escondites, cintas, último avistamiento |
| Decisión | `decideEnemyState` en `game-core.ts` | Ampliar con `stalk`, `freeze`, `intercept`, `guard-exit` y `vent-hunt` |
| Director | `app/walk-exe/tension-director.ts` (nuevo, puro) | Fases de calma/presión y eventos de ambiente |
| Animación | `WalkGame.tsx` (sección del mixer) | Capas, nuevas acciones y `timeScale` según la velocidad |
| QA | `__M00NQA__` | `stageEnemy` + nuevos `stageFreeze` y `stageStalk` para probar cada estado |

Igual que hoy, toda la lógica de decisión debe ser **pura y con tests** (`tests/maze-core.test.mjs` y `tests/walk-run.test.mjs`), y `WalkGame.tsx` solo la usa.

---

## 4. Orden recomendado

1. **Cono de visión y medidor de detección**: es lo que más cambia la sensación de sigilo.
2. **Estatua con la linterna**: la mecánica más divertida y original.
3. **Acecho silencioso y emboscada en cruces.**
4. **Memoria (mapa de calor, cintas, escondites) y dificultad adaptativa.**
5. **Director de tensión.**
6. **Modelo y animaciones nuevas**: requieren tocar el GLB, así que mejor cuando la IA ya esté cerrada.

---

## 5. Cómo probarlo

- **Tests puros:** cada estado nuevo con su caso. Por ejemplo, «con la linterna apagada y agachado no detecta a 6 celdas», o «tras recoger 3 cintas vigila la salida».
- **Modo QA:** `/walk-exe?qa` y `/walk-exe?qa&tapes=3` con `__M00NQA__` para colocar al enemigo y al jugador en situaciones concretas.
- **Prueba de juego real:** una partida de 10 minutos con auriculares, anotando cuándo baja la tensión.
