# AI Act Diagnosis Bot

Lead magnet publico para la consultoria AI Act de Jose Robles, orientado a PYMEs espanolas de 50 a 500 empleados.

El visitante responde un cuestionario adaptativo, obtiene una clasificacion orientativa bajo el Reglamento (UE) 2024/1689 (AI Act) y descarga un PDF con obligaciones aplicables. CTA principal: reservar un diagnostico tecnico completo con Jose Robles.

## Stack

- Astro 4 static con TypeScript
- Tailwind CSS con componentes estilo shadcn
- React islands para cuestionario, resultado y PDF
- `pdf-lib` para generar PDF en cliente
- Estado local en `localStorage`
- Sin backend, sin cookies obligatorias, sin Google Analytics
- Telemetria opt-in compatible con Plausible self-hosted si se anade el script de Plausible
- Deploy a GitHub Pages

## Desarrollo

```bash
npm install
npm run dev
```

Build de produccion:

```bash
npm run build
npm run preview
```

La configuracion de GitHub Pages vive en `astro.config.mjs`:

```js
site: "https://josediegorobles.github.io",
base: "/ai-act-diagnosis-bot"
```

## Como modificar preguntas sin tocar codigo

El motor esta en `src/lib/decisionTree.ts`, pero el arbol se cambia editando JSON:

- Espanol: `src/data/questions.es.json`
- Ingles: `src/data/questions.en.json`
- Obligaciones ES: `src/data/obligations.es.json`
- Obligaciones EN: `src/data/obligations.en.json`

Cada pregunta puede tener:

- `id`: identificador estable
- `title` y `help`: texto visible
- `when`: condicion simple para mostrar la pregunta
- `options`: respuestas posibles
- `effects`: impactos declarativos

Ejemplo:

```json
{
  "id": "employment_selection",
  "when": { "question": "uses_ai", "equals": "yes" },
  "options": [
    {
      "value": "yes",
      "label": "Si",
      "effects": [
        { "type": "classification", "value": "high-risk" },
        { "type": "annex", "value": "Anexo III: empleo y gestion de trabajadores" }
      ]
    }
  ]
}
```

Tipos de efectos soportados:

- `classification`: `prohibited`, `high-risk`, `limited` o `minimal`
- `obligation`: anade una obligacion por `id`
- `annex`: anade una senal de encaje en Anexo
- `flag`: anade una nota de revision
- `role`: anade rol como `deployer` o `provider`

La prioridad de clasificacion es:

```text
prohibited > high-risk > limited > minimal
```

## Obligaciones cubiertas

El contenido inicial cita obligaciones y referencias del AI Act, incluyendo:

- Art. 5: practicas prohibidas
- Art. 9: gestion de riesgos
- Art. 10: datos y gobernanza
- Art. 11 y Anexo IV: documentacion tecnica
- Art. 12: logs
- Art. 13: transparencia e instrucciones
- Art. 14: supervision humana
- Art. 26: obligaciones del deployer
- Art. 50: transparencia para chatbots y contenido sintetico
- Art. 51: revision GPAI
- Anexo III: categorias de alto riesgo

## Privacidad y telemetria

El cuestionario no pide nombre, email ni datos personales. Las respuestas se guardan en `localStorage`.

La telemetria esta desactivada por defecto. Si el usuario marca el opt-in y el sitio tiene un script Plausible self-hosted que exponga `window.plausible`, se envia solo:

- clasificacion
- numero de respuestas

No se incluye PII.

## Disclaimer legal

El footer de la web y del PDF incluyen:

> Esta herramienta provee una clasificación orientativa basada en el Reglamento (UE) 2024/1689 (AI Act). No constituye asesoramiento legal. Verifica con abogado especializado antes de tomar decisiones de cumplimiento.

## Deploy

1. Crear el repositorio publico `github.com/josediegorobles/ai-act-diagnosis-bot`.
2. Subir el codigo a `main`.
3. En GitHub, activar Pages usando GitHub Actions.
4. El workflow `.github/workflows/deploy.yml` publicara `dist`.

URL esperada:

```text
https://josediegorobles.github.io/ai-act-diagnosis-bot/
```

## Fuentes

- Reglamento (UE) 2024/1689 en EUR-Lex: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
