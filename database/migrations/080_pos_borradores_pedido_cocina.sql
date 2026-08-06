-- 080_pos_borradores_pedido_cocina.sql
-- Vincula un borrador del POS (orden guardada) con el pedido/mesa "de cocina"
-- que se crea al guardarla (ver POSService.enviarACocina), para poder cerrarlo
-- cuando esa orden finalmente se cobra (POSController.vender).

USE restaurante;

ALTER TABLE pos_borradores
ADD COLUMN pedido_cocina_id INT NULL,
ADD COLUMN mesa_cocina_id INT NULL;
