---
title: "Guía: Corrección de bugs"
sidebar_label: Corrección de bugs
description: Flujo estructurado de depuración en siete etapas, con triaje de severidad, señales de escalamiento, diagnóstico respaldado por el código fuente y validación posterior a la corrección.
---

# Guía: Corrección de bugs

## Cuándo usar el flujo de depuración

Usa `/debug` (o di «fix bug», «fix error» o «debug» en lenguaje natural) cuando tengas un bug concreto que diagnosticar y corregir. El flujo ofrece un enfoque estructurado y reproducible para depurar, y evita la trampa habitual de corregir los síntomas en lugar de las causas raíz.

El flujo de depuración admite todos los proveedores configurados. Las etapas 1-5 se ejecutan inline. La etapa 6 (búsqueda de patrones similares) puede delegarse a un subagente `debug-investigator` cuando el alcance sea amplio (10+ archivos o errores que abarcan varios dominios); después se registra la memoria de la etapa 7.

---

## Plantilla de reporte de bug

Al reportar un bug, proporciona la mayor cantidad posible de la información siguiente. Cada campo ayuda al flujo de depuración a acotar más rápido la búsqueda.

### Campos obligatorios

| Campo | Descripción | Ejemplo |
|:------|:-----------|:--------|
| **Mensaje de error** | El texto exacto del error o el stack trace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Pasos para reproducir** | Acciones ordenadas que activan el bug | 1. Inicia sesión como admin. 2. Ve a /users. 3. Haz clic en «Delete» sobre cualquier usuario. |
| **Comportamiento esperado** | Lo que debería ocurrir | El usuario se elimina y desaparece de la lista. |
| **Comportamiento real** | Lo que ocurre realmente | La página se bloquea y muestra una pantalla blanca. |

### Campos opcionales (muy recomendados)

<!-- oma-docs:ignore-start -->
| Campo | Descripción | Ejemplo |
|:------|:-----------|:--------|
| **Entorno** | Navegador, SO, versión de Node y dispositivo | Chrome 124, macOS 15.3, Node 22.1 |
| **Frecuencia** | Siempre, a veces o solo la primera vez | Siempre reproducible |
| **Cambios recientes** | Qué cambió antes de que apareciera el bug | PR #142 fusionado (funcionalidad de eliminación de usuarios) |
| **Código relacionado** | Archivos o funciones que sospechas | `src/api/users.ts`, `deleteUser()` |
| **Logs** | Logs del servidor y salida de consola | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Capturas o grabaciones** | Evidencia visual | Captura de la pantalla del error |
<!-- oma-docs:ignore-end -->

Cuanto más contexto proporciones de entrada, menos preguntas de ida y vuelta necesitará el flujo de depuración.

---

## Triaje de severidad (P0-P3)

La severidad determina cómo se gestiona el bug y con qué rapidez debe corregirse.

### P0: crítico (respuesta inmediata)

**Definición:** La producción está caída, se están perdiendo o corrompiendo datos, o hay una brecha de seguridad activa.

**Expectativa de respuesta:** Deja todo. Esta es la única tarea hasta resolverla.

**Ejemplos:**
- Se puede eludir el sistema de autenticación y todos los usuarios acceden a endpoints de administración.
- Una migración de base de datos corrompió la tabla de usuarios y las cuentas son inaccesibles.
- El procesamiento de pagos cobra dos veces a los clientes.
- Un endpoint de API devuelve datos personales de otros usuarios.

**Enfoque de depuración:** Omite la plantilla completa. Proporciona el mensaje de error y cualquier stack trace. El flujo comienza directamente en el Paso 2 (Reproducir).

### P1: alto (misma sesión)

**Definición:** Una funcionalidad principal está rota para un número significativo de usuarios. Puede existir una solución alternativa, pero no es aceptable a largo plazo.

**Expectativa de respuesta:** Corrige el problema durante la sesión de trabajo actual. No empieces funcionalidades nuevas hasta resolverlo.

**Ejemplos:**
- La búsqueda no devuelve resultados para consultas que contienen caracteres especiales.
- La carga de archivos falla cuando superan los 5MB (el límite debería ser 50MB).
- La aplicación mobile se cierra al iniciar en dispositivos Android 14.
- No se envían los correos de restablecimiento de contraseña (la integración del servicio de correo está rota).

**Enfoque de depuración:** Ejecuta el bucle completo de siete etapas. Se recomienda una revisión de QA después de la corrección.

### P2: medio (este sprint)

**Definición:** Una funcionalidad funciona, pero su comportamiento está degradado. Afecta a la usabilidad, no a la funcionalidad.

**Expectativa de respuesta:** Programa la corrección para el sprint actual. Corrígela antes de la próxima release.

**Ejemplos:**
- La ordenación de la tabla distingue mayúsculas («apple» aparece después de «Zebra»).
- El modo oscuro muestra texto ilegible en el panel de ajustes.
- El tiempo de respuesta de la API para el endpoint /users es de 8 segundos (debería ser inferior a 1s).
- La paginación muestra «Page 1 of 0» cuando la lista está vacía.

**Enfoque de depuración:** Ejecuta el bucle completo de siete etapas. Incluye el caso en la suite de regresión de QA.

### P3: bajo (backlog)

**Definición:** Problema cosmético, caso límite o inconveniente menor.

**Expectativa de respuesta:** Añádelo al backlog. Corrígelo cuando sea conveniente o agrúpalo con cambios relacionados.

**Ejemplos:**
- El texto de un tooltip tiene una errata: «Delet» en lugar de «Delete».
- Hay una advertencia en la consola sobre un método de ciclo de vida de React obsoleto.
- El pie de página está desalineado 2 píxeles en anchos de viewport entre 768 y 800px.
- El spinner de carga continúa durante 200ms después de que el contenido ya sea visible.

**Enfoque de depuración:** Puede que no necesite el bucle completo. Basta con una corrección directa y una prueba de regresión.

---

## El bucle de depuración de siete etapas en detalle

El flujo `/debug` ejecuta estas etapas en orden. Usa el proveedor configurado de inteligencia de código. La búsqueda nativa solo se usa para rutas fuera del proyecto o rutas ignoradas cuando ese proveedor no está disponible o agota el tiempo de espera.

### Paso 1: recopilar información del error

El flujo solicita (o recibe del usuario):
- Mensaje de error y stack trace.
- Pasos para reproducir.
- Comportamiento esperado frente al real.
- Detalles del entorno.

Si el prompt ya incluye un mensaje de error, el flujo pasa directamente al Paso 2.

### Paso 2: reproducir el bug

**Herramientas utilizadas:** las herramientas configuradas de búsqueda y símbolos, o `rg` nativo y lecturas acotadas cuando las herramientas configuradas no están disponibles.

El objetivo es localizar el error en el codebase: encontrar la línea exacta donde se lanza la excepción, la función exacta que produce una salida incorrecta o la condición exacta que provoca el comportamiento inesperado.

Este paso transforma un síntoma reportado por el usuario («la página se bloquea») en una ubicación del codebase (`src/api/users.ts:47, deleteUser() throws TypeError`).

### Paso 3: diagnosticar la causa raíz

**Herramientas utilizadas:** navegación de referencias y símbolos cuando está disponible, seguida de lecturas nativas dirigidas cuando no lo está.

El flujo rastrea hacia atrás desde la ubicación del error para encontrar la causa real. Comprueba estos patrones habituales de causa raíz:

| Patrón | Qué buscar |
|:--------|:----------------|
| **Acceso a null/undefined** | Comprobaciones null ausentes, encadenamiento opcional necesario y variables sin inicializar |
| **Condiciones de carrera** | Operaciones asíncronas que terminan fuera de orden, await ausente y estado mutable compartido |
| **Manejo de errores ausente** | try/catch ausente, rechazo de promesa sin gestionar y error boundary ausente |
| **Tipos de datos incorrectos** | String donde se esperaba un número, coerción de tipos ausente y esquema incorrecto |
| **Estado obsoleto** | Estado de React sin actualizar, valores en caché no invalidados y un closure que captura un valor antiguo |
| **Validación ausente** | Entrada del usuario sin sanitizar, cuerpo de solicitud de API sin validar y límites sin comprobar |

Diagnostica la causa raíz, no el síntoma. Si `user.id` es undefined, pregunta por qué user es undefined en ese punto de la ruta de ejecución, en lugar de preguntar cómo proteger el acceso a undefined.

### Paso 4: proponer una corrección mínima

El flujo presenta:
1. La causa raíz identificada (con evidencia del rastreo del código).
2. La corrección propuesta (cambiando solo lo necesario).
3. Una explicación de por qué corrige la causa raíz, no solo el síntoma.

El flujo presenta la propuesta antes de editar. Espera confirmación cuando el cambio no está autorizado por la solicitud o por la política de ejecución; si ya existe autorización, puede continuar sin pedirla de nuevo.

**Principio de corrección mínima:** cambia el menor número posible de líneas. No refactorices, no mejores el estilo del código ni agregues funcionalidades no relacionadas. La corrección debe poder revisarse en menos de 2 minutos.

### Paso 5: aplicar la corrección y escribir una prueba de regresión

En este paso ocurren dos acciones:

1. **Implementar la corrección**: se aplica el cambio mínimo aprobado.
2. **Escribir una prueba de regresión**: una prueba que:
   - Reproduce el bug original (debe fallar sin la corrección).
   - Comprueba que la corrección funciona (debe pasar con la corrección).
   - Evita que el mismo bug reaparezca en cambios futuros.

La prueba de regresión es el resultado más importante del flujo de depuración. Sin ella, cualquier cambio futuro puede volver a introducir el mismo bug.

### Paso 6: buscar patrones similares

Después de aplicar la corrección, el flujo busca en todo el codebase el mismo patrón que causó el bug.

**Herramientas utilizadas:** la búsqueda de patrones configurada o una búsqueda nativa acotada con el patrón identificado como causa raíz.

Por ejemplo, si el bug se debió a acceder a `user.organization.id` sin comprobar si `organization` era null, la búsqueda revisa todas las demás instancias de acceso a `organization.id` sin comprobaciones de null.

**Criterios para delegar en un subagente:** el flujo genera un subagente `debug-investigator` cuando:
- El error abarca varios dominios (por ejemplo, afecta tanto a frontend como a backend).
- El alcance de la búsqueda de patrones similares cubre 10+ archivos.
- Se necesita rastrear dependencias en profundidad para diagnosticar completamente el problema.

Métodos de generación específicos del proveedor:

| Proveedor | Método de generación |
|:-------|:------------|
| Claude Code | Herramienta Agent con `.claude/agents/debug-investigator.md` |
| Codex CLI | Solicitud de subagente mediada por el modelo, con resultados en JSON |
| Gemini CLI | `oma agent spawn debug "scan prompt" {session_id} -w {workspace}` |
| Antigravity / Fallback | `oma agent spawn debug "scan prompt" {session_id} -w {workspace}` |

Se informan todas las ubicaciones vulnerables similares. Las instancias confirmadas se corrigen dentro de la misma sesión.

### Paso 7: documentar el bug

El flujo escribe un archivo de memoria con:
- El síntoma y la causa raíz.
- La corrección aplicada y los archivos modificados.
- La ubicación de la prueba de regresión.
- Los patrones similares encontrados en el codebase.

---

## Plantilla de prompt para /debug

Al activar el flujo de depuración, puedes proporcionar un prompt estructurado:

```
/debug

Error: TypeError: Cannot read properties of undefined (reading 'id')
Stack trace:
  at deleteUser (src/api/users.ts:47:23)
  at handleDelete (src/routes/users.ts:112:5)

Steps to reproduce:
1. Log in as admin
2. Navigate to /users
3. Click "Delete" on a user whose organization was deleted

Expected: User is deleted
Actual: 500 Internal Server Error

Environment: Node 22.1, PostgreSQL 16
```

**Por qué funciona esta estructura:**

- **Error + stack trace** permite que el Paso 2 localice inmediatamente el código (`search_for_pattern` con «deleteUser» encuentra la función; `find_symbol` señala la ubicación exacta).
- **Pasos para reproducir** con la condición de activación concreta («usuario cuya organización se eliminó») da una pista sobre la causa raíz (clave foránea nula).
- **Entorno** elimina pistas falsas específicas de la versión.

Para bugs más sencillos, basta con un prompt más corto:

```
/debug The login page shows "Invalid credentials" even with correct password
```

El flujo solicitará más detalles cuando los necesite.

---

## Señales de escalamiento

Estas señales indican que el bug requiere escalar más allá del bucle de depuración estándar:

### Señal 1: se intentó dos veces la misma corrección

Si el flujo propone una corrección, la aplica y el mismo error reaparece, el problema es más profundo que el diagnóstico inicial. Reevalúa la causa. Si hay alternativas que merezcan probarse y el presupuesto de recuperación existente lo permite, usa el **Bucle de exploración** en el flujo activo (ultrawork, orchestrate y work):

- Genera 2-3 hipótesis alternativas para la causa raíz.
- Aísla cada experimento y conserva su línea base, su evidencia y el trabajo no relacionado.
- Selecciona un enfoque que cumpla el comportamiento requerido y criterios de medición comparables, y luego verifica el resultado integrado.

### Señal 2: causa raíz que cruza dominios

El error del frontend está causado por un cambio de backend que, a su vez, está causado por una migración del esquema de base de datos. Cuando la causa raíz cruza límites de dominio, escala a `/work` u `/orchestrate` para involucrar a los agentes de dominio correspondientes.

**Ejemplo:** el frontend muestra «undefined» en el nombre del usuario. El backend devuelve null para `user.display_name`. Una migración de base de datos agregó la columna, pero las filas existentes tienen valores NULL. La corrección requiere una migración de base de datos (backfill), manejo de null en el backend y un valor alternativo de visualización en el frontend.

### Señal 3: falta el entorno de reproducción

El bug solo ocurre en producción y no puedes reproducirlo localmente. Entre las señales están:
- Diferencias de configuración específicas del entorno.
- Condiciones de carrera que solo aparecen con carga de producción.
- Diferencias en el comportamiento de servicios de terceros entre staging y producción.

**Acción:** recopila logs de producción, solicita acceso al monitoreo de producción y considera agregar instrumentación o logging antes de intentar una corrección.

### Señal 4: falla la infraestructura de pruebas

No se puede escribir la prueba de regresión porque la infraestructura de pruebas está rota, falta o no es adecuada.

**Acción:** corrige primero la infraestructura de pruebas (o usa `oma install` para configurarla) y después vuelve al flujo de depuración. Si no corresponde una comprobación ejecutable, registra el motivo en el contrato de resultados en lugar de inventar una comprobación aprobada.

---

## Lista de verificación de validación posterior a la corrección

Después de aplicar la corrección y la prueba de regresión, verifica lo siguiente:

- [ ] **La prueba de regresión falla sin la corrección**: revierte temporalmente la corrección y confirma que la prueba detecta el bug.
- [ ] **La prueba de regresión pasa con la corrección**: aplica la corrección y confirma que la prueba pasa.
- [ ] **Las comprobaciones existentes pertinentes siguen pasando**: ejecuta las comprobaciones del proyecto que cubren el comportamiento modificado. Ejecuta un build solo cuando la tarea lo requiera explícitamente.
- [ ] **Se buscaron patrones similares**: se completó el Paso 6 y todas las instancias encontradas se corrigieron o documentaron.
- [ ] **La corrección es mínima**: solo se cambiaron las líneas necesarias y no se incluyó refactorización no relacionada.
- [ ] **La causa raíz está documentada**: el archivo de memoria registra el síntoma, la causa raíz, la corrección aplicada, los archivos modificados, la ubicación de la prueba de regresión y los patrones similares encontrados.

---

## Criterios de finalización

El flujo de depuración termina cuando:

1. La causa raíz está identificada y documentada (no solo el síntoma).
2. Se aplica una corrección mínima con la autorización de la tarea.
3. Existe una prueba de regresión que falla sin la corrección y pasa con ella.
4. Se buscó en el codebase patrones similares y se abordaron todas las instancias confirmadas.
5. Hay un reporte del bug registrado en memoria con el síntoma, la causa raíz, la corrección aplicada, los archivos modificados, la ubicación de la prueba de regresión y los patrones similares encontrados.
6. Todas las pruebas existentes siguen pasando después de la corrección.
