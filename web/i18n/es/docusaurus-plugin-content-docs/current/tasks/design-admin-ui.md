---
title: Diseñar una UI de administración en torno a sus tareas reales
description: Define la jerarquía, la densidad de la tabla, los estados y la entrega de diseño de una pantalla de administración, conservando el stack y el contrato visual del proyecto.
---

# Diseñar una UI de administración en torno a sus tareas reales

Usa `oma-design` para decidir cómo debe apoyar una pantalla de administración a sus usuarios antes de cambiar el código de la aplicación.

## Cargar la habilidad

Pide a tu agente de código que ejecute este comando y lea las instrucciones devueltas y el directorio de apoyo:

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## Aportar la entrada

- Una pantalla en ejecución, capturas o los componentes relevantes.
- Quién usa la pantalla y las acciones que necesita completar.
- El `DESIGN.md` existente, los tokens, los componentes, los idiomas y los requisitos de respuesta y accesibilidad.

## Dar la tarea

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## Comprobar el resultado

Espera decisiones de jerarquía y densidad específicas de la pantalla, el comportamiento de los estados, el mapeo de tokens semánticos y una entrega de implementación. Los cambios aceptados del sistema pertenecen al `DESIGN.md` canónico del proyecto.

Contrasta la propuesta con la tarea de triaje: ¿puede un usuario identificar el siguiente ticket, cambiar los filtros, abrir los detalles y recuperarse de los errores? Inspecciona el foco de teclado, el texto legible en coreano e inglés y el comportamiento en pantalla estrecha cuando haya un espécimen renderizado. Una entrega solo documental deja sin verificar la ejecución en el navegador y la accesibilidad.

## Dependencias y paso siguiente

Para una dirección nueva de interfaz de administración o de producto, el [contrato de enrutamiento](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md) selecciona Interface Design. La crítica, la auditoría y el pulido de una UI existente seleccionan Impeccable; otra dirección artística web usa Taste. Se carga un solo proveedor para la operación actual.

Esas instrucciones externas pueden necesitar sus propias descargas o herramientas de runtime. El stack existente, la marca, la cobertura CJK, el objetivo WCAG y los requisitos de movimiento reducido siguen siendo restricciones. Cargar instrucciones no renderiza ni verifica la UI.

Usa el especialista de frontend del proyecto para la implementación. Para hooks y flujos de trabajo de proyecto, [elige una configuración de runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) que incluya `oma-design`.
