---
title: "Guía: Corrección de Bugs"
description: Guía completa de depuración que cubre el bucle estructurado de 5 pasos, triaje de severidad, señales de escalamiento y validación posterior a la corrección.
---

# Guía: Corrección de Bugs

## Cuándo Usar el Flujo de Depuración

Usa `/debug` (o di "fix bug", "corregir error", "debug" en lenguaje natural) cuando tengas un bug específico por diagnosticar y corregir. El flujo proporciona un enfoque estructurado y reproducible para la depuración que evita la trampa común de corregir síntomas en lugar de causas raíz.

El flujo de depuración soporta todos los proveedores (Gemini, Claude, Codex, Qwen). Los Pasos 1-5 se ejecutan inline. El Paso 6 (escaneo de patrones similares) puede delegar a un subagente `debug-investigator` cuando el alcance del escaneo es amplio (10+ archivos o errores multi-dominio).

---

## Plantilla de Reporte de Bug

Al reportar un bug, proporciona tanta información como sea posible. Cada campo ayuda al flujo de depuración a reducir la búsqueda más rápidamente.

### Campos Requeridos

| Campo | Descripción | Ejemplo |
|:------|:-----------|:--------|
| **Mensaje de error** | El texto exacto del error o stack trace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Pasos para reproducir** | Acciones ordenadas que activan el bug | 1. Iniciar sesión como admin. 2. Navegar a /users. 3. Hacer clic en "Eliminar" en cualquier usuario. |
| **Comportamiento esperado** | Qué debería suceder | El usuario es eliminado y removido de la lista. |
| **Comportamiento real** | Qué sucede realmente | La página se congela con una pantalla blanca. |

### Campos Opcionales (Muy Recomendados)

| Campo | Descripción | Ejemplo |
|:------|:-----------|:--------|
| **Entorno** | Navegador, SO, versión de Node, dispositivo | Chrome 124, macOS 15.3, Node 22.1 |
| **Frecuencia** | Siempre, a veces, solo la primera vez | Siempre reproducible |
| **Cambios recientes** | Qué cambió antes de que apareciera el bug | Se fusionó PR #142 (función de eliminación de usuarios) |
| **Código relacionado** | Archivos o funciones sospechosas | `src/api/users.ts`, `deleteUser()` |
| **Logs** | Logs del servidor, salida de consola | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Capturas/grabaciones** | Evidencia visual | Captura de pantalla de la pantalla de error |

Cuanto más contexto proporciones de entrada, menos preguntas de ida y vuelta necesitará el flujo de depuración.

---

## Triaje de Severidad (P0-P3)

La severidad determina cómo se maneja el bug y con qué rapidez debe corregirse.

### P0 — Crítico (Respuesta Inmediata)

**Definición:** La producción está caída, se están perdiendo o corrompiendo datos, hay una brecha de seguridad activa.

**Expectativa de respuesta:** Dejar todo. Esta es la única tarea hasta que se resuelva.

**Ejemplos:**
- El sistema de autenticación está comprometido — todos los usuarios pueden acceder a endpoints de admin.
- Una migración de base de datos corrompió la tabla de usuarios — las cuentas son inaccesibles.
- El procesamiento de pagos está haciendo doble cargo a los clientes.
- Un endpoint de API devuelve datos personales de otros usuarios.

**Enfoque de depuración:** Omitir la plantilla completa. Proporcionar el mensaje de error y cualquier stack trace. El flujo comienza inmediatamente en el Paso 2 (Reproducir).

### P1 — Alto (Misma Sesión)

**Definición:** Una funcionalidad principal está rota para un número significativo de usuarios. Puede existir solución alternativa pero no es aceptable a largo plazo.

**Expectativa de respuesta:** Corregir dentro de la sesión de trabajo actual. No iniciar nuevas funcionalidades hasta que se resuelva.

**Ejemplos:**
- La búsqueda no devuelve resultados para consultas con caracteres especiales.
- La subida de archivos falla para archivos mayores de 5MB (el límite debería ser 50MB).
- La app móvil se cierra al iniciar en dispositivos Android 14.
- Los emails de restablecimiento de contraseña no se envían (integración de servicio de email rota).

**Enfoque de depuración:** Bucle completo de 5 pasos. Se recomienda revisión QA después de la corrección.

### P2 — Medio (Este Sprint)

**Definición:** Una funcionalidad funciona pero con comportamiento degradado. Afecta la usabilidad pero no la funcionalidad.

**Expectativa de respuesta:** Programar para el sprint actual. Corregir antes del próximo release.

**Ejemplos:**
- El ordenamiento de tabla es sensible a mayúsculas ("apple" se ordena después de "Zebra").
- El modo oscuro tiene texto ilegible en el panel de configuración.
- El tiempo de respuesta de la API para el endpoint /users es de 8 segundos (debería ser menos de 1s).
- La paginación muestra "Página 1 de 0" cuando la lista está vacía.

**Enfoque de depuración:** Bucle completo de 5 pasos. Incluir en la suite de regresión QA.

### P3 — Bajo (Backlog)

**Definición:** Problema cosmético, caso límite o inconveniente menor.

**Expectativa de respuesta:** Agregar al backlog. Corregir cuando sea conveniente, o agrupar con cambios relacionados.

**Ejemplos:**
- El texto del tooltip tiene una errata: "Elimnar" en lugar de "Eliminar".
- Advertencia en consola sobre método de ciclo de vida de React deprecado.
- La alineación del footer está desfasada por 2 píxeles en anchos de viewport entre 768-800px.
- El spinner de carga continúa por 200ms después de que el contenido es visible.

**Enfoque de depuración:** Puede no necesitar el bucle completo de depuración. Corrección directa con prueba de regresión es suficiente.

---

## El Bucle de Depuración de 5 Pasos en Detalle

El flujo `/debug` ejecuta estos pasos en orden estricto. Usa herramientas de análisis de código MCP en todo momento — nunca lecturas de archivos directas ni grep.

### Paso 1: Recopilar Información del Error

El flujo solicita (o recibe del usuario):
- Mensaje de error y stack trace
- Pasos para reproducir
- Comportamiento esperado vs real
- Detalles del entorno

Si ya se proporcionó un mensaje de error en el prompt, el flujo procede inmediatamente al Paso 2.

### Paso 2: Reproducir el Bug

**Herramientas usadas:** `search_for_pattern` con el mensaje de error o palabras clave del stack trace, `find_symbol` para localizar la función y archivo exactos.

El objetivo es localizar el error en el codebase — encontrar la línea exacta donde se lanza la excepción, la función exacta que produce output incorrecto, o la condición exacta que causa el comportamiento inesperado.

Este paso transforma un síntoma reportado por el usuario ("la página se congela") en una ubicación a nivel de codebase (`src/api/users.ts:47, deleteUser() lanza TypeError`).

### Paso 3: Diagnosticar Causa Raíz

**Herramientas usadas:** `find_referencing_symbols` para trazar la ruta de ejecución hacia atrás desde el punto de error.

El flujo traza hacia atrás desde la ubicación del error para encontrar la causa real. Verifica estos patrones comunes de causa raíz:

| Patrón | Qué Buscar |
|:-------|:-----------|
| **Acceso null/undefined** | Verificaciones null faltantes, encadenamiento opcional necesario, variables no inicializadas |
| **Condiciones de carrera** | Operaciones async completándose fuera de orden, await faltante, estado mutable compartido |
| **Manejo de errores faltante** | try/catch ausente, rechazo de promesa no manejado, error boundary faltante |
| **Tipos de datos incorrectos** | String donde se esperaba number, coerción de tipo faltante, esquema incorrecto |
| **Estado obsoleto** | Estado de React no actualizado, valores en caché no invalidados, closure capturando valor viejo |
| **Validación faltante** | Entrada de usuario no sanitizada, cuerpo de solicitud API no validado, condiciones de límite no verificadas |

La disciplina clave: diagnosticar la **causa raíz**, no el síntoma. Si `user.id` es undefined, la pregunta no es "¿cómo verifico si es undefined?" sino "¿por qué user es undefined en este punto de la ruta de ejecución?"

### Paso 4: Proponer Corrección Mínima

El flujo presenta:
1. La causa raíz identificada (con evidencia del rastreo de código).
2. La corrección propuesta (cambiando solo lo necesario).
3. Una explicación de por qué esto corrige la causa raíz, no solo el síntoma.

**El flujo se bloquea aquí hasta que el usuario confirma.** Esto previene que el agente de depuración haga cambios sin aprobación.

**Principio de corrección mínima:** Cambiar la menor cantidad de líneas posible. No refactorizar, no mejorar estilo de código, no agregar funcionalidades no relacionadas. La corrección debería poder revisarse en menos de 2 minutos.

### Paso 5: Aplicar Corrección y Escribir Prueba de Regresión

Dos acciones suceden en este paso:

1. **Implementar la corrección** — El cambio mínimo aprobado se aplica.
2. **Escribir una prueba de regresión** — Una prueba que:
   - Reproduce el bug original (la prueba debe fallar sin la corrección)
   - Verifica que la corrección funciona (la prueba debe pasar con la corrección)
   - Previene que el mismo bug reaparezca en cambios futuros

La prueba de regresión es el resultado más importante del flujo de depuración. Sin ella, el mismo bug puede ser reintroducido por cualquier cambio futuro.

### Paso 6: Escanear Patrones Similares

Después de aplicar la corrección, el flujo escanea todo el codebase buscando el mismo patrón que causó el bug.

**Herramientas usadas:** `search_for_pattern` con el patrón identificado como causa raíz.

**Criterio de delegación a subagente** — El flujo genera un subagente `debug-investigator` cuando:
- El error abarca múltiples dominios (ej., tanto frontend como backend afectados).
- El alcance del escaneo de patrones similares cubre 10+ archivos.
- Se necesita rastreo profundo de dependencias para diagnosticar completamente el problema.

Métodos de generación específicos del proveedor:

| Proveedor | Método de Generación |
|:----------|:--------------------|
| Claude Code | Herramienta Agent con `.claude/agents/debug-investigator.md` |
| Codex CLI | Solicitud de subagente mediada por modelo, resultados como JSON |
| Gemini CLI | `oh-my-ag agent:spawn debug "scan prompt" {session_id} -w {workspace}` |
| Antigravity / Fallback | `oh-my-ag agent:spawn debug "scan prompt" {session_id} -w {workspace}` |

Todas las ubicaciones vulnerables similares se reportan. Las instancias confirmadas se corrigen como parte de la misma sesión.

### Paso 7: Documentar el Bug

El flujo escribe un archivo de memoria con:
- Síntoma y causa raíz
- Corrección aplicada y archivos modificados
- Ubicación de la prueba de regresión
- Patrones similares encontrados en el codebase

---

## Plantilla de Prompt para /debug

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

**Por qué esta estructura funciona:**

- **Error + stack trace** permite que el Paso 2 localice inmediatamente el código (`search_for_pattern` con "deleteUser" encuentra la función; `find_symbol` señala la ubicación exacta).
- **Pasos para reproducir** con la condición de activación específica ("usuario cuya organización fue eliminada") da pistas sobre la causa raíz (clave foránea nula).
- **Entorno** elimina pistas falsas específicas de versión.

Para bugs más simples, un prompt más corto funciona:

```
/debug La página de login muestra "Invalid credentials" incluso con la contraseña correcta
```

El flujo solicitará detalles adicionales según sea necesario.

---

## Señales de Escalamiento

Estas señales indican que el bug requiere escalamiento más allá del bucle estándar de depuración:

### Señal 1: Misma Corrección Intentada Dos Veces

Si el flujo propone una corrección, la aplica y el mismo error reaparece, el problema es más profundo que el diagnóstico inicial. Esto activa el **Bucle de Exploración** en flujos que lo soportan (ultrawork, orchestrate, coordinate):

- Generar 2-3 hipótesis alternativas para la causa raíz.
- Probar cada hipótesis en un workspace separado (git stash por intento).
- Puntuar resultados y adoptar el mejor enfoque.

### Señal 2: Causa Raíz Multi-Dominio

El error en el frontend es causado por un cambio en el backend que es causado por una migración de esquema de base de datos. Cuando la causa raíz cruza límites de dominio, escalar a `/coordinate` o `/orchestrate` para involucrar a los agentes de dominio relevantes.

**Ejemplo:** El frontend muestra "undefined" para el nombre de usuario. El backend devuelve null para `user.display_name`. La migración de base de datos agregó la columna pero las filas existentes tienen valores NULL. La corrección requiere: migración de base de datos (backfill), manejo de null en backend y visualización de respaldo en frontend.

### Señal 3: Entorno de Reproducción Faltante

El bug solo ocurre en producción y no se puede reproducir localmente. Las señales incluyen:
- Diferencias de configuración específicas del entorno.
- Condiciones de carrera que solo se manifiestan bajo carga de producción.
- Diferencias de comportamiento de servicios de terceros entre staging y producción.

**Acción:** Recopilar logs de producción, solicitar acceso a monitoreo de producción y considerar agregar instrumentación/logging antes de intentar una corrección.

### Señal 4: Fallo de Infraestructura de Pruebas

La prueba de regresión no puede escribirse porque la infraestructura de pruebas está rota, faltante o inadecuada.

**Acción:** Corregir la infraestructura de pruebas primero (o usar `/setup` para configurarla), luego volver al flujo de depuración.

---

## Lista de Verificación de Validación Post-Corrección

Después de aplicar la corrección y prueba de regresión, verificar:

- [ ] **La prueba de regresión falla sin la corrección** — Revertir la corrección temporalmente y confirmar que la prueba detecta el bug.
- [ ] **La prueba de regresión pasa con la corrección** — Aplicar la corrección y confirmar que la prueba pasa.
- [ ] **Las pruebas existentes siguen pasando** — Ejecutar la suite completa de pruebas para verificar que no hay regresiones.
- [ ] **El build tiene éxito** — Compilar/construir el proyecto para detectar errores de tipo o problemas de importación.
- [ ] **Patrones similares escaneados** — El Paso 6 se ha completado y todas las instancias encontradas están corregidas o documentadas.
- [ ] **La corrección es mínima** — Solo se cambiaron las líneas necesarias. No se incluyó refactorización no relacionada.
- [ ] **Causa raíz documentada** — El archivo de memoria registra: síntoma, causa raíz, corrección aplicada, archivos modificados, ubicación de prueba de regresión y patrones similares encontrados.

---

## Criterios de Completación

El flujo de depuración está completo cuando:

1. La causa raíz está identificada y documentada (no solo el síntoma).
2. Se aplica una corrección mínima con aprobación del usuario.
3. Existe una prueba de regresión que falla sin la corrección y pasa con ella.
4. El codebase ha sido escaneado buscando patrones similares, y todas las instancias confirmadas están abordadas.
5. Un reporte de bug está registrado en memoria con: síntoma, causa raíz, corrección aplicada, archivos modificados, ubicación de prueba de regresión y patrones similares encontrados.
6. Todas las pruebas existentes continúan pasando después de la corrección.
