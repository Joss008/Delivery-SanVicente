```markdown
# PROJECT.md
## Problema
La problemática es la dificultad que tienen los restaurantes y negocios de comida rápida de San Vicente de Cañete para gestionar eficientemente a sus repartidores, debido a que utilizan medios manuales como llamadas y WhatsApp para conocer su disponibilidad, ubicación y asignar pedidos. Esto puede generar demoras, recorridos innecesarios y una distribución poco eficiente de las entregas.

## Perfiles de usuario
Restaurante
Empleados del restaurante (gerentes, encargados)
Repartidor

## Flujo de la solución
Los restaurantes visualizarían la ubicación de los repartidores en un mapa, recibirían notificaciones de disponibilidad y asignarían pedidos, optimizando rutas y tiempos de entrega.

## Stack técnico
Next.js, TypeScript, Tailwind CSS, shadcn/ui, SQLite

## Instrucciones para el agente de código
Eres un desarrollador de software. El objetivo es construir un prototipo funcional con las funcionalidades mínimas necesarias para validar la idea, no un producto terminado ni pulido. Implementa lo descrito. Si falta una decisión menor, elige la alternativa más simple. Si es una decisión de negocio importante, pregunta antes de implementar.

## Convenciones de CRUD
Cada recurso con CRUD debe implementar las 4 operaciones completas: crear, listar, editar y eliminar. Crear y editar se hacen en modales separados (cada uno su propio modal, nunca combinados en el mismo). El listado del recurso muestra todos sus registros con acciones (editar, eliminar, etc.) que abren esos modales. Al guardar o eliminar, cierra el modal y refresca el listado sin salir de la vista.

## Funcionalidades adicionales
### Módulo de repartidores
CRUD completo de repartidores: crear, listar, editar y eliminar. Cada repartidor tiene nombre, teléfono, estado (disponible/ocupado/inactivo) y ubicación (lat/lng). Crear y editar usan modales separados; el listado muestra todos los registros con acciones.

### Módulo de pedidos
CRUD completo de pedidos: crear, listar, editar y eliminar. Cada pedido tiene cliente, dirección, estado (pendiente/asignado/en_camino/entregado), repartidor asignado (opcional) y ubicación de entrega (lat/lng). Crear y editar usan modales separados; el listado muestra todos los registros con acciones.

### Panel de mapa
Dashboard con mapa (Leaflet + OpenStreetMap) que visualiza la ubicación de los repartidores y los pedidos mediante marcadores, con resumen lateral de repartidores activos y pedidos pendientes. Los datos se refrescan automáticamente cada 15 segundos.

### Persistencia
Base de datos SQLite local (vía `node:sqlite`) con esquema y datos de ejemplo, ubicada en `data/reparto.db`.

### Convenciones aplicadas
Cada recurso implementa las 4 operaciones CRUD, con modales separados para crear y editar, y refresco del listado tras guardar o eliminar sin salir de la vista.
```
## Design System

La interfaz debe tener un estilo **minimalista, elegante y profesional tipo startup SaaS**, usando shadcn/ui como base.

- Priorizar una composición visual moderna: buena jerarquía, espacios en blanco, proporciones y distribución equilibrada.
- No limitar el diseño a colores o estilos CSS: adaptar layout, navegación, cards, tablas, formularios y paneles para mejorar UX y apariencia.
- Usar paleta neutral (`slate/zinc`) con azul como color principal y colores semánticos suaves para estados.
- Tipografía `Inter`, textos compactos y jerarquía clara.
- Cards con `rounded-xl`, bordes suaves, sombras mínimas y buen espaciado.
- Usar componentes shadcn/ui e iconos `lucide-react`.
- Evitar interfaces genéricas de panel administrativo, exceso de bordes, colores, sombras, gradientes y elementos innecesarios.
- El resultado debe sentirse como un **producto SaaS moderno y premium**, no como componentes shadcn colocados sin diseño.
- Mantener consistencia visual y responsive en todas las vistas.

Al crear o modificar una vista, aplicar estos principios tanto a sus estilos como a su **estructura y composición visual**.