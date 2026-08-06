-- 076_stock_valorizado_ajustes_neutrales.sql
-- Auditoría de cliente: los "ajustes" manuales de inventario (correcciones de cocina,
-- sin dinero de por medio) mueven el KPI "Valor de inventario" porque getResumenValorizacion
-- calcula stock_actual * costo_promedio, y stock_actual sí se modifica en un ajuste.
-- Se separa el stock "valorizado" (solo se mueve con compras/entradas y salidas reales)
-- del stock físico (stock_actual, que sí refleja ajustes). InventarioService usa
-- min(stock_actual, stock_valorizado) al valorizar, así un ajuste no infla ni desinfla
-- el valor reportado más allá de lo que la pérdida/ganancia física ya implica.

USE restaurante;

ALTER TABLE insumos
    ADD COLUMN stock_valorizado DECIMAL(12, 4) NOT NULL DEFAULT 0 COMMENT 'Stock cubierto por compras reales, no se mueve con ajustes manuales' AFTER stock_actual;

UPDATE insumos SET stock_valorizado = stock_actual WHERE stock_valorizado <> stock_actual;
