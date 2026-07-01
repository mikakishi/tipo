# Tipografía Color — versión corregida v3

Archivos listos para GitHub Pages.

## Cambios principales

- Exportación SVG Color como **.otf** real, no .ttf falso.
- Incrustación de CSS interno del SVG como atributos directos `fill`, `stroke`, etc.
- Eliminación de clases CSS en la tabla SVG para mejorar compatibilidad.
- Baseline y caja tipográfica normalizadas a 1000 unidades.
- COLRv0 queda marcado como experimental porque muchos programas de Adobe lo muestran en negro.

## Uso recomendado

Para color en Illustrator/Photoshop/InDesign, usa **OTF SVG Color**.

Si el SVG usa degradados complejos, máscaras o filtros, puede seguir fallando. Lo más estable son formas vectoriales con colores planos.
