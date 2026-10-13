# Fase 3: especificación de componentes

## Convenciones existentes

- Los componentes de pantalla viven en `frontend/src/components/dashboard/`; los elementos reutilizables de UI están en `frontend/src/components/ui/`. Se usan nombres PascalCase y props explícitas tipadas, por ejemplo `IncomeOutcomeChartProps` y `ProfitPercentChartProps`.
- `App.tsx` mantiene `loading` y `error`, comprueba `response.ok`, muestra un mensaje de error y finaliza la carga en `finally` ([App.tsx](../src/App.tsx#L19), [App.tsx](../src/App.tsx#L27), [App.tsx](../src/App.tsx#L34)). Los gráficos muestran `Skeleton` durante la carga y conservan su panel con un mensaje cuando no hay datos ([income-outcome-chart.tsx](../src/components/dashboard/income-outcome-chart.tsx#L50), [profit-percent-chart.tsx](../src/components/dashboard/profit-percent-chart.tsx#L51)). Los nuevos componentes deben seguir esos estados y reutilizar `Skeleton` y el patrón de mensaje inline existentes.
- Los tipos de API y query params son los definidos en [`api-types.ts`](api-types.ts) y [`param-types.ts`](param-types.ts). No redefinir sus contratos ni cambiar los nombres JSON `snake_case`.

## 1. Filtro de rango de fechas

**Componente:** `MetricsDateRangeFilter`.

**Responsabilidad:** permitir editar un rango opcional compartido por movimientos, alertas y comparativa. Al abrir, inicializar ambos extremos vacíos para consultar todos los datos. Aplicar automáticamente cada cambio de input válido con `onChange`, sin botón de aplicar.

**Props:**

| Prop | Tipo | Uso |
|---|---|---|
| `value` | `DateRangeFilter` | Rango actualmente aplicado. |
| `facets` | `FacetsResponse \| null` | Facets globales, incluido el intervalo disponible. |
| `isLoading` | `boolean` | Carga inicial de facets. |
| `error` | `string \| null` | Error de carga de facets. |
| `isResultEmpty` | `boolean` | Indica que la consulta aplicada a movimientos devolvió cero resultados. |
| `onChange` | `(value: DateRangeFilter) => void` | Aplica un rango válido al estado compartido del dashboard. |

**Endpoints:** `GET /api/metrics/facets` para obtener `min_date`/`max_date` (verificado en `/docs`, sin parámetros), y `GET /api/metrics` con `start_date`/`end_date` para consultar movimientos filtrados (verificado en `/docs`; también admite `category` y `operation_type`). Los dos límites son opcionales e inclusivos ([routes.py](../../backend/app/routes.py#L109), [routes.py](../../backend/app/routes.py#L116), [routes.py](../../backend/app/routes.py#L248)). Facets no recibe filtros ([routes.py](../../backend/app/routes.py#L263)).

**Reglas de fecha y renderizado:**

- Junto a los inputs mostrar siempre, cuando facets esté disponible, `Rango disponible: {min_date} – {max_date}` en formato `YYYY-MM-DD`. Es un intervalo global del dataset, no un rango recalculado según el filtro actual; `build_metrics_facets` obtiene los extremos del conjunto recibido ([routes.py](../../backend/app/routes.py#L150)).
- Si solo se rellena `start_date`, enviar solo ese parámetro: la API devuelve movimientos desde esa fecha inclusive. Si solo se rellena `end_date`, enviar solo ese parámetro y filtrar hasta esa fecha inclusive. Si ambos están vacíos, quitar ambos parámetros y no limitar por fecha ([routes.py](../../backend/app/routes.py#L112), [routes.py](../../backend/app/routes.py#L116)).
- Si `start_date > end_date`, mostrar exactamente `La fecha inicial no puede ser posterior a la fecha final.`, no llamar al endpoint y conservar el último rango válido aplicado. El backend no declara esta validación; es responsabilidad de la UI.
- Restringir ambos inputs al intervalo `[min_date, max_date]` de facets. Si se introduce manualmente una fecha fuera del intervalo, mostrar exactamente `La fecha debe estar entre {min_date} y {max_date}.`, no aplicar ni hacer la petición; permitir borrar el límite y volver a usarlo como abierto.
- Cada cambio de input que produzca un rango válido se aplica y consulta de inmediato, incluyendo el caso de un único extremo presente. Si ambos quedan vacíos, quitar ambos query params y mostrar todos los datos.
- **Cargando:** skeleton compacto en lugar de los controles hasta recibir facets. **Error:** controles deshabilitados y mensaje inline siguiendo el patrón de `App.tsx`. **Sin movimientos para el rango:** conservar los inputs y mostrar `No hay movimientos para el rango seleccionado`; no ocultar el filtro. **Con datos:** mostrar las fechas aplicadas y permitir cambiarlas o limpiarlas.

## 2. Tabla de alertas de anomalías

**Componente:** `AnomalyAlertsTable`.

**Responsabilidad:** configurar el umbral y la agrupación, y presentar alertas de egreso dentro del rango de fechas compartido.

**Props:**

| Prop | Tipo | Uso |
|---|---|---|
| `params` | `AlertsParams` | Query aplicada, incluidos `start_date`/`end_date` del filtro compartido. |
| `data` | `AlertsResponse` | Alertas recibidas. |
| `isLoading` | `boolean` | Estado de carga de la petición. |
| `error` | `string \| null` | Error de petición. |
| `onParamsChange` | `(params: AlertsParams) => void` | Actualiza parámetros y solicita los resultados nuevos desde el contenedor. |

**Endpoint:** `GET /api/metrics/alerts` con los parámetros de `AlertsParams`. Al cambiar el rango compartido, propagar ambas fechas a `params` y volver a consultar; cambiar threshold o group_by debe preservar las fechas existentes. No mostrar control de `business_type` y omitir siempre ese parámetro, consultando ambos segmentos. La ruta está verificada en `/docs` y admite fechas, `threshold` y `group_by` ([routes.py](../../backend/app/routes.py#L343)).

**Reglas y renderizado:**

- El input de threshold inicia en `0.30`, usa `step=0.01` y muestra siempre dos decimales. La API admite `threshold >= 0` sin máximo, pero la UI valida el rango solicitado por PM, `0.01–1.0` ([routes.py](../../backend/app/routes.py#L344), [param-types.ts](param-types.ts#L14)). Para un campo vacío, no numérico o valor fuera de ese rango, mostrar exactamente `Introduce un umbral entre 0.01 y 1.00.`, no enviar una petición y conservar como último valor aplicado el threshold válido anterior. Aplicar el cambio solo cuando el valor sea válido.
- Mostrar `increase_ratio` como porcentaje: `increase_ratio × 100` seguido de `%` (por ejemplo `0.45` → `45%`). La API devuelve un ratio, no un porcentaje ([api-types.ts](api-types.ts#L46)).
- Etiquetar `baseline_average` como **“Media de egresos de todos los períodos anteriores”**, no “media móvil de 3 períodos”: el backend calcula la media del historial completo acumulado antes del período actual ([routes.py](../../backend/app/routes.py#L219), [routes.py](../../backend/app/routes.py#L227), [routes.py](../../backend/app/routes.py#L239)).
- **Cargando:** mantener el encabezado y controles visibles y mostrar skeleton en el cuerpo de la tabla. **Error:** mantener la sección y mostrar el error inline; no confundir error con una lista vacía. **Sin anomalías:** mantener la tabla, encabezados y controles; mostrar en una fila que abarque las columnas `No se detectaron anomalías para el umbral actual.` **Con datos:** una fila por cada `AlertEntry`, con el período, total, baseline y ratio formateado como porcentaje.
- Formatear importes de alertas con `formatCurrency` de [`financial-utils.ts`](../src/lib/financial-utils.ts#L81), igual que el resto del dashboard; mantener `increase_ratio` como porcentaje, no como moneda.

## 3. Vista comparativa B2B vs B2C

**Componente:** `B2BvsB2CIncomeComparison`.

**Responsabilidad:** comparar ingresos de ambos segmentos en el mismo rango, mostrando totales por grupo, categorías principales y proporción de cada categoría sobre el ingreso total de su grupo.

**Props:**

| Prop | Tipo | Uso |
|---|---|---|
| `dateRange` | `DateRangeFilter` | Mismo rango aplicado por `MetricsDateRangeFilter`. |
| `facets` | `FacetsResponse \| null` | Rango global disponible y vocabulario global de categorías. |
| `b2bCategories` | `TopCategoriesResponse` | Respuesta de la petición filtrada a B2B. |
| `b2cCategories` | `TopCategoriesResponse` | Respuesta de la petición filtrada a B2C. |
| `isLoading` | `boolean` | Carga inicial de facets y de ambas peticiones de categorías. |
| `facetsError` | `string \| null` | Error al cargar facets. |
| `b2bError` | `string \| null` | Error de la petición B2B. |
| `b2cError` | `string \| null` | Error de la petición B2C. |

**Endpoints y parámetros:** obtener facets con `GET /api/metrics/facets` para compartir el intervalo disponible. Hacer dos peticiones independientes a `GET /api/metrics/categories/top`, con el rango seleccionado en ambas:

- B2B: `TopCategoriesParams` con `operation_type: "income"`, `limit: 5`, `business_type: "B2B"` y las fechas aplicadas.
- B2C: `TopCategoriesParams` con `operation_type: "income"`, `limit: 5`, `business_type: "B2C"` y las mismas fechas.

El endpoint admite `business_type` y rango de fechas ([routes.py](../../backend/app/routes.py#L288), [routes.py](../../backend/app/routes.py#L291), [routes.py](../../backend/app/routes.py#L298)). El generador de este backend asigna a ingresos solo las categorías `sales` u `others`, por lo que con `limit=5` devuelve como máximo dos categorías por grupo; un rango/segmento sin ingresos puede devolver cero ([routes.py](../../backend/app/routes.py#L79), [routes.py](../../backend/app/routes.py#L190), [routes.py](../../backend/app/routes.py#L207)).

**Cálculos y categorías:**

- Total de ingreso de cada grupo: suma de `total_amount` en la respuesta correspondiente. Con el generador actual, las dos categorías posibles están dentro del límite 5, de modo que esta suma representa el total de ingresos del grupo en el rango.
- Porcentaje de categoría: `category.total_amount / sum(total_amount de todas las entradas income del mismo grupo) × 100`. Si el denominador es `0`, mostrar `—` en vez de dividir.
- `facets.categories` es global: `/api/metrics/facets` no recibe `business_type` y construye su lista sobre todos los movimientos ([routes.py](../../backend/app/routes.py#L150), [routes.py](../../backend/app/routes.py#L263)). No usar esa lista para afirmar que una categoría tiene actividad en B2B o B2C. La disponibilidad por grupo sale de las respuestas `b2bCategories` y `b2cCategories`; para alinear filas, usar la unión de las categorías presentes en ambas respuestas y completar con cero solo la categoría ausente del otro grupo. El contenido de cada panel sigue reflejando estrictamente su propia respuesta.

**Renderizado condicional:**

- **Cargando:** mostrar paneles B2B/B2C con skeletons estables mientras llegan las dos respuestas.
- **Error:** mostrar el error en el panel afectado; el otro panel puede seguir mostrando datos. No presentar un gráfico comparativo conjunto como completo si falla una de las dos peticiones.
- **Vacío por grupo:** conservar cada panel y mostrar explícitamente `Sin ingresos/categorías para B2B en el rango seleccionado` o `Sin ingresos/categorías para B2C en el rango seleccionado`, según corresponda. No eliminar el panel ni completar con categorías globales de facets.
- **Con datos:** mostrar tabla/categorías, importe y porcentaje de cada grupo. Formatear importes con `formatCurrency` de [`financial-utils.ts`](../src/lib/financial-utils.ts#L81). Mostrar un gráfico comparativo con el total de ingresos B2B frente al total B2C; si una petición respondió correctamente con lista vacía, su total es `0` y su panel conserva el mensaje vacío.

**Decisión de navegación abierta del PM:** el proyecto actual monta un único `App` y no declara una dependencia de router en `frontend/package.json` ([App.tsx](../src/App.tsx#L27), [package.json](../package.json#L15)). Mantener abierta la decisión entre sección del dashboard y vista con URL propia; no introducir una librería de rutas ni asumir una página hasta que PM lo decida.