---
title: "Caso de uso: Correccion de errores"
description: Ciclo estructurado de reproducir-diagnosticar-corregir-verificar regresion con escalacion basada en severidad.
---

# Caso de uso: Correccion de errores

## Formato de recepcion

Comience con un informe reproducible:

```text
Symptom:
Environment:
Steps to reproduce:
Expected vs actual:
Logs/trace:
Regression window (if known):
```

## Triaje de severidad

Clasifique temprano para elegir la velocidad de respuesta:

- `P0`: perdida de datos, evasion de autenticacion, interrupcion en produccion
- `P1`: flujo principal de usuario afectado
- `P2`: comportamiento degradado con solucion alternativa
- `P3`: menor/no bloqueante

`P0/P1` siempre deben incluir revision de QA/seguridad.

## Ciclo de ejecucion

1. Reproducir exactamente en un entorno minimo.
2. Aislar la causa raiz (no solo parchear el sintoma).
3. Implementar la correccion segura mas pequena.
4. Agregar pruebas de regresion para la ruta que falla.
5. Verificar rutas adyacentes que probablemente compartan el mismo modo de fallo.

## Plantilla de prompt para oma-debug

```text
Bug: <error/symptom>
Repro steps: <steps>
Scope: <files/modules>
Expected behavior: <expected>
Need:
1) root cause
2) minimal fix
3) regression tests
4) adjacent-risk scan
```

## Senales comunes de escalacion

Escalar a QA o seguridad cuando el error afecta:

- autenticacion/sesion/renovacion de tokens
- limites de permisos
- consistencia de pagos/transacciones
- regresiones de rendimiento bajo carga

## Validacion posterior a la correccion

- la reproduccion original ya no falla
- no hay errores nuevos en flujos relacionados
- las pruebas fallan antes de la correccion y pasan despues
- la ruta de reversion es clara si se requiere un hotfix

## Criterios de finalizacion

La correccion de errores esta completa cuando:

- la causa raiz esta identificada y documentada
- la correccion esta verificada mediante comprobaciones reproducibles
- la cobertura de regresion esta implementada
