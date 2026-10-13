# Contrato de datos: funcionalidades del dashboard

Esta guía reúne las decisiones funcionales y los contratos necesarios para implementar las tres funcionalidades. La evidencia del backend está en `backend/app/routes.py`; los contratos compartidos están tipados en este directorio. No se deben cambiar los nombres API `snake_case`.

## Índice de `specs/`

| Archivo | Propósito |
|---|---|
| [`api-exploration.md`](api-exploration.md) | Endpoints, parámetros, respuestas, errores y contraste registrado con `/docs`. |
| [`api-types.ts`](api-types.ts) | Enums literales y tipos de respuesta (`FacetsResponse`, `AlertsResponse`, `TopCategoriesResponse`). |
| [`param-types.ts`](param-types.ts) | Tipos de query (`DateRangeFilter`, `AlertsParams`, `TopCategoriesParams`). |
| [`components.md`](components.md) | Responsabilidades, props, estados UI y decisiones de interacción de cada funcionalidad. |
| [`tsconfig.json`](tsconfig.json) | Compilación estricta y aislada de los archivos TypeScript de `specs/`. |
| `README.md` | Contrato operativo y guía de implementación para una sesión nueva. |

Validar los tipos de esta carpeta desde `frontend/` con:

```bash
npx tsc -p specs
```

El `npx tsc --noEmit` habitual desde `frontend/` no incluye `specs/`: `tsconfig.app.json` solo incluye `src`.

## 1. Filtro de rango de fechas

**Endpoints y verificación:**

- `GET /api/metrics/facets` está verificado en vivo en `/docs` (OpenAPI). No acepta parámetros y responde `FacetsResponse`: `operation_types`, `business_types`, `categories`, `min_date`, `max_date`.
- `GET /api/metrics` está verificado en vivo en `/docs`: acepta `start_date`, `end_date`, `category` y `operation_type`. Para este filtro se envían `start_date`/`end_date`; responde un array `FinancialMovement[]`, cuyo tipo actual está en `frontend/src/lib/financial-types.ts` (no en `api-types.ts`).

**Tipos de petición/respuesta:**

- Query: `DateRangeFilter` de [`param-types.ts`](param-types.ts). `start_date?: string` y `end_date?: string`, formato de fecha calendario `YYYY-MM-DD`; cada extremo es opcional.
- Facets: `FacetsResponse` de [`api-types.ts`](api-types.ts). Las fechas disponibles tienen formato `YYYY-MM-DD`; `categories` es la lista global.
- Movimientos: `FinancialMovement[]` de `frontend/src/lib/financial-types.ts`, con `create_date`, `amount`, `operation_type`, `category`, `business_type`.

**Restricciones y aplicación:**

- Al abrir el dashboard, inicializar `start_date` y `end_date` vacíos para mostrar todos los datos. Aplicar automáticamente cada cambio de input cuando el rango resultante sea válido; no mostrar botón de aplicar. Enviar solo las fechas rellenas. Solo `start_date` significa desde esa fecha inclusiva; solo `end_date`, hasta esa fecha inclusiva; ambas vacías significa sin límite de fecha. El filtrado inclusivo está en `backend/app/routes.py` líneas 116–121.
- El backend no declara validación `start_date <= end_date`, ni cotas de fecha en el query. Si el rango está invertido, mostrar exactamente `La fecha inicial no puede ser posterior a la fecha final.`, no consultar y conservar el último rango válido aplicado.
- Usar `min_date` y `max_date` de facets como intervalo global disponible. Mostrar cerca de los inputs `Rango disponible: {min_date} – {max_date}`. Si una fecha introducida queda fuera de ese intervalo, mostrar exactamente `La fecha debe estar entre {min_date} y {max_date}.`, no aplicar el rango ni consultar. Facets no se filtra por el rango seleccionado; devuelve extremos/categorías globales (`routes.py` líneas 150–158 y 262–265).
- Si las fechas están en el intervalo válido pero no hay movimientos, conservar los controles y mostrar `No hay movimientos para el rango seleccionado`.

**Casos límite que debe cubrir la UI:**

1. Al abrir, ambas fechas vacías: consultar sin límites para mostrar todos los datos.
2. Solo `start_date` o solo `end_date`: aplicar automáticamente al cambiar el input, consultar con ese único parámetro y aplicar el límite inclusivo.
3. `start_date > end_date`: mostrar `La fecha inicial no puede ser posterior a la fecha final.`, no consultar y conservar el último rango válido.
4. Fecha anterior a `min_date` o posterior a `max_date`: mostrar `La fecha debe estar entre {min_date} y {max_date}.`, no consultar y mantener visible el intervalo global junto a los inputs.
5. Rango válido sin resultados: mantener el filtro visible y presentar `No hay movimientos para el rango seleccionado`.

## 2. Tabla de alertas de anomalías

**Endpoint y verificación:** `GET /api/metrics/alerts`, verificado en vivo en `/docs` (OpenAPI). Admite query opcional y responde `AlertsResponse` (`AlertEntry[]`).

**Tipos de petición/respuesta:** `AlertsParams` de [`param-types.ts`](param-types.ts) y `AlertsResponse`/`AlertEntry` de [`api-types.ts`](api-types.ts).

| Parámetro | Tipo | Restricciones y default |
|---|---|---|
| `threshold` | `number` | API: mínimo `0`, sin máximo, default `0.3`. UI: aceptar `0.01–1.0`, `step=0.01` y mostrar dos decimales (`0.30` por defecto); validar antes de enviar. |
| `group_by` | `GroupBy` | `day`, `week` o `month`; default API `month`. |
| `start_date`, `end_date` | `string` | Opcionales, inclusivas, formato `YYYY-MM-DD`; compartir el rango aplicado en el filtro de fechas. |

No mostrar control de `business_type` para alertas. Omitir siempre el parámetro para consultar alertas en ambos segmentos.

La respuesta contiene `period`, `outcome_total`, `baseline_average`, `increase_ratio`. Formato de `period`: para `day`, `YYYY-MM-DD`; para `week`, `YYYY-Www` (año ISO y número de semana ISO de dos dígitos); para `month`, `YYYY-MM` (`api-types.ts` documenta la cita `backend/app/routes.py:169-175`). `increase_ratio` es ratio: mostrar `increase_ratio × 100` como porcentaje; `0.45` se muestra `45%`. `baseline_average` es la media de todos los períodos anteriores ya recorridos, no una media móvil de tres (`backend/app/routes.py:227`). Etiquetar la columna **Media de egresos de todos los períodos anteriores**.

**Casos límite que debe cubrir la UI:**

1. Campo `threshold` vacío, no numérico o fuera de `0.01–1.0`: mostrar exactamente `Introduce un umbral entre 0.01 y 1.00.`, no enviar petición y conservar el último valor aplicado válido. No ampliar la UI al rango más permisivo de la API. Usar `step=0.01` y mostrar dos decimales.
2. Respuesta `[]` para el umbral/rango actual: mantener controles, encabezados y tabla, y mostrar una fila vacía explícita: `No se detectaron anomalías para el umbral actual.` No ocultar la tabla.
3. Error HTTP, incluido `422`: conservar la sección y mostrar el error; no tratarlo como ausencia de anomalías.
4. Cambio de rango de fechas: propagar los extremos válidos a `AlertsParams` y volver a consultar; no perder threshold ni `group_by`.

## 3. Vista comparativa B2B vs B2C

**Endpoints y verificación:**

- `GET /api/metrics/categories/top` está verificado en vivo en `/docs` (OpenAPI). Ejecutar dos peticiones, no una: una para cada grupo.
- `GET /api/metrics/facets` está verificado en vivo en `/docs`; solo sirve para opciones/rango global, no ofrece facets por segmento.

**Tipos de petición/respuesta:** `TopCategoriesParams` de [`param-types.ts`](param-types.ts), `TopCategoriesResponse` (`CategoryEntry[]`) de [`api-types.ts`](api-types.ts) y `FacetsResponse` de `api-types.ts`.

| Petición | Parámetros fijos | Parámetros compartidos |
|---|---|---|
| B2B | `operation_type: "income"`, `limit: 5`, `business_type: "B2B"` | `start_date`, `end_date` del filtro activo, si están definidos |
| B2C | `operation_type: "income"`, `limit: 5`, `business_type: "B2C"` | Las mismas fechas que B2B |

`operation_type` solo admite `income`/`outcome` (el default de API es `outcome`, por eso esta vista debe enviar explícitamente `income`). `limit` debe ser entero entre `1` y `20`, default API `5`. Las fechas son opcionales, inclusivas y `YYYY-MM-DD`. `business_type` solo admite `B2B` o `B2C`. Cada `CategoryEntry` tiene `category`, `operation_type`, `total_amount`.

El backend mock solo asigna `sales` y `others` a ingresos (`backend/app/routes.py:79`); con `limit=5`, cada grupo puede devolver como máximo dos categorías y puede devolver cero. El total de ingresos por grupo es la suma de sus `total_amount`. Porcentaje de cada categoría: `total_amount / sum(total_amount de categorías income del mismo grupo) × 100`; si el denominador es cero, mostrar `—`, no dividir. Formatear todos los importes de las tres funcionalidades con `formatCurrency` de [`frontend/src/lib/financial-utils.ts`](../src/lib/financial-utils.ts#L81), reutilizando su formato `en-US`, USD y cero decimales máximos.

`FacetsResponse.categories` es global: `/api/metrics/facets` no acepta `business_type`. No usar esa lista como si indicara disponibilidad por grupo. Para alinear filas del comparativo, usar la unión de categorías presentes en las dos respuestas; completar con cero solo la categoría ausente en el otro grupo. Si un grupo devuelve cero categorías, conservar ese panel y mostrar explícitamente `Sin ingresos/categorías para B2B en el rango seleccionado` o el equivalente B2C. El total del grupo vacío es `0`; el otro panel puede seguir mostrando sus datos. Si una petición falla, mostrar error en el panel afectado y no presentar el gráfico conjunto como completo.

El gráfico compara los totales de ingresos B2B y B2C para el mismo rango. No calcular porcentajes usando facets ni mezclar denominadores entre segmentos.

**Casos límite que debe cubrir la UI:**

1. Un grupo devuelve una categoría y el otro dos: mostrar las categorías devueltas; alinear la categoría ausente con valor cero y calcular cada porcentaje con el total de su propio grupo.
2. Un grupo devuelve `[]`: conservar su panel con el mensaje vacío y total `0`; el porcentaje queda `—`. El panel del otro grupo permanece independiente.
3. Ambos grupos devuelven `[]`: conservar ambos paneles y mostrar el mensaje de vacío en cada uno; los dos totales son `0`.
4. La carga/error de una petición: mostrar skeletons mientras ambas están pendientes; un error no equivale a `[]` y bloquea presentar una comparación completa.

## Decisiones abiertas

- **Navegación B2B vs B2C:** la app actual monta un único `App` y `frontend/package.json` no declara router. Tratar la vista como sección del dashboard por ahora; si se requiere URL/página independiente, decidir mecanismo de navegación antes de implementarla, sin asumir una librería.