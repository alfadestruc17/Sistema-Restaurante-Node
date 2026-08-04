-- 078_impresion_qz_cajon.sql
-- Soporte de impresión térmica (QZ Tray) y apertura de cajón físico por tenant.
-- imprimir_auto y abrir_cajon_auto son toggles independientes: un tenant puede
-- querer solo el cajón sin impresión automática, o viceversa.

USE restaurante;

ALTER TABLE configuracion_impresion
    ADD COLUMN qz_habilitado     TINYINT(1)   NOT NULL DEFAULT 0,
    ADD COLUMN impresora_nombre  VARCHAR(150) NULL     DEFAULT NULL,
    ADD COLUMN imprimir_auto     TINYINT(1)   NOT NULL DEFAULT 1,
    ADD COLUMN abrir_cajon_auto  TINYINT(1)   NOT NULL DEFAULT 1,
    ADD COLUMN cajon_comando_hex VARCHAR(60)  NULL     DEFAULT NULL COMMENT 'Override avanzado; si es NULL se usa el estándar ESC/POS 1B 70 00 19 FA';
