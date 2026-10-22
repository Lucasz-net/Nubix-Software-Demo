# Nubix Software

Sistema de punto de venta e inventario para kioscos y comercios de barrio (Argentina). Programa de escritorio para Windows.

> **Versión demo.** Los datos son de ejemplo y se guardan en la misma computadora. Usuarios de prueba: **Roberto Díaz** (dueño, PIN 1234) y **Juan Sosa** (cajero, PIN 1111).

## Qué hace

- **Punto de Venta:** búsqueda y lector de código de barras, atajos F2 (buscar) y F9 (cobrar), cobro en efectivo con vuelto, débito/crédito, Mercado Pago/QR, transferencia y fiado. Si se escanea un código que no está cargado, se da de alta el producto en el momento.
- **Caja:** apertura, ingresos y egresos, cierre con conteo y diferencia, historial de turnos.
- **Clientes y Fiado:** cuenta corriente por cliente y registro de pagos.
- **Inventario:** productos, márgenes, filtros, aumento masivo de precios.
- **Reposición:** faltantes y pedido al proveedor por WhatsApp.
- **Ventas y Estadísticas:** registro con filtros, anulaciones, exportación a CSV y reportes.
- **Usuarios:** dueño y cajero con PIN; el cajero no ve costos ni la plata esperada en caja (cierre ciego) y necesita el PIN del dueño para sacar plata de la caja.

## Desarrollo

Requisitos: Node.js 20+, Rust y los [requisitos de Tauri 2](https://tauri.app/start/prerequisites/).

```bash
npm install
npm run tauri dev     # abre el programa en modo desarrollo
npm run tauri build   # genera el instalador en src-tauri/target/release/bundle
```

Stack: Tauri 2, React 19, TypeScript, Vite, Tailwind CSS 4 y Zustand.
