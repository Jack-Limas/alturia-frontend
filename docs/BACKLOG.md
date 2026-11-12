# Trabajo pendiente del frontend

## Jack Anderson Limas Solarte (shell, sala, KDS, administración, estilos)
1. **HU-08 a HU-12** Pestaña «Reservas» del panel: lista del día, formulario de reserva, modificar, programar preparación anticipada y botón «Llegó el cliente» (depende de los endpoints de reservas del backend).
2. **HU-20 y HU-21** Pestaña «Reportes»: historial con filtros, resumen de pagos del día y tiempos promedio por estación y producto.
3. **HU-07** Cambiar el estado de una mesa desde la sala (mantener pulsado → menú de estados).
4. **HU-25/HU-28** Etiqueta «RESERVA» con color distinto y hora de entrega en el KDS; contador de pendientes fuera de pantalla.
5. **HU-03** Editar y desactivar productos desde el panel.
6. Íconos de la PWA (192 y 512 px) en `src/assets` y `manifest.webmanifest`.
7. Ajustes visuales según los wireframes y pruebas de legibilidad del KDS a 2 m.

## Juan David Maya Benavides (core y caja)
1. Reintentos con espera creciente en `ConexionService` y aviso de pedidos que quedaron «Requiere revisión» (HU-17).
2. Distinguir «sin internet» de «sin red local» en el indicador (el backend puede informar si la nube responde) (HU-16).
3. Estilos de impresión (`@media print`) para el comprobante interno (HU-32).
4. Mostrar el comprobante existente cuando la cuenta ya está pagada (HU-32, escenario 8).
5. Resumen de pagos del día en la caja (cuando exista `/api/reportes/pagos-dia`) (HU-20).
6. Indicador de reconexión del WebSocket en el KDS y en la caja.
