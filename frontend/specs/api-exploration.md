# Fase 1: exploración de API

## Alcance y evidencia

Los contratos siguientes se describen a partir de los modelos y las firmas de `backend/app/routes.py`. Los contratos de `/api/metrics/facets`, `/api/metrics/alerts` y `/api/metrics/categories/top` se contrastaron con los resultados de OpenAPI en `/docs` indicados en este informe. `/api/metrics/comparison`, `/api/metrics/b2b` y `/api/metrics/b2c` no se verificaron en vivo. Los tipos JSON indicados corresponden a los modelos Pydantic y parámetros Python declarados en el backend.

El router se incluye sin prefijo adicional en `backend/app/main.py`; las rutas reales empiezan por `/api/metrics`.

## Endpoints

### `GET /api/metrics`

Definición: [`backend/app/routes.py`](../../backend/app/routes.py#L248). Respuesta tipada por `FinancialMovement`, definido en [routes.py](../../backend/app/routes.py#L22).

Query:

| Nombre | Tipo | Obligatorio | Default | Límites |
|---|---|---:|---|---|
| `start_date` | `date` (`YYYY-MM-DD`) | No | `null` | Sin mínimo/máximo declarado |
| `end_date` | `date` (`YYYY-MM-DD`) | No | `null` | Sin mínimo/máximo declarado |
| `category` | enum string | No | `null` | `suppliers`, `sales`, `operational`, `administrative`, `others` |
| `operation_type` | enum string | No | `null` | `income`, `outcome` |

Respuesta: array de movimientos. Cada elemento tiene:

| Campo | Tipo JSON |
|---|---|
| `create_date` | string de fecha (`YYYY-MM-DD`) |
| `amount` | number |
| `operation_type` | string: `income` o `outcome` |
| `category` | string: `suppliers`, `sales`, `operational`, `administrative` o `others` |
| `business_type` | string: `B2B` o `B2C` |

Errores: `422` si un query param no se puede validar (por ejemplo, fecha mal formada o valor fuera de los literales); no hay restricciones declaradas para `start_date <= end_date`. Código HTTP/schema exacto publicado por el servidor: ❓, porque OpenAPI en vivo no fue accesible.

### `GET /api/metrics/facets`

Definición: [`backend/app/routes.py`](../../backend/app/routes.py#L262). Respuesta tipada por `MetricsFacets`, definido en [routes.py](../../backend/app/routes.py#L30).

Query: no acepta parámetros.

Respuesta: objeto con `operation_types: string[]` (valores `income`, `outcome`), `business_types: string[]` (valores `B2B`, `B2C`), `categories: string[]` (categorías del modelo), `min_date: string` (fecha `YYYY-MM-DD`) y `max_date: string` (fecha `YYYY-MM-DD`).

Errores: no hay validaciones de query que produzcan `422`; otros errores de ejecución no quedan determinados por el handler. ✅ Verificado en `/docs` (OpenAPI): sin parámetros y respuesta con `operation_types`, `business_types`, `categories`, `min_date` y `max_date`.

### `GET /api/metrics/alerts`

Definición: [`backend/app/routes.py`](../../backend/app/routes.py#L342). Respuesta tipada por `MetricsAlert`, definido en [routes.py](../../backend/app/routes.py#L58).

Query:

| Nombre | Tipo | Obligatorio | Default | Límites |
|---|---|---:|---|---|
| `threshold` | `float` | No | `0.3` | Mínimo `0`; sin máximo declarado |
| `group_by` | string enum | No | `month` | `day`, `week`, `month` |
| `start_date` | `date` (`YYYY-MM-DD`) | No | `null` | Sin mínimo/máximo declarado |
| `end_date` | `date` (`YYYY-MM-DD`) | No | `null` | Sin mínimo/máximo declarado |
| `business_type` | string enum | No | `null` | `B2B`, `B2C` |

Respuesta: array de alertas. Cada elemento contiene `period: string`, `outcome_total: number`, `baseline_average: number` e `increase_ratio: number`.

El baseline no es una media móvil de 3 períodos: `detect_outcome_alerts` promedia todos los `outcome` de los períodos anteriores ya recorridos. El historial se amplía en cada iteración, por lo que la ventana es acumulativa y creciente ([routes.py](../../backend/app/routes.py#L219), cálculo en [routes.py](../../backend/app/routes.py#L227), acumulación en [routes.py](../../backend/app/routes.py#L239)).

Errores: `422` si los parámetros no validan (por ejemplo `threshold < 0`, enum inválido o fecha mal formada). No hay máximo para `threshold` ni validación declarada del orden de las fechas. ✅ Verificado en `/docs` (OpenAPI): tipos/defaults/límite de `threshold`, valores de `group_by`, filtros `start_date`, `end_date`, `business_type`, campos de respuesta y error `422` coinciden con lo indicado arriba.

### `GET /api/metrics/categories/top`

Definición: [`backend/app/routes.py`](../../backend/app/routes.py#L287). Respuesta tipada por `TopCategoryItem`, definido en [routes.py](../../backend/app/routes.py#L45).

Query:

| Nombre | Tipo | Obligatorio | Default | Límites |
|---|---|---:|---|---|
| `operation_type` | string enum | No | `outcome` | `income`, `outcome` |
| `limit` | `int` | No | `5` | Mínimo `1`, máximo `20` |
| `start_date` | `date` (`YYYY-MM-DD`) | No | `null` | Sin mínimo/máximo declarado |
| `end_date` | `date` (`YYYY-MM-DD`) | No | `null` | Sin mínimo/máximo declarado |
| `business_type` | string enum | No | `null` | `B2B`, `B2C` |

Respuesta: array de categorías. Cada elemento contiene `category: string` (categorías del modelo), `operation_type: string` (`income` o `outcome`) y `total_amount: number`.

Para `operation_type=income`, el generador solo asigna `sales` u `others` ([routes.py](../../backend/app/routes.py#L79)); así que, con estos datos mock, el endpoint devuelve como máximo 2 categorías aunque `limit=5`. El código no garantiza que ambas aparezcan en cada subconjunto filtrado.

Errores: `422` si los parámetros no validan (por ejemplo `limit` fuera de `1..20`, enum inválido o fecha mal formada). ✅ Verificado en `/docs` (OpenAPI): parámetros, límite de `limit`, campos de respuesta y error `422` coinciden con lo indicado arriba.

### `GET /api/metrics/comparison` (sufijo `/comparison`)

Definición: [`backend/app/routes.py`](../../backend/app/routes.py#L305). Respuesta tipada por `MetricsComparison`, definido en [routes.py](../../backend/app/routes.py#L51).

Query:

| Nombre | Tipo | Obligatorio | Default | Límites |
|---|---|---:|---|---|
| `start_date` | `date` (`YYYY-MM-DD`) | Sí | Sin default | Sin mínimo/máximo declarado |
| `end_date` | `date` (`YYYY-MM-DD`) | Sí | Sin default | Sin mínimo/máximo declarado |
| `business_type` | string enum | No | `null` | `B2B`, `B2C` |

Respuesta: objeto con `current_period: number`, `previous_period: number`, `delta_abs: number` y `delta_pct: number | null`.

El handler compara el neto del rango indicado con el rango inmediatamente anterior de igual duración. Errores: `422` si falta una fecha o un valor no valida. No hay validación declarada de que `start_date <= end_date`. Contrato servido en vivo: ❓.

### `GET /api/metrics/b2b` (sufijo `/b2b`)

Definición: [`backend/app/routes.py`](../../backend/app/routes.py#L362). Respuesta: array `FinancialMovement` (campos y tipos descritos en `/api/metrics`; modelo en [routes.py](../../backend/app/routes.py#L22)).

Query:

| Nombre | Tipo | Obligatorio | Default | Límites |
|---|---|---:|---|---|
| `start_date` | `date` (`YYYY-MM-DD`) | No | `null` | Sin mínimo/máximo declarado |
| `end_date` | `date` (`YYYY-MM-DD`) | No | `null` | Sin mínimo/máximo declarado |
| `category` | `Category` enum | No | `null` | `suppliers`, `sales`, `operational`, `administrative`, `others` |
| `operation_type` | `OperationType` enum | No | `null` | `income`, `outcome` |

Errores: `422` para parámetros inválidos. El handler fija `business_type` en `B2B`; no recibe un parámetro `business_type`. Contrato servido en vivo: ❓.

### `GET /api/metrics/b2c` (sufijo `/b2c`)

Definición: [`backend/app/routes.py`](../../backend/app/routes.py#L378). Respuesta: array `FinancialMovement` (campos y tipos descritos en `/api/metrics`; modelo en [routes.py](../../backend/app/routes.py#L22)).

Query:

| Nombre | Tipo | Obligatorio | Default | Límites |
|---|---|---:|---|---|
| `start_date` | `date` (`YYYY-MM-DD`) | No | `null` | Sin mínimo/máximo declarado |
| `end_date` | `date` (`YYYY-MM-DD`) | No | `null` | Sin mínimo/máximo declarado |
| `category` | `Category` enum | No | `null` | `suppliers`, `sales`, `operational`, `administrative`, `others` |
| `operation_type` | `OperationType` enum | No | `null` | `income`, `outcome` |

Errores: `422` para parámetros inválidos. El handler fija `business_type` en `B2C`; no recibe un parámetro `business_type`. Contrato servido en vivo: ❓.

## Patrones de fetch del frontend actual

- [`frontend/src/App.tsx`](../src/App.tsx#L17-L24): define `API_BASE_URL` desde `VITE_API_BASE_URL` (vacío por defecto), llama a `fetch` nativo para `GET /api/metrics`, comprueba `response.ok`, lanza un error con el estado HTTP y devuelve `response.json()`. No hay query params, cliente HTTP compartido ni llamadas a los otros endpoints en `frontend/src`.
- [`frontend/src/App.tsx`](../src/App.tsx#L34-L49): dispara esa única carga al montar con `useEffect`; actualiza estado en éxito, maneja el error y termina el estado de carga en `finally`.
- [`frontend/vite.config.ts`](../vite.config.ts#L11-L16): proxy de desarrollo para prefijo `/api` hacia `http://host.docker.internal:8000`.

## Desajustes con lo que pide el PM

- ✅ **Filtro de fechas en el endpoint de métricas existente:** `GET /api/metrics` acepta `start_date` y `end_date`; ambos son opcionales e inclusivos según la función de filtrado. No hay validación de orden entre ambas fechas.
- ✅ **Facets y rango de fechas:** `GET /api/metrics/facets` expone tipos de operación, tipos de negocio, categorías y fechas mínima/máxima; `GET /api/metrics` acepta `start_date` y `end_date` para filtrar los movimientos.
- ✅ **Endpoint de alertas:** existe `GET /api/metrics/alerts` y admite `threshold` (default `0.3`, mínimo `0`) además de `group_by`, fechas y `business_type`.
- ❌ **Rango de threshold:** el PM pide `0.01–1.0`, pero la API solo impone mínimo `0` y no declara máximo (`Query(default=0.3, ge=0)`, [routes.py](../../backend/app/routes.py#L344)). La API admite `0` y valores mayores que `1`, fuera del rango pedido.
- ❌ **Semántica de `increase_ratio`:** es un ratio, no un porcentaje: se calcula como `(outcome - baseline) / baseline` sin multiplicar por 100 ([routes.py](../../backend/app/routes.py#L227)). Por ejemplo, `0.25` representa un aumento del 25 %.
- ❌ **Porcentaje del total del grupo en alertas:** la respuesta `MetricsAlert` no incluye un porcentaje de la alerta respecto al total del grupo; ese valor debe calcularlo la UI a partir de sus datos. La UI actual calcula `profitPercent` sobre ingresos, no ese porcentaje de alertas ([financial-utils.ts](../src/lib/financial-utils.ts#L71)).
- ✅ **Endpoint de categorías top:** existe `GET /api/metrics/categories/top`; acepta `operation_type`, `limit` y filtros opcionales de fecha y `business_type`. El valor default de `operation_type` es `outcome`; para income se debe enviar explícitamente `operation_type=income`.
- ❌ **Cantidad de categorías income:** aunque `limit=5`, el generador solo crea ingresos en `sales` y `others` ([routes.py](../../backend/app/routes.py#L79)); por tanto, el resultado contiene como máximo 2 categorías para income, no cinco. Con filtros puede ser menor.
- ❌ **Facets por grupo:** `/api/metrics/facets` no acepta filtros y calcula `categories` sobre todos los movimientos, no por `business_type`/grupo ([routes.py](../../backend/app/routes.py#L150), handler sin parámetros en [routes.py](../../backend/app/routes.py#L263)).
- ❌ **Baseline de anomalías:** si el PM requiere una media móvil de 3 períodos, la implementación no coincide: usa la media de todos los períodos anteriores acumulados, no solo los tres previos ([routes.py](../../backend/app/routes.py#L227)).
- ✅ **Distinción B2B/B2C en datos:** `FinancialMovement.business_type` discrimina `B2B`/`B2C`; `categories/top`, `alerts` y `comparison` permiten seleccionar uno mediante `business_type`. `/b2b` y `/b2c` también devuelven movimientos prefiltrados.
- ❌ **Comparativa B2B vs B2C en una respuesta:** `/api/metrics/categories/top` devuelve resultados para un único valor de `business_type` por petición y no incluye ese campo en cada elemento; `/api/metrics/facets` enumera los tipos, pero no devuelve importes. La comparación de resultados es posible haciendo dos peticiones a `categories/top`, una con `business_type=B2B` y otra con `business_type=B2C`; el backend no devuelve el desglose conjunto en una sola respuesta.
- ✅ **Existencia de comparison/B2B/B2C:** el backend expone `/api/metrics/comparison`, `/api/metrics/b2b` y `/api/metrics/b2c`, no las rutas raíz `/comparison`, `/b2b` o `/b2c`. Comparison compara neto actual contra periodo previo, no es una comparación B2B/B2C; los endpoints B2B/B2C devuelven movimientos.
- ✅ **OpenAPI en vivo:** `/api/metrics/facets`, `/api/metrics/alerts` y `/api/metrics/categories/top` coinciden con los resultados verificados en `/docs`.
- ❓ **Endpoints no verificados en vivo:** `/api/metrics/comparison`, `/api/metrics/b2b` y `/api/metrics/b2c`; sus contratos aquí se basan en el código del backend.
- ❓ **Representación esperada por el PM para la tabla de anomalías y la comparativa B2B/B2C:** la solicitud nombra funcionalidades y endpoints, pero no define campos de presentación adicionales al contrato descrito aquí.